// client/src/pages/Admin/MediaManager.jsx
import { Table, Image, Tag, Button, message, Popconfirm } from 'antd';
import { DeleteOutlined, UploadOutlined } from '@ant-design/icons';
import { useState, useEffect } from 'react';
import api from '../../../services/api';
import UploadModal from '../../../components/Admin/UploadModal';

export default function MediaManager() {
  const [media, setMedia] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchMedia = async () => {
    setLoading(true);
    try {
      const res = await api.get('/upload');
      setMedia(res.data.data.files);
    } catch (err) {
      message.error('Lỗi khi tải danh sách media');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (filename) => {
    try {
      await api.delete(`/upload/${filename}`);
      message.success('Xóa thành công');
      fetchMedia();
    } catch (err) {
      message.error('Xóa thất bại');
    }
  };

  useEffect(() => {
    fetchMedia();
  }, []);

  const columns = [
    {
      title: 'Tên file',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: 'Xem trước',
      dataIndex: 'url',
      key: 'url',
      render: (url) => (
        url.includes('.mp4') || url.includes('.mov') ? (
          <video src={url} width="150" controls />
        ) : (
          <Image src={url} width={150} />
        )
      )
    },
    {
      title: 'Loại',
      dataIndex: 'name',
      key: 'type',
      render: (name) => (
        <Tag color={name.includes('.mp4') ? 'blue' : 'green'}>
          {name.includes('.mp4') ? 'Video' : 'Ảnh'}
        </Tag>
      )
    },
    {
      title: 'Hành động',
      key: 'action',
      render: (_, record) => (
        <Popconfirm
          title="Xóa file này?"
          onConfirm={() => handleDelete(record.name)}
        >
          <Button danger icon={<DeleteOutlined />} />
        </Popconfirm>
      )
    }
  ];

  return (
    <div>
      <Button 
        type="primary" 
        icon={<UploadOutlined />}
        onClick={() => setIsModalOpen(true)}
        style={{ marginBottom: 16 }}
      >
        Upload Media
      </Button>

      <Table 
        columns={columns} 
        dataSource={media} 
        loading={loading}
        rowKey="name"
      />

      <UploadModal
        visible={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onSuccess={() => {
          fetchMedia();
          setIsModalOpen(false);
        }}
      />
    </div>
  );
}