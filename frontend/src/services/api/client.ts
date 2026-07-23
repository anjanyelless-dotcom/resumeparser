import axios, { type AxiosError, type AxiosRequestConfig } from "axios";
import { useAuthStore } from "../../store/authStore";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const apiClient = axios.create({
  baseURL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

const authClient = axios.create({
  baseURL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

let refreshingPromise: Promise<string> | null = null;

const refreshToken = async () => {
  const {
    refreshToken: token,
    setTokens,
    clearTokens,
  } = useAuthStore.getState();
  if (!token) {
    clearTokens();
    throw new Error("Missing refresh token");
  }
  const response = await authClient.post("/api/auth/refresh", {
    refresh_token: token,
  });
  const { access_token, refresh_token } = response.data;
  setTokens(access_token, refresh_token);
  return access_token as string;
};

apiClient.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${accessToken}`,
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

    if (status === 401 && !original?._retry) {
      original._retry = true;
      try {
        refreshingPromise = refreshingPromise || refreshToken();
        const newToken = await refreshingPromise;
        refreshingPromise = null;
        original.headers = {
          ...original.headers,
          Authorization: `Bearer ${newToken}`,
        };
        return apiClient(original);
      } catch {
        refreshingPromise = null;
        useAuthStore.getState().clearTokens();
      }
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
      error.message ||
      "Unexpected API error";
    return Promise.reject(new Error(message));
  },
);

export const createAbortController = () => new AbortController();
