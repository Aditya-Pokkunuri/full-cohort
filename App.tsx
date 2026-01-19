import React from 'react';

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { NewLandingPage } from './components/pages/NewLandingPage';
import { LoginPage } from './components/pages/LoginPage';
import { ExecutiveDashboard } from './components/pages/ExecutiveDashboard';
import { ManagerDashboard } from './components/pages/ManagerDashboard';
import { TeamLeadDashboard } from './components/pages/TeamLeadDashboard';
import { StudentDashboard } from './components/pages/StudentDashboard';
import { ForgotPasswordPage } from './components/pages/ForgotPasswordPage';
import { ResetPasswordPage } from './components/pages/ResetPasswordPage';

import { useEffect } from 'react';
import { supabase } from './lib/supabaseClient';

function App() {
    useEffect(() => {
        const checkConnection = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                console.log('✅ Active session:', session.user.email);
            }
        };

        checkConnection();

        // Global session monitoring
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT') {
                const isManualLogout = sessionStorage.getItem('manual_logout') === 'true';
                if (!isManualLogout) {
                    // Redirect to login with session_expired flag if on dashboard
                    if (window.location.pathname.includes('-dashboard')) {
                        window.location.href = '/login?session_expired=true';
                    }
                }
                sessionStorage.removeItem('manual_logout');
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    return (
        <Router>
            <Routes>
                <Route path="/" element={<NewLandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/executive-dashboard/*" element={<ExecutiveDashboard />} />
                <Route path="/manager-dashboard/*" element={<ManagerDashboard />} />
                <Route path="/teamlead-dashboard/*" element={<TeamLeadDashboard />} />
                <Route path="/student-dashboard/*" element={<StudentDashboard />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
            </Routes>
        </Router>
    );
}

export default App;
