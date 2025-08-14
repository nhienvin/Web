import { Menu } from 'antd';
import {
  UserOutlined,
  FolderOutlined,
  FileTextOutlined,
  DashboardOutlined
} from '@ant-design/icons';
import { Link } from 'react-router-dom';

export default function Sidebar() {
  const items = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: <Link to="/admin">Dashboard</Link>
    },
    {
      key: 'users',
      icon: <UserOutlined />,
      label: <Link to="/admin/users">Quản lý User</Link>
    },
    {
      key: 'categories',
      icon: <FolderOutlined />,
      label: <Link to="/admin/categories">Danh mục</Link>
    },
    {
      key: 'posts',
      icon: <FileTextOutlined />,
      label: <Link to="/admin/posts">Bài viết</Link>
    }
  ];

  return (
    <Menu
      theme="dark"
      mode="inline"
      defaultSelectedKeys={['dashboard']}
      items={items}
    />
  );
}