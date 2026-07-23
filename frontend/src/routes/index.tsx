import type { RouteObject } from "react-router-dom";
import HomePage from "../pages/HomePage";
import UploadPage from "../pages/UploadPage";
import CandidatesPage from "../pages/CandidatesPage";
import CandidateDetailPage from "../pages/CandidateDetailPage";
import AuthPage from "../pages/AuthPage";
import TaxonomyPage from "../pages/TaxonomyPage";
import CorrectionsPage from "../pages/CorrectionsPage";
import AccuracyPage from "../pages/AccuracyPage";
import AnalyticsPage from "../pages/AnalyticsPage";
import PermissionManagementPage from "../pages/PermissionManagementPage";
import ClientsPage from "../pages/ClientsPage";
import ClientDetailPage from "../pages/ClientDetailPage";
import JobOversightPage from "../pages/JobOversightPage";
import DuplicateReviewPage from "../pages/DuplicateReviewPage";
import PipelineStagesPage from "../pages/PipelineStagesPage";
import EmailTemplatesPage from "../pages/EmailTemplatesPage";
import NotificationSettingsPage from "../pages/NotificationSettingsPage";
import AuditLogPage from "../pages/AuditLogPage";

export const appRoutes: RouteObject[] = [
  {
    path: "/",
    element: <HomePage />,
  },
  {
    path: "/upload",
    element: <UploadPage />,
  },
  {
    path: "/candidates",
    element: <CandidatesPage />,
  },
  {
    path: "/candidates/:id",
    element: <CandidateDetailPage />,
  },
  {
    path: "/taxonomy",
    element: <TaxonomyPage />,
  },
  {
    path: "/corrections",
    element: <CorrectionsPage />,
  },
  {
    path: "/accuracy",
    element: <AccuracyPage />,
  },
  {
    path: "/analytics",
    element: <AnalyticsPage />,
  },
  {
    path: "/auth",
    element: <AuthPage />,
  },
  {
    path: "/admin/permissions",
    element: <PermissionManagementPage />,
  },
  {
    path: "/admin/clients",
    element: <ClientsPage />,
  },
  {
    path: "/admin/clients/:id",
    element: <ClientDetailPage />,
  },
  {
    path: "/admin/jobs",
    element: <JobOversightPage />,
  },
  {
    path: "/admin/duplicates",
    element: <DuplicateReviewPage />,
  },
  {
    path: "/admin/settings/pipeline-stages",
    element: <PipelineStagesPage />,
  },
  {
    path: "/admin/settings/email-templates",
    element: <EmailTemplatesPage />,
  },
  {
    path: "/admin/settings/notifications",
    element: <NotificationSettingsPage />,
  },
  {
    path: "/admin/audit-logs",
    element: <AuditLogPage />,
  },
];
