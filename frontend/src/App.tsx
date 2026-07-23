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
import DuplicateReviewPage from "./pages/DuplicateReviewPage";
import AnalyticsPage, { ParserAnalyticsTab, AIAnalyticsTab } from "./pages/AnalyticsPage";
import AccuracyPage from "./pages/AccuracyPage";
import UserEditPage from "./pages/UserEditPage";
import UserCreatePage from "./pages/UserCreatePage";
import ClientsPage from "./pages/ClientsPage";
import ClientDetailPage from "./pages/ClientDetailPage";
import ClientCreatePage from "./pages/ClientCreatePage";
import RecruiterRequirementsPage from "./pages/RecruiterRequirementsPage";
import RecruiterCandidatesPage from "./pages/RecruiterCandidatesPage";
import RecruiterSubmissionsPage from "./pages/RecruiterSubmissionsPage";
import ClientReviewPage from "./pages/ClientReviewPage";
import RequirementWorkspacePage from "./pages/RequirementWorkspacePage";
import TeamRequirementAssignmentPage from "./pages/TeamRequirementAssignmentPage";
import SubmissionReviewPage from "./pages/SubmissionReviewPage";
import ClientManagerRequirementsPage from "./pages/ClientManagerRequirementsPage";
import ClientSubmissionTrackingPage from "./pages/ClientSubmissionTrackingPage";
import InterviewCoordinationPage from "./pages/InterviewCoordinationPage";
import ClientPipelinePage from "./pages/ClientPipelinePage";
import BDMRequirementsPage from "./pages/BDMRequirementsPage";
import ApplyPage from "./pages/ApplyPage";
import BDMRequirementFormPage from "./pages/BDMRequirementFormPage";
import BDMCandidatesPage from "./pages/BDMCandidatesPage";
import BDMReportsPage from "./pages/BDMReportsPage";
import SubmissionDetailPage from "./pages/SubmissionDetailPage";
import SettingsPage from "./pages/SettingsPage";
import TeamKpisPage from "./pages/TeamKpisPage";
import CompanyIntelPage from "./pages/CompanyIntelPage";
import UsersPage from "./pages/UsersPage";
import { RolesAndPermissionsPage } from "./pages/RolesAndPermissionsPage";
import LabelingPage from "./pages/LabelingPage";
import AuditLogPage from "./pages/AuditLogPage";
import NotificationsPage from "./pages/NotificationsPage";
import SystemSettingsPage from "./pages/SystemSettingsPage";
import JobOversightPage from "./pages/JobOversightPage";

// New pages
import PlacementsPage from "./pages/PlacementsPage";
import TeamsPage from "./pages/TeamsPage";
import DepartmentsPage from "./pages/DepartmentsPage";
import IntegrationsPage from "./pages/IntegrationsPage";
import BackupRestorePage from "./pages/BackupRestorePage";
import RequirementApprovalPage from "./pages/RequirementApprovalPage";
import OffersPage from "./pages/OffersPage";
import JoiningPage from "./pages/JoiningPage";

// Module wrapper pages
import BusinessDevelopmentPage from "./pages/modules/BusinessDevelopmentPage";
import RecruitmentPlanningPage from "./pages/modules/RecruitmentPlanningPage";
import TeamLeadManagementPage from "./pages/modules/TeamLeadManagementPage";
import AssignedJobsPage from "./pages/team/AssignedJobsPage";
import RecruiterAssignmentPage from "./pages/team/RecruiterAssignmentPage";
import ShortlistReviewPage from "./pages/team/ShortlistReviewPage";
import TeamDashboardPage from "./pages/team/TeamDashboardPage";
import CandidateSourcingPage from "./pages/modules/CandidateSourcingPage";
import AIRecruitmentPage from "./pages/modules/AIRecruitmentPage";
import HiringProcessPage from "./pages/modules/HiringProcessPage";
import ShortlistedCandidatesPage from "./pages/modules/ShortlistedCandidatesPage";
import TeamManagementPage from "./pages/modules/TeamManagementPage";
import AnalyticsReportsPage from "./pages/modules/AnalyticsReportsPage";
import AdministrationPage from "./pages/modules/AdministrationPage";

import { getRequiredPermission } from "./utils/routePermissions";
import { usePermissionStore } from "./store/usePermissionStore";

// ─── Protected Route ────────────────────────────────────────
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, token } = useAuthStore();
  const hasPermission = usePermissionStore((state) => state.hasPermission);
  const isInitialized = usePermissionStore((state) => state.isInitialized);
  const location = useLocation();

  if (!isAuthenticated || !token) {
    return <Navigate to="/login" replace />;
  }

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const requiredPermission = getRequiredPermission(location.pathname);
  if (requiredPermission) {
    const isAllowed = hasPermission(requiredPermission.module, requiredPermission.action);
    if (!isAllowed) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="text-center p-8 bg-white rounded-xl shadow-sm max-w-md">
            <h1 className="text-4xl font-bold text-red-500 mb-4">403</h1>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-500 mb-6">
              You do not have permission to view this page. If you believe this is an error, please contact your administrator.
            </p>
            <a
              href="/dashboard"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Return to Dashboard
            </a>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}

// ─── Public Route ────────────────────────────────────────────
function PublicRoute({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function App() {
  const { token, isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    if (token && isAuthenticated) {
      usePermissionStore.getState().fetchUserPermissions().catch((err) => {
        console.error("Failed to restore permissions on refresh:", err);
      });
    }
  }, [token, isAuthenticated]);

  // (layout helper removed — use explicit route wrappers)

  return (
    <Routes>
      {/* ── Public Routes ── */}
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* ── Dashboard ── */}
      <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<DashboardPage />} />
      </Route>

      {/* ── Module Routes (New Navigation Structure) ── */}
      <Route path="/business-development" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route element={<BusinessDevelopmentPage />}>
          <Route index element={<ClientPipelinePage />} />
          <Route path="client-pipeline" element={<ClientPipelinePage />} />
          <Route path="clients" element={<ClientsPage />} />
          <Route path="bdm-requirements" element={<BDMRequirementsPage />} />
          <Route path="requirement-approval" element={<RequirementApprovalPage />} />
          <Route path="client-submission-tracking" element={<ClientSubmissionTrackingPage />} />
        </Route>
      </Route>
      <Route path="/recruitment-planning" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route element={<RecruitmentPlanningPage />}>
          <Route index element={<JobsPage />} />
          <Route path="jobs" element={<JobsPage />} />
          <Route path="team-lead-assignment" element={<JobsPage />} />
          <Route path="recruiter-assignment" element={<JobsPage />} />
          <Route path="requirement-approval" element={<RequirementApprovalPage />} />
        </Route>
      </Route>
      <Route path="/team-lead-management" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route element={<TeamLeadManagementPage />}>
          <Route index element={<AssignedJobsPage />} />
          <Route path="assigned-jobs" element={<AssignedJobsPage />} />
          <Route path="recruiter-assignment" element={<RecruiterAssignmentPage />} />
          <Route path="submission-review" element={<SubmissionReviewPage />} />
          <Route path="shortlist-review" element={<ShortlistReviewPage />} />
          <Route path="team-dashboard" element={<TeamDashboardPage />} />
        </Route>
      </Route>
      <Route path="/candidate-sourcing" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route element={<CandidateSourcingPage />}>
          <Route index element={<BooleanSearchPage />} />
          <Route path="boolean-search" element={<BooleanSearchPage />} />
          <Route path="upload-resume" element={<UploadPage />} />
          <Route path="resume-parsing" element={<UploadPage />} />
          <Route path="candidates" element={<CandidatesPage />} />
          <Route path="duplicate-candidates" element={<DuplicateReviewPage />} />
        </Route>
      </Route>
      <Route path="/ai-recruitment" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route element={<AIRecruitmentPage />}>
          <Route index element={<JDMatchingPage />} />
          <Route path="jd-matching" element={<JDMatchingPage />} />
          <Route path="ai-matching" element={<MatchingPage />} />
          <Route path="resume-labeling" element={<LabelingPage />} />
          <Route path="model-test" element={<ModelTestPage />} />
          <Route path="section-preview" element={<SectionPreviewPage />} />
        </Route>
      </Route>
      <Route path="/hiring-process" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route element={<HiringProcessPage />}>
          <Route index element={<ShortlistedCandidatesPage />} />
          <Route path="shortlisted-candidates" element={<ShortlistedCandidatesPage />} />
          <Route path="submissions" element={<RecruiterSubmissionsPage />} />
          <Route path="client-review" element={<ClientReviewPage />} />
          <Route path="interviews" element={<InterviewCoordinationPage />} />
          <Route path="offer-management" element={<OffersPage />} />
          <Route path="joining" element={<JoiningPage />} />
          <Route path="placement" element={<PlacementsPage />} />
        </Route>
      </Route>
      <Route path="/team-management" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route element={<TeamManagementPage />}>
          <Route index element={<UsersPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="roles-permissions" element={<RolesAndPermissionsPage />} />
          <Route path="submission-review-queue" element={<SubmissionReviewPage />} />
          <Route path="activity-timeline" element={<DashboardPage />} />
          <Route path="departments" element={<DepartmentsPage />} />
          <Route path="teams" element={<TeamsPage />} />
        </Route>
      </Route>
      <Route path="/analytics-reports" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route element={<AnalyticsReportsPage />}>
          <Route index element={<AnalyticsPage />} />
          <Route path="recruitment-analytics" element={<AnalyticsPage />} />
          <Route path="parser-analytics" element={<ParserAnalyticsTab />} />
          <Route path="ai-analytics" element={<AIAnalyticsTab />} />
          <Route path="company-analytics" element={<CompanyIntelPage />} />
          <Route path="reports" element={<TeamKpisPage />} />
          <Route path="audit-logs" element={<AuditLogPage />} />
        </Route>
      </Route>
      <Route path="/administration" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route element={<AdministrationPage />}>
          <Route index element={<NotificationsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="system-configuration" element={<SystemSettingsPage />} />
          <Route path="integrations" element={<IntegrationsPage />} />
          <Route path="activity-logs" element={<AuditLogPage />} />
          <Route path="backup-restore" element={<BackupRestorePage />} />
        </Route>
      </Route>

      {/* ── Role dashboards (all reuse DashboardPage) ── */}
      {["/team-lead/dashboard", "/client-manager/dashboard", "/bdm/dashboard"].map((path) => (
        <Route key={path} path={path} element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          <Route index element={<DashboardPage />} />
        </Route>
      ))}

      {/* ── Upload ── */}
      <Route path="/upload" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<UploadPage />} />
      </Route>

      {/* ── Parsing (alias for upload) ── */}
      <Route path="/parsing" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<UploadPage />} />
      </Route>

      {/* ── Candidates ── */}
      <Route path="/candidates" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<CandidatesPage />} />
        <Route path="create" element={<Navigate to="." replace />} />
        <Route path="filter-search" element={<CandidateFilterSearch />} />
        <Route path="xray-search" element={<XRaySearchPage />} />
        <Route path="boolean-search" element={<BooleanSearchPage />} />
        <Route path="duplicates" element={<DuplicateReviewPage />} />
      </Route>
      <Route path="/candidates/:id" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<CandidateDetailPage />} />
      </Route>

      {/* ── Jobs ── */}
      <Route path="/jobs" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<JobsPage />} />
        <Route path="team-lead-assignment" element={<JobsPage />} />
        <Route path="recruiter-assignment" element={<JobsPage />} />
        <Route path="create" element={<Navigate to="/jobs" state={{ showCreateModal: true }} replace />} />
        <Route path="my-assignments" element={<MyAssignmentsPage />} />
        <Route path=":id" element={<JobDetailPage />} />
      </Route>

      {/* ── Clients ── */}
      <Route path="/clients" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<ClientsPage />} />
        <Route path="new" element={<ClientCreatePage />} />
        <Route path=":id" element={<ClientDetailPage />} />
      </Route>

      {/* ── Matching / AI ── */}
      <Route path="/matching" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<MatchingPage />} />
      </Route>
      <Route path="/jd-matching" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<JDMatchingPage />} />
      </Route>
      <Route path="/section-preview" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<SectionPreviewPage />} />
      </Route>
      <Route path="/model-test" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<ModelTestPage />} />
      </Route>
      <Route path="/accuracy" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<AccuracyPage />} />
      </Route>
      <Route path="/analytics" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<AnalyticsPage />} />
      </Route>

      {/* ── Users / Roles ── */}
      <Route path="/users" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<UsersPage />} />
        <Route path="create" element={<UserCreatePage />} />
        <Route path=":id/edit" element={<UserEditPage />} />
        <Route path="permissions" element={<Navigate to="/roles" replace />} />
      </Route>
      <Route path="/roles" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<RolesAndPermissionsPage />} />
      </Route>

      {/* ── Settings ── */}
      <Route path="/settings" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<SettingsPage />} />
        <Route path="labeling" element={<SettingsPage />} />
        <Route path="audit-logs" element={<AuditLogPage />} />
        <Route path="notifications" element={<Navigate to="/notifications" replace />} />
      </Route>
      <Route path="/notifications" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<NotificationsPage />} />
      </Route>
      <Route path="/system-settings" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<SystemSettingsPage />} />
      </Route>

      {/* ── Audit Logs / Activity (multiple aliases) ── */}
      <Route path="/audit-logs" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<AuditLogPage />} />
      </Route>
      <Route path="/activity-logs" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<AuditLogPage />} />
      </Route>
      <Route path="/activity-timeline" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<AuditLogPage />} />
      </Route>

      {/* ── Admin routes ── */}
      <Route path="/admin/audit-logs" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<AuditLogPage />} />
      </Route>
      <Route path="/admin/duplicates" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<DuplicateReviewPage />} />
      </Route>
      <Route path="/admin/permissions" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<RolesAndPermissionsPage />} />
      </Route>

      <Route path="/placements" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<PlacementsPage />} />
      </Route>
      <Route path="/teams" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<TeamsPage />} />
      </Route>
      <Route path="/departments" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<DepartmentsPage />} />
      </Route>
      <Route path="/integrations" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<IntegrationsPage />} />
      </Route>
      <Route path="/backup-restore" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<BackupRestorePage />} />
      </Route>
      <Route path="/job-oversight" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<JobOversightPage />} />
      </Route>
      <Route path="/recruiter-performance" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<TeamKpisPage />} />
      </Route>

      {/* ── New Dedicated Pages ── */}
      <Route path="/requirement-approval" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<RequirementApprovalPage />} />
      </Route>
      <Route path="/offers" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<OffersPage />} />
      </Route>
      <Route path="/joining" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<JoiningPage />} />
      </Route>

      {/* ── Interviews ── */}
      <Route path="/interviews" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<InterviewCoordinationPage />} />
      </Route>

      {/* ── Reports ── */}
      <Route path="/reports" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<BDMReportsPage />} />
      </Route>

      {/* ── Company Intel ── */}
      <Route path="/company-intel" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<CompanyIntelPage />} />
      </Route>

      {/* ── Recruiter Routes ── */}
      <Route path="/recruiter/requirements" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<RecruiterRequirementsPage />} />
      </Route>
      <Route path="/recruiter/candidates" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<RecruiterCandidatesPage />} />
      </Route>
      <Route path="/recruiter/submissions" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<RecruiterSubmissionsPage />} />
      </Route>
      <Route path="/recruiter/shortlisted-candidates" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<RecruiterSubmissionsPage />} />
      </Route>

      {/* ── Recruiter Workspace Routes ── */}
      <Route path="/recruiter/workspace/:jobId" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route element={<RequirementWorkspacePage />}>
          <Route index element={null} />
          <Route path="candidates" element={<CandidatesPage />} />
          <Route path="matching" element={<MatchingPage />} />
          <Route path="submissions" element={<RecruiterSubmissionsPage />} />
        </Route>
      </Route>

      {/* ── Team Lead Routes ── */}
      <Route path="/team-lead/requirements" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<TeamRequirementAssignmentPage />} />
      </Route>
      <Route path="/team-lead/assigned-jobs" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<TeamRequirementAssignmentPage />} />
      </Route>
      <Route path="/team-lead/recruiter-assignment" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<TeamRequirementAssignmentPage />} />
      </Route>
      <Route path="/team-lead/review-queue" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<SubmissionReviewPage />} />
      </Route>
      <Route path="/team-lead/submission-review" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<SubmissionReviewPage />} />
      </Route>
      <Route path="/team-lead/team-kpis" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<TeamKpisPage />} />
      </Route>
      <Route path="/team-lead/recruiter-performance" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<TeamKpisPage />} />
      </Route>
      <Route path="/team-lead/team-dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<DashboardPage />} />
      </Route>
      <Route path="/team-lead/shortlist-review" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<SubmissionReviewPage />} />
      </Route>
      <Route path="/team-lead" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route path="requirements" element={<TeamRequirementAssignmentPage />} />
        <Route path="team-dashboard" element={<DashboardPage />} />
      </Route>

      {/* ── Client Manager Routes ── */}
      <Route path="/client-manager/requirements" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<ClientManagerRequirementsPage />} />
      </Route>
      <Route path="/client-manager/submissions" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<ClientSubmissionTrackingPage />} />
      </Route>
      <Route path="/client-manager/interviews" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<InterviewCoordinationPage />} />
      </Route>

      {/* ── BDM Routes (consolidated) ── */}
      <Route path="/bdm/pipeline" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<ClientPipelinePage />} />
      </Route>
      <Route path="/bdm/requirements" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<BDMRequirementsPage />} />
        <Route path="new" element={<BDMRequirementFormPage />} />
        <Route path=":id" element={<BDMRequirementFormPage />} />
      </Route>
      <Route path="/bdm/submissions" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<ClientSubmissionTrackingPage />} />
        <Route path=":jobId" element={<ClientSubmissionTrackingPage />} />
      </Route>
      <Route path="/bdm/candidates" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<BDMCandidatesPage />} />
      </Route>
      <Route path="/bdm/reports" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<BDMReportsPage />} />
      </Route>
      <Route path="/bdm/clients/:id" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<ClientDetailPage />} />
      </Route>

      {/* ── Admin alias routes ── */}
      <Route path="/admin/jobs" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<JobsPage />} />
      </Route>

      {/* ── Submission Detail (shared) ── */}
      <Route path="/submissions/:id" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<SubmissionDetailPage />} />
      </Route>

      {/* ── Apply (public candidate portal) ── */}
      <Route path="/apply" element={<ProtectedRoute><ApplyPage /></ProtectedRoute>} />

      {/* ── Alias shortcuts ── */}
      <Route path="/xray-search" element={<Navigate to="/candidates/xray-search" replace />} />
      <Route path="/boolean-search" element={<Navigate to="/candidates/boolean-search" replace />} />
      <Route path="/client" element={<Navigate to="/clients" replace />} />
      <Route path="/bdm/clients" element={<Navigate to="/clients" replace />} />
      <Route path="/client-manager/clients" element={<Navigate to="/clients" replace />} />
      <Route path="/client-pipeline" element={<Navigate to="/bdm/pipeline" replace />} />

      {/* ── Role-based /requirements redirect ── */}
      <Route
        path="/requirements"
        element={
          isAuthenticated ? (
            user?.role === "recruiter" ? <Navigate to="/recruiter/requirements" replace /> :
            user?.role === "team_lead" ? <Navigate to="/team-lead/requirements" replace /> :
            user?.role === "manager" ? <Navigate to="/team-lead/requirements" replace /> :
            user?.role === "client_manager" ? <Navigate to="/client-manager/requirements" replace /> :
            user?.role === "bdm" ? <Navigate to="/bdm/requirements" replace /> :
            <Navigate to="/dashboard" replace />
          ) : <Navigate to="/login" replace />
        }
      />

      {/* ── Role-based /submissions redirect ── */}
      <Route
        path="/submissions"
        element={
          isAuthenticated ? (
            user?.role === "recruiter" ? <Navigate to="/recruiter/submissions" replace /> :
            user?.role === "team_lead" ? <Navigate to="/team-lead/review-queue" replace /> :
            user?.role === "manager" ? <Navigate to="/team-lead/review-queue" replace /> :
            user?.role === "client_manager" ? <Navigate to="/client-manager/submissions" replace /> :
            user?.role === "bdm" ? <Navigate to="/bdm/submissions" replace /> :
            <Navigate to="/dashboard" replace />
          ) : <Navigate to="/login" replace />
        }
      />

      {/* ── Catch-all ── */}
      <Route
        path="*"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />}
      />
    </Routes>
  );
}

export default App;
