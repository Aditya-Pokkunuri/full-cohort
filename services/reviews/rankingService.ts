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
        // 1. Fetch all students in the organization first
        let profileQuery = supabase
            .from('profiles')
            .select('id, full_name, email, avatar_url, role, org_id')
            .eq('role', 'employee');

        if (orgId) {
            profileQuery = profileQuery.eq('org_id', orgId);
        }

        const { data: profiles, error: profileError } = await profileQuery;
        if (profileError) throw profileError;
        if (!profiles) return [];

        // 2. Fetch all assessments for this period
        let assessmentQuery = supabase
            .from('student_skills_assessments')
            .select(`
                student_id,
                soft_skills_score,
                development_skills_score
            `)
            .eq('period_start', periodStart)
            .eq('period_type', periodType);

        const { data: assessments, error: assessmentError } = await assessmentQuery;
        if (assessmentError) throw assessmentError;

        // 3. Map assessments to student IDs
        const assessmentMap: Record<string, { soft_total: number; dev_total: number; count: number }> = {};
        assessments?.forEach((a: any) => {
            if (!assessmentMap[a.student_id]) {
                assessmentMap[a.student_id] = { soft_total: 0, dev_total: 0, count: 0 };
            }
            assessmentMap[a.student_id].soft_total += parseFloat(a.soft_skills_score) || 0;
            assessmentMap[a.student_id].dev_total += parseFloat(a.development_skills_score) || 0;
            assessmentMap[a.student_id].count += 1;
        });

        // 4. Create rankings for students with assessments
        const rankings: RankingData[] = profiles
            .map(profile => {
                const data = assessmentMap[profile.id];

                let soft_score = 0;
                let dev_score = 0;
                let overall_score = 0;

                if (data && data.count > 0) {
                    soft_score = parseFloat((data.soft_total / data.count).toFixed(2));
                    dev_score = parseFloat((data.dev_total / data.count).toFixed(2));
                    overall_score = parseFloat(((soft_score + dev_score) / 2).toFixed(2));
                }

                return {
                    student_id: profile.id,
                    full_name: profile.full_name || 'Anonymous',
                    email: profile.email || '',
                    avatar_url: profile.avatar_url || null,
                    soft_score,
                    dev_score,
                    overall_score
                };
            })
            .filter(r => r.overall_score > 0); // Only include students who got reviews

        // 5. Sort by overall score descending, then by name
        return rankings.sort((a, b) => {
            if (b.overall_score !== a.overall_score) {
                return b.overall_score - a.overall_score;
            }
            return a.full_name.localeCompare(b.full_name);
        });
    } catch (error) {
        console.error('Error fetching rankings:', error);
        return [];
    }
};
