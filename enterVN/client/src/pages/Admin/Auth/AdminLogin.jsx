import { Button, Form, Input, message } from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
// import api from '../../services/api';
import { useAuth } from '../../../contexts/AuthContext'; // Thêm dòng này
export default function AdminLogin() {
  const navigate = useNavigate();
  const { login } = useAuth(); // Sử dụng hàm login từ context

  const onFinish = async (values) => {
    try {
      const result = await login(values); // Dùng hàm login từ AuthContext
      
      if (result?.success) {
         // Lưu token vào localStorage
        localStorage.setItem('token', result.data.token);
        navigate('/admin/dashboard');
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'Đăng nhập thất bại');
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '100px auto' }}>
      <h1 style={{ textAlign: 'center' }}>Đăng nhập Admin</h1>
      <Form onFinish={onFinish}>
        <Form.Item
          name="username"
          rules={[{ required: true, message: 'Vui lòng nhập username!' }]}
        >
          <Input prefix={<UserOutlined />} placeholder="Username" />
        </Form.Item>
        <Form.Item
          name="password"
          rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="Mật khẩu" />
        </Form.Item>
        <Button type="primary" htmlType="submit" block>
          Đăng nhập
        </Button>
      </Form>
    </div>
  );
  
}