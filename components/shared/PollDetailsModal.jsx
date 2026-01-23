import React from 'react';
import { X, PieChart, User } from 'lucide-react';

const PollDetailsModal = ({ isOpen, onClose, message, currentUserId, orgUsers }) => {
    if (!isOpen || !message) return null;

    const totalVotes = message.poll_options?.reduce((acc, opt) => acc + (opt.votes || 0), 0) || 0;

    // Helper to get user details
    const getUser = (userId) => {
        return orgUsers.find(u => u.id === userId) || { full_name: 'Unknown User', email: '' };
    };

    // Format time (mocking for now as we might not have vote timestamp in the lightweight fetch)
    // If we need vote time, we'd need to fetch it. for now, we'll just show user.

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 rounded-xl shadow-xl w-full max-w-md animate-in fade-in zoom-in duration-200 overflow-hidden text-white flex flex-col max-h-[80vh]">
                <div className="flex flex-row items-center justify-between p-4 border-b border-gray-800">
                    <div>
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            Poll details
                        </h2>
                        <p className="text-sm text-gray-400 mt-1">
                            {message.content}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                            {totalVotes} of {orgUsers.length} members voted
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-200 transition-colors p-1 rounded-full hover:bg-gray-800"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 overflow-y-auto space-y-6">
                    {message.poll_options?.map((option) => (
                        <div key={option.id}>
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="font-medium text-gray-200">{option.option_text}</h3>
                                <div className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-300 border border-gray-700">
                                    {option.votes || 0} votes
                                </div>
                            </div>

                            <div className="space-y-3">
                                {option.poll_votes && option.poll_votes.length > 0 ? (
                                    option.poll_votes.map((vote, idx) => {
                                        const user = getUser(vote.user_id);
                                        const isMe = vote.user_id === currentUserId;
                                        return (
                                            <div key={idx} className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
                                                    {user.avatar_url ? (
                                                        <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-xs font-medium text-gray-300">
                                                            {(user.full_name?.[0] || user.email?.[0] || '?').toUpperCase()}
                                                        </span>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium text-gray-200">
                                                        {isMe ? 'You' : (user.full_name || user.email)}
                                                    </div>
                                                    {/* We don't have vote timestamp on the client side yet without fetching, so skipping time display for now */}
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="text-sm text-gray-500 italic px-1">
                                        No votes yet
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default PollDetailsModal;
