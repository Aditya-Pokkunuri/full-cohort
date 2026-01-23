import { supabase } from '../../lib/supabaseClient';

export interface RankingData {
    student_id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
    soft_score: number;
    dev_score: number;
    overall_score: number;
}

export const getOrganizationRankings = async (
    periodStart: string,
    periodType: 'weekly' | 'monthly' = 'weekly',
    orgId?: string | null
): Promise<RankingData[]> => {
    try {
        // 1. Fetch all assessments for this period
        let query = supabase
            .from('student_skills_assessments')
            .select(`
                student_id,
                soft_skills_score,
                development_skills_score,
                profiles:student_id (
                    full_name,
                    email,
                    avatar_url,
                    role,
                    org_id
                )
            `)
            .eq('period_start', periodStart)
            .eq('period_type', periodType);

        const { data: assessments, error: assessmentError } = await query;

        if (assessmentError) throw assessmentError;
        if (!assessments) return [];

        // 2. Group by student and average scores
        const studentMap: Record<string, { soft_total: number; dev_total: number; count: number; profile: any }> = {};

        assessments.forEach((a: any) => {
            const profile = Array.isArray(a.profiles) ? a.profiles[0] : a.profiles;
            if (profile?.role !== 'employee') return;

            // Filter by orgId if provided
            if (orgId && profile?.org_id !== orgId) return;

            if (!studentMap[a.student_id]) {
                studentMap[a.student_id] = {
                    soft_total: 0,
                    dev_total: 0,
                    count: 0,
                    profile
                };
            }

            studentMap[a.student_id].soft_total += parseFloat(a.soft_skills_score) || 0;
            studentMap[a.student_id].dev_total += parseFloat(a.development_skills_score) || 0;
            studentMap[a.student_id].count += 1;
        });

        const rankings: RankingData[] = Object.entries(studentMap).map(([id, data]) => {
            const soft_avg = data.soft_total / data.count;
            const dev_avg = data.dev_total / data.count;

            return {
                student_id: id,
                full_name: data.profile?.full_name || 'Anonymous',
                email: data.profile?.email || '',
                avatar_url: data.profile?.avatar_url || null,
                soft_score: parseFloat(soft_avg.toFixed(2)),
                dev_score: parseFloat(dev_avg.toFixed(2)),
                overall_score: parseFloat(((soft_avg + dev_avg) / 2).toFixed(2))
            };
        });

        // 3. Sort by overall score descending
        return rankings.sort((a, b) => {
            if (b.overall_score !== a.overall_score) {
                return b.overall_score - a.overall_score;
            }
            return a.full_name.localeCompare(b.full_name); // Tie-breaker
        });
    } catch (error) {
        console.error('Error fetching rankings:', error);
        return [];
    }
};
