import { create } from "zustand";
import { persist } from "zustand/middleware";
import { usePermissionStore } from "./usePermissionStore";

interface User {
  id: string;
  email: string;
  name?: string;
  role?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  setAuth: (auth: { user: User; token: string; isAuthenticated: boolean }) => void;
  setLoading: (loading: boolean) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set) => ({
      // Initial state
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      // Actions
      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await fetch(
            `${import.meta.env.VITE_API_URL}/auth/login`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ email, password }),
            },
          );    
          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || error.message || "Login failed");
          }

          const data = await response.json();
          const { token, user: userData } = data;

          // Use the user data from backend response
          const user = {
            id: userData?.id || email,
            email: userData?.email || email,
            name: userData?.name,
            role: userData?.role || "admin",
          };

          set({
            user,
            token: token,
            isAuthenticated: true,
            isLoading: false,
          });
          
          // Fetch user permissions after successful login
          try {
            await usePermissionStore.getState().fetchUserPermissions();
          } catch (permissionError) {
            console.error("Failed to fetch permissions after login:", permissionError);
            // Don't throw error - login succeeded even if permission fetch failed
          }
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        // Clear auth state
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
        
        // Clear any persisted data
        localStorage.removeItem('applicant-portal-draft-v1');
        
        // Clear permissions on logout
        usePermissionStore.getState().reset();
        
        // Redirect to login page
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      },

      setUser: (user: User) => {
        set({ user });
      },

      setAuth: (auth: { user: User; token: string; isAuthenticated: boolean }) => {
        set({
          user: auth.user,
          token: auth.token,
          isAuthenticated: auth.isAuthenticated,
        });
      },

      setToken: (token: string) => {
        set({ token, isAuthenticated: !!token });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      clearAuth: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },
    }),
    {
      name: "auth-storage", // localStorage key
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
