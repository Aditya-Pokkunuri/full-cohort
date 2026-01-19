import React, { useState } from 'react';
import { Send, X, User } from 'lucide-react';
import { sendMessage } from '../../services/messageService';

const NotificationBanner = ({
    notificationId,
    senderId,
    senderName,
    senderAvatar,
    message,
    conversationId,
    onDismiss,
    currentUserId
}) => {
    const [replyText, setReplyText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [sent, setSent] = useState(false);

    const handleReply = async () => {
        if (!replyText.trim() || isSending) return;

        setIsSending(true);
        try {
            if (currentUserId) {
                await sendMessage(conversationId, currentUserId, replyText);
                setSent(true);
                setTimeout(() => {
                    onDismiss(notificationId);
                }, 1500);
            } else {
                console.error("No user ID found for reply");
            }
        } catch (error) {
            console.error('Failed to send reply:', error);
        } finally {
            setIsSending(false);
        }
    };

    if (sent) {
        return (
            <div style={{
                backgroundColor: '#1e1e2d', // Dark background matching image
                color: '#ffffff',
                padding: '16px',
                borderRadius: '12px',
                boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '350px',
                animation: 'slideIn 0.3s ease',
                borderLeft: '4px solid #7c3aed' // Purple accent
            }}>
                <span style={{ fontWeight: 600 }}>Reply sent!</span>
            </div>
        );
    }

    return (
        <div style={{
            backgroundColor: '#1e1e2d', // Dark background
            color: '#ffffff',
            padding: '16px',
            borderRadius: '12px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            minWidth: '350px',
            maxWidth: '400px',
            animation: 'slideIn 0.3s ease',
            borderLeft: '4px solid #7c3aed', // Purple accent
            position: 'relative'
        }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* Avatar */}
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        backgroundColor: '#333'
                    }}>
                        {senderAvatar ? (
                            <img src={senderAvatar} alt={senderName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <User size={20} color="#ccc" />
                            </div>
                        )}
                    </div>
                    {/* Name and Snippet */}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{senderName || 'Unknown Sender'}</span>
                        <span style={{ fontSize: '0.85rem', color: '#a1a1aa', marginTop: '2px' }}>
                            {message && message.length > 50 ? message.substring(0, 50) + '...' : message}
                        </span>
                    </div>
                </div>
                {/* Close Button */}
                <button
                    onClick={() => onDismiss(notificationId)}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#6c6c7c',
                        cursor: 'pointer',
                        padding: '4px'
                    }}
                >
                    <X size={16} />
                </button>
            </div>

            {/* Reply Input */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: '#2b2b40',
                borderRadius: '24px',
                padding: '4px 4px 4px 16px',
                marginTop: '4px'
            }}>
                <input
                    type="text"
                    placeholder="Type a reply..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleReply()}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#fff',
                        flex: 1,
                        outline: 'none',
                        fontSize: '0.9rem'
                    }}
                />
                <button
                    onClick={handleReply}
                    disabled={!replyText.trim() || isSending}
                    style={{
                        backgroundColor: '#7c3aed',
                        border: 'none',
                        borderRadius: '50%',
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: (!replyText.trim() || isSending) ? 'default' : 'pointer',
                        opacity: (!replyText.trim() || isSending) ? 0.5 : 1,
                        transition: 'opacity 0.2s'
                    }}
                >
                    <Send size={14} color="#fff" />
                </button>
            </div>
        </div>
    );
};

export default NotificationBanner;
