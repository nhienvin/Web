// update_embeddings.js

const mongoose = require('mongoose');
const fetch = require('node-fetch'); // Sử dụng node-fetch phiên bản 2
const HistoricalData = require('./HistoricalData'); // Import model dữ liệu lịch sử

const DB_URI = 'mongodb://localhost:27017/enterVN'; // Địa chỉ kết nối MongoDB của bạn

async function updateEmbeddings() {
  try {
    // Kết nối đến MongoDB
    await mongoose.connect(DB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Đã kết nối thành công đến MongoDB');

    // Lấy các bản ghi cần cập nhật (ví dụ: những bản ghi chưa có embedding hoặc embedding rỗng)
    const records = await HistoricalData.find({
      $or: [
        { embedding: { $exists: false } },
        { embedding: { $size: 0 } }
      ]
    });
    console.log(`Tìm thấy ${records.length} bản ghi cần cập nhật embedding`);

    // Duyệt qua từng bản ghi
    for (const record of records) {
      try {
        const queryText = record.description;
        if (!queryText) {
          console.warn(`Bản ghi ${record._id} không có mô tả, bỏ qua.`);
          continue;
        }

        // Gửi POST request đến microservice NLP để nhận embedding
        const response = await fetch('http://localhost:5050/embedding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: queryText }),
        });
        if (!response.ok) {
          console.error(`Lỗi khi lấy embedding cho bản ghi ${record._id}: ${response.statusText}`);
          continue;
        }
        const data = await response.json();

        // Cập nhật trường embedding nếu có kết quả từ microservice
        if (data.embedding) {
          record.embedding = data.embedding;
          await record.save();
          console.log(`Đã cập nhật thành công embedding cho bản ghi ${record._id}.`);
        } else {
          console.error(`Không nhận được embedding cho bản ghi ${record._id}.`);
        }
      } catch (error) {
        console.error(`Lỗi xử lý bản ghi ${record._id}:`, error);
      }
    }

    console.log('Quá trình cập nhật embedding hoàn tất.');
    mongoose.disconnect();
  } catch (error) {
    console.error('Lỗi khi kết nối hoặc cập nhật MongoDB:', error);
  }
}

// Chạy hàm cập nhật embedding
updateEmbeddings();
