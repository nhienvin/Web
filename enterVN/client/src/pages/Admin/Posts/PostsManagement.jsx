import { Button, Popconfirm, Space, Table, message } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useState, useEffect } from 'react';
import api from '../../../services/api';

export default function PostsManagement() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/posts');
      setPosts(res.data.data);
    } catch (err) {
      message.error('Lỗi khi tải bài viết');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (postId) => {
    try {
      await api.delete(`/posts/${postId}`);
      message.success('Xóa bài viết thành công');
      setPosts(posts.filter(post => post.id !== postId));
    } catch (err) {
      message.error('Xóa bài viết thất bại');
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const columns = [
    {
      title: 'Tiêu đề',
      dataIndex: 'title',
      key: 'title',
      render: (text, record) => (
        <Link to={`/admin/posts/edit/${record.id}`}>{text}</Link>
      )
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: status => (
        <span style={{ color: status === 'published' ? 'green' : 'orange' }}>
          {status}
        </span>
      )
    },
    {
      title: 'Hành động',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Link to={`/admin/posts/edit/${record.id}`}>
            <Button icon={<EditOutlined />} />
          </Link>
          {user.role === 'admin' && (
            <Popconfirm
              title="Xóa bài viết này?"
              onConfirm={() => handleDelete(record.id)}
            >
              <Button danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      )
    }
  ];

  return (
    <div>
      <Table 
        columns={columns} 
        dataSource={posts} 
        loading={loading}
        rowKey="id"
      />
    </div>
  );
}