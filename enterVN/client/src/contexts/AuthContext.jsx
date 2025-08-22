// client/src/contexts/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Hàm kiểm tra token khi khởi động app
  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      // Đặt token vào header axios
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      const res = await api.get('/auth/me');
      setUser(res.data.data.user);
    } catch (err) {
      localStorage.removeItem('token');
      delete api.defaults.headers.common['Authorization'];
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Hàm login (dùng luôn trong context)
  const login = async (credentials) => {
    try {
      const res = await api.post('/auth/login', credentials);
      localStorage.setItem('token', res.data.token);
      api.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
      setUser(res.data.data.user);
      // return { success: true };
      return res.data;
    } catch (err) {
      throw err;
    }
  };

  // Hàm logout
  const logout = async () => {
    try {
      await api.post('/auth/logout');
      localStorage.removeItem('token');
      delete api.defaults.headers.common['Authorization'];
      setUser(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Tự động kiểm tra auth khi khởi động
  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, setUser }}>
      {children} {/* Bỏ điều kiện !loading để render UI ngay */}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);