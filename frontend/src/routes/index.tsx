import type { RouteObject } from "react-router-dom";
import HomePage from "../pages/HomePage";
import UploadPage from "../pages/UploadPage";
import CandidatesPage from "../pages/CandidatesPage";
import CandidateDetailPage from "../pages/CandidateDetailPage";
import AuthPage from "../pages/AuthPage";
import TaxonomyPage from "../pages/TaxonomyPage";
import CorrectionsPage from "../pages/CorrectionsPage";
import AccuracyPage from "../pages/AccuracyPage";

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
    path: "/auth",
    element: <AuthPage />,
  },
];
