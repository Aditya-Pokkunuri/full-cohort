import React, { useState, useEffect, useRef } from 'react';
import { ClipboardList, Star, TrendingUp, Award, ChevronRight, ChevronLeft, Loader2, Calendar, User, Save } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { supabase } from '@/lib/supabaseClient';
import { NumberTicker } from "@/registry/magicui/number-ticker";
import { getStudentTasksWithReviews } from '@/services/reviews/studentTaskReviews';
import { getStudentSkillsAssessments, type SkillsAssessment } from '@/services/reviews/studentSkillsAssessments';
import { Confetti, type ConfettiRef } from '@/registry/magicui/confetti';
import { useToast } from '../context/ToastContext';

const SOFT_SKILL_TRAITS = [
    "Accountability", "Learnability", "Abstract Thinking", "Curiosity", "Second-Order Thinking",
    "Compliance", "Ambitious", "Communication", "English", "First-Principle Thinking"
];

const DEVELOPMENT_SKILL_TRAITS = [
    "Frontend", "Backend", "Workflows", "Databases", "Prompting",
    "Non-popular LLMs", "Fine-tuning", "Data Labelling", "Content Generation"
];

import SoftSkillsSection from '../components/SoftSkillsSection';

const MyReviewPage = () => {
    const { userId } = useUser();
    const { addToast } = useToast();
    const [selectedTab, setSelectedTab] = useState('Score');
    const [tasks, setTasks] = useState<any[]>([]);
    const [skills, setSkills] = useState<SkillsAssessment[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [viewPeriod, setViewPeriod] = useState<'weekly' | 'monthly'>('weekly');
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [skillCategory, setSkillCategory] = useState<'soft' | 'development'>('soft');
    const confettiRef = useRef<ConfettiRef>(null);

    // Self Assessment State
    const [selfSoftSkillScores, setSelfSoftSkillScores] = useState<Record<string, number>>({});
    const [selfSoftSkillEnabled, setSelfSoftSkillEnabled] = useState<Record<string, boolean>>({});
    const [selfSoftSkillsAvg, setSelfSoftSkillsAvg] = useState(0);

    const [selfDevSkillScores, setSelfDevSkillScores] = useState<Record<string, number>>({});
    const [selfDevSkillEnabled, setSelfDevSkillEnabled] = useState<Record<string, boolean>>({});
    const [selfDevSkillsAvg, setSelfDevSkillsAvg] = useState(0);

    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // Task Details Modal State
    const [selectedTask, setSelectedTask] = useState<any>(null);

    // Helper functions for period navigation
    const getWeekStart = (date: Date): Date => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(d.setDate(diff));
    };

    const isSamePeriod = (d1: Date, d2: Date, period: 'weekly' | 'monthly') => {
        if (period === 'weekly') {
            const s1 = getWeekStart(d1);
            const s2 = getWeekStart(d2);
            return s1.toISOString().split('T')[0] === s2.toISOString().split('T')[0];
        } else {
            return d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();
        }
    };

    const formatPeriodRange = (date: Date) => {
        if (viewPeriod === 'weekly') {
            const start = getWeekStart(date);
            const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
            return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        } else {
            return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        }
    };

    const navigatePeriod = (direction: number) => {
        const newDate = new Date(selectedDate);
        if (viewPeriod === 'weekly') {
            newDate.setDate(newDate.getDate() + direction * 7);
        } else {
            newDate.setMonth(newDate.getMonth() + direction);
        }

        // Don't navigate into future
        if (newDate <= new Date()) {
            setSelectedDate(newDate);
        }
    };

    const isCurrentPeriod = isSamePeriod(selectedDate, new Date(), viewPeriod);

    // Updated: Filter tasks by the selected period
    const filteredTasks = tasks.filter(task => {
        const reviews = task.student_task_reviews || [];
        return reviews.some((review: any) => {
            const reviewDate = new Date(review.created_at || review.updated_at);
            return isSamePeriod(reviewDate, selectedDate, viewPeriod);
        });
    });

    useEffect(() => {
        const fetchData = async () => {
            if (!userId) return;
            setLoading(true);
            try {
                const [tasksData, skillsData] = await Promise.all([
                    getStudentTasksWithReviews(userId),
                    getStudentSkillsAssessments(userId)
                ]);
                setTasks(tasksData || []);
                setSkills(skillsData || []);
            } catch (error) {
                console.error('Error fetching review data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [userId, refreshTrigger]);

    // REAL-TIME SUBSCRIPTION
    useEffect(() => {
        const taskChannel = supabase
            .channel('student-task-review-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'student_task_reviews' }, () => {
                setRefreshTrigger(prev => prev + 1);
            })
            .subscribe();

        const skillsChannel = supabase
            .channel('student-skills-review-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'student_skills_assessments' }, () => {
                setRefreshTrigger(prev => prev + 1);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(taskChannel);
            supabase.removeChannel(skillsChannel);
        };
    }, []);

    const tabs = [
        { id: 'Score', icon: <Star size={24} />, color: '#f59e0b', label: 'Score' },
        // { id: 'Review', icon: <ClipboardList size={24} />, color: '#3b82f6', label: 'Review' }, // REMOVED
        // { id: 'Improvements', icon: <TrendingUp size={24} />, color: '#10b981', label: 'Improvements' }, // REMOVED
        { id: 'My Score', icon: <User size={24} />, color: '#3b82f6', label: 'My Score' },
        { id: 'Org Score', icon: <Award size={24} />, color: '#8b5cf6', label: 'Org Score' } // Renamed from Skills
    ];

    // --- Self Assessment Helpers ---
    useEffect(() => {
        if (!userId) return;
        const loadSelfAssessment = async () => {
            const periodStartStr = (viewPeriod === 'weekly' ? getWeekStart(selectedDate) : new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)).toISOString().split('T')[0];
            // Find existing assessment in the fetched skills list (or fetch specifically if needed, but we have getStudentSkillsAssessments returning all)
            // The current API might return all, let's filter from 'skills' state if possible, or fetch fresh.
            // optimized: use 'skills' state.
            const currentAssessment = skills.find(s => s.period_type === viewPeriod && s.period_start === periodStartStr);

            if (currentAssessment) {
                // Load Self Scores
                const sSoft = currentAssessment.self_soft_skill_traits || {};
                const sDev = currentAssessment.self_development_skill_traits || {};

                const initialSoftScores: Record<string, number> = {};
                const initialSoftEnabled: Record<string, boolean> = {};
                SOFT_SKILL_TRAITS.forEach(t => {
                    if (sSoft[t] !== undefined && sSoft[t] !== null) {
                        initialSoftScores[t] = sSoft[t];
                        initialSoftEnabled[t] = true;
                    } else {
                        initialSoftScores[t] = 0;
                        initialSoftEnabled[t] = false; // Default false if not set
                    }
                });

                const initialDevScores: Record<string, number> = {};
                const initialDevEnabled: Record<string, boolean> = {};
                DEVELOPMENT_SKILL_TRAITS.forEach(t => {
                    if (sDev[t] !== undefined && sDev[t] !== null) {
                        initialDevScores[t] = sDev[t];
                        initialDevEnabled[t] = true;
                    } else {
                        initialDevScores[t] = 0;
                        initialDevEnabled[t] = false;
                    }
                });

                setSelfSoftSkillScores(initialSoftScores);
                setSelfSoftSkillEnabled(initialSoftEnabled);
                setSelfSoftSkillsAvg(currentAssessment.self_soft_skills_score || 0);

                setSelfDevSkillScores(initialDevScores);
                setSelfDevSkillEnabled(initialDevEnabled);
                setSelfDevSkillsAvg(currentAssessment.self_development_skills_score || 0);

                setIsEditing(false); // Mode: View/Edit
            } else {
                // Reset
                setSelfSoftSkillScores({});
                setSelfSoftSkillEnabled(SOFT_SKILL_TRAITS.reduce((acc, t) => ({ ...acc, [t]: true }), {})); // Default all enabled for new? Or logic choice. Let's say all enabled default 0.
                setSelfSoftSkillsAvg(0);
                setSelfDevSkillScores({});
                setSelfDevSkillEnabled(DEVELOPMENT_SKILL_TRAITS.reduce((acc, t) => ({ ...acc, [t]: true }), {}));
                setSelfDevSkillsAvg(0);
                setIsEditing(true); // New assessment
            }
        };
        loadSelfAssessment();
    }, [skills, viewPeriod, selectedDate, userId]);

    const calculateAvg = (scores: Record<string, number>, enabled: Record<string, boolean>, traits: string[]) => {
        let total = 0;
        let count = 0;
        traits.forEach(t => {
            if (enabled[t]) {
                total += (scores[t] || 0);
                count++;
            }
        });
        return count > 0 ? parseFloat((total / count).toFixed(1)) : 0;
    };

    const handleSoftChange = (trait: string, val: number) => {
        const newScores = { ...selfSoftSkillScores, [trait]: val };
        setSelfSoftSkillScores(newScores);
        setSelfSoftSkillsAvg(calculateAvg(newScores, selfSoftSkillEnabled, SOFT_SKILL_TRAITS));
    };

    const toggleSoft = (trait: string) => {
        const newEnabled = { ...selfSoftSkillEnabled, [trait]: !selfSoftSkillEnabled[trait] };
        setSelfSoftSkillEnabled(newEnabled);
        setSelfSoftSkillsAvg(calculateAvg(selfSoftSkillScores, newEnabled, SOFT_SKILL_TRAITS));
    };

    const handleDevChange = (trait: string, val: number) => {
        const newScores = { ...selfDevSkillScores, [trait]: val };
        setSelfDevSkillScores(newScores);
        setSelfDevSkillsAvg(calculateAvg(newScores, selfDevSkillEnabled, DEVELOPMENT_SKILL_TRAITS));
    };

    const toggleDev = (trait: string) => {
        const newEnabled = { ...selfDevSkillEnabled, [trait]: !selfDevSkillEnabled[trait] };
        setSelfDevSkillEnabled(newEnabled);
        setSelfDevSkillsAvg(calculateAvg(selfDevSkillScores, newEnabled, DEVELOPMENT_SKILL_TRAITS));
    };

    const handleSaveSelfAssessment = async () => {
        if (!userId) return;
        setSaving(true);
        try {
            const periodStart = (viewPeriod === 'weekly' ? getWeekStart(selectedDate) : new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
            const periodStartStr = periodStart.toISOString().split('T')[0];
            const periodEnd = (viewPeriod === 'weekly' ? new Date(periodStart.getTime() + 6 * 24 * 60 * 60 * 1000) : new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 0)).toISOString().split('T')[0];

            const softTraitsToSave: Record<string, number | null> = {};
            SOFT_SKILL_TRAITS.forEach(t => {
                softTraitsToSave[t] = selfSoftSkillEnabled[t] ? (selfSoftSkillScores[t] || 0) : null;
            });

            const devTraitsToSave: Record<string, number | null> = {};
            DEVELOPMENT_SKILL_TRAITS.forEach(t => {
                devTraitsToSave[t] = selfDevSkillEnabled[t] ? (selfDevSkillScores[t] || 0) : null;
            });

            // Upsert
            const { error } = await supabase
                .from('student_skills_assessments')
                .upsert({
                    student_id: userId,
                    period_type: viewPeriod,
                    period_start: periodStartStr,
                    period_end: periodEnd,
                    self_soft_skill_traits: softTraitsToSave,
                    self_soft_skills_score: selfSoftSkillsAvg,
                    self_development_skill_traits: devTraitsToSave,
                    self_development_skills_score: selfDevSkillsAvg,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'student_id,period_type,period_start' });

            if (error) throw error;

            addToast('Self assessment saved!', 'success');
            if (confettiRef.current) confettiRef.current.fire({});
            // Refresh logic handled by realtime subscription or manual refetch
        } catch (err) {
            console.error(err);
            addToast('Failed to save assessment', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <Loader2 className="animate-spin text-gray-400" size={48} />
            </div>
        );
    }

    const renderContent = () => {
        // --- ORG SCORE (Read Only) ---
        if (selectedTab === 'Org Score') {
            const periodStartStr = (viewPeriod === 'weekly' ? getWeekStart(selectedDate) : new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)).toISOString().split('T')[0];
            const periodSkills = skills.find(s => s.period_type === viewPeriod && s.period_start === periodStartStr);

            // Org Scores (Manager/Lead)
            const softTraitScores = periodSkills?.soft_skill_traits || {};
            const devTraitScores = periodSkills?.development_skill_traits || {};

            const softTraits = SOFT_SKILL_TRAITS
                .filter(name => softTraitScores[name] !== undefined && softTraitScores[name] !== null)
                .map(name => ({ name, score: softTraitScores[name] }));
            const softOverall = periodSkills?.soft_skills_score || 0;

            const devTraits = DEVELOPMENT_SKILL_TRAITS
                .filter(name => devTraitScores[name] !== undefined && devTraitScores[name] !== null)
                .map(name => ({ name, score: devTraitScores[name] }));
            const devOverall = periodSkills?.development_skills_score || 0;

            // Compare with Self Scores for "Reason" display?
            // Actually requirement says: "if alter any scores from personal scores , he needs to add the reasons and that scores will be shown in "Org Scores""
            // So we should show the "override_reason" if it exists.
            const overrideReason = periodSkills?.override_reason;

            return (
                <div style={{ padding: '0 8px' }}>
                    {overrideReason && (
                        <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-xl">
                            <h3 className="font-bold text-purple-800 text-sm uppercase mb-1">Feedback / Override Reason</h3>
                            <p className="text-purple-900">{overrideReason}</p>
                        </div>
                    )}

                    {/* Sub-tabs for Soft / Dev */}
                    <div className="flex justify-center mb-6">
                        <div className="flex bg-slate-100 rounded-xl p-1">
                            <button
                                onClick={() => setSkillCategory('soft')}
                                className={`px-6 py-2 rounded-lg font-semibold text-sm transition-all ${skillCategory === 'soft' ? 'bg-purple-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Soft Skills
                            </button>
                            <button
                                onClick={() => setSkillCategory('development')}
                                className={`px-6 py-2 rounded-lg font-semibold text-sm transition-all ${skillCategory === 'development' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Development Skills
                            </button>
                        </div>
                    </div>

                    {skillCategory === 'soft' ? (
                        <SoftSkillsSection softSkillsAverageScore={softOverall} softSkillsTraits={softTraits} />
                    ) : (
                        <SoftSkillsSection softSkillsAverageScore={devOverall} softSkillsTraits={devTraits} /> // reusing component, works for dev traits too if passed correctly
                    )}
                </div>
            );
        }

        // --- MY SCORE (Self Assessment) ---
        if (selectedTab === 'My Score') {
            const isSoft = skillCategory === 'soft';
            const currentTraits = isSoft ? SOFT_SKILL_TRAITS : DEVELOPMENT_SKILL_TRAITS;
            const currentScores = isSoft ? selfSoftSkillScores : selfDevSkillScores;
            const currentEnabled = isSoft ? selfSoftSkillEnabled : selfDevSkillEnabled;
            const currentAvg = isSoft ? selfSoftSkillsAvg : selfDevSkillsAvg;
            const toggleFn = isSoft ? toggleSoft : toggleDev;
            const changeFn = isSoft ? handleSoftChange : handleDevChange;

            const themeColor = isSoft ? 'text-orange-500' : 'text-emerald-500';
            const borderColor = isSoft ? 'border-orange-500' : 'border-emerald-500';
            const bgColor = isSoft ? 'bg-orange-500' : 'bg-emerald-500';

            return (
                <div style={{ padding: '0 8px' }}>
                    {/* Sub-tabs */}
                    <div className="flex justify-center mb-6">
                        <div className="flex bg-slate-100 rounded-xl p-1">
                            <button
                                onClick={() => setSkillCategory('soft')}
                                className={`px-6 py-2 rounded-lg font-semibold text-sm transition-all ${skillCategory === 'soft' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Soft Skills
                            </button>
                            <button
                                onClick={() => setSkillCategory('development')}
                                className={`px-6 py-2 rounded-lg font-semibold text-sm transition-all ${skillCategory === 'development' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Development Skills
                            </button>
                        </div>
                    </div>

                    <div className="relative overflow-hidden rounded-2xl bg-white p-8 shadow-sm border border-slate-100">
                        {/* Background Confetti for High Score */}
                        {currentAvg >= 7 && (
                            <Confetti
                                ref={confettiRef}
                                className="pointer-events-none absolute inset-0 z-0 h-full w-full opacity-50"
                            />
                        )}

                        <div className="relative z-10">
                            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800">My Self Assessment</h2>
                                    <p className="text-slate-500 text-sm">Rate your {isSoft ? 'soft' : 'development'} skills</p>
                                </div>
                                <button
                                    onClick={handleSaveSelfAssessment}
                                    disabled={saving}
                                    className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors disabled:opacity-50 shadow-lg hover:shadow-xl transform active:scale-95 transition-all"
                                >
                                    <Save size={18} />
                                    {saving ? 'Saving...' : 'Save Assessment'}
                                </button>
                            </div>

                            <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-3">
                                {/* Left: Average Score Circle */}
                                <div className="flex flex-col items-center justify-center">
                                    <div className={`flex h-48 w-48 items-center justify-center rounded-full border-[8px] ${borderColor} bg-white shadow-xl`} style={{ boxShadow: `0 10px 30px -10px ${isSoft ? 'rgba(249, 115, 22, 0.3)' : 'rgba(16, 185, 129, 0.3)'}` }}>
                                        <div className="flex flex-col items-center justify-center">
                                            <NumberTicker
                                                value={currentAvg}
                                                decimalPlaces={1}
                                                className={`text-5xl font-black ${themeColor}`}
                                            />
                                            <div className="mt-1 text-sm font-bold text-slate-400">OUT OF 10</div>
                                        </div>
                                    </div>
                                    <p className="mt-6 text-sm font-semibold text-slate-500 uppercase tracking-wide">Average Score</p>

                                    <div className={`mt-4 px-4 py-2 rounded-full text-sm font-bold ${isSoft ? 'bg-orange-50 text-orange-700' : 'bg-emerald-50 text-emerald-700'}`}>
                                        {currentAvg >= 8 ? 'Outstanding! 🚀' : currentAvg >= 6 ? 'Good Progress 👍' : 'Keep Improving 💪'}
                                    </div>
                                </div>

                                {/* Right: Inputs Grid */}
                                <div className="lg:col-span-2 grid grid-cols-1 gap-4 md:grid-cols-2">
                                    {currentTraits.map(t => (
                                        <div
                                            key={t}
                                            className={`group flex items-center justify-between rounded-xl px-5 py-4 border transition-all duration-200 ${currentEnabled[t] ? 'bg-white border-slate-200 shadow-sm hover:border-slate-300' : 'bg-slate-50 border-slate-100 opacity-60'}`}
                                        >
                                            <div
                                                className="flex items-center gap-3 flex-1 overflow-hidden cursor-pointer"
                                                onClick={() => toggleFn(t)}
                                            >
                                                <div
                                                    className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 transition-colors ${currentEnabled[t] ? `${borderColor} ${bgColor}` : 'border-slate-300 bg-white group-hover:border-slate-400'}`}
                                                >
                                                    {currentEnabled[t] && <span className="text-white text-xs font-bold">✓</span>}
                                                </div>
                                                <span className={`font-semibold text-sm truncate transition-colors ${currentEnabled[t] ? 'text-slate-700' : 'text-slate-400'}`} title={t}>
                                                    {t}
                                                </span>
                                            </div>

                                            <input
                                                type="number"
                                                min="0" max="10" step="0.5"
                                                disabled={!currentEnabled[t]}
                                                value={currentScores[t] || 0}
                                                onChange={(e) => {
                                                    let val = parseFloat(e.target.value);
                                                    if (isNaN(val)) val = 0;
                                                    if (val < 0) val = 0;
                                                    if (val > 10) val = 10;
                                                    changeFn(t, val);
                                                }}
                                                className={`w-16 h-10 text-center border-2 rounded-lg font-bold text-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 ${currentEnabled[t] ? 'bg-slate-50 border-slate-200 text-slate-800 focus:border-slate-400' : 'bg-slate-100 border-transparent text-slate-400'}`}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        // --- SCORES (Task List) ---
        return (
            <div style={{ backgroundColor: '#fff', borderRadius: '24px', padding: '32px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                {/* Header Row */}
                <div style={{ display: 'flex', borderBottom: '2px solid #f1f5f9', paddingBottom: '16px', marginBottom: '8px' }}>
                    <div style={{ width: '40px', fontWeight: 'bold', color: '#64748b' }}>#</div>
                    <div style={{ flex: 1, fontWeight: 'bold', color: '#1e293b', fontSize: '1rem' }}>Task</div>
                    <div style={{ width: '120px', fontWeight: 'bold', color: '#64748b', fontSize: '1rem', textAlign: 'center' }}>Given By</div>
                    <div style={{ width: '100px', textAlign: 'right', fontWeight: 'bold', color: '#1e293b', fontSize: '1rem' }}>Score</div>
                </div>

                {/* Task List */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {filteredTasks.length === 0 ? (
                        <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
                            <p style={{ fontSize: '1.1rem', marginBottom: '8px', fontStyle: 'italic' }}>
                                No reviews found for this {viewPeriod === 'weekly' ? 'week' : 'month'}.
                            </p>
                        </div>
                    ) : (
                        filteredTasks.map((task, index) => {
                            const reviews = task.student_task_reviews || [];
                            const review = reviews.find((r: any) => r.reviewer_role === 'executive') || reviews[0];

                            // Helper to get initials or color based on role
                            let givenBy = '--';
                            if (review?.reviewer_role) {
                                givenBy = review.reviewer_role === 'executive' ? 'Tutor' : 'Mentor';
                            }

                            return (
                                <div
                                    key={task.id}
                                    onClick={() => review && setSelectedTask({ task, review })}
                                    style={{
                                        display: 'flex',
                                        padding: '16px 0',
                                        borderBottom: '1px solid #f8fafc',
                                        alignItems: 'center',
                                        cursor: review ? 'pointer' : 'default',
                                        transition: 'background-color 0.2s'
                                    }}
                                    className="hover:bg-slate-50"
                                >
                                    <div style={{ width: '40px', color: '#94a3b8', fontWeight: '500' }}>{index + 1}</div>
                                    <div style={{ flex: 1, fontWeight: '500', color: '#1e293b' }}>
                                        {task.title}
                                        {review && <span className="ml-2 text-xs text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">View Details</span>}
                                    </div>

                                    <div style={{ width: '120px', textAlign: 'center' }}>
                                        {givenBy !== '--' && (
                                            <span style={{
                                                display: 'inline-block',
                                                padding: '4px 12px',
                                                borderRadius: '20px',
                                                fontSize: '0.75rem',
                                                fontWeight: 'bold',
                                                backgroundColor: givenBy === 'Tutor' ? '#f3e8ff' : '#e0f2fe',
                                                color: givenBy === 'Tutor' ? '#7e22ce' : '#0369a1',
                                                textTransform: 'capitalize'
                                            }}>
                                                {givenBy}
                                            </span>
                                        )}
                                    </div>

                                    <div style={{ width: '100px', textAlign: 'right' }}>
                                        {review ? <span style={{ fontWeight: 'bold', color: '#3b82f6' }}>{review.score}/10</span> : '--'}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        );
    };



    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header with Weekly/Monthly Toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '4px' }}>My Review</h1>
                    <p style={{ color: '#64748b' }}>Track your performance across tasks and skills</p>
                </div>

                {/* Weekly / Monthly Toggle & Navigator */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{
                        display: 'flex',
                        backgroundColor: '#f1f5f9',
                        borderRadius: '12px',
                        padding: '4px'
                    }}>
                        <button
                            onClick={() => { setViewPeriod('weekly'); setSelectedDate(new Date()); }}
                            style={{
                                padding: '10px 24px',
                                borderRadius: '8px',
                                border: 'none',
                                backgroundColor: viewPeriod === 'weekly' ? '#f59e0b' : 'transparent',
                                color: viewPeriod === 'weekly' ? 'white' : '#64748b',
                                fontWeight: '600',
                                fontSize: '0.9rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            Weekly
                        </button>
                        <button
                            onClick={() => { setViewPeriod('monthly'); setSelectedDate(new Date()); }}
                            style={{
                                padding: '10px 24px',
                                borderRadius: '8px',
                                border: 'none',
                                backgroundColor: viewPeriod === 'monthly' ? '#f59e0b' : 'transparent',
                                color: viewPeriod === 'monthly' ? 'white' : '#64748b',
                                fontWeight: '600',
                                fontSize: '0.9rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            Monthly
                        </button>
                    </div>

                    {/* Period Navigator */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        backgroundColor: '#fff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '4px 8px'
                    }}>
                        <button
                            onClick={() => navigatePeriod(-1)}
                            style={{ padding: '8px', borderRadius: '8px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer' }}
                        >
                            <ChevronLeft size={18} color="#64748b" />
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '160px', justifyContent: 'center' }}>
                            <Calendar size={16} color="#f59e0b" />
                            <span style={{ fontWeight: '700', fontSize: '0.95rem', color: '#1e293b' }}>
                                {formatPeriodRange(selectedDate)}
                            </span>
                        </div>
                        <button
                            onClick={() => navigatePeriod(1)}
                            disabled={isCurrentPeriod}
                            style={{
                                padding: '8px',
                                borderRadius: '8px',
                                border: 'none',
                                backgroundColor: 'transparent',
                                cursor: isCurrentPeriod ? 'not-allowed' : 'pointer',
                                opacity: isCurrentPeriod ? 0.3 : 1
                            }}
                        >
                            <ChevronRight size={18} color="#64748b" />
                        </button>
                    </div>
                </div>
            </div>

            {/* 4 Cards/Icons */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {tabs.map((tab) => (
                    <div
                        key={tab.id}
                        onClick={() => setSelectedTab(tab.id)}
                        style={{
                            backgroundColor: selectedTab === tab.id ? tab.color : '#fff',
                            color: selectedTab === tab.id ? '#fff' : '#1e293b',
                            padding: '24px',
                            borderRadius: '24px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            border: '1px solid #e2e8f0',
                            boxShadow: selectedTab === tab.id ? `0 10px 15px -3px ${tab.color}40` : '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                            transform: selectedTab === tab.id ? 'translateY(-4px)' : 'none'
                        }}
                    >
                        <div style={{
                            backgroundColor: selectedTab === tab.id ? 'rgba(255,255,255,0.2)' : `${tab.color}15`,
                            color: selectedTab === tab.id ? '#fff' : tab.color,
                            padding: '12px',
                            borderRadius: '16px'
                        }}>
                            {tab.icon}
                        </div>
                        <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{tab.label}</span>
                    </div>
                ))}
            </div>

            {/* Main Content */}
            <div>
                {renderContent()}
            </div>

            {/* Task Review Modal */}
            {selectedTask && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">{selectedTask.task.title}</h3>
                                <p className="text-slate-500 text-sm">Review Details</p>
                            </div>
                            <button
                                onClick={() => setSelectedTask(null)}
                                className="p-2 hover:bg-slate-100 rounded-full"
                            >
                                <ChevronRight className="rotate-90" />
                            </button>
                        </div>

                        <div className="p-8 space-y-8">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                                    <label className="text-xs font-bold text-blue-600 uppercase tracking-wider">Score</label>
                                    <div className="text-3xl font-bold text-blue-700 mt-1">{selectedTask.review.score}<span className="text-lg text-blue-400">/10</span></div>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Reviewer</label>
                                    <div className="font-bold text-slate-700 mt-1 capitalize">{selectedTask.review.reviewer_role === 'executive' ? 'Tutor' : 'Mentor'}</div>
                                </div>
                            </div>

                            <div>
                                <h4 className="flex items-center gap-2 font-bold text-slate-800 mb-3">
                                    <ClipboardList size={20} className="text-blue-500" />
                                    Review / Feedback
                                </h4>
                                <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 text-slate-700 leading-relaxed whitespace-pre-wrap">
                                    {selectedTask.review.review || 'No written review provided.'}
                                </div>
                            </div>

                            <div>
                                <h4 className="flex items-center gap-2 font-bold text-slate-800 mb-3">
                                    <TrendingUp size={20} className="text-emerald-500" />
                                    Areas for Improvement
                                </h4>
                                <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-100 text-slate-700 leading-relaxed whitespace-pre-wrap">
                                    {selectedTask.review.improvements || 'No specific improvements noted.'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyReviewPage;
