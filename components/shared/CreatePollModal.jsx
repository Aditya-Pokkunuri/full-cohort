import React, { useState } from 'react';
import { X, Plus, Trash2, PieChart } from 'lucide-react';
import { createPoll } from '../../services/messageService';

const CreatePollModal = ({ isOpen, onClose, conversationId, currentUserId }) => {
    const [question, setQuestion] = useState('');
    const [options, setOptions] = useState(['', '']);
    const [allowMultiple, setAllowMultiple] = useState(false);
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleAddOption = () => {
        setOptions([...options, '']);
    };

    const handleRemoveOption = (index) => {
        if (options.length <= 2) return;
        setOptions(options.filter((_, i) => i !== index));
    };

    const handleOptionChange = (index, value) => {
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (!question.trim()) {
            alert('Please enter a question');
            return;
        }

        const validOptions = options.filter(opt => opt.trim());
        if (validOptions.length < 2) {
            alert('Please provide at least 2 options');
            return;
        }

        setLoading(true);
        try {
            await createPoll(conversationId, currentUserId, question, validOptions, allowMultiple);
            onClose();
            // Reset form
            setQuestion('');
            setOptions(['', '']);
            setAllowMultiple(false);
        } catch (error) {
            console.error('Error creating poll:', error);
            alert('Failed to create poll. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md animate-in fade-in zoom-in duration-200">
                <div className="flex flex-row items-center justify-between p-4 border-b">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <PieChart className="text-indigo-600" size={20} />
                        Create Poll
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">Question</label>
                        <input
                            type="text"
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            placeholder="Ask a question..."
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-gray-400"
                            autoFocus
                        />
                    </div>

                    <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-700">Options</label>
                        {options.map((option, index) => (
                            <div key={index} className="flex gap-2 items-center">
                                <input
                                    type="text"
                                    value={option}
                                    onChange={(e) => handleOptionChange(index, e.target.value)}
                                    placeholder={`Option ${index + 1}`}
                                    className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                                {options.length > 2 && (
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveOption(index)}
                                        className="text-gray-400 hover:text-red-500 p-1.5 hover:bg-red-50 rounded-md transition-colors"
                                        title="Remove option"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={handleAddOption}
                        className="text-sm text-indigo-600 font-medium flex items-center gap-1 hover:text-indigo-700 w-fit px-1"
                    >
                        <Plus size={16} />
                        Add Option
                    </button>

                    <div className="flex items-center justify-between py-2">
                        <label className="text-sm font-medium text-gray-700">Allow multiple answers</label>
                        <button
                            type="button"
                            onClick={() => setAllowMultiple(!allowMultiple)}
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ${allowMultiple ? 'bg-indigo-600' : 'bg-gray-200'}`}
                            role="switch"
                            aria-checked={allowMultiple}
                        >
                            <span
                                aria-hidden="true"
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${allowMultiple ? 'translate-x-5' : 'translate-x-0'}`}
                            />
                        </button>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                'Create Poll'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreatePollModal;
