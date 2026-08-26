// ============================================
// Djuniors Dashboard - Main Application & Routes
// ============================================
// Page-level code splitting: each admin page is loaded on demand via React.lazy
// so the initial bundle (Login + shell) stays small. See vite.config.ts for
// vendor / charts / icons chunk splits.

import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Login is kept eager: it's the public entry point, so lazy-loading it would
// only delay the first paint and add a Suspense jump. All admin pages below
// are lazy-loaded (one chunk per page).
import Login from './pages/Login';

// Lazy-loaded routes (one chunk per page).
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Registrations = React.lazy(() => import('./pages/Registrations'));
const Participants = React.lazy(() => import('./pages/Participants'));
const Classes = React.lazy(() => import('./pages/Classes'));
const Levels = React.lazy(() => import('./pages/Levels'));
const Promos = React.lazy(() => import('./pages/Promos'));
const Forms = React.lazy(() => import('./pages/Forms'));
const Notifications = React.lazy(() => import('./pages/Notifications'));
const CMS = React.lazy(() => import('./pages/CMS'));
const Settings = React.lazy(() => import('./pages/Settings'));

// Lightweight inline fallback — keeps bundle small and avoids an extra CSS dep.
const PageFallback: React.FC = () => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      color: 'var(--text-secondary, #64748b)',
      fontSize: '0.95rem',
    }}
  >
    <span>Memuat halaman…</span>
  </div>
);

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            {/* Public Login Route */}
            <Route path="/login" element={<Login />} />

            {/* Protected Admin Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="levels" element={<Levels />} />
              <Route path="classes" element={<Classes />} />
              <Route path="registrations" element={<Registrations />} />
              <Route path="participants" element={<Participants />} />
              {/* Redirects for legacy routes */}
              <Route path="students" element={<Navigate to="/participants" replace />} />
              <Route path="enrollments" element={<Navigate to="/registrations" replace />} />
              <Route path="payments" element={<Navigate to="/registrations" replace />} />
              <Route path="promos" element={<Promos />} />
              <Route path="forms" element={<Forms />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="cms" element={<CMS />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
