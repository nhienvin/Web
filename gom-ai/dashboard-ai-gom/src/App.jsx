import React from 'react'
import { useState } from "react";
import Sidebar from "./components/Sidebar.jsx";
import TopicTable from "./components/TopicTable.jsx";

function App() {
  // Dữ liệu mẫu: ban đầu dashboard sẽ load sẵn 2 chủ đề mẫu
  const [data, setData] = useState([
    {
      topic: "Gốm là gì",
      subtopic: "Khái niệm về gốm",
      questions: [
        "Gốm là gì?",
        "Bạn có thể giải thích gốm là gì không?",
        "Cho tôi biết về khái niệm gốm được không?"
      ],
      answer: "**Gốm** là sản phẩm được làm từ **đất sét**, nung ở nhiệt độ cao để đạt độ cứng và bền chắc."
    },
    {
      topic: "Các loại gốm",
      subtopic: "Phân loại gốm",
      questions: [
        "Có những loại gốm nào?",
        "Phân biệt các loại gốm giúp tôi với.",
        "Các dòng gốm phổ biến hiện nay là gì?"
      ],
      answer: "- Gốm đất nung\n- Gốm sứ\n- Gốm men rạn\n- Gốm tử sa"
    }
  ]);

  // Hàm xuất JSON
  const handleExport = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "ai_gom_data.json";
    link.click();
  };

  return (
    <div className="min-h-screen flex">
      <Sidebar data={data} setData={setData} />
      <main className="flex-1 p-6">
        <h1 className="text-3xl font-bold mb-4">Dashboard Quản lý Chủ đề & Câu hỏi</h1>
        <TopicTable data={data} setData={setData} />
        <button
          onClick={handleExport}
          className="mt-4 px-4 py-2 bg-gom-green hover:bg-gom-green-dark text-gom-brown font-bold rounded"
        >
          Xuất JSON
        </button>
      </main>
    </div>
  );
}

export default App;
