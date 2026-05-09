import axios from "axios";

const axiosClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  withCredentials: true,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  }
});

const axiosRaw = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  withCredentials: true,
});

let csrfToken = null;

export const fetchCsrfToken = async () => {
  const res = await axiosRaw.get("/auth/csrf-token");
  csrfToken = res.data.csrfToken;
  return csrfToken;
};

axiosClient.interceptors.request.use(async (config) => {
  if (!csrfToken) {
    await fetchCsrfToken();
  }

  config.headers["X-CSRF-Token"] = csrfToken;

  return config;
});

// Response interceptor: on 401 try to refresh tokens once and retry original request
axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (!originalRequest) return Promise.reject(error);

    const isAuthEndpoint = (originalRequest.url || '').includes('/auth/refresh-token');

    if (error.response && error.response.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;
      try {
        await axiosRaw.get('/auth/refresh-token');
        return axiosClient(originalRequest);
      } catch (err) {
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosClient 