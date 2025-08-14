// client/src/pages/Admin/Posts/PostForm.jsx
import { Form, Input, Select, Upload, Button, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import RichTextEditor from '../../../components/Layout/RichTextEditor';
import api from '../../../services/api';
import { useState } from 'react';
const { Option } = Select;

export default function PostForm({ initialValues, onFinish }) {
  const [form] = Form.useForm();
  const [featuredImage, setFeaturedImage] = useState(initialValues?.featuredImage || '');

  const handleUpload = async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await api.post('/upload', formData);
      return res.data.data.url;
    } catch (err) {
      message.error('Upload thất bại');
      return false;
    }
  };

  return (
    <Form
      form={form}
      initialValues={initialValues}
      onFinish={async (values) => {
        values.featuredImage = featuredImage;
        onFinish(values);
      }}
      layout="vertical"
    >
      <Form.Item name="title" label="Tiêu đề" rules={[{ required: true }]}>
        <Input />
      </Form.Item>

      <Form.Item name="categoryId" label="Danh mục" rules={[{ required: true }]}>
        <Select>
          <Option value="60d5f1b5f8a1f525a4d8e1f2">Tổng quan về Việt Nam</Option>
          <Option value="60d5f1b5f8a1f525a4d8e1f3">Lịch sử</Option>
          {/* Thêm các danh mục khác */}
        </Select>
      </Form.Item>

      <Form.Item label="Ảnh đại diện">
        <Upload
          customRequest={async ({ file, onSuccess }) => {
            const url = await handleUpload(file);
            if (url) {
              setFeaturedImage(url);
              onSuccess(url);
            }
          }}
          showUploadList={false}
        >
          <Button icon={<UploadOutlined />}>Tải lên</Button>
        </Upload>
        {featuredImage && <img src={featuredImage} alt="Featured" style={{ maxWidth: 200 }} />}
      </Form.Item>

      <Form.Item name="content" label="Nội dung" rules={[{ required: true }]}>
        <RichTextEditor />
      </Form.Item>

      <Button type="primary" htmlType="submit">
        Lưu bài viết
      </Button>
    </Form>
  );
}