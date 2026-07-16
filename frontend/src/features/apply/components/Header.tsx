import { useApplicationContext } from "../context/ApplicationContext";
import { useAuthStore } from "../../../store/useAuthStore";
import toast from "react-hot-toast";

export function Header() {
  const { currentStep, application } = useApplicationContext();
  const { user, isAuthenticated, logout } = useAuthStore();
  const isAccountStep = currentStep === "account";
  const accountEmail = application.account?.email?.trim() || user?.email;
  const showUserEmail = !isAccountStep && Boolean(accountEmail);

  const handleLogout = () => {
    toast.success("Logged out successfully");
    logout();
  };

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="flex h-20 items-center justify-between pl-2 pr-6">
        <div className="bg-gradient-to-r from-[#5f89dc] via-[#ef8c56] to-[#5f89dc] bg-clip-text text-6xl font-bold leading-none tracking-[0.14em] text-transparent">Lakshya</div>
        <div className="text-right text-sm text-slate-700">
          <div className="mb-1 flex items-center justify-end gap-3">
            <span>🌐 English</span>
            <span className="text-slate-400">|</span>
            {isAccountStep ? (
              <span>Sign In</span>
            ) : (
              <>
                <span>⚙ Settings</span>
                <span className="text-slate-400">|</span>
                {showUserEmail ? <span>👤 {accountEmail}</span> : <span>Sign In</span>}
                {isAuthenticated && (
                  <>
                    <span className="text-slate-400">|</span>
                    <button 
                      onClick={handleLogout}
                      className="text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      Logout
                    </button>
                  </>
                )}
              </>
            )}
          </div>
          <div className="flex items-center justify-end gap-14 font-semibold text-slate-900">
            <span>Search for Jobs</span>
            {!isAccountStep && <span>Candidate Home</span>}
          </div>
        </div>
      </div>
    </header>
  );
}