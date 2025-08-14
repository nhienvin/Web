// client/src/components/Layout/AdminHeader.jsx
import { Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api'
export default function AdminHeader() {
  const navigate = useNavigate();

  // AdminHeader.jsx
  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.clear();
      window.location.href = '/admin/login'; // Dùng window.location để tải lại hoàn toàn
    }
  };

  return (
    <header style={{ padding: '0 16px', background: '#fff', textAlign: 'right' }}>
      <Button type="text" danger onClick={handleLogout}>
        Đăng xuất
      </Button>
    </header>
  );
}