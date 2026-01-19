import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';

const UserContext = createContext();

export const useUser = () => useContext(UserContext);

export const UserProvider = ({ children }) => {
    const [userName, setUserName] = useState('Loading...');
    const [userRole, setUserRole] = useState('User');
    const [currentTeam, setCurrentTeam] = useState('All');
    const [userStatus, setUserStatus] = useState('Offline');
    const [userTask, setUserTask] = useState('');
    const [lastActive, setLastActive] = useState('Now');
    const [userId, setUserId] = useState(null);
    const [teamId, setTeamId] = useState(null);
    const [orgId, setOrgId] = useState(null);
    const [orgName, setOrgName] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                // Get current user from Supabase auth
                const { data: { user } } = await supabase.auth.getUser();

                if (user) {
                    setUserId(user.id);

                    // Fetch user's profile
                    const { data: profile, error } = await supabase
                        .from('profiles')
                        .select('full_name, email, role, org_id, organizations(name)')
                        .eq('id', user.id)
                        .single();

                    if (error) {
                        console.error('Error fetching user profile:', error);
                        setUserName(user.email || 'User');
                        setUserRole('User');
                        setTeamId(null);
                        setOrgId(null);
                    } else if (profile) {
                        setUserName(profile.full_name || profile.email || 'User');
                        setUserRole(profile.role || 'User');
                        setOrgId(profile.org_id);
                        const fetchedOrgName = profile.organizations?.name || (Array.isArray(profile.organizations) ? profile.organizations[0]?.name : '');
                        setOrgName(fetchedOrgName);

                        // Fetch project assignment
                        const { data: projectMember } = await supabase
                            .from('project_members')
                            .select('project_id')
                            .eq('user_id', user.id)
                            .maybeSingle();

                        setTeamId(projectMember?.project_id || null);
                    }
                } else {
                    setUserName('Guest');
                    setUserRole('Guest');
                    setUserId(null);
                    setTeamId(null);
                    setOrgId(null);
                    setOrgName('');
                }
            } catch (err) {
                console.error('Error in fetchUserData:', err);
                setUserName('User');
                setUserRole('User');
                setUserId(null);
                setTeamId(null);
                setOrgId(null);
                setOrgName('');
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, []);

    return (
        <UserContext.Provider value={{
            userName, setUserName,
            userRole, setUserRole,
            currentTeam, setCurrentTeam,
            userId,
            teamId,
            orgId,
            orgName,
            userStatus, setUserStatus,
            userTask, setUserTask,
            lastActive, setLastActive,
            setTeamId,
            loading
        }}>
            {children}
        </UserContext.Provider>
    );
};
