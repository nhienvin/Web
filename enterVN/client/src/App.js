import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext'; // Import AuthProvider
import AdminRoutes from './routes/AdminRoutes';
import AdminLogin from './pages/Admin/Auth/AdminLogin';
import ProtectedRoute from './components/ProtectedRoute'; // Tạo component này (xem bên dưới)
import NotAuthorized from './pages/Admin/Shared/NotAuthorized'; // Tạo trang này
function App() {
  return (
    <AuthProvider> {/* Bọc toàn bộ ứng dụng bằng AuthProvider */}
      <BrowserRouter>
        <Routes>
          <Route path="/admin/login" element={<AdminLogin />} />
          
          {/* Bảo vệ các route admin */}
          <Route path="/admin/*" element={
            <ProtectedRoute>
              <AdminRoutes  />
            </ProtectedRoute>
          } />
           <Route 
            path="/admin/not-authorized" 
            element={<NotAuthorized />} 
          />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;