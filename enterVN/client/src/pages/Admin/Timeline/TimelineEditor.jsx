// client/src/pages/Admin/TimelineEditor.jsx
import { Form, Input, Button, DatePicker, Upload } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

export default function TimelineEditor() {
  const [form] = Form.useForm();

  const onFinish = async (values) => {
    try {
      await api.post('/timeline', values);
      message.success('Thêm sự kiện thành công!');
    } catch (err) {
      message.error('Có lỗi xảy ra!');
    }
  };

  return (
    <Form form={form} onFinish={onFinish}>
      <Form.Item name="year" label="Năm" rules={[{ required: true }]}>
        <Input type="number" />
      </Form.Item>
      <Form.List name="events">
        {(fields, { add, remove }) => (
          <>
            {fields.map(({ key, name, ...restField }) => (
              <div key={key}>
                <Form.Item {...restField} name={[name, 'title']} label="Tiêu đề">
                  <Input />
                </Form.Item>
                <Form.Item {...restField} name={[name, 'description']} label="Mô tả">
                  <Input.TextArea />
                </Form.Item>
                <Button onClick={() => remove(name)}>Xóa</Button>
              </div>
            ))}
            <Button onClick={() => add()} icon={<PlusOutlined />}>
              Thêm sự kiện
            </Button>
          </>
        )}
      </Form.List>
      <Button type="primary" htmlType="submit">
        Lưu
      </Button>
    </Form>
  );
}