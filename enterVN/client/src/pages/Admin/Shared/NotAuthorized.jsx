// client/src/pages/Admin/NotAuthorized.jsx
import { Alert, Button } from 'antd';
import { Link } from 'react-router-dom';

export default function NotAuthorized() {
  return (
    <div style={{ maxWidth: 500, margin: '100px auto' }}>
      <Alert
        message="Không có quyền truy cập"
        description="Bạn không có quyền truy cập trang này. Vui lòng liên hệ quản trị viên."
        type="error"
        showIcon
      />
      <Button type="primary" style={{ marginTop: 20 }}>
        <Link to="/admin">Về trang chủ</Link>
      </Button>
    </div>
  );
}