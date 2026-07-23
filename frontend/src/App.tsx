import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/useAuthStore";
import { useEffect } from "react";

// Layout Components
import DashboardLayout from "./components/layout/DashboardLayout";

// Page Components
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import UploadPage from "./pages/UploadPage";
import LabelingPage from "./pages/LabelingPage";
import CandidatesPage from "./pages/CandidatesPage";
import CandidateDetailPage from "./pages/CandidateDetailPage";
import JobsPage from "./pages/JobsPage";
import MatchingPage from "./pages/MatchingPage";
import JDMatchingPage from "./pages/JDMatchingPage";
import SectionPreviewPage from "./pages/SectionPreviewPage";
import ModelTestPage from "./pages/ModelTestPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import SettingsPage from "./pages/SettingsPage";
import AccuracyPage from "./pages/AccuracyPage";
import UsersPage from "./pages/UsersPage";

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, token } = useAuthStore();

  if (!isAuthenticated || !token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Public Route Component (redirect to dashboard if authenticated)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

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
        <Route index element={<LabelingPage />} />
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
        <Route index element={<UsersPage />} />
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
