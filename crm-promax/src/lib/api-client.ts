import axios from 'axios';
import { useAuthStore } from './auth-store';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

const apiClient = axios.create({
  baseURL: API_URL, // Cổng backend linh hoạt
  withCredentials: true, // Quan trọng: Cho phép gửi và nhận HttpOnly Cookie (RefreshToken)
});

// Gắn Access Token (trong RAM) vào mỗi Request
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Xử lý Lỗi (Tự động Refresh Token khi gặp 401)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Rớt 401 và chưa bị lặp retry
    if (error.response?.status === 401 && !originalRequest._retry && originalRequest.url !== '/auth/refresh' && originalRequest.url !== '/auth/login') {
      originalRequest._retry = true;

      try {
        // Gọi API cấp mới bằng thư viện axios thuần (để tránh đi qua interceptor này gây loop)
        const res = await axios.post(
          `${API_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        
        const newAccessToken = res.data.token;
        useAuthStore.getState().setAuth(newAccessToken);

        // Gắn lại token mới và Retry request gốc
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Nếu refresh cũng tạch -> Token chết thật -> Bắt đăng nhập lại
        useAuthStore.getState().clearAuth();
        if (typeof window !== 'undefined') {
          window.location.href = '/admin/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
