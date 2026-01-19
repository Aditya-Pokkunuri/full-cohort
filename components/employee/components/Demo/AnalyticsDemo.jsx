import React, { useState, useEffect } from 'react';
import { useUser } from '../../context/UserContext';
import { TrendingUp, Award, Briefcase, Star } from 'lucide-react';
import { supabase } from '../../../../lib/supabaseClient';
import { useToast } from '../../context/ToastContext';

const AnalyticsDemo = () => {
    const { userName } = useUser();
    const { addToast } = useToast();
    const [loading, setLoading] = useState(true);

    const [myStats, setMyStats] = useState({
        performance: 0,
        tasksCompleted: 0,
        activeTasks: 0,
        attendance: '0%'
    });

    const [performanceHistory, setPerformanceHistory] = useState([]);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Fetch Tasks
            const { data: tasks, error: tasksError } = await supabase
                .from('tasks')
                .select('*')
                .eq('assigned_to', user.id);

            if (tasksError) throw tasksError;

            // 2. Fetch Attendance
            const { data: attendance, error: attendanceError } = await supabase
                .from('attendance')
                .select('*')
                .eq('employee_id', user.id);

            if (attendanceError) throw attendanceError;

            // --- Calculate Stats ---

            // Tasks Stats
            const totalTasks = tasks.length;
            const completedTasks = tasks.filter(t => t.status === 'completed').length;
            const activeTasks = tasks.filter(t => t.status === 'in progress' || t.status === 'pending').length;

            const performanceRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

            // Attendance Stats
            const totalAttendanceDays = attendance.length;
            const presentDays = attendance.filter(a => a.status === 'Present').length;
            const attendanceRate = totalAttendanceDays > 0 ? Math.round((presentDays / totalAttendanceDays) * 100) : 0;

            setMyStats({
                performance: performanceRate,
                tasksCompleted: completedTasks,
                activeTasks: activeTasks,
                attendance: `${attendanceRate}%`
            });

            // --- Calculate History (Last 7 Days) ---
            // Group completed tasks by day
            const last7Days = [];
            for (let i = 6; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const dayName = d.toLocaleString('default', { weekday: 'short' });
                const dateStr = d.toISOString().split('T')[0];

                // Count completed tasks for this day
                const count = tasks.filter(t => {
                    const tDate = new Date(t.created_at || t.due_date);
                    const tDateStr = tDate.toISOString().split('T')[0];
                    return t.status === 'completed' && tDateStr === dateStr;
                }).length;

                last7Days.push({ month: dayName, score: count });
            }
            setPerformanceHistory(last7Days);

        } catch (error) {
            console.error('Error fetching analytics:', error);
            addToast('Failed to load analytics', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                    My Analytics
                </h2>
            </div>

            {/* Top Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--spacing-lg)' }}>
                {[
                    { label: 'Task Completion Rate', value: `${myStats.performance}%`, change: '+2.5%', icon: Award, color: '#f59e0b' },
                    { label: 'Tasks Completed', value: myStats.tasksCompleted, change: '+5', icon: Briefcase, color: '#3b82f6' },
                    { label: 'Active Tasks', value: myStats.activeTasks, change: '-1', icon: Star, color: '#8b5cf6' },
                    { label: 'Attendance Rate', value: myStats.attendance, change: 'Stable', icon: TrendingUp, color: '#10b981' },
                ].map((stat, i) => (
                    <div key={i} style={{ backgroundColor: 'var(--surface)', padding: 'var(--spacing-lg)', borderRadius: '16px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 'var(--spacing-md)' }}>
                            <div style={{ padding: '10px', borderRadius: '12px', backgroundColor: stat.color + '20', color: stat.color }}>
                                <stat.icon size={20} />
                            </div>
                            {/* <span style={{ fontSize: '0.875rem', color: 'var(--success)', fontWeight: 600 }}>
                                {stat.change}
                            </span> */}
                        </div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500 }}>{stat.label}</p>
                        <h3 style={{
                            fontSize: '1.8rem',
                            fontWeight: '700',
                            marginTop: '8px',
                            color: 'var(--text-primary)',
                            fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                            letterSpacing: '-0.02em'
                        }}>
                            {stat.value}
                        </h3>
                    </div>
                ))}
            </div>

            {/* Performance History Chart */}
            <div style={{ backgroundColor: 'var(--surface)', borderRadius: '16px', boxShadow: 'var(--shadow-sm)', padding: 'var(--spacing-lg)', border: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '24px', color: 'var(--text-primary)' }}>Tasks Completed (Last 7 Days)</h3>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '200px', paddingBottom: '20px', borderBottom: '1px solid var(--border)' }}>
                    {performanceHistory.map((item, i) => (
                        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flex: 1 }}>
                            <div
                                title={`${item.score} tasks`}
                                style={{
                                    width: '40px',
                                    height: `${Math.max(item.score * 10, 4)}px`, // Scale height, min 4px
                                    maxHeight: '150px',
                                    backgroundColor: '#3b82f6',
                                    borderRadius: '8px 8px 0 0',
                                    opacity: 0.8,
                                    transition: 'height 0.3s'
                                }}></div>
                            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{item.month}</span>
                        </div>
                    ))}
                </div>
            </div>



        </div>
    );
};

export default AnalyticsDemo;
