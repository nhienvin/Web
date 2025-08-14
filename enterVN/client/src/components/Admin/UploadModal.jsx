// client/src/components/Admin/UploadModal.jsx
import { Modal, Upload, Button, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { useState } from 'react';
import api from '../../services/api';

export default function UploadModal({ visible, onCancel, onSuccess }) {
  const [fileList, setFileList] = useState([]);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    try {
      setUploading(true);
      await Promise.all(
        fileList.map(file => {
          const formData = new FormData();
          formData.append('file', file);
          return api.post('/upload', formData);
        })
      );
      message.success('Upload thành công');
      onSuccess();
    } catch (err) {
      message.error('Upload thất bại');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal
      title="Upload Media"
      visible={visible}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Hủy
        </Button>,
        <Button
          key="upload"
          type="primary"
          onClick={handleUpload}
          loading={uploading}
          disabled={fileList.length === 0}
        >
          Upload
        </Button>
      ]}
    >
      <Upload
        multiple
        beforeUpload={(file) => {
          setFileList([...fileList, file]);
          return false;
        }}
        onRemove={(file) => {
          setFileList(fileList.filter(f => f.uid !== file.uid));
        }}
        fileList={fileList}
        accept="image/*,video/*"
      >
        <Button icon={<UploadOutlined />}>Chọn file</Button>
      </Upload>
    </Modal>
  );
}