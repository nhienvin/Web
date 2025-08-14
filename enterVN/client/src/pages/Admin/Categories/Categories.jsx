// client/src/pages/Admin/Categories.jsx
import { Table, Button, TreeSelect, Select, Modal, Form, Input, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useState } from 'react';
import api from '../../../services/api';

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();

  const columns = [
    {
      title: 'Tên danh mục',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: 'Đường dẫn',
      dataIndex: 'slug',
      key: 'slug'
    },
    {
      title: 'Cấp độ',
      dataIndex: 'level',
      key: 'level'
    }
  ];
  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data.data);
    } catch (err) {
      message.error('Lỗi khi tải danh mục');
    }
  };
  const onFinish = async (values) => {
    try {
      await api.post('/categories', values);
      message.success('Thêm danh mục thành công');
      fetchCategories();
      setIsModalOpen(false);
      form.resetFields();
    } catch (err) {
      message.error('Thêm danh mục thất bại');
    }
  };
  
  
  return (
    <div>
      <Button 
        type="primary" 
        icon={<PlusOutlined />} 
        onClick={() => setIsModalOpen(true)}
        style={{ marginBottom: 16 }}
      >
        Thêm danh mục
      </Button>

      <Table 
        columns={columns} 
        dataSource={categories} 
        rowKey="id"
        expandable={{
          childrenColumnName: 'children',
          defaultExpandAllRows: true
        }}
      />

      <Modal 
        title="Thêm danh mục" 
        open={isModalOpen} 
        onCancel={() => setIsModalOpen(false)}
        footer={null}
      >
        <Form form={form} onFinish={onFinish}>
          <Form.Item name="name" label="Tên danh mục" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="parentId" label="Danh mục cha">
            <TreeSelect
              treeData={categories}
              placeholder="Chọn danh mục cha"
              allowClear
            />
          </Form.Item>
          <Form.Item name="level" label="Cấp độ" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 1, label: 'Cấp 1' },
                { value: 2, label: 'Cấp 2' },
                { value: 3, label: 'Cấp 3' }
              ]}
            />
          </Form.Item>
          <Button type="primary" htmlType="submit">
            Lưu
          </Button>
        </Form>
      </Modal>
    </div>
  );
}