// client/src/components/TimelineEventForm.jsx
import { Form, Input, DatePicker, Button, Upload } from 'antd';
import { UploadOutlined } from '@ant-design/icons';

export default function TimelineEventForm({ onFinish, initialValues }) {
  const [form] = Form.useForm();

  return (
    <Form
      form={form}
      initialValues={initialValues}
      onFinish={onFinish}
      layout="vertical"
    >
      <Form.Item name="title" label="Tiêu đề sự kiện" rules={[{ required: true }]}>
        <Input />
      </Form.Item>

      <Form.Item name="description" label="Mô tả chi tiết">
        <Input.TextArea rows={4} />
      </Form.Item>

      <Form.Item name="exactDate" label="Ngày chính xác">
        <DatePicker showTime format="DD/MM/YYYY HH:mm" />
      </Form.Item>

      <Form.Item name="images" label="Hình ảnh">
        <Upload multiple listType="picture">
          <Button icon={<UploadOutlined />}>Tải lên ảnh</Button>
        </Upload>
      </Form.Item>

      <Button type="primary" htmlType="submit">
        Lưu sự kiện
      </Button>
    </Form>
  );
}