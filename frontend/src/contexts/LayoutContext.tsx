import { createContext, useCallback, useContext, useState } from "react";

type LayoutContextValue = {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  collapseSidebar: () => void;
};

const LayoutContext = createContext<LayoutContextValue | null>(null);

export function LayoutProvider({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const collapseSidebar = useCallback(() => setSidebarOpen(false), []);
  return (
    <LayoutContext.Provider
      value={{
        sidebarOpen,
        setSidebarOpen,
        collapseSidebar,
      }}
    >
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  const ctx = useContext(LayoutContext);
  if (!ctx)
    return {
      sidebarOpen: true,
      setSidebarOpen: () => {},
      collapseSidebar: () => {},
    };
  return ctx;
}
