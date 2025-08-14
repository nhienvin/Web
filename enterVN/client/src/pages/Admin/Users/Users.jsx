import { Table, Tag, Button, message, Popconfirm, Space, Modal, Form, Input, Select } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useState, useEffect } from 'react';
import api from '../../../services/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';

const { Option } = Select;

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users');
      // Đảm bảo dữ liệu là mảng
      const userArray = Array.isArray(res.data.data.users) ? res.data.data.users : [];
      setUsers(userArray);
    } catch (err) {
      message.error('Lỗi khi tải danh sách');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId) => {
    try {
      await api.delete(`/users/${userId}`);
      message.success('Xóa thành công');
      fetchUsers();
    } catch (err) {
      message.error('Xóa thất bại: ' + err.response?.data?.message);
    }
  };

  const showEditModal = (user) => {
    setEditingUser(user);
    form.setFieldsValue(user);
    setIsModalOpen(true);
  };

  const handleSubmit = async (values) => {
    
    try {
      let response;
      setLoading(true);
      if (editingUser) {
        // Cập nhật user
        response = await api.patch(`/users/${editingUser._id}`, values);
        message.success('Cập nhật thành công');
      } else {
        // Tạo user mới
        response = await api.post('/users', values);
        console.log('API response:', response.data);
        message.success('Thêm thành công');
      }
      // Kiểm tra phản hồi từ server
    if (response.status >= 200 && response.status < 300) {
      message.success(editingUser ? 'Cập nhật thành công' : 'Thêm thành công');
      
      // 1. Đóng modal
      setIsModalOpen(false);
      
      // 2. Tải lại dữ liệu
      await fetchUsers();
      
      // 3. Reset form
      form.resetFields();
      setEditingUser(null);
    } else {
      throw new Error(response.data.message || 'Lỗi không xác định');
    }
    } catch (err) {
      message.error('Lỗi: ' + err.response?.data?.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const columns = [
    {
      title: 'Username',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Vai trò',
      dataIndex: 'role',
      key: 'role',
      render: (role) => (
        <Tag color={role === 'admin' ? 'red' : 'blue'}>
          {role.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Hành động',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button 
            icon={<EditOutlined />} 
            onClick={() => showEditModal(record)}
            disabled={currentUser?.role !== 'admin'}
          />
          <Popconfirm
            title="Xác nhận xóa?"
            onConfirm={() => handleDelete(record._id)}
            disabled={currentUser?.role !== 'admin'}
          >
            <Button 
              danger 
              icon={<DeleteOutlined />}
              disabled={currentUser?.role !== 'admin'}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {currentUser?.role === 'admin' && (
        <Button 
          type="primary" 
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingUser(null);
            form.resetFields();
            setIsModalOpen(true);
          }}
          style={{ marginBottom: 16 }}
        >
          Thêm người dùng
        </Button>
      )}

      <Table
        columns={columns}
        dataSource={users}
        loading={loading}
        rowKey="_id"
        scroll={{ x: true }}
      />

      {/* Modal thêm/sửa user */}
      <Modal
        title={editingUser ? "Sửa người dùng" : "Thêm người dùng"}
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields(); // Reset form khi đóng
          setEditingUser(null); // Reset user đang chỉnh sửa
        }}
        footer={null}
        destroyOnHidden // Quan trọng: hủy component khi đóng
      >
        <Form
          form={form}
          onFinish={handleSubmit}
          layout="vertical"
          initialValues={{ role: 'user' }}
        >
          <Form.Item
            name="username"
            label="Username"
            rules={[{ required: true, message: 'Vui lòng nhập username' }]}
          >
            <Input />
          </Form.Item>
          
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Vui lòng nhập email' },
              { type: 'email', message: 'Email không hợp lệ' }
            ]}
          >
            <Input />
          </Form.Item>
          
          {!editingUser && (
            <Form.Item
              name="password"
              label="Mật khẩu"
              rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}
            >
              <Input.Password />
            </Form.Item>
          )}
          
          <Form.Item
            name="role"
            label="Vai trò"
            rules={[{ required: true, message: 'Vui lòng chọn vai trò' }]}
          >
            <Select>
              <Option value="admin">Admin</Option>
              <Option value="editor">Editor</Option>
              <Option value="user">User</Option>
            </Select>
          </Form.Item>
          
          <Button type="primary" htmlType="submit" loading={loading}>
            {editingUser ? 'Cập nhật' : 'Thêm mới'}
          </Button>
        </Form>
      </Modal>
    </div>
  );
}