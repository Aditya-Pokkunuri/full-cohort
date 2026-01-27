import React, { useState, useEffect } from 'react';
import {
    Award, Search, ChevronRight, ChevronLeft, Loader2, X, Calendar, Filter
} from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { useUser } from '../context/UserContext';
import { useToast } from '../context/ToastContext';

const SOFT_SKILL_TRAITS = [
    "Accountability", "Learnability", "Abstract Thinking", "Curiosity", "Second-Order Thinking",
    "Compliance", "Ambitious", "Communication", "English", "First-Principle Thinking"
];

const DEVELOPMENT_SKILL_TRAITS = [
    "Frontend", "Backend", "Workflows", "Databases", "Prompting",
    "Non-popular LLMs", "Fine-tuning", "Data Labelling", "Content Generation"
];

/**
 * StudentReviewPage - Weekly/Monthly Skills Assessment
 * 
 * This page is for assessing student skills:
 * - Soft Skills (10 traits)
 * - Development Skills (9 traits)
 * 
 * Skills are assessed per week or month, NOT per task.
 * Task-specific reviews are handled in TaskReviewPage.
 */

const StudentCard = ({ student, index, handleStudentClick, getRoleLabel }: { student: any, index: number, handleStudentClick: (s: any) => void, getRoleLabel: (r: string) => string }) => {
    const assessment = student.assessment;
    const hasSelf = !!assessment?.self_soft_skill_traits && Object.keys(assessment.self_soft_skill_traits).length > 0;
    const isGraded = !!assessment?.soft_skill_traits && Object.keys(assessment.soft_skill_traits).length > 2; // Includes __mentor_review or traits

    return (
        <div
            onClick={() => handleStudentClick(student)}
            style={{
                padding: '16px 24px',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                backgroundColor: '#fff',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#8b5cf6';
                e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.transform = 'none';
            }}
        >
            <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                backgroundColor: '#f3e8ff', color: '#8b5cf6',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 'bold', flexShrink: 0
            }}>
                {index + 1}
            </div>
            <div style={{
                width: '48px', height: '48px', borderRadius: '50%',
                backgroundColor: '#f3e8ff', color: '#8b5cf6',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 'bold', fontSize: '1.2rem', flexShrink: 0
            }}>
                {student.full_name?.charAt(0) || 'S'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '1.1rem' }}>{student.full_name || 'Unnamed'}</h3>
                    {hasSelf && (
                        <span style={{ fontSize: '0.7rem', backgroundColor: '#dcfce7', color: '#166534', padding: '1px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                            Self Rated
                        </span>
                    )}
                </div>
                <p style={{ fontSize: '0.9rem', color: '#64748b' }}>{student.email}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                <div style={{
                    padding: '4px 12px', borderRadius: '20px',
                    backgroundColor: isGraded ? '#8b5cf6' : '#f3e8ff',
                    color: isGraded ? 'white' : '#8b5cf6',
                    fontSize: '0.85rem', fontWeight: '500'
                }}>
                    {getRoleLabel(student.role)}
                </div>
                {isGraded && <span style={{ fontSize: '0.75rem', color: '#8b5cf6', fontWeight: 'bold' }}>Graded</span>}
            </div>
            <Award size={20} color={isGraded ? "#8b5cf6" : "#cbd5e1"} />
        </div>
    );
};

const StudentReviewPage = () => {
    const { userId, userRole, teamId } = useUser();
    const { addToast } = useToast();

    // State
    const [students, setStudents] = useState<any[]>([]);
    const [projects, setProjects] = useState<any[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [saving, setSaving] = useState(false);

    // Period State
    const [periodType, setPeriodType] = useState<'weekly' | 'monthly'>('weekly');
    const [selectedWeek, setSelectedWeek] = useState<Date>(getWeekStart(new Date()));

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [existingAssessment, setExistingAssessment] = useState<any>(null);
    const [loadingAssessment, setLoadingAssessment] = useState(false);

    // Skills Form State
    const [softSkillScores, setSoftSkillScores] = useState<Record<string, number>>({});
    const [softSkillEnabled, setSoftSkillEnabled] = useState<Record<string, boolean>>({});
    const [softSkillsAvg, setSoftSkillsAvg] = useState(0);

    const [devSkillScores, setDevSkillScores] = useState<Record<string, number>>({});
    const [devSkillEnabled, setDevSkillEnabled] = useState<Record<string, boolean>>({});
    const [devSkillsAvg, setDevSkillsAvg] = useState(0);

    const [overrideReason, setOverrideReason] = useState('');
    const [traitReasons, setTraitReasons] = useState<Record<string, string>>({});
    const [mentorReview, setMentorReview] = useState('');
    const [mentorImprovements, setMentorImprovements] = useState('');

    // Helper function to get Monday of the week
    function getWeekStart(date: Date): Date {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
        return new Date(d.setDate(diff));
    }

    // Helper function to get Sunday of the week
    function getWeekEnd(date: Date): Date {
        const weekStart = getWeekStart(date);
        return new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
    }

    // Format date for display
    function formatWeekRange(weekStart: Date): string {
        const weekEnd = getWeekEnd(weekStart);
        const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
        return `${weekStart.toLocaleDateString('en-US', options)} - ${weekEnd.toLocaleDateString('en-US', options)}`;
    }

    // Navigate weeks
    const goToPreviousWeek = () => {
        setSelectedWeek(new Date(selectedWeek.getTime() - 7 * 24 * 60 * 60 * 1000));
    };

    const goToNextWeek = () => {
        const nextWeek = new Date(selectedWeek.getTime() + 7 * 24 * 60 * 60 * 1000);
        const currentWeek = getWeekStart(new Date());
        if (nextWeek <= currentWeek) {
            setSelectedWeek(nextWeek);
        }
    };

    const goToCurrentWeek = () => {
        setSelectedWeek(getWeekStart(new Date()));
    };

    const isCurrentWeek = selectedWeek.getTime() === getWeekStart(new Date()).getTime();

    useEffect(() => {
        const fetchInitialData = async () => {
            setLoading(true);
            try {
                // Fetch projects first
                let pQuery = supabase.from('projects').select('*');
                if (userRole === 'manager' || userRole === 'team_lead') {
                    const { data: mps } = await supabase.from('project_members').select('project_id').eq('user_id', userId);
                    const pIds = mps?.map(p => p.project_id) || [];
                    pQuery = pQuery.in('id', pIds);
                }
                const { data: pData } = await pQuery;
                setProjects(pData || []);

                // Fetch students
                await fetchStudents(selectedProjectId);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };

        if (userId) fetchInitialData();
    }, [userId, userRole, selectedProjectId, selectedWeek, periodType]);

    const fetchStudents = async (projectIdFilter: string) => {
        try {
            let query = supabase
                .from('profiles')
                .select('*');

            let targetUserIds: string[] | null = null;

            if (projectIdFilter !== 'all') {
                const { data: projectMembers } = await supabase
                    .from('project_members')
                    .select('user_id')
                    .eq('project_id', projectIdFilter);
                targetUserIds = [...new Set(projectMembers?.map(m => m.user_id) || [])];

                if (targetUserIds.length === 0) {
                    setStudents([]);
                    return;
                }
            } else if (userRole === 'manager' || userRole === 'team_lead') {
                const { data: mentorProjects } = await supabase
                    .from('project_members')
                    .select('project_id')
                    .eq('user_id', userId);
                const pIds = mentorProjects?.map(p => p.project_id) || [];
                if (pIds.length === 0) {
                    setStudents([]);
                    return;
                }
                const { data: relatedMembers } = await supabase
                    .from('project_members')
                    .select('user_id')
                    .in('project_id', pIds);
                targetUserIds = [...new Set(relatedMembers?.map(m => m.user_id) || [])];
            }

            if (targetUserIds) {
                query = query.in('id', targetUserIds);
            }

            // Exclude executives and apply role filters
            if (userRole === 'manager' || userRole === 'team_lead') {
                query = query.eq('role', 'employee');
            } else {
                query = query.in('role', ['employee', 'manager', 'team_lead']);
            }

            const { data: profiles, error: pError } = await query;
            if (pError) throw pError;

            // Fetch assessments for this period to show self-rating status
            const startDate = new Date(selectedWeek);
            startDate.setHours(12, 0, 0, 0);
            const periodStartStr = startDate.toISOString().split('T')[0];
            const { data: assessments, error: aError } = await supabase
                .from('student_skills_assessments')
                .select('*')
                .eq('period_type', periodType)
                .eq('period_start', periodStartStr);

            if (aError) {
                console.error('Error fetching assessments:', aError);
            }

            const assessmentMap = assessments?.reduce((acc: any, curr: any) => {
                acc[curr.student_id] = curr;
                return acc;
            }, {}) || {};

            const studentsWithAssessments = (profiles || []).map((p: any) => ({
                ...p,
                assessment: assessmentMap[p.id] || null
            }));

            const sortedData = studentsWithAssessments.sort((a: any, b: any) =>
                (a.full_name || '').localeCompare(b.full_name || '')
            );

            setStudents(sortedData);
        } catch (error) {
            console.error('Error fetching students:', error);
            addToast('Failed to fetch students', 'error');
        }
    };

    const handleStudentClick = async (student: any) => {
        setSelectedStudent(student);
        setShowModal(true);
        setExistingAssessment(null);

        // Reset form
        const initialSoftScores: Record<string, number> = {};
        const initialSoftEnabled: Record<string, boolean> = {};
        SOFT_SKILL_TRAITS.forEach(t => {
            initialSoftScores[t] = 0;
            initialSoftEnabled[t] = true;
        });
        setSoftSkillScores(initialSoftScores);
        setSoftSkillEnabled(initialSoftEnabled);
        setSoftSkillsAvg(0);

        const initialDevScores: Record<string, number> = {};
        const initialDevEnabled: Record<string, boolean> = {};
        DEVELOPMENT_SKILL_TRAITS.forEach(t => {
            initialDevScores[t] = 0;
            initialDevEnabled[t] = true;
        });
        setDevSkillScores(initialDevScores);
        setDevSkillEnabled(initialDevEnabled);
        setDevSkillsAvg(0);

        // Fetch existing assessment for this period
        setLoadingAssessment(true);
        try {
            const startDate = new Date(selectedWeek);
            startDate.setHours(12, 0, 0, 0);
            const periodStart = startDate.toISOString().split('T')[0];

            const { data, error } = await supabase
                .from('student_skills_assessments')
                .select('*')
                .eq('student_id', student.id)
                .eq('period_type', periodType)
                .eq('period_start', periodStart)
                .maybeSingle();

            if (data && !error) {
                setExistingAssessment(data);

                // Process Soft Skills
                const savedSoftTraits = data.soft_skill_traits || {};
                const studentSoftTraits = data.self_soft_skill_traits || {};

                const newSoftScores = { ...initialSoftScores };
                const newSoftEnabled: Record<string, boolean> = {};

                SOFT_SKILL_TRAITS.forEach(t => {
                    // If Manager has graded, use Manager's score
                    if (savedSoftTraits[t] !== undefined && savedSoftTraits[t] !== null) {
                        newSoftScores[t] = savedSoftTraits[t];
                        newSoftEnabled[t] = true;
                    }
                    // If Manager hasn't graded but Student has, Pre-fill with Student's score (Review Mode)
                    else if (studentSoftTraits[t] !== undefined && studentSoftTraits[t] !== null) {
                        newSoftScores[t] = studentSoftTraits[t];
                        newSoftEnabled[t] = true;
                    }
                    else {
                        newSoftEnabled[t] = false;
                    }
                });
                setSoftSkillScores(newSoftScores);
                setSoftSkillEnabled(newSoftEnabled);

                // Recalculate average based on what we loaded
                let sTotal = 0; let sCount = 0;
                SOFT_SKILL_TRAITS.forEach(t => {
                    if (newSoftEnabled[t]) { sTotal += newSoftScores[t]; sCount++; }
                });
                setSoftSkillsAvg(sCount > 0 ? parseFloat((sTotal / sCount).toFixed(1)) : 0);


                // Process Dev Skills
                const savedDevTraits = data.development_skill_traits || {};
                const studentDevTraits = data.self_development_skill_traits || {};

                const newDevScores = { ...initialDevScores };
                const newDevEnabled: Record<string, boolean> = {};

                DEVELOPMENT_SKILL_TRAITS.forEach(t => {
                    if (savedDevTraits[t] !== undefined && savedDevTraits[t] !== null) {
                        newDevScores[t] = savedDevTraits[t];
                        newDevEnabled[t] = true;
                    }
                    else if (studentDevTraits[t] !== undefined && studentDevTraits[t] !== null) {
                        newDevScores[t] = studentDevTraits[t];
                        newDevEnabled[t] = true;
                    }
                    else {
                        newDevEnabled[t] = false;
                    }
                });
                setDevSkillScores(newDevScores);
                setDevSkillEnabled(newDevEnabled);

                // Recalculate average
                let dTotal = 0; let dCount = 0;
                DEVELOPMENT_SKILL_TRAITS.forEach(t => {
                    if (newDevEnabled[t]) { dTotal += newDevScores[t]; dCount++; }
                });
                setDevSkillsAvg(dCount > 0 ? parseFloat((dTotal / dCount).toFixed(1)) : 0);

                setOverrideReason(data.override_reason || '');

                // Parse per-trait reasons if available
                if (data.override_reason && data.override_reason.startsWith('{')) {
                    try {
                        const parsed = JSON.parse(data.override_reason);
                        if (parsed.traitReasons) {
                            setTraitReasons(parsed.traitReasons);
                        } else {
                            setTraitReasons({});
                        }
                    } catch (e) {
                        setTraitReasons({});
                    }
                } else {
                    setTraitReasons({});
                }

                // Load Mentor specific Review/Improvements if it's a mentor
                if (student.role !== 'employee') {
                    const softTraits = data.soft_skill_traits || {};
                    if (softTraits.__mentor_review) {
                        setMentorReview(softTraits.__mentor_review || '');
                        setMentorImprovements(softTraits.__mentor_improvements || '');
                    }
                    else if (data.override_reason) {
                        if (data.override_reason.startsWith('{')) {
                            try {
                                const parsed = JSON.parse(data.override_reason);
                                setMentorReview(parsed.review || '');
                                setMentorImprovements(parsed.improvements || '');
                            } catch (e) {
                                setMentorReview(data.override_reason);
                            }
                        } else {
                            setMentorReview(data.override_reason);
                        }
                    }
                }
            } else {
                setOverrideReason('');
                setTraitReasons({});
                setMentorReview('');
                setMentorImprovements('');
            }
        } catch (error) {
            // No existing assessment - that's fine
        } finally {
            setLoadingAssessment(false);
        }
    };

    const calculateSoftSkillsAvg = (scores: Record<string, number>, enabled: Record<string, boolean>) => {
        let total = 0;
        let count = 0;
        SOFT_SKILL_TRAITS.forEach(t => {
            if (enabled[t]) {
                total += (scores[t] || 0);
                count++;
            }
        });
        return count > 0 ? parseFloat((total / count).toFixed(1)) : 0;
    };

    const calculateDevSkillsAvg = (scores: Record<string, number>, enabled: Record<string, boolean>) => {
        let total = 0;
        let count = 0;
        DEVELOPMENT_SKILL_TRAITS.forEach(t => {
            if (enabled[t]) {
                total += (scores[t] || 0);
                count++;
            }
        });
        return count > 0 ? parseFloat((total / count).toFixed(1)) : 0;
    };

    const toggleSoftSkill = (trait: string) => {
        const newEnabled = { ...softSkillEnabled, [trait]: !softSkillEnabled[trait] };
        setSoftSkillEnabled(newEnabled);
        setSoftSkillsAvg(calculateSoftSkillsAvg(softSkillScores, newEnabled));
    };

    const toggleDevSkill = (trait: string) => {
        const newEnabled = { ...devSkillEnabled, [trait]: !devSkillEnabled[trait] };
        setDevSkillEnabled(newEnabled);
        setDevSkillsAvg(calculateDevSkillsAvg(devSkillScores, newEnabled));
    };

    const handleSoftSkillChange = (trait: string, value: number) => {
        const newScores = { ...softSkillScores, [trait]: value };
        setSoftSkillScores(newScores);
        setSoftSkillsAvg(calculateSoftSkillsAvg(newScores, softSkillEnabled));
    };

    const handleDevSkillChange = (trait: string, value: number) => {
        const newScores = { ...devSkillScores, [trait]: value };
        setDevSkillScores(newScores);
        setDevSkillsAvg(calculateDevSkillsAvg(newScores, devSkillEnabled));
    };

    const handleSaveAssessment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStudent || !userId) return;

        setSaving(true);
        try {
            const startDate = new Date(selectedWeek);
            startDate.setHours(12, 0, 0, 0);
            const periodStart = startDate.toISOString().split('T')[0];

            const endDate = getWeekEnd(selectedWeek);
            endDate.setHours(12, 0, 0, 0);
            const periodEnd = endDate.toISOString().split('T')[0];

            // Prepare traits (only store checked ones)
            const softTraitsToSave: Record<string, number | null> = {};
            SOFT_SKILL_TRAITS.forEach(t => {
                softTraitsToSave[t] = softSkillEnabled[t] ? softSkillScores[t] : null;
            });

            const devTraitsToSave: Record<string, number | null> = {};
            DEVELOPMENT_SKILL_TRAITS.forEach(t => {
                devTraitsToSave[t] = devSkillEnabled[t] ? devSkillScores[t] : null;
            });

            // Prepare the clean payload
            const payload: any = {
                student_id: selectedStudent.id,
                reviewer_id: userId,
                reviewer_role: (['executive', 'manager', 'team_lead', 'employee'].includes(userRole) ? userRole : 'executive'),
                period_type: periodType,
                period_start: periodStart,
                period_end: periodEnd,
                soft_skill_traits: selectedStudent.role !== 'employee'
                    ? { __mentor_review: mentorReview, __mentor_improvements: mentorImprovements }
                    : softTraitsToSave,
                soft_skills_score: softSkillsAvg,
                development_skill_traits: devTraitsToSave,
                development_skills_score: devSkillsAvg,
                override_reason: JSON.stringify({
                    traitReasons: traitReasons,
                    mentorReview: mentorReview, // for legacy parity
                    mentorImprovements: mentorImprovements
                }),
                updated_at: new Date().toISOString()
            };

            // If we have an existing assessment, preserve the self-assessment fields
            if (existingAssessment) {
                payload.self_soft_skill_traits = existingAssessment.self_soft_skill_traits;
                payload.self_soft_skills_score = existingAssessment.self_soft_skills_score;
                payload.self_development_skill_traits = existingAssessment.self_development_skill_traits;
                payload.self_development_skills_score = existingAssessment.self_development_skills_score;
            }

            const { data, error } = await supabase
                .from('student_skills_assessments')
                .upsert(payload, {
                    onConflict: 'student_id,period_type,period_start'
                })
                .select()
                .single();

            if (error) throw error;

            addToast('Skills assessment saved successfully', 'success');
            setExistingAssessment(data);

        } catch (error: any) {
            console.error('Error saving skills assessment:', error);
            const errorMsg = error.message || error.details || 'Unknown database error';
            addToast(`Failed to save: ${errorMsg}`, 'error');
        } finally {
            setSaving(false);
        }
    };

    const filteredStudents = students.filter(s =>
        (s.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.email || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getRoleLabel = (role: string) => {
        switch (role) {
            case 'employee': return 'Student';
            case 'manager': return 'Mentor';
            case 'executive': return 'Tutor';
            case 'team_lead': return 'Team Lead';
            default: return role;
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] p-6 lg:p-8" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Header Area */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '4px' }}>Student Review</h1>
                    <p style={{ color: '#64748b' }}>Assess student skills on a weekly or monthly basis</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    {/* Period Type Toggle */}
                    <div style={{
                        display: 'flex',
                        backgroundColor: '#f1f5f9',
                        borderRadius: '12px',
                        padding: '4px'
                    }}>
                        <button
                            onClick={() => setPeriodType('weekly')}
                            style={{
                                padding: '8px 20px',
                                borderRadius: '8px',
                                border: 'none',
                                backgroundColor: periodType === 'weekly' ? '#8b5cf6' : 'transparent',
                                color: periodType === 'weekly' ? 'white' : '#64748b',
                                fontWeight: '600',
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            Weekly
                        </button>
                        <button
                            onClick={() => setPeriodType('monthly')}
                            style={{
                                padding: '8px 20px',
                                borderRadius: '8px',
                                border: 'none',
                                backgroundColor: periodType === 'monthly' ? '#8b5cf6' : 'transparent',
                                color: periodType === 'monthly' ? 'white' : '#64748b',
                                fontWeight: '600',
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            Monthly
                        </button>
                    </div>

                    {/* Week Navigator */}
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
                            onClick={goToPreviousWeek}
                            style={{
                                padding: '6px',
                                borderRadius: '6px',
                                border: 'none',
                                backgroundColor: 'transparent',
                                cursor: 'pointer'
                            }}
                        >
                            <ChevronLeft size={18} color="#64748b" />
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Calendar size={16} color="#8b5cf6" />
                            <span style={{ fontWeight: '600', fontSize: '0.9rem', color: '#1e293b', minWidth: '140px', textAlign: 'center' }}>
                                {formatWeekRange(selectedWeek)}
                            </span>
                        </div>
                        <button
                            onClick={goToNextWeek}
                            disabled={isCurrentWeek}
                            style={{
                                padding: '6px',
                                borderRadius: '6px',
                                border: 'none',
                                backgroundColor: 'transparent',
                                cursor: isCurrentWeek ? 'not-allowed' : 'pointer',
                                opacity: isCurrentWeek ? 0.3 : 1
                            }}
                        >
                            <ChevronRight size={18} color="#64748b" />
                        </button>
                        {!isCurrentWeek && (
                            <button
                                onClick={goToCurrentWeek}
                                style={{
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    backgroundColor: '#8b5cf6',
                                    color: 'white',
                                    fontSize: '0.75rem',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}
                            >
                                Today
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Filters Row */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
                {/* Search */}
                <div style={{ position: 'relative', flex: 1, minWidth: '300px' }}>
                    <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                        type="text"
                        placeholder="Search students..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '10px 16px 10px 40px',
                            borderRadius: '12px',
                            border: '1px solid #e2e8f0',
                            backgroundColor: '#fff',
                            outline: 'none',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                        }}
                    />
                </div>

                {/* Project Filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Filter size={18} color="#64748b" />
                    <select
                        value={selectedProjectId}
                        onChange={(e) => setSelectedProjectId(e.target.value)}
                        style={{
                            padding: '10px 16px', borderRadius: '12px',
                            border: '1px solid #e2e8f0', backgroundColor: 'white',
                            fontSize: '0.9rem', color: '#1e293b', fontWeight: '600',
                            cursor: 'pointer', outline: 'none'
                        }}
                    >
                        <option value="all">All Projects</option>
                        {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Main Content: Student List */}
            <div style={{ flex: 1 }}>
                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="animate-spin text-purple-500" size={32} />
                    </div>
                ) : (
                    <>
                        {userRole === 'executive' ? (
                            <div className="space-y-12">
                                {/* Mentors Section */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '8px', borderBottom: '2px solid #e2e8f0' }}>
                                        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1e293b' }}>
                                            Mentors <span style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 'normal' }}>({filteredStudents.filter(u => u.role !== 'employee').length})</span>
                                        </h2>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        {filteredStudents.filter(u => u.role !== 'employee').length === 0 ? (
                                            <div className="text-center py-6 text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">No mentors found</div>
                                        ) : (
                                            filteredStudents.filter(u => u.role !== 'employee').map((student, index) => (
                                                <StudentCard key={student.id} student={student} index={index} handleStudentClick={handleStudentClick} getRoleLabel={getRoleLabel} />
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* Students Section */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '8px', borderBottom: '2px solid #e2e8f0' }}>
                                        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1e293b' }}>
                                            Students <span style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 'normal' }}>({filteredStudents.filter(u => u.role === 'employee').length})</span>
                                        </h2>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        {filteredStudents.filter(u => u.role === 'employee').length === 0 ? (
                                            <div className="text-center py-6 text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">No students found</div>
                                        ) : (
                                            filteredStudents.filter(u => u.role === 'employee').map((student, index) => (
                                                <StudentCard key={student.id} student={student} index={index} handleStudentClick={handleStudentClick} getRoleLabel={getRoleLabel} />
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                    <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1e293b' }}>
                                        My Team Members <span style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 'normal' }}>({filteredStudents.length})</span>
                                    </h2>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    {filteredStudents.length === 0 ? (
                                        <div className="text-center py-12 text-gray-400">No members found for this project</div>
                                    ) : (
                                        filteredStudents.map((student, index) => (
                                            <StudentCard key={student.id} student={student} index={index} handleStudentClick={handleStudentClick} getRoleLabel={getRoleLabel} />
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Modal for Skills Assessment */}
            {showModal && selectedStudent && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 1000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '20px',
                    backdropFilter: 'blur(2px)'
                }}>
                    <div
                        className="bg-white rounded-[24px] w-full max-w-[95%] lg:max-w-[700px] max-h-[92vh] flex flex-col overflow-hidden shadow-2xl"
                    >
                        <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'flex-start', gap: '20px', backgroundColor: '#ffffff' }}>
                            <div style={{
                                width: '56px', height: '56px', borderRadius: '50%',
                                backgroundColor: '#f3e8ff', color: '#8b5cf6',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: 'bold', fontSize: '1.5rem', flexShrink: 0,
                                border: '2px solid #e2e8f0'
                            }}>
                                {selectedStudent.full_name?.charAt(0) || 'S'}
                            </div>

                            <div style={{ flex: 1, paddingRight: '16px' }}>
                                <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#000000', margin: '0 0 6px 0', lineHeight: '1.2' }}>
                                    {selectedStudent.full_name}
                                </h2>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '500' }}>Skills Assessment</span>
                                    <span style={{ color: '#cbd5e1' }}>•</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Calendar size={14} color="#8b5cf6" />
                                        <span style={{ color: '#8b5cf6', fontSize: '0.9rem', fontWeight: '600' }}>
                                            {formatWeekRange(selectedWeek)}
                                        </span>
                                    </div>
                                    {existingAssessment && (
                                        <span style={{ fontSize: '0.75rem', backgroundColor: '#10b981', color: 'white', padding: '2px 8px', borderRadius: '4px', marginLeft: '4px', fontWeight: '600' }}>
                                            Saved
                                        </span>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                style={{
                                    padding: '8px',
                                    borderRadius: '50%',
                                    border: '1px solid #e2e8f0',
                                    cursor: 'pointer',
                                    backgroundColor: 'white',
                                    color: '#64748b',
                                    transition: 'all 0.2s',
                                    alignSelf: 'flex-start'
                                }}
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                            {loadingAssessment ? (
                                <div className="flex justify-center py-12">
                                    <Loader2 className="animate-spin text-purple-500" size={32} />
                                </div>
                            ) : (
                                <form onSubmit={handleSaveAssessment}>
                                    {selectedStudent.role !== 'employee' ? (
                                        <div className="space-y-6 mb-8">
                                            <div>
                                                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', fontSize: '1rem', color: '#1e293b' }}>Detailed Review</label>
                                                <textarea
                                                    style={{
                                                        width: '100%', padding: '16px', borderRadius: '12px',
                                                        border: '1px solid #e2e8f0', minHeight: '120px',
                                                        fontSize: '0.95rem', outline: 'none'
                                                    }}
                                                    placeholder="Enter your detailed review..."
                                                    value={mentorReview}
                                                    onChange={(e) => setMentorReview(e.target.value)}
                                                />
                                            </div>

                                            <div>
                                                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', fontSize: '1rem', color: '#1e293b' }}>Areas for Improvement</label>
                                                <textarea
                                                    style={{
                                                        width: '100%', padding: '16px', borderRadius: '12px',
                                                        border: '1px solid #e2e8f0', minHeight: '120px',
                                                        fontSize: '0.95rem', outline: 'none'
                                                    }}
                                                    placeholder="What should they focus on improving?"
                                                    value={mentorImprovements}
                                                    onChange={(e) => setMentorImprovements(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="mb-8">
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                                    <label style={{ fontWeight: 'bold', fontSize: '1rem', color: '#1e293b' }}>Soft Skills (0-10)</label>
                                                    <div style={{ padding: '6px 16px', borderRadius: '10px', backgroundColor: '#8b5cf6', color: 'white', fontWeight: 'bold', fontSize: '0.95rem' }}>
                                                        Avg: {softSkillsAvg}
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                                    {SOFT_SKILL_TRAITS.map(trait => {
                                                        const studentScore = existingAssessment?.self_soft_skill_traits?.[trait];
                                                        const mentorScore = softSkillScores[trait] || 0;

                                                        return (
                                                            <div key={trait} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', opacity: softSkillEnabled[trait] ? 1 : 0.6 }}>
                                                                    <input type="checkbox" checked={softSkillEnabled[trait]} onChange={() => toggleSoftSkill(trait)} style={{ accentColor: '#8b5cf6' }} />
                                                                    <div style={{ flex: 1 }}>
                                                                        <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#475569' }}>{trait}</div>
                                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                                            {studentScore !== undefined && studentScore !== null && (
                                                                                <span style={{ fontSize: '11px', color: '#94a3b8' }}>Student's Self Rating: <b>{studentScore}</b></span>
                                                                            )}
                                                                            {userRole === 'executive' && existingAssessment?.reviewer_role === 'manager' && existingAssessment.soft_skill_traits?.[trait] !== undefined && (
                                                                                <span style={{ fontSize: '11px', color: '#8b5cf6' }}>Mentor's Rating: <b>{existingAssessment.soft_skill_traits[trait]}</b></span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{userRole === 'executive' ? 'Tutor:' : 'Mentor:'}</span>
                                                                        <input
                                                                            type="number" min="0" max="10" step="0.5"
                                                                            disabled={!softSkillEnabled[trait]}
                                                                            value={mentorScore}
                                                                            onChange={(e) => handleSoftSkillChange(trait, parseFloat(e.target.value) || 0)}
                                                                            style={{ width: '60px', padding: '6px', border: '1px solid #e2e8f0', borderRadius: '8px', textAlign: 'center', fontWeight: 'bold', color: '#8b5cf6' }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                                {softSkillEnabled[trait] && (
                                                                    <div style={{ marginTop: '8px', paddingLeft: '26px' }}>
                                                                        <input
                                                                            type="text"
                                                                            placeholder="Reason..."
                                                                            value={traitReasons[trait] || ''}
                                                                            onChange={(e) => setTraitReasons({ ...traitReasons, [trait]: e.target.value })}
                                                                            style={{
                                                                                width: '100%', padding: '8px 12px', fontSize: '0.85rem',
                                                                                borderRadius: '8px', border: '1px solid #fed7aa',
                                                                                backgroundColor: '#fffbeb', color: '#9a3412', outline: 'none'
                                                                            }}
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            <div className="mb-8">
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                                    <label style={{ fontWeight: 'bold', fontSize: '1rem', color: '#1e293b' }}>Development Skills (0-10)</label>
                                                    <div style={{ padding: '6px 16px', borderRadius: '10px', backgroundColor: '#10b981', color: 'white', fontWeight: 'bold', fontSize: '0.95rem' }}>
                                                        Avg: {devSkillsAvg}
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                                    {DEVELOPMENT_SKILL_TRAITS.map(trait => {
                                                        const studentScore = existingAssessment?.self_development_skill_traits?.[trait];
                                                        const mentorScore = devSkillScores[trait] || 0;

                                                        return (
                                                            <div key={trait} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', opacity: devSkillEnabled[trait] ? 1 : 0.6 }}>
                                                                    <input type="checkbox" checked={devSkillEnabled[trait]} onChange={() => toggleDevSkill(trait)} style={{ accentColor: '#10b981' }} />
                                                                    <div style={{ flex: 1 }}>
                                                                        <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#475569' }}>{trait}</div>
                                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                                            {studentScore !== undefined && studentScore !== null && (
                                                                                <span style={{ fontSize: '11px', color: '#94a3b8' }}>Student's Self Rating: <b>{studentScore}</b></span>
                                                                            )}
                                                                            {userRole === 'executive' && existingAssessment?.reviewer_role === 'manager' && existingAssessment.development_skill_traits?.[trait] !== undefined && (
                                                                                <span style={{ fontSize: '11px', color: '#10b981' }}>Mentor's Rating: <b>{existingAssessment.development_skill_traits[trait]}</b></span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{userRole === 'executive' ? 'Tutor:' : 'Mentor:'}</span>
                                                                        <input
                                                                            type="number" min="0" max="10" step="0.5"
                                                                            disabled={!devSkillEnabled[trait]}
                                                                            value={mentorScore}
                                                                            onChange={(e) => handleDevSkillChange(trait, parseFloat(e.target.value) || 0)}
                                                                            style={{ width: '60px', padding: '6px', border: '1px solid #e2e8f0', borderRadius: '8px', textAlign: 'center', fontWeight: 'bold', color: '#10b981' }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                                {devSkillEnabled[trait] && (
                                                                    <div style={{ marginTop: '8px', paddingLeft: '26px' }}>
                                                                        <input
                                                                            type="text"
                                                                            placeholder="Reason..."
                                                                            value={traitReasons[trait] || ''}
                                                                            onChange={(e) => setTraitReasons({ ...traitReasons, [trait]: e.target.value })}
                                                                            style={{
                                                                                width: '100%', padding: '8px 12px', fontSize: '0.85rem',
                                                                                borderRadius: '8px', border: '1px solid #d1fae5',
                                                                                backgroundColor: '#f0fdf4', color: '#065f46', outline: 'none'
                                                                            }}
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={saving}
                                        style={{
                                            padding: "14px 24px", backgroundColor: "#8b5cf6", color: "#fff",
                                            borderRadius: "12px", fontWeight: "bold", border: "none",
                                            cursor: "pointer", width: "100%", fontSize: "1rem", marginTop: "24px"
                                        }}
                                    >
                                        {saving ? "Saving..." : "Save Skills Assessment"}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentReviewPage;