import React from "react";

function Sidebar({ data, setData }) {
  // Lấy danh sách các chủ đề lớn (unique)
  const topics = [...new Set(data.map((item) => item.topic))];

  return (
    <aside className="w-64 p-4 bg-gom-green text-gom-brown">
      <h2 className="text-xl font-bold mb-4">Chủ đề lớn</h2>
      <ul>
        {topics.map((topic, idx) => (
          <li key={idx} className="mb-2 border-b border-gom-brown py-1">
            {topic}
          </li>
        ))}
      </ul>
      {/* Bạn có thể thêm nút Thêm Chủ đề mới nếu cần */}
    </aside>
  );
}

export default Sidebar;
