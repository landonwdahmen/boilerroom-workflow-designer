// src/AppRoutes.js

import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import HomePage from '../pages/HomePage';
import LoginPage from '../pages/LoginPage';
import SignupPage from '../pages/SignupPage';
import ForgotPasswordPage from '../pages/ForgotPasswordPage';
import DocumentationPage from '../pages/DocumentationPage';
import ComingSoonPage from '../pages/ComingSoonPage';
import AdminDashboardPage from '../pages/AdminDashboardPage';
import MemberDashboardPage from '../pages/MemberDashboardPage';
import ProfilePage from '../pages/ProfilePage';
import ProjectInformationPage from '../pages/TermsAndConditionsPage';
import { useAuth } from '../hooks/useAuth';
import { dashboardPath } from '../contexts/AuthContext';

// Load the visual editor only after the protected route grants access.
const ProjectPlaygroundPageV2 = lazy(() => import('../pages/ProjectPlaygroundPageV2').catch(() => ({
  default: () => <p role="alert">Editor could not be loaded. Reload the page to try again.</p>,
})));

const ProtectedRoute = ({ children, role }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <p role="status">Checking session…</p>;
  if (!user) return <Navigate to="/login" replace />;

  // If role is an array, check if user.role is in that array
  if (Array.isArray(role)) {
    const allowed = role.map(r => r.toLowerCase());
    if (!allowed.includes(user.role.toLowerCase())) {
      return <Navigate to={dashboardPath(user)} replace />;
    }
  } else if (role && user.role.toLowerCase() !== role.toLowerCase()) {
    return <Navigate to={dashboardPath(user)} replace />;
  }

  return children;
};

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={user ? <Navigate to={dashboardPath(user)} replace /> : <LoginPage />} />
      <Route path="/signup" element={user ? <Navigate to={dashboardPath(user)} replace /> : <SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/documentation" element={<DocumentationPage />} />
      <Route path="/coming-soon" element={<ComingSoonPage />} />
      <Route path="/terms" element={<ProjectInformationPage />} />

      {/* Protected Routes */}
      <Route
        path="/admin-dashboard"
        element={
          <ProtectedRoute role="administrator">
            <AdminDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/member-dashboard"
        element={
          // Developer assignments are scoped by the API.
          <ProtectedRoute role={['developer']}>
            <MemberDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/playground/:projectId"
        element={
          <ProtectedRoute>
            <Suspense fallback={<p role="status">Loading editor…</p>}>
              <ProjectPlaygroundPageV2 />
            </Suspense>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<ComingSoonPage />} />
      {/* Feature Pages */}
      <Route path="/features" element={<ComingSoonPage />} />
      <Route path="/faq" element={<ComingSoonPage />} />
      <Route path="/pricing" element={<ComingSoonPage />} />
      <Route path="/about" element={<ComingSoonPage />} />
      <Route path="/contact" element={<ComingSoonPage />} />
      <Route path="/blog" element={<ComingSoonPage />} />
      <Route path="/careers" element={<ComingSoonPage />} />
      <Route path="/privacy" element={<ComingSoonPage />} />
      <Route path="/sitemap" element={<ComingSoonPage />} />

      {/* Documentation Sub-pages */}
      <Route path="/documentation/getting-started" element={<ComingSoonPage />} />
      <Route path="/documentation/api-reference" element={<ComingSoonPage />} />
      <Route path="/documentation/cli" element={<ComingSoonPage />} />
      <Route path="/documentation/best-practices" element={<ComingSoonPage />} />
      <Route path="/documentation/faq" element={<ComingSoonPage />} />
      <Route path="/documentation/authentication" element={<ComingSoonPage />} />
      <Route path="/documentation/rate-limiting" element={<ComingSoonPage />} />
      <Route path="/documentation/error-handling" element={<ComingSoonPage />} />
      <Route path="/documentation/webhooks" element={<ComingSoonPage />} />
      <Route path="/documentation/sdk" element={<ComingSoonPage />} />
      <Route path="/documentation/examples" element={<ComingSoonPage />} />
    </Routes>
  );
}

export default AppRoutes;
