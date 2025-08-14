// client/src/pages/Admin/Posts.jsx
import { Table, Button, Space, Tag, Popconfirm, message } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import api from '../../../services/api';
import { useEffect, useState } from 'react';

const columns = [
  {
    title: 'Tiêu đề',
    dataIndex: 'title',
    key: 'title',
    render: (text, record) => <Link to={`/admin/posts/edit/${record.id}`}>{text}</Link>
  },
  {
    title: 'Danh mục',
    dataIndex: 'category',
    key: 'category',
    render: (_, record) => record.categoryId?.name
  },
  {
    title: 'Trạng thái',
    dataIndex: 'status',
    key: 'status',
    render: status => (
      <Tag color={status === 'published' ? 'green' : 'orange'}>
        {status === 'published' ? 'Đã đăng' : 'Bản nháp'}
      </Tag>
    )
  },
  {
    title: 'Hành động',
    key: 'action',
    render: (_, record) => (
      <Space size="middle">
        <Button icon={<EditOutlined />} />
        <Popconfirm
          title="Xóa bài viết?"
          onConfirm={() => handleDelete(record.id)}
        >
          <Button danger icon={<DeleteOutlined />} />
        </Popconfirm>
      </Space>
    )
  }
];

export default function Posts() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/posts');
      setData(res.data.data);
    } catch (err) {
      message.error('Lỗi khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/posts/${id}`);
      message.success('Xóa thành công');
      fetchPosts();
    } catch (err) {
      message.error('Xóa thất bại');
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />}>
          <Link to="/admin/posts/new">Thêm bài viết</Link>
        </Button>
      </div>
      <Table 
        columns={columns} 
        dataSource={data} 
        loading={loading} 
        rowKey="id" 
      />
    </div>
  );
}