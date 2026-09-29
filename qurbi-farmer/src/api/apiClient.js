/// <reference types="vite/client" />

import axios from "axios";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api").replace(/\/$/, "");
const API_ORIGIN = new URL(API_BASE_URL, window.location.origin).origin;

export function resolveApiAssetUrl(url) {
  if (!url || !String(url).startsWith("/uploads/public/")) return url;
  return `${API_ORIGIN}${url}`;
}

export const ACCESS_TOKEN_KEY = "qurbi_access_token";
export const REFRESH_TOKEN_KEY = "qurbi_refresh_token";

function readToken(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeToken(key, token) {
  try {
    if (token) localStorage.setItem(key, token);
    else localStorage.removeItem(key);
  } catch {
    // Storage may be unavailable in restricted browser contexts.
  }
}

export const getAccessToken = () => readToken(ACCESS_TOKEN_KEY);
export const getRefreshToken = () => readToken(REFRESH_TOKEN_KEY);

/**
 * @param {{ accessToken?: string | null, refreshToken?: string | null }} [tokens]
 */
export function setSessionTokens({ accessToken, refreshToken } = {}) {
  writeToken(ACCESS_TOKEN_KEY, accessToken);
  writeToken(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearSessionTokens() {
  writeToken(ACCESS_TOKEN_KEY, null);
  writeToken(REFRESH_TOKEN_KEY, null);
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config) => {
  const accessToken = getAccessToken();
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  // Let the browser add the multipart boundary for file uploads. The
  // instance's JSON default would otherwise send an invalid multipart body.
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }
  return config;
});

let refreshRequest = null;

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const refreshToken = getRefreshToken();
    const isAuthRequest = originalRequest?.url?.includes("/auth/login") ||
      originalRequest?.url?.includes("/auth/firebase") ||
      originalRequest?.url?.includes("/auth/refresh");

    if (error.response?.status !== 401 || originalRequest?._retry || !refreshToken || isAuthRequest) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;
    try {
      refreshRequest ||= axios
        .post(`${API_BASE_URL}/auth/refresh`, { refreshToken })
        .then(({ data }) => {
          setSessionTokens(data);
          return data.accessToken;
        })
        .finally(() => {
          refreshRequest = null;
        });

      const accessToken = await refreshRequest;
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      clearSessionTokens();
      return Promise.reject(refreshError);
    }
  },
);

function errorMessage(error) {
  const message = error.response?.data?.message;
  if (Array.isArray(message)) return message.join(". ");
  return message || error.message || "Unable to complete the request";
}

async function unwrap(request) {
  try {
    const response = await request;
    return response.data;
  } catch (error) {
    error.message = errorMessage(error);
    throw error;
  }
}

export const authApi = {
  register: (details) => unwrap(apiClient.post("/auth/register", details)),
  login: (credentials) => unwrap(apiClient.post("/auth/login", credentials)),
  me: () => unwrap(apiClient.get("/auth/me")),
  refresh: (refreshToken) => unwrap(apiClient.post("/auth/refresh", { refreshToken })),
  logout: (refreshToken) => unwrap(apiClient.post("/auth/logout", { refreshToken })),
  firebase: (idToken) => unwrap(apiClient.post("/auth/firebase", { idToken, portal: "farmer" })),
};

export const uploadApi = {
  upload: (file, visibility = "private") => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("visibility", visibility);
    return unwrap(apiClient.post("/uploads", formData));
  },
  getPrivateFile: (fileUrl) =>
    unwrap(apiClient.get(fileUrl, { responseType: "blob" })),
};

export const farmerProfileApi = {
  list: () => unwrap(apiClient.get("/farmer-profiles")),
  byUser: (userId) => unwrap(apiClient.get(`/farmer-profiles/by-user/${userId}`)),
  create: (details) => unwrap(apiClient.post("/farmer-profiles", details)),
  update: (id, details) => unwrap(apiClient.patch(`/farmer-profiles/${id}`, details)),
};

export const farmVerificationApi = {
  list: (params = {}) => unwrap(apiClient.get("/farm-verifications", { params })),
  submit: (details) => unwrap(apiClient.post("/farm-verifications", details)),
  review: (id, details) => unwrap(apiClient.patch(`/farm-verifications/${id}/review`, details)),
};

export const userApi = {
  list: (params = {}) => unwrap(apiClient.get("/users", { params })),
  get: (id) => unwrap(apiClient.get(`/users/${id}`)),
};

export const livestockApi = {
  list: (params = {}) => unwrap(apiClient.get("/livestock", { params })),
};

export const orderApi = {
  adminList: (params = {}) => unwrap(apiClient.get("/orders/admin", { params })),
};

export default apiClient;
