import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { OverviewPage } from '../features/overview/OverviewPage';
import { AnalyticsPage } from '../features/analytics/AnalyticsPage';
import { SalesPage } from '../features/sales/SalesPage';
import { BouldersPage } from '../features/boulders/BouldersPage';
import { ReferencesPage } from '../features/references/ReferencesPage';
import { ReportsPage } from '../features/reports/ReportsPage';
import { UserManagementPage } from '../features/users/UserManagementPage';
import { AuditLogsPage } from '../features/audit/AuditLogsPage';
import { Role } from '../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f9fafb] text-xs font-mono text-[#6b7280]">
        Verifying security session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to permitted default route
    if (user.role === 'SALES_OPERATOR') return <Navigate to="/sales" replace />;
    if (user.role === 'BOULDER_OPERATOR') return <Navigate to="/boulders" replace />;
    return <Navigate to="/overview" replace />;
  }

  return <>{children}</>;
};

export const AppRoutes: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f9fafb] text-xs font-mono text-[#6b7280]">
        Verifying security session...
      </div>
    );
  }

  const getDefaultRedirect = () => {
    if (!user) return '/login';
    if (user.role === 'SALES_OPERATOR') return '/sales';
    if (user.role === 'BOULDER_OPERATOR') return '/boulders';
    return '/overview';
  };

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={getDefaultRedirect()} replace /> : <LoginPage />} />
      <Route path="/register" element={<Navigate to="/login" replace />} />

      {/* Authenticated Dashboard Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to={getDefaultRedirect()} replace />} />

        {/* Admin only */}
        <Route
          path="overview"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <OverviewPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="analytics"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AnalyticsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="reports"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <ReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="users"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <UserManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="audit-logs"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AuditLogsPage />
            </ProtectedRoute>
          }
        />

        {/* Sales Operator & Admin */}
        <Route
          path="sales"
          element={
            <ProtectedRoute allowedRoles={['SALES_OPERATOR', 'ADMIN']}>
              <SalesPage />
            </ProtectedRoute>
          }
        />

        {/* Boulder Operator & Admin */}
        <Route
          path="boulders"
          element={
            <ProtectedRoute allowedRoles={['BOULDER_OPERATOR', 'ADMIN']}>
              <BouldersPage />
            </ProtectedRoute>
          }
        />

        {/* All authenticated operators */}
        <Route
          path="references"
          element={
            <ProtectedRoute allowedRoles={['SALES_OPERATOR', 'BOULDER_OPERATOR', 'ADMIN']}>
              <ReferencesPage />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to={getDefaultRedirect()} replace />} />
    </Routes>
  );
};
