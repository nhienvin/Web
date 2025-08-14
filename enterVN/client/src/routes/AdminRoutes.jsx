// client/src/routes/AdminRoutes.jsx
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AdminLayout from '../components/Layout/AdminLayout';
import { lazy, Suspense } from 'react';
import LoadingScreen from '../components/LoadingScreen'; // Tạo component loading

// Sửa lại cách lazy load
const Dashboard = lazy(() => import('../pages/Admin/Dashboard'));
const PostsManagement = lazy(() => import('../pages/Admin/Posts'));
const Categories = lazy(() => import('../pages/Admin/Categories'));
const MediaManager = lazy(() => import('../pages/Admin/Media'));
const TimelineManager = lazy(() => import('../pages/Admin/Timeline'));
const UsersManagement = lazy(() => import('../pages/Admin/Users'));
const PostForm = lazy(() => import('../pages/Admin/Posts/PostForm'));

function AdminRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/admin/login" replace />;
  
  return (
    <Routes>
    {/* Route cha sử dụng AdminLayout */}
    <Route element={(
      <AdminLayout>
        <Suspense fallback={<LoadingScreen />}>
          <Outlet /> {/* Đây là nơi các route con sẽ render */}
        </Suspense>
      </AdminLayout>
    )}>
      {/* Redirect từ /admin -> /admin/dashboard */}
      <Route index element={<Navigate to="dashboard" replace />} />
      
      {/* Các route con */}
      <Route path="dashboard" element={<Dashboard />} />
      <Route path="posts" element={<PostsManagement />}>
        <Route path="new" element={<PostForm />} />
        <Route path="edit/:id" element={<PostForm />} />
      </Route>
      <Route path="categories" element={<Categories />} />
      <Route path="media" element={<MediaManager />} />
      <Route path="timeline" element={<TimelineManager />} />
      <Route path="users" element={<UsersManagement />} />
      
      {/* Fallback route */}
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Route>
  </Routes>
  );
}

export default AdminRoutes;