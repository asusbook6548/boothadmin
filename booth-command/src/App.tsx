import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './store/auth.context';
import { AdminLayout } from './components/layout/AdminLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { AssembliesPage } from './pages/AssembliesPage';
import { AssemblyDetailPage } from './pages/AssemblyDetailPage';
import { BoothsPage } from './pages/BoothsPage';
import { BoothDetailPage } from './pages/BoothDetailPage';
import { VotersPage } from './pages/VotersPage';
import { VoterDetailPage } from './pages/VoterDetailPage';
import { ClassificationPage } from './pages/ClassificationPage';
import { AnalyticsPage } from './pages/analytics/AnalyticsPage';
import { BoothAnalysisPage } from './pages/analytics/BoothAnalysisPage';
import {
  SummaryReportPage, VotersReportPage, BoothsReportPage,
  VolunteersReportPage, ClassificationReportPage
} from './pages/ReportsPage';
import { ImportPage } from './pages/ImportPage';
import { VolunteersPage } from './pages/VolunteersPage';
import { VolunteerDetailPage } from './pages/VolunteerDetailPage';
import { UsersPage } from './pages/UsersPage';
import { SettingsPage } from './pages/SettingsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { Spinner } from './components/ui';

// ============================================================
// PROTECTED ROUTE GUARD
// ============================================================
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// ============================================================
// SYSTEM USER GUARD (accessible only by system user)
// ============================================================
function SystemUserRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spinner size="lg" />
      </div>
    );
  }

  const isSys = Boolean(
    user?.name?.toLowerCase().includes('system') ||
    user?.email?.toLowerCase() === 'admin@boothcommand.com'
  );

  if (!isSys) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

// ============================================================
// PUBLIC ROUTE GUARD (redirect to dashboard if already logged in)
// ============================================================
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

// ============================================================
// APP ROUTES
// ============================================================
function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />

      {/* Protected — Admin Layout */}
      <Route
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />

        {/* Assemblies */}
        <Route path="/assemblies" element={<AssembliesPage />} />
        <Route path="/assemblies/:id" element={<AssemblyDetailPage />} />

        {/* Booths */}
        <Route path="/booths" element={<BoothsPage />} />
        <Route path="/booths/:id" element={<BoothDetailPage />} />

        {/* Voters */}
        <Route path="/voters" element={<VotersPage />} />
        <Route path="/voters/:id" element={<VoterDetailPage />} />

        {/* Classification */}
        <Route path="/classification" element={<ClassificationPage />} />

        {/* Analytics */}
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/analytics/classification" element={<AnalyticsPage />} />
        <Route path="/analytics/verification" element={<AnalyticsPage />} />
        <Route path="/analytics/booths-table" element={<AnalyticsPage />} />
        <Route path="/analytics/booths/strong" element={<BoothAnalysisPage type="strong" />} />
        <Route path="/analytics/booths/weak" element={<BoothAnalysisPage type="weak" />} />
        <Route path="/analytics/booths/opportunity" element={<BoothAnalysisPage type="opportunity" />} />
        <Route path="/analytics/booths/confidence" element={<BoothAnalysisPage type="confidence" />} />

        {/* Reports */}
        <Route path="/reports" element={<SummaryReportPage />} />
        <Route path="/reports/voters" element={<VotersReportPage />} />
        <Route path="/reports/booths" element={<BoothsReportPage />} />
        <Route path="/reports/volunteers" element={<VolunteersReportPage />} />
        <Route path="/reports/classification" element={<ClassificationReportPage />} />

        {/* Import */}
        <Route path="/import" element={<ImportPage />} />

        {/* Volunteers */}
        <Route path="/volunteers" element={<VolunteersPage />} />
        <Route path="/volunteers/:id" element={<VolunteerDetailPage />} />

        {/* Users */}
        <Route path="/users" element={<SystemUserRoute><UsersPage /></SystemUserRoute>} />

        {/* Settings */}
        <Route path="/settings" element={<SettingsPage />} />

        {/* Audit Logs */}
        <Route path="/audit-logs" element={<AuditLogsPage />} />

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}

// ============================================================
// ROOT APP
// ============================================================
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1e293b',
              color: '#f1f5f9',
              fontSize: '14px',
              borderRadius: '10px',
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
