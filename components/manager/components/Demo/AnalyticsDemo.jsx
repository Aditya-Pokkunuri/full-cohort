import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
    BarChart2,
    TrendingUp,
    Users,
    Award,
    Briefcase,
    Clock,
    CheckCircle,
    ChevronLeft,
    PieChart,
    Activity
} from 'lucide-react';
import { supabase } from '../../../../lib/supabaseClient';

const AnalyticsDemo = ({ currentProject, projectRole, userId, hideHeader = false }) => {
    const [loading, setLoading] = useState(true);
    const [performanceData, setPerformanceData] = useState({
        stats: [],
        dailyProgress: [],
        lifecycleDistribution: [],
        memberPerformance: [],
        projectInfo: null
    });

    useEffect(() => {
        const fetchDeepAnalytics = async () => {
            try {
                setLoading(true);
                const todayStr = new Date().toISOString().split('T')[0];

                // 1. Fetch Employees
                let employeesQuery = supabase.from('profiles').select('id, full_name, email, role');
                if (currentProject?.id) {
                    const { data: members } = await supabase.from('project_members').select('user_id').eq('project_id', currentProject.id);
                    if (members) employeesQuery = employeesQuery.in('id', members.map(m => m.user_id));
                }
                const { data: employees } = await employeesQuery;

                // 2. Fetch Tasks
                let tasksQuery = supabase.from('tasks').select('*');
                if (currentProject?.id) tasksQuery = tasksQuery.eq('project_id', currentProject.id);
                const { data: tasks } = await tasksQuery;

                // 3. Process Stats
                const totalEmployees = employees?.length || 0;
                const totalTasks = tasks?.length || 0;
                const completedTasks = tasks?.filter(t => ['completed', 'done'].includes(t.status?.toLowerCase()) || t.lifecycle_state === 'closed').length || 0;
                const activeTasks = tasks?.filter(t => !['completed', 'done', 'closed'].includes(t.status?.toLowerCase()) && t.lifecycle_state !== 'closed').length || 0;
                const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

                // 4. Daily Progress (Last 7 Days)
                const last7Days = [];
                for (let i = 5; i >= 0; i--) {
                    const d = new Date();
                    d.setDate(d.getDate() - i);
                    const dayName = d.toLocaleString('default', { weekday: 'short' });
                    const dateStr = d.toISOString().split('T')[0];

                    const count = tasks?.filter(t => {
                        if (!t.updated_at && !t.created_at) return false;
                        const tDate = new Date(t.updated_at || t.created_at).toISOString().split('T')[0];
                        return (['completed', 'done'].includes(t.status?.toLowerCase()) || t.lifecycle_state === 'closed') &&
                            tDate === dateStr;
                    }).length || 0;

                    last7Days.push({ name: dayName, value: count });
                }

                // 5. Lifecycle Distribution
                const lifecyclePhases = ['requirement_refiner', 'design_guidance', 'build_guidance', 'acceptance_criteria', 'deployment', 'closed'];
                const distribution = lifecyclePhases.map(phase => {
                    const count = tasks?.filter(t => t.lifecycle_state === phase).length || 0;
                    return {
                        phase: phase.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                        count,
                        percentage: totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0
                    };
                });

                // 6. Member Performance Leaderboard
                const members = employees?.map(emp => {
                    const empTasks = tasks?.filter(t => t.assigned_to === emp.id) || [];
                    const mCompleted = empTasks.filter(t => ['completed', 'done'].includes(t.status?.toLowerCase()) || t.lifecycle_state === 'closed').length;
                    const mTotal = empTasks.length;
                    const mRate = mTotal > 0 ? Math.round((mCompleted / mTotal) * 100) : 0;

                    return {
                        name: emp.full_name,
                        role: emp.role === 'employee' ? 'Student' : emp.role,
                        completion: mRate,
                        tasks: mTotal,
                        completed: mCompleted,
                        status: mRate > 80 ? 'Top Performer' : mRate > 50 ? 'Steady' : 'Needs Improvement'
                    };
                }).sort((a, b) => b.completion - a.completion) || [];

                const getHealthStatus = (rate) => {
                    if (rate >= 90) return { status: 'Elite', color: '#8b5cf6', bgColor: '#ede9fe' };
                    if (rate >= 70) return { status: 'Excellent', color: '#10b981', bgColor: '#d1fae5' };
                    if (rate >= 50) return { status: 'Stable', color: '#3b82f6', bgColor: '#dbeafe' };
                    if (rate >= 30) return { status: 'At Risk', color: '#f59e0b', bgColor: '#fef3c7' };
                    return { status: 'Critical', color: '#ef4444', bgColor: '#fee2e2' };
                };
                const health = getHealthStatus(completionRate);

                setPerformanceData({
                    stats: [
                        { label: 'Completion Rate', value: `${completionRate}%`, icon: Award, color: '#f59e0b', bgColor: '#fef3c7' },
                        { label: 'Total Headcount', value: totalEmployees, icon: Users, color: '#3b82f6', bgColor: '#dbeafe' },
                        { label: 'Active Tasks', value: activeTasks, icon: Activity, color: '#8b5cf6', bgColor: '#ede9fe' },
                        { label: 'Project Health', value: health.status, icon: TrendingUp, color: health.color, bgColor: health.bgColor },
                    ],
                    dailyProgress: last7Days,
                    lifecycleDistribution: distribution,
                    memberPerformance: members,
                    projectInfo: currentProject
                });

            } catch (error) {
                console.error('Error fetching deep analytics:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchDeepAnalytics();
    }, [currentProject?.id]);

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ width: '40px', height: '40px', border: '4px solid #f3f4f6', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }}></div>
                <p style={{ color: '#64748b', fontWeight: 500 }}>Gathering intelligence...</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', animation: 'fadeIn 0.5s ease-out' }}>
            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .chart-bar:hover { filter: brightness(1.1); transform: scaleX(1.05); }
                .chart-tooltip { 
                    opacity: 0; 
                    transition: all 0.2s ease; 
                    pointer-events: none;
                }
                .chart-bar-container:hover .chart-tooltip { 
                    opacity: 1; 
                    transform: translateX(-50%) translateY(-5px); 
                }
            `}</style>

            {/* Header */}
            {!hideHeader && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
                            Performance Intelligence
                        </h2>
                        <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
                            {performanceData.projectInfo ? performanceData.projectInfo.name : 'Organization Overview'} • Real-time metrics
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <div style={{ padding: '8px 16px', backgroundColor: '#f1f5f9', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>
                            Last updated: Just now
                        </div>
                    </div>
                </div>
            )}

            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                {performanceData.stats.map((stat, i) => (
                    <div key={i} style={{ backgroundColor: 'white', padding: '24px', borderRadius: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: stat.bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <stat.icon size={22} color={stat.color} />
                        </div>
                        <div>
                            <p style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.025em', marginBottom: '4px' }}>{stat.label}</p>
                            <h3 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>{stat.value}</h3>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Charts Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px' }}>
                {/* Daily Trends */}
                <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>Daily Tasks Completed</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontSize: '0.85rem', fontWeight: 600 }}>
                            <TrendingUp size={16} /> Activity last 6 days
                        </div>
                    </div>
                    <div style={{ height: '240px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', paddingBottom: '24px', position: 'relative' }}>
                        {/* Horizontal Grid Lines */}
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: '60px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', zIndex: 0 }}>
                            {[1, 2, 3].map(i => <div key={i} style={{ borderBottom: '1px dashed #f1f5f9', width: '100%' }}></div>)}
                        </div>

                        {performanceData.dailyProgress.map((data, i) => {
                            const maxVal = Math.max(...performanceData.dailyProgress.map(d => d.value), 5);
                            const height = (data.value / maxVal) * 100;
                            return (
                                <div key={i} style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', zIndex: 1 }}>
                                    <div className="chart-bar-container" style={{ position: 'relative', width: '32px', flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', marginBottom: '16px', cursor: 'pointer' }}>
                                        <div
                                            className="chart-bar"
                                            style={{
                                                width: '100%',
                                                height: `${Math.max(height, 5)}%`,
                                                backgroundColor: '#3b82f6',
                                                borderRadius: '8px 8px 0 0',
                                                background: 'linear-gradient(to top, #3b82f6, #60a5fa)',
                                                transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                                            }}
                                        >
                                            {data.value > 0 && (
                                                <div className="chart-tooltip" style={{ position: 'absolute', top: '-28px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#0f172a', color: 'white', fontSize: '0.7rem', padding: '4px 8px', borderRadius: '6px', fontWeight: 700, whiteSpace: 'nowrap', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', zIndex: 10 }}>
                                                    {data.value} tasks
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>{data.name}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Lifecycle Distribution */}
                <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '32px' }}>Workflow Stages</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {performanceData.lifecycleDistribution.map((item, i) => (
                            <div key={i}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>{item.phase}</span>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>{item.count}</span>
                                </div>
                                <div style={{ width: '100%', height: '8px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{
                                        width: `${item.percentage}%`,
                                        height: '100%',
                                        background: [
                                            'linear-gradient(to right, #ef4444, #f87171)',
                                            'linear-gradient(to right, #f59e0b, #fbbf24)',
                                            'linear-gradient(to right, #3b82f6, #60a5fa)',
                                            'linear-gradient(to right, #8b5cf6, #a78bfa)',
                                            'linear-gradient(to right, #06b6d4, #22d3ee)',
                                            'linear-gradient(to right, #10b981, #34d399)'
                                        ][i % 6],
                                        borderRadius: '4px',
                                        transition: 'width 1s ease-in-out'
                                    }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Individual Performance Leaderboard */}
            <div style={{ backgroundColor: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
                <div style={{ padding: '24px 32px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>Performance Leaderboard</h3>
                    <div style={{ color: '#64748b', fontSize: '0.85rem' }}>
                        Showing {performanceData.memberPerformance.length} members
                    </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f8fafc', textAlign: 'left' }}>
                                <th style={{ padding: '16px 32px', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Member</th>
                                <th style={{ padding: '16px 32px', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Progress</th>
                                <th style={{ padding: '16px 32px', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Completed</th>
                                <th style={{ padding: '16px 32px', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {performanceData.memberPerformance.map((member, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }}>
                                    <td style={{ padding: '20px 32px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#eff6ff', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem' }}>
                                                {member.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.95rem' }}>{member.name}</p>
                                                <p style={{ fontSize: '0.75rem', color: '#64748b' }}>{member.role}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '20px 32px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ flex: 1, minWidth: '100px', height: '8px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                                                <div style={{
                                                    width: `${member.completion}%`,
                                                    height: '100%',
                                                    backgroundColor: member.completion > 80 ? '#10b981' : member.completion > 50 ? '#f59e0b' : '#ef4444',
                                                    borderRadius: '4px'
                                                }}></div>
                                            </div>
                                            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>{member.completion}%</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '20px 32px' }}>
                                        <div style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: 600 }}>
                                            {member.completed} <span style={{ color: '#94a3b8', fontWeight: 400 }}>/ {member.tasks} tasks</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '20px 32px' }}>
                                        <span style={{
                                            padding: '6px 12px',
                                            borderRadius: '8px',
                                            fontSize: '0.75rem',
                                            fontWeight: 700,
                                            backgroundColor: member.status === 'Top Performer' ? '#d1fae5' : member.status === 'Steady' ? '#fef3c7' : '#fee2e2',
                                            color: member.status === 'Top Performer' ? '#065f46' : member.status === 'Steady' ? '#92400e' : '#991b1b'
                                        }}>
                                            {member.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {performanceData.memberPerformance.length === 0 && (
                                <tr>
                                    <td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontStyle: 'italic' }}>
                                        No performance data recorded for this cycle.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsDemo;

