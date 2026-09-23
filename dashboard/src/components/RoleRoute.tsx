// ============================================
// Djuniors Dashboard - Role Route Guard
// ============================================
// Membatasi akses halaman berdasarkan role akun. super_admin selalu lolos.
// Enforcement sesungguhnya tetap di backend (CS gate + requireRole);
// komponen ini hanya mengarahkan UI agar CS tidak masuk halaman admin.

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface RoleRouteProps {
  roles: string[];
  children: React.ReactNode;
}

export const RoleRoute: React.FC<RoleRouteProps> = ({ roles, children }) => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'super_admin' || roles.includes(user.role)) {
    return <>{children}</>;
  }
  return <Navigate to="/" replace />;
};

export default RoleRoute;
