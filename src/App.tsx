/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Teachers from './pages/Teachers';
import Classes from './pages/Classes';
import Grades from './pages/Grades';
import Payments from './pages/Payments';
import Timetable from './pages/Timetable';
import TimetableRequests from './pages/TimetableRequests';
import Alerts from './pages/Alerts';
import Settings from './pages/Settings';
import Subjects from './pages/Subjects';
import Promotions from './pages/Promotions';
import SchoolInfo from './pages/Schoolinfo';
import AuditLogs from './pages/AuditLogs';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import SetupPassword from './pages/SetupPassword';
import ParentGrades from './pages/ParentGrades';
import ParentLogin from './pages/ParentLogin';
import Landing from './pages/Landing';
import Pricing from './pages/Pricing';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import About from './pages/About';
import SignupVerify from './pages/SignupVerify';
import ResetPassword from './pages/ResetPassword';
import React from 'react';
import { ThemeProvider } from './components/ThemeProvider';
import { TranslationProvider } from './contexts/TranslationContext';
import { useAuth } from './contexts/AuthContext';
import { ConfirmProvider } from './contexts/ConfirmContext';
import { Toaster } from 'react-hot-toast';

const ProtectedRoute = ({ children, allowedRoles, user, path }: { children: React.ReactNode, allowedRoles?: string[], user: any, path?: string }) => {
  if (!user) return <Navigate to="/login" />;
  
  // Admins have access to everything
  if (user.role === 'admin' || user.role === 'super_admin') return <>{children}</>;

  // Check explicit permissions if path is provided
  if (path && user.permissions && Array.isArray(user.permissions)) {
    const hasPermission = user.permissions.some((p: any) => (typeof p === 'string' ? p === path : p.path === path));
    if (hasPermission) return <>{children}</>;
  }

  // If it's the home page, allow access
  if (path === '/accueil') return <>{children}</>;
  
  return <Navigate to="/accueil" />;
};

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
    </div>
  );

  return (
    <TranslationProvider>
      <ThemeProvider>
        <ConfirmProvider>
          <Router>
            <Toaster position="top-right" />
            <Routes>
              <Route path="/" element={user ? <Navigate to={['admin', 'super_admin'].includes(user.role) ? "/tableau-de-bord" : "/accueil"} replace /> : <Landing />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/confidentialite" element={<Privacy />} />
              <Route path="/conditions" element={<Terms />} />
              <Route path="/a-propos" element={<Layout><About /></Layout>} />
              <Route path="/signup-verify" element={<SignupVerify />} />
              <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
              <Route path="/parent-login" element={!user ? <ParentLogin /> : <Navigate to="/" />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/signup" element={<Navigate to="/pricing" />} />
              <Route path="/setup-password" element={<SetupPassword />} />
              
              <Route path="/*" element={user ? (
                <Layout>
                  <Routes>
                    <Route path="/tableau-de-bord" element={<ProtectedRoute user={user} path="/"><Dashboard /></ProtectedRoute>} />
                    <Route path="/accueil" element={<Home />} />
                    <Route path="/eleves" element={<ProtectedRoute user={user} path="/eleves"><Students /></ProtectedRoute>} />
                    <Route path="/promotions" element={<ProtectedRoute user={user} path="/promotions"><Promotions /></ProtectedRoute>} />
                    <Route path="/enseignants" element={<ProtectedRoute user={user} path="/enseignants"><Teachers /></ProtectedRoute>} />
                    <Route path="/classes" element={<ProtectedRoute user={user} path="/classes"><Classes /></ProtectedRoute>} />
                    <Route path="/notes" element={<ProtectedRoute user={user} path="/notes"><Grades /></ProtectedRoute>} />
                    <Route path="/mon-enfant" element={<ProtectedRoute user={user} path="/mon-enfant"><ParentGrades /></ProtectedRoute>} />
                    <Route path="/paiements" element={<ProtectedRoute user={user} path="/paiements"><Payments /></ProtectedRoute>} />
                    <Route path="/emploi-du-temps" element={<ProtectedRoute user={user} path="/emploi-du-temps"><Timetable /></ProtectedRoute>} />
                    <Route path="/emploi-du-temps-requests" element={<ProtectedRoute user={user} path="/emploi-du-temps-requests"><TimetableRequests /></ProtectedRoute>} />
                    <Route path="/alertes" element={<ProtectedRoute user={user} path="/alertes"><Alerts /></ProtectedRoute>} />
                    <Route path="/matieres" element={<ProtectedRoute user={user} path="/matieres"><Subjects /></ProtectedRoute>} />
                    <Route path="/ecole" element={<ProtectedRoute user={user} path="/ecole"><SchoolInfo /></ProtectedRoute>} />
                    <Route path="/audit-logs" element={<ProtectedRoute user={user} path="/audit-logs"><AuditLogs /></ProtectedRoute>} />
                    <Route path="/parametres" element={<ProtectedRoute user={user} path="/parametres"><Settings /></ProtectedRoute>} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Layout>
              ) : <Navigate to="/login" />} />
            </Routes>
          </Router>
        </ConfirmProvider>
      </ThemeProvider>
    </TranslationProvider>
  );
}

