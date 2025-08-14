// client/src/layouts/AdminLayout.jsx
import { Layout, Menu, Button } from 'antd';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  DashboardOutlined,
  FileOutlined,
  UserOutlined,
  ClockCircleOutlined,
  AppstoreOutlined,
  LogoutOutlined
} from '@ant-design/icons';
// Thêm đoạn này vào đầu file
import { useNavigate } from 'react-router-dom';


const { Header, Sider, Content } = Layout;

export default function AdminLayout() {
  const location = useLocation();
  const { user, logout } = useAuth();
// Trong component
const navigate = useNavigate();
  const menuItems = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
      onClick: () => {
        console.log('Click menu item');
        navigate('/admin/dashboard');
      }
    },
    // {
    //   key: 'dashboard',
    //   icon: <DashboardOutlined />,
    //   label: <Link to="/admin/dashboard">Dashboard</Link>,
    // },
    {
      key: 'posts',
      icon: <FileOutlined />,
      label: <Link to="/admin/posts">Bài viết</Link>,
    },
    {
      key: 'categories',
      icon: <AppstoreOutlined />,
      label: <Link to="/admin/categories">Danh mục</Link>,
    },
    {
      key: 'timeline',
      icon: <ClockCircleOutlined />,
      label: <Link to="/admin/timeline">Timeline</Link>,
    },
    {
      key: 'users',
      icon: <UserOutlined />,
      label: <Link to="/admin/users">Người dùng</Link>,
      // Chỉ hiển thị cho admin
      style: { display: user?.role === 'admin' ? 'block' : 'none' }   
    }
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible>
        <div className="logo" style={{ color: 'white', textAlign: 'center', padding: 16 }}>
          ADMIN PANEL
        </div>
        <Menu
          theme="dark"
          selectedKeys={[location.pathname.split('/')[2]]}
          mode="inline"
          items={menuItems}
        />
      </Sider>
      <Layout>
        <Header style={{ 
          background: '#fff', 
          padding: 0,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingRight: 24
        }}>
          <div></div>
          <Button 
            icon={<LogoutOutlined />}
            onClick={logout}
            style={{ marginRight: 16 }}
          >
            Đăng xuất
          </Button>
        </Header>
        <Content style={{ margin: '24px 16px 0' }}>
          <div style={{ 
            padding: 24, 
            background: '#fff', 
            minHeight: 'calc(100vh - 112px)'
          }}>
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}