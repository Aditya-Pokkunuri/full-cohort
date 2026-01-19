import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useNavigate, useLocation } from 'react-router-dom';
import { sendMessage } from '../../../services/messageService';
import { sendNotification } from '../../../services/notificationService';

const MessageContext = createContext();

export const useMessages = () => {
    return useContext(MessageContext);
};

export const MessageProvider = ({ children, addToast }) => {
    const [unreadCount, setUnreadCount] = useState(0);
    const [conversations, setConversations] = useState([]);
    const [lastReadTimes, setLastReadTimes] = useState({});
    const [userId, setUserId] = useState(null);

    // Hooks for navigation
    const navigate = useNavigate();
    const location = useLocation();

    // Get current user first
    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) setUserId(user.id);
        };
        getUser();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
                setUserId(session.user.id);
            } else if (event === 'SIGNED_OUT') {
                setUserId(null);
                setConversations([]);
                setUnreadCount(0);
                setLastReadTimes({}); // Clear on logout
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // Initialize from localStorage AFTER we have userId (user-specific storage)
    useEffect(() => {
        if (!userId) return;

        const storageKey = `message_read_times_${userId}`;
        const stored = localStorage.getItem(storageKey);
        if (stored) {
            try {
                setLastReadTimes(JSON.parse(stored));
            } catch (e) {
                console.error('Failed to parse read times', e);
            }
        }
    }, [userId]);

    // Persist to localStorage whenever it changes (user-specific)
    useEffect(() => {
        if (!userId) return;
        if (Object.keys(lastReadTimes).length > 0) {
            const storageKey = `message_read_times_${userId}`;
            localStorage.setItem(storageKey, JSON.stringify(lastReadTimes));
        }
    }, [lastReadTimes, userId]);

    const fetchConversations = async () => {
        if (!userId) return;
        try {
            // 1. Get user's conversation memberships
            const { data: memberships } = await supabase
                .from('conversation_members')
                .select('conversation_id')
                .eq('user_id', userId);

            if (!memberships?.length) return;

            const conversationIds = memberships.map(m => m.conversation_id);

            // 2. Get conversations with their indexes (last message info)
            const { data: convs, error } = await supabase
                .from('conversations')
                .select(`
                    id, 
                    type, 
                    name,
                    conversation_indexes (
                        last_message,
                        last_message_at
                    )
                `)
                .in('id', conversationIds);

            if (error) throw error;

            setConversations(convs || []);
            return convs || [];
        } catch (err) {
            console.error('Error fetching conversations for notifications:', err);
            return [];
        }
    };

    // Fetch conversations and calculate unread count
    useEffect(() => {
        fetchConversations();

        // Poll every 30 seconds for new messages (fallback)
        const interval = setInterval(fetchConversations, 30000);

        return () => clearInterval(interval);
    }, [userId]);

    // Real-time listener for notifications
    useEffect(() => {
        if (!userId) return;

        const channel = supabase
            .channel(`message-notifs-${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `receiver_id=eq.${userId}`
                },
                async (payload) => {
                    // If it's a message notification
                    if (payload.new.type === 'message') {
                        // 1. Immediately increment unread count (instant feedback)
                        setUnreadCount(prev => prev + 1);

                        // 2. Refresh conversations (background update)
                        const latestConvs = await fetchConversations();

                        // 2. Prepare toast data
                        if (addToast) {
                            const senderId = payload.new.sender_id;
                            let senderAvatar = null;
                            let conversationId = null;
                            let displayMessage = payload.new.message || 'New Message';

                            // Fetch sender profile
                            if (senderId) {
                                const { data: profile } = await supabase
                                    .from('profiles')
                                    .select('avatar_url, full_name')
                                    .eq('id', senderId)
                                    .single();
                                senderAvatar = profile?.avatar_url;

                                // Attempt to find DM conversation ID
                                // We check if any of our 'dm' conversations involves this sender
                                // First get sender's conversation IDs
                                const { data: senderMemberships } = await supabase
                                    .from('conversation_members')
                                    .select('conversation_id')
                                    .eq('user_id', senderId);

                                if (senderMemberships) {
                                    const senderConvIds = senderMemberships.map(c => c.conversation_id);
                                    // Find common DM using latest conversations
                                    const dm = latestConvs?.find(c => c.type === 'dm' && senderConvIds.includes(c.id));
                                    if (dm) {
                                        conversationId = dm.id;
                                        // Fetch the actual latest message directly from messages table
                                        const { data: latestMessages } = await supabase
                                            .from('messages')
                                            .select('content')
                                            .eq('conversation_id', dm.id)
                                            .order('created_at', { ascending: false })
                                            .limit(1);

                                        if (latestMessages && latestMessages.length > 0 && latestMessages[0].content) {
                                            displayMessage = latestMessages[0].content;
                                        }
                                    }
                                }
                            }

                            if (conversationId) {
                                // Get current user's profile for name
                                const { data: myProfile } = await supabase
                                    .from('profiles')
                                    .select('full_name')
                                    .eq('id', userId)
                                    .single();
                                const myName = myProfile?.full_name || 'Someone';
                                const recipientId = senderId; // The original sender becomes the recipient of our reply

                                // Show interactive Reply Toast
                                addToast(
                                    displayMessage,
                                    'message_reply',
                                    {
                                        sender: {
                                            name: payload.new.sender_name || 'User',
                                            avatar_url: senderAvatar
                                        },
                                        action: {
                                            onReply: async (text) => {
                                                // Send the message
                                                await sendMessage(conversationId, userId, text);
                                                // Also create a notification for the recipient
                                                await sendNotification(
                                                    recipientId,
                                                    userId,
                                                    myName,
                                                    text,
                                                    'message'
                                                );
                                            }
                                        }
                                    }
                                );
                            } else {
                                // Fallback to standard toast with View button
                                addToast(
                                    payload.new.message || 'New Message',
                                    'info',
                                    {
                                        label: 'Reply',
                                        onClick: () => {
                                            // Determine dashboard root based on current path
                                            const path = location.pathname;
                                            let root = '';
                                            if (path.includes('/employee-dashboard')) root = '/employee-dashboard';
                                            else if (path.includes('/manager-dashboard')) root = '/manager-dashboard';
                                            else if (path.includes('/teamlead-dashboard')) root = '/teamlead-dashboard';
                                            else if (path.includes('/executive-dashboard')) root = '/executive-dashboard';

                                            if (root) {
                                                navigate(`${root}/messages`);
                                            }
                                        }
                                    }
                                );
                            }
                        }

                        // 3. Optional: Play sound
                        try {
                            const audio = new Audio('/notification.mp3');
                            audio.play().catch(e => console.log('Audio play failed', e));
                        } catch (e) { }
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId, addToast, location.pathname, navigate]); // Removed conversations dependency

    // Calculate unread count
    useEffect(() => {
        if (!conversations.length) {
            // Don't reset to 0 if we already have a count from real-time notifications
            // Only reset if this is a fresh load (lastReadTimes has entries for these convs)
            return;
        }

        let count = 0;
        let hasValidIndexes = false;

        console.log('📊 Calculating unread count...');
        console.log('📊 Conversations:', conversations.length);
        console.log('📊 LastReadTimes:', lastReadTimes);

        conversations.forEach(conv => {
            const index = conv.conversation_indexes?.[0];
            if (!index?.last_message_at) {
                console.log(`📊 Conv ${conv.id}: No last_message_at`);
                return;
            }

            hasValidIndexes = true;
            const lastMsgTime = new Date(index.last_message_at).getTime();
            const lastReadTime = lastReadTimes[conv.id] || 0;

            console.log(`📊 Conv ${conv.id}: lastMsg=${lastMsgTime}, lastRead=${lastReadTime}, isUnread=${lastMsgTime > lastReadTime}`);

            if (lastMsgTime > lastReadTime) {
                count++;
            }
        });

        console.log('📊 Final calculated count:', count, 'hasValidIndexes:', hasValidIndexes);

        // Only update if we have valid index data to calculate from
        // Otherwise, keep the existing count (from real-time notifications)
        if (hasValidIndexes) {
            setUnreadCount(count);
        }
    }, [conversations, lastReadTimes]);

    const markAsRead = (conversationId) => {
        let timestamp = Date.now();

        // Find conversation to handle potential clock skews where server time > client time
        const conv = conversations.find(c => c.id === conversationId);
        if (conv?.conversation_indexes?.[0]?.last_message_at) {
            const msgTime = new Date(conv.conversation_indexes[0].last_message_at).getTime();
            if (msgTime > timestamp) {
                timestamp = msgTime + 1000; // Add 1s buffer to be safe
            }
        }

        setLastReadTimes(prev => ({
            ...prev,
            [conversationId]: timestamp
        }));

        // Optimistically update count immediately
        // (useEffect will run eventually but this feels snappier)
    };

    const value = {
        unreadCount,
        conversations,
        markAsRead,
        lastReadTimes
    };

    return (
        <MessageContext.Provider value={value}>
            {children}
        </MessageContext.Provider>
    );
};
