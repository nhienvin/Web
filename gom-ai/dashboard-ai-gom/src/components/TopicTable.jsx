import React, { useState } from "react";
import AddEditModal from "./AddEditModal.jsx";

function TopicTable({ data, setData }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);

  const handleEdit = (index) => {
    setEditingIndex(index);
    setModalOpen(true);
  };

  const handleDelete = (index) => {
    if (window.confirm("Bạn có chắc muốn xoá mục này không?")) {
      setData(data.filter((_, i) => i !== index));
    }
  };

  return (
    <div>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b">
            <th className="py-2">Chủ đề lớn</th>
            <th className="py-2">Chủ đề con</th>
            <th className="py-2">Câu hỏi (biến thể)</th>
            <th className="py-2">Trả lời (Markdown)</th>
            <th className="py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, idx) => (
            <tr key={idx} className="border-b">
              <td className="py-2">{item.topic}</td>
              <td className="py-2">{item.subtopic}</td>
              <td className="py-2">
                <ul className="list-disc pl-4">
                  {item.questions.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ul>
              </td>
              <td className="py-2 whitespace-pre-line">{item.answer}</td>
              <td className="py-2">
                <button
                  onClick={() => handleEdit(idx)}
                  className="px-2 py-1 bg-gom-green hover:bg-gom-green-dark rounded mr-2"
                >
                  Sửa
                </button>
                <button
                  onClick={() => handleDelete(idx)}
                  className="px-2 py-1 bg-red-500 hover:bg-red-600 rounded"
                >
                  Xoá
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        onClick={() => {
          setEditingIndex(null);
          setModalOpen(true);
        }}
        className="mt-4 px-4 py-2 bg-gom-green hover:bg-gom-green-dark text-gom-brown font-bold rounded"
      >
        Thêm mới
      </button>
      {modalOpen && (
        <AddEditModal
          data={data}
          setData={setData}
          index={editingIndex}
          closeModal={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}

export default TopicTable;
