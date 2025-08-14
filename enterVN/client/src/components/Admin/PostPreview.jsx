// client/src/components/Admin/PostPreview.jsx
import { Modal } from 'antd';
import ReactQuill from 'react-quill';

export default function PostPreview({ content, open, onCancel }) {
  return (
    <Modal
      title="Xem trước bài viết"
      open={open}
      onCancel={onCancel}
      footer={null}
      width="80%"
    >
      <ReactQuill 
        value={content} 
        readOnly 
        theme="bubble" 
      />
    </Modal>
  );
}