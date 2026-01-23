import React, { useState } from 'react';
import { Check, User, Activity } from 'lucide-react';
import { votePoll } from '../../services/messageService';
import { supabase } from '../../lib/supabaseClient';

const PollMessage = ({ message, currentUserId }) => {
    const [isVoting, setIsVoting] = useState(false);

    // Safety check for malformed data
    if (!message.poll_options) return <div className="p-3 bg-red-50 text-red-500 rounded">Invalid Poll Data</div>;

    const totalVotes = message.poll_options.reduce((acc, opt) => acc + (opt.votes || 0), 0);

    const handleVote = async (optionId) => {
        if (isVoting) return;
        setIsVoting(true);
        try {
            await votePoll(optionId, currentUserId);
            // Optimistic update handled by parent subscription or refresh
        } catch (error) {
            console.error('Failed to vote:', error);
            alert('Failed to cast vote. Please try again.');
        } finally {
            setIsVoting(false);
        }
    };

    return (
        <div className="poll-container w-full max-w-sm bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mt-1">
            <div className="poll-header p-4 bg-gray-50 border-b border-gray-100">
                <h3 className="text-base font-semibold text-gray-800 break-words">{message.content}</h3>
                <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <Activity size={12} />
                    {totalVotes} vote{totalVotes !== 1 ? 's' : ''} • Single Choice
                </div>
            </div>

            <div className="poll-options p-3 space-y-2">
                {message.poll_options.map((option) => {
                    const percentage = totalVotes > 0 ? Math.round(((option.votes || 0) / totalVotes) * 100) : 0;
                    const isVoted = option.userVoted;
                    const allowMultiple = message.metadata?.allow_multiple;
                    const inputType = allowMultiple ? 'checkbox' : 'radio';

                    return (
                        <div
                            key={option.id}
                            onClick={() => handleVote(option.id)}
                            className={`relative group cursor-pointer border rounded-md transition-all duration-200 overflow-hidden ${isVoted
                                ? 'border-indigo-500 ring-1 ring-indigo-500 bg-indigo-50'
                                : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                                }`}
                        >
                            {/* Progress Bar Background */}
                            <div
                                className={`absolute top-0 left-0 bottom-0 transition-all duration-500 ease-out ${isVoted ? 'bg-indigo-100' : 'bg-gray-100'
                                    }`}
                                style={{ width: `${percentage}%`, opacity: 0.5 }}
                            />

                            {/* Content */}
                            <div className="relative p-3 flex justify-between items-center z-10">
                                <div className="flex-1 mr-3 flex items-center gap-3">
                                    {/* Inputs for visual cue */}
                                    <div className={`flex items-center justify-center w-5 h-5 rounded-full border ${isVoted ? 'border-indigo-600 bg-indigo-600' : 'border-gray-400 bg-transparent'} transition-colors`}>
                                        {isVoted && <Check size={12} className="text-white" />}
                                    </div>

                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className={`text-sm font-medium ${isVoted ? 'text-indigo-900' : 'text-gray-700'}`}>
                                                {option.option_text}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {option.votes > 0 && (
                                        <div className="flex -space-x-1 items-center">
                                            {/* Avatar bubble for counts */}
                                            <div className="bg-gray-200 rounded-full w-5 h-5 flex items-center justify-center text-[10px] text-gray-600 border border-white font-medium">
                                                {option.votes}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <button
                onClick={(e) => {
                    e.stopPropagation();
                    // Custom event or callback to open details
                    // For now, dispatch a custom event that MessagingHub can listen to, or we pass a handler
                    // Since I can't easily change the props sequence in usage without updating MessagingHub, I'll use a window event or just assume we'll update MessagingHub next.
                    // Let's assume we update MessagingHub to pass onOpenDetails
                    if (window.dispatchEvent) {
                        window.dispatchEvent(new CustomEvent('open-poll-details', { detail: { messageId: message.id } }));
                    }
                }}
                className="w-full p-3 bg-gray-50 border-t border-gray-100 text-center text-sm font-medium text-indigo-600 hover:bg-gray-100 transition-colors cursor-pointer"
            >
                View votes
            </button>
        </div>
    );
};

export default PollMessage;
