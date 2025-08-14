// client/src/components/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Spin } from 'antd';
export default function ProtectedRoute({ roles, children }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20%' }}>
        <Spin size="large" tip="Đang kiểm tra đăng nhập..." />
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/admin/login" replace />; // Sửa đường dẫn login
  }

  // if (roles && !roles.includes(user.role)) {
  //   return <Navigate to="/admin/not-authorized" replace />; // Thêm trang not-authorized
  // }
  
  return children;
}

// client/src/components/ProtectedRoute.jsx
// export default function ProtectedRoute({ children }) {
//   const { user, loading } = useAuth();
//     if (loading) {
//     return <div>Đang kiểm tra đăng nhập...</div>;
//   }

//   if (!user) {
//     return <Navigate to="/admin/login" replace />;
//   }

//   return children;
// }