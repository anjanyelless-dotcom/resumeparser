import axios, { type AxiosError, type AxiosRequestConfig } from "axios";
import { useAuthStore } from "../../store/useAuthStore";

const baseURL = import.meta.env.VITE_API_URL;

export const apiClient = axios.create({
  baseURL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});


apiClient.interceptors.request.use((config) => {
  const { token } = useAuthStore.getState();
  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    } as any;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as AxiosRequestConfig & {
      _retry?: boolean;
      _retryCount?: number;
    };
    const status = error.response?.status;
    const errorMessage = (error.response?.data as { error?: string })?.error;
    const isAuthError =
      status === 401 ||
      (status === 403 && errorMessage === "Invalid or expired token");

    if (isAuthError) {
      useAuthStore.getState().clearAuth();
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
      return Promise.reject(new Error("Session expired. Please log in again."));
    }

    const shouldRetry = !status || status >= 500;
    if (shouldRetry && (original?._retryCount ?? 0) < 2) {
      original._retryCount = (original._retryCount ?? 0) + 1;
      await new Promise((resolve) =>
        setTimeout(resolve, 400 * (original._retryCount ?? 1)),
      );
      return apiClient(original);
    }

    const message =
      (error.response?.data as { detail?: string })?.detail ||
      (error.response?.data as { message?: string })?.message ||
      error.message ||
      "Unexpected API error";
    return Promise.reject(new Error(message));
  },
);

export const createAbortController = () => new AbortController();
