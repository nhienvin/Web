// // Modal dùng cho thao tác Thêm/Sửa
import React, { useState, useEffect } from "react";

function AddEditModal({ data, setData, index, closeModal }) {
  // Nếu editing, load dữ liệu
  const current = index !== null ? data[index] : {
    topic: "",
    subtopic: "",
    questions: [""],
    answer: ""
  };

  const [topic, setTopic] = useState(current.topic);
  const [subtopic, setSubtopic] = useState(current.subtopic);
  const [questions, setQuestions] = useState(current.questions || [""]);
  const [answer, setAnswer] = useState(current.answer);

  // Xử lý thêm biến thể câu hỏi
  const addQuestionField = () => {
    setQuestions([...questions, ""]);
  };

  const updateQuestion = (idx, value) => {
    const newQuestions = questions.slice();
    newQuestions[idx] = value;
    setQuestions(newQuestions);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newEntry = { topic, subtopic, questions, answer };
    if (index !== null) {
      // Sửa
      const newData = data.slice();
      newData[index] = newEntry;
      setData(newData);
    } else {
      // Thêm mới
      setData([...data, newEntry]);
    }
    closeModal();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-gom-brown text-gom-white p-6 rounded w-3/4 md:w-1/2">
        <h2 className="text-2xl font-bold mb-4">{index !== null ? "Sửa Mục" : "Thêm Mục"}</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block mb-1 font-semibold">Chủ đề lớn</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full p-2 rounded bg-gom-green text-gom-brown"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block mb-1 font-semibold">Chủ đề con</label>
            <input
              type="text"
              value={subtopic}
              onChange={(e) => setSubtopic(e.target.value)}
              className="w-full p-2 rounded bg-gom-green text-gom-brown"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block mb-1 font-semibold">Câu hỏi (biến thể)</label>
            {questions.map((q, idx) => (
              <input
                key={idx}
                type="text"
                value={q}
                onChange={(e) => updateQuestion(idx, e.target.value)}
                className="w-full p-2 mb-2 rounded bg-gom-green text-gom-brown"
                required
              />
            ))}
            <button
              type="button"
              onClick={addQuestionField}
              className="px-2 py-1 bg-gom-green hover:bg-gom-green-dark rounded"
            >
              Thêm biến thể
            </button>
          </div>
          <div className="mb-4">
            <label className="block mb-1 font-semibold">Trả lời (Markdown hỗ trợ)</label>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              className="w-full p-2 rounded bg-gom-green text-gom-brown"
              rows="4"
              required
            />
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={closeModal}
              className="mr-4 px-4 py-2 bg-red-500 hover:bg-red-600 rounded"
            >
              Huỷ
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-gom-green hover:bg-gom-green-dark rounded"
            >
              Lưu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddEditModal;
