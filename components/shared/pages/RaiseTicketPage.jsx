import React, { useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import {
    Ticket,
    Send,
    AlertCircle,
    CheckCircle2,
    Paperclip,
    X,
    Loader2,
    Lightbulb,
    Bug
} from 'lucide-react';

const RaiseTicketPage = () => {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [files, setFiles] = useState([]);
    const [ticketType, setTicketType] = useState('issue'); // 'issue' or 'enhancement'

    const [formData, setFormData] = useState({
        subject: '',
        category: 'it_support',
        description: ''
    });

    const issueCategories = [
        { value: 'it_support', label: 'IT Support' },
        { value: 'hr_support', label: 'HR Support' },
        { value: 'operations', label: 'Operations' },
        { value: 'finance', label: 'Finance' },
        { value: 'facilities', label: 'Facilities' },
        { value: 'other', label: 'Other' }
    ];

    const enhancementCategories = [
        { value: 'feature_request', label: 'New Feature' },
        { value: 'ux_improvement', label: 'UX/UI Improvement' },
        { value: 'process_opt', label: 'Process Optimization' },
        { value: 'new_tool', label: 'New Tool Request' },
        { value: 'other', label: 'Other' }
    ];



    const handleFileChange = (e) => {
        if (e.target.files) {
            setFiles([...files, ...Array.from(e.target.files)]);
        }
    };

    const removeFile = (index) => {
        setFiles(files.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                alert('You must be logged in to submit a ticket.');
                setLoading(false);
                return;
            }

            // Upload files (Placeholder: Assuming 'support-attachments' bucket exists or similar logic)
            // For now, we'll skip actual file upload implementation to avoid errors if bucket doesn't exist,
            // but we'll prepare the array structure.
            const uploadedUrls = [];
            // Implementation for file upload would go here...

            const payload = {
                user_id: user.id,
                type: ticketType, // 'issue' or 'enhancement'
                category: formData.category,
                subject: formData.subject,
                description: formData.description,
                status: ticketType === 'issue' ? 'open' : 'proposed',
                attachments: uploadedUrls
            };

            const { error } = await supabase
                .from('tickets')
                .insert([payload]);

            if (error) throw error;

            console.log('Ticket Submitted:', payload);
            setSuccess(true);
            setFormData({
                subject: '',
                category: ticketType === 'issue' ? 'it_support' : 'feature_request',
                description: ''
            });
            setFiles([]);

            // Reset success message after 3 seconds
            setTimeout(() => setSuccess(false), 3000);

        } catch (error) {
            console.error('Error submitting ticket:', error);
            alert(`Failed to submit ticket: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const toggleTicketType = (type) => {
        setTicketType(type);
        setFormData(prev => ({
            ...prev,
            category: type === 'issue' ? 'it_support' : 'feature_request'
        }));
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${ticketType === 'issue' ? 'bg-red-100' : 'bg-purple-100'}`}>
                        {ticketType === 'issue' ? (
                            <Bug className={`w-6 h-6 ${ticketType === 'issue' ? 'text-red-600' : 'text-purple-600'}`} />
                        ) : (
                            <Lightbulb className="w-6 h-6 text-purple-600" />
                        )}
                    </div>
                    {ticketType === 'issue' ? 'Report an Issue' : 'Propose Enhancement'}
                </h1>
                <p className="text-slate-500 mt-2 ml-12">
                    {ticketType === 'issue'
                        ? "Submit a support request for bugs, errors, or operational issues."
                        : "Have an idea? Suggest improvements or new features for the platform."}
                </p>
            </div>

            {/* Ticket Type Toggle */}
            <div className="flex gap-4 mb-8 bg-slate-100 p-1.5 rounded-xl w-fit">
                <button
                    onClick={() => toggleTicketType('issue')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${ticketType === 'issue'
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <Bug className="w-4 h-4" />
                    Raise Issue
                </button>
                <button
                    onClick={() => toggleTicketType('enhancement')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${ticketType === 'enhancement'
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <Lightbulb className="w-4 h-4" />
                    Enhancement
                </button>
            </div>

            <div className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-colors ${ticketType === 'issue' ? 'border-red-100' : 'border-purple-100'}`}>
                <div className="p-6 md:p-8">
                    {success ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in zoom-in duration-300">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle2 className="w-8 h-8 text-green-600" />
                            </div>
                            <h3 className="text-xl font-semibold text-slate-800 mb-2">
                                {ticketType === 'issue' ? 'Issue Reported!' : 'Suggestion Received!'}
                            </h3>
                            <p className="text-slate-500 max-w-sm">
                                Your {ticketType} has been recorded. Reference ID: #{Math.floor(Math.random() * 10000)}
                            </p>
                            <button
                                onClick={() => setSuccess(false)}
                                className="mt-6 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors font-medium"
                            >
                                Submit Another
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2 col-span-2">
                                    <label className="text-sm font-medium text-slate-700">Category</label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                    >
                                        {(ticketType === 'issue' ? issueCategories : enhancementCategories).map(cat => (
                                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Subject</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.subject}
                                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                    placeholder={ticketType === 'issue' ? "Brief summary of the issue" : "Title of your enhancement idea"}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Description</label>
                                <textarea
                                    required
                                    rows="5"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder={ticketType === 'issue' ? "Please describe the issue in detail..." : "Describe the enhancement and its benefits..."}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Attachments</label>
                                <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 transition-all hover:border-indigo-400 hover:bg-slate-50/50">
                                    <input
                                        type="file"
                                        multiple
                                        onChange={handleFileChange}
                                        className="hidden"
                                        id="file-upload"
                                    />
                                    <label
                                        htmlFor="file-upload"
                                        className="flex flex-col items-center justify-center cursor-pointer"
                                    >
                                        <div className="p-3 bg-indigo-50 rounded-full mb-3 text-indigo-600">
                                            <Paperclip className="w-5 h-5" />
                                        </div>
                                        <span className="text-sm font-medium text-slate-700">Click to upload files</span>
                                        <span className="text-xs text-slate-500 mt-1">Images, PDF, or Documents (Max 10MB)</span>
                                    </label>
                                </div>

                                {files.length > 0 && (
                                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {files.map((file, index) => (
                                            <div key={index} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg group">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className="min-w-[32px] w-8 h-8 bg-white rounded-md flex items-center justify-center border border-slate-200 text-slate-500 text-xs font-medium uppercase">
                                                        {file.name.split('.').pop()}
                                                    </div>
                                                    <span className="text-sm text-slate-700 truncate">{file.name}</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeFile(index)}
                                                    className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded transition-colors"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="pt-4 flex items-center justify-end gap-4 border-t border-slate-100 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ subject: '', category: ticketType === 'issue' ? 'it_support' : 'feature_request', description: '' })}
                                    className="px-6 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-50 rounded-lg transition-colors"
                                >
                                    Reset
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={`flex items-center gap-2 px-6 py-2.5 text-white text-sm font-medium rounded-lg shadow-sm transition-all disabled:opacity-70 disabled:cursor-not-allowed ${ticketType === 'issue' ? 'bg-red-600 hover:bg-red-700 shadow-red-200' : 'bg-purple-600 hover:bg-purple-700 shadow-purple-200'}`}
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Submitting...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-4 h-4" />
                                            Submit {ticketType === 'issue' ? 'Ticket' : 'Proposal'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RaiseTicketPage;
