// client/src/pages/Admin/TimelineManager.jsx
import { Timeline, Card, Button, Modal, Form, Input, DatePicker, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { createContext, useState, useEffect } from 'react';
import api from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';

export default function TimelineManager() {
  const [events, setEvents] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const { user } = useAuth();
  
  // Ẩn nút thêm nếu không có quyền
  const canAddEvent = ['admin', 'editor'].includes(user?.role);
   // Hàm fetchEvents
   const fetchEvents = async () => {
    try {
      const res = await api.get('/timeline');
      setEvents(res.data.data);
    } catch (err) {
      message.error('Lỗi khi tải sự kiện');
    }
  };
  const onFinish = async (values) => {
    try {
      await api.post('/timeline', values);
      message.success('Thêm sự kiện thành công');
      fetchEvents();
      setIsModalOpen(false);
      form.resetFields();
    } catch (err) {
      message.error('Thêm sự kiện thất bại');
    }
  };

  return (
    <div>
      {canAddEvent && (
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={() => setIsModalOpen(true)}
          style={{ marginBottom: 16 }}
        >
          Thêm sự kiện
        </Button>
      )}

      <Timeline mode="alternate">
        {events.map((event, index) => (
          <Timeline.Item key={index} label={event.year}>
            <Card title={event.title}>
              <p>{event.description}</p>
              <small>{new Date(event.date).toLocaleDateString()}</small>
            </Card>
          </Timeline.Item>
        ))}
      </Timeline>

      <Modal 
        title="Thêm sự kiện lịch sử" 
        open={isModalOpen} 
        onCancel={() => setIsModalOpen(false)}
        footer={null}
      >
        <Form form={form} onFinish={onFinish}>
          <Form.Item name="year" label="Năm" rules={[{ required: true }]}>
            <Input type="number" />
          </Form.Item>
          <Form.Item name="title" label="Tiêu đề" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea />
          </Form.Item>
          <Form.Item name="date" label="Ngày chính xác">
            <DatePicker />
          </Form.Item>
          <Button type="primary" htmlType="submit">
            Lưu
          </Button>
        </Form>
      </Modal>
    </div>
  );
}