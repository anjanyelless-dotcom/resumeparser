import { ApplicationProvider } from "../features/apply/context/ApplicationContext";
import { Header } from "../features/apply/components/Header.tsx";
import { Wizard } from "../features/apply/components/Wizard";
import { useSessionRestore } from "../hooks/useSessionRestore";

function ApplyPageContent() {
  const { isRestoring } = useSessionRestore();

  if (isRestoring) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Restoring your session...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header />
      <Wizard />
    </>
  );
}

export default function ApplyPage() {
  return (
    <ApplicationProvider>
      <ApplyPageContent />
    </ApplicationProvider>
  );
}