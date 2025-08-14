import axios from 'axios';
// 1. Khởi tạo instance axios
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1',
  timeout: 10000,
});
// Tự động thêm token nếu có
const token = localStorage.getItem('token');
if (token) {
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

// Thêm interceptor để tự động gửi token
api.interceptors.request.use(config => {
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, error => {
  return Promise.reject(error);
});

// Thêm interceptor xử lý lỗi 401 (Unauthorized)
api.interceptors.response.use(response => response, error => {
  if (error.response?.status === 401) {
    // Xử lý khi token hết hạn hoặc không hợp lệ
    localStorage.removeItem('token');
    window.location.href = '/admin/login';
  }
  return Promise.reject(error);
});
export default api;