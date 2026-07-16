import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "./store/useAuthStore";
import { useEffect } from "react";

// Layout Components
import DashboardLayout from "./components/layout/DashboardLayout";

// Page Components
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import UploadPage from "./pages/UploadPage";
import CandidatesPage from "./pages/CandidatesPage";
import CandidateDetailPage from "./pages/CandidateDetailPage";
import CandidateFilterSearch from "./pages/CandidateFilterSearch";
import XRaySearchPage from "./pages/XRaySearchPage";
import BooleanSearchPage from "./pages/BooleanSearchPage";
import JobsPage from "./pages/JobsPage";
import JobDetailPage from "./pages/JobDetailPage";
import MyAssignmentsPage from "./pages/MyAssignmentsPage";
import MatchingPage from "./pages/MatchingPage";
import JDMatchingPage from "./pages/JDMatchingPage";
import SectionPreviewPage from "./pages/SectionPreviewPage";
import ModelTestPage from "./pages/ModelTestPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import AccuracyPage from "./pages/AccuracyPage";
import UserEditPage from "./pages/UserEditPage";
import UserCreatePage from "./pages/UserCreatePage";
import ClientsPage from "./pages/ClientsPage";
import ClientDetailPage from "./pages/ClientDetailPage";
import ClientCreatePage from "./pages/ClientCreatePage";
import JobOversightPage from "./pages/JobOversightPage";
import RecruiterRequirementsPage from "./pages/RecruiterRequirementsPage";
import RecruiterCandidatesPage from "./pages/RecruiterCandidatesPage";
import RecruiterSubmissionsPage from "./pages/RecruiterSubmissionsPage";
import TeamRequirementAssignmentPage from "./pages/TeamRequirementAssignmentPage";
import SubmissionReviewPage from "./pages/SubmissionReviewPage";
import TeamLeadDashboardPage from "./pages/TeamLeadDashboardPage";
import ClientManagerRequirementsPage from "./pages/ClientManagerRequirementsPage";
import ClientManagerDashboardPage from "./pages/ClientManagerDashboardPage";
import ClientSubmissionTrackingPage from "./pages/ClientSubmissionTrackingPage";
import InterviewCoordinationPage from "./pages/InterviewCoordinationPage";
import ClientPipelinePage from "./pages/ClientPipelinePage";
import BDMRequirementsPage from "./pages/BDMRequirementsPage";
import ApplyPage from "./pages/ApplyPage";
import BDMRequirementFormPage from "./pages/BDMRequirementFormPage";
import BdmDashboardPage from "./pages/BdmDashboardPage";
import BDMCandidatesPage from "./pages/BDMCandidatesPage";
import BDMReportsPage from "./pages/BDMReportsPage";
import BDMSubmissionsPage from "./pages/BDMSubmissionsPage";
import SubmissionDetailPage from "./pages/SubmissionDetailPage";
import SettingsPage from "./pages/SettingsPage";
import TeamKpisPage from "./pages/TeamKpisPage";
import CompanyIntelPage from "./pages/CompanyIntelPage";

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, token, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated || !token) {
    return <Navigate to="/login" replace />;
  }

  // Role-based routing logic
  if (user?.role === 'team_lead' && location.pathname === '/dashboard') {
    return <Navigate to="/team-lead/dashboard" replace />;
  }
  
  if (user?.role === 'client_manager' && location.pathname === '/dashboard') {
    return <Navigate to="/client-manager/dashboard" replace />;
  }

  if (user?.role === 'bdm' && location.pathname === '/dashboard') {
    return <Navigate to="/bdm/dashboard" replace />;
  }

  return <>{children}</>;
}

// Public Route Component (allow access to login page even if authenticated)
function PublicRoute({ children }: { children: React.ReactNode }) {
  // Always show the login page - don't redirect authenticated users
  return <>{children}</>;
}

function App() {
  const { token, isAuthenticated } = useAuthStore();

  // Initialize auth state from localStorage on app load
  useEffect(() => {
    if (token && isAuthenticated) {
      // User is already authenticated
      console.log("User authenticated from localStorage");
    }
  }, [token, isAuthenticated]);

  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />

      {/* Redirect root to login */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Protected Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
      </Route>

      {/* Team Lead Dashboard Route */}
      <Route
        path="/team-lead/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<TeamLeadDashboardPage />} />
      </Route>

      <Route
        path="/upload"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<UploadPage />} />
      </Route>

      <Route
        path="/candidates"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<CandidatesPage />} />
        <Route path="filter-search" element={<CandidateFilterSearch />} />
        <Route path="xray-search" element={<XRaySearchPage />} />
        <Route path="boolean-search" element={<BooleanSearchPage />} />
      </Route>

      <Route
        path="/candidates/:id"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<CandidateDetailPage />} />
      </Route>

      <Route
        path="/jobs"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<JobsPage />} />
        <Route path="my-assignments" element={<MyAssignmentsPage />} />
        <Route path=":id" element={<JobDetailPage />} />
      </Route>

      <Route
        path="/matching"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<MatchingPage />} />
      </Route>

      <Route
        path="/jd-matching"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<JDMatchingPage />} />
      </Route>
      <Route
        path="/labeling"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/settings" replace />} />
      </Route>

      <Route
        path="/section-preview"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<SectionPreviewPage />} />
      </Route>

      <Route
        path="/model-test"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<ModelTestPage />} />
      </Route>

      <Route
        path="/apply"
        element={
          <ProtectedRoute>
            <ApplyPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AnalyticsPage />} />
      </Route>

      <Route
        path="/accuracy"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AccuracyPage />} />
      </Route>

      <Route
        path="/users"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/settings" replace />} />
        <Route path="create" element={<UserCreatePage />} />
        <Route path=":id/edit" element={<UserEditPage />} />
        <Route path="permissions" element={<Navigate to="/settings" replace />} />
      </Route>

      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<SettingsPage />} />
      </Route>

      {/* Admin Routes */}
      <Route
        path="/admin/clients"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<ClientsPage />} />
        <Route path="new" element={<ClientCreatePage />} />
      </Route>

      <Route
        path="/admin/clients/:id"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<ClientDetailPage />} />
      </Route>

      {/* Admin Routes - Job Oversight */}
      <Route
        path="/admin/jobs"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<JobOversightPage />} />
        <Route path=":id" element={<JobDetailPage />} />
      </Route>

      {/* Recruiter Routes - Requirements */}
      <Route
        path="/recruiter/requirements"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<RecruiterRequirementsPage />} />
      </Route>

      {/* Recruiter Routes - Candidates */}
      <Route
        path="/recruiter/candidates"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<RecruiterCandidatesPage />} />
      </Route>

      {/* Recruiter Routes - Submissions */}
      <Route
        path="/recruiter/submissions"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<RecruiterSubmissionsPage />} />
      </Route>

      {/* Team Lead Routes - Requirements */}
      <Route
        path="/team-lead/requirements"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<TeamRequirementAssignmentPage />} />
      </Route>

      {/* Team Lead Routes - Review Queue */}
      <Route
        path="/team-lead/review-queue"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<SubmissionReviewPage />} />
      </Route>

      {/* Team Lead Routes - Team KPIs */}
      <Route
        path="/team-lead/team-kpis"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<TeamKpisPage />} />
      </Route>

      {/* Client Manager Routes - Dashboard */}
      <Route
        path="/client-manager/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<ClientManagerDashboardPage />} />
      </Route>

      {/* Client Manager Routes - Requirements */}
      <Route
        path="/client-manager/requirements"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<ClientManagerRequirementsPage />} />
      </Route>

      {/* Client Manager Routes - Submissions */}
      <Route
        path="/client-manager/submissions"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<ClientSubmissionTrackingPage />} />
      </Route>

      {/* Client Manager Routes - Interviews */}
      <Route
        path="/client-manager/interviews"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<InterviewCoordinationPage />} />
      </Route>

      {/* BDM Routes - Dashboard */}
      <Route
        path="/bdm/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<BdmDashboardPage />} />
      </Route>

      {/* BDM Routes - Pipeline */}
      <Route
        path="/bdm/pipeline"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<ClientPipelinePage />} />
      </Route>

      {/* BDM Routes - Client Detail */}
      <Route
        path="/bdm/clients/:id"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<ClientDetailPage />} />
      </Route>

      {/* BDM Routes - Requirements */}
      <Route
        path="/bdm/requirements"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<BDMRequirementsPage />} />
      </Route>

      <Route
        path="/bdm/requirements/new"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<BDMRequirementFormPage />} />
      </Route>

      {/* BDM Routes - Candidates */}
      <Route
        path="/bdm/candidates"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<BDMCandidatesPage />} />
      </Route>

      {/* BDM Routes - Reports */}
      <Route
        path="/bdm/reports"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<BDMReportsPage />} />
      </Route>

      {/* BDM Routes - Submissions */}
      <Route
        path="/bdm/submissions"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<BDMSubmissionsPage />} />
      </Route>

      {/* Submission Detail Page - Shared across all roles */}
      <Route
        path="/submissions/:id"
        element={
          <ProtectedRoute>
            <SubmissionDetailPage />
          </ProtectedRoute>
        }
      />

      {/* Admin Routes - Duplicate Review */}
      <Route
        path="/admin/duplicates"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/settings" replace />} />
      </Route>

      {/* Admin Routes - Audit Logs */}
      <Route
        path="/admin/audit-logs"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/settings" replace />} />
      </Route>

      {/* Admin Routes - Permissions */}
      <Route
        path="/admin/permissions"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/settings" replace />} />
      </Route>

      {/* Company Intelligence */}
      <Route
        path="/company-intel"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<CompanyIntelPage />} />
      </Route>

      {/* Catch all route - redirect to dashboard if authenticated, login if not */}
      <Route
        path="*"
        element={
          isAuthenticated ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}

export default App;
