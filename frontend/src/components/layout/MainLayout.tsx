import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useLayout } from "../../contexts/LayoutContext";
import Header from "./Header";
import Sidebar from "./Sidebar";

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const location = useLocation();
  const { sidebarOpen } = useLayout();
  const isCandidateDetail = /^\/candidates\/[^/]+$/.test(location.pathname);
  const maxWidth = isCandidateDetail ? "max-w-[1600px]" : "max-w-6xl";

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <div className={`mx-auto flex ${maxWidth} gap-6 px-6 py-8`}>
        <Sidebar open={sidebarOpen} />
        <main className="min-w-0 flex-1">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-subtle">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
