const express = require('express');
const mongoose = require('mongoose');
const fetch = require('node-fetch');  // Nếu Node phiên bản cũ hơn Node 18, cần cài đặt: npm install node-fetch
const HistoricalData = require('./HistoricalData'); // file model mà bạn đã tạo
const { semanticSearchVectorized } = require('./semantic_vectorized');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Kết nối tới MongoDB (thay đổi connection string nếu dùng MongoDB Atlas)
mongoose.connect('mongodb://localhost:27017/enterVN', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Kết nối thành công tới cơ sở dữ liệu'))
  .catch(err => console.error('Kết nối bị lỗi: ', err));

/**
 * Hàm tính cosine similarity giữa 2 vector
 * @param {Array} vecA - vector A
 * @param {Array} vecB - vector B
 * @returns {Number} cosine similarity
 */
const cosineSimilarity = (vecA, vecB) => {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] ** 2;
    normB += vecB[i] ** 2;
  }
  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);
  // Tránh chia cho 0
  if (normA === 0 || normB === 0) {
    return 0;
  }
  return dotProduct / (normA * normB);
};

let namesList = [];

// 1. Khởi tạo namesList khi server khởi động
(async () => {
  const docs = await HistoricalData.find({}, 'name additionalInfo.aliases');
  namesList = docs.flatMap(doc => [
    doc.name,
    ...(doc.additionalInfo.aliases || [])
  ]);
  // Sắp xếp theo độ dài giảm dần để match tên dài trước
  namesList.sort((a, b) => b.length - a.length);
})();

// Utility để escape regex special chars
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Endpoint Semantic Search
 * GET /api/historical/semantic?q=...
 */
app.get('/api/historical/semantic', async (req, res) => {
  const { q } = req.query;
  if (!q) {
    return res.status(400).json({ error: 'Thiếu tham số truy vấn "q".' });
  }
  
  // 2.1. Extract entity name bằng dictionary
  // lấy thông tin trường name trong DB
  let cleanedQ = null;
  for (const name of namesList) {
    const pattern = new RegExp(`\\b${escapeRegExp(name)}\\b`, 'i');
    if (pattern.test(q)) {
      cleanedQ = name;
      break;
    }
  }
  // 2.2. Nếu tìm được tên, làm ngay lexical search
  if (cleanedQ) {
    const regex = new RegExp(`\\b${escapeRegExp(cleanedQ)}\\b`, 'i');
    const lexicalMatches = await HistoricalData.find({
      $or: [
        { name: regex },
        { 'additionalInfo.aliases': regex }
      ]
    }).limit(5);

    if (lexicalMatches.length > 0) {
      return res.json(
        lexicalMatches.map(r => ({ record: r, similarity: 1 }))
      );
    }
    // dù đã extract tên nhưng DB không có: coi như không tìm được lexical
  }

  try {
    // Bước 1: Gửi câu truy vấn tới microservice NLP để tính embedding
    //  Giả sử microservice đang chạy tại http://localhost:5050/embedding và nhận body { query: "..." }
     // 2.3. Fallback semantic search với toàn bộ q (original)
    const targetQuery = cleanedQ || q;
    const nlpRes = await fetch('http://localhost:5000/embedding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: targetQuery })
    });
    const { embedding: queryEmb } = await nlpRes.json();
    const allRecs = await HistoricalData.find({});

    // 2.4. Tính similarity
    const scored = allRecs.map(r => ({
      record: r,
      similarity: r.embedding?.length
        ? cosineSimilarity(queryEmb, r.embedding)
        : 0
    }));

    // 2.5. Lọc & trả về
    const THRESHOLD = 0.6;
    const top = scored
      .filter(x => x.similarity >= THRESHOLD)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5);

    if (!top.length) {
      return res.json({ message: 'Không tìm thấy kết quả phù hợp.' });
    }
    res.json(top);
  } catch (error) {
    console.error('Lỗi semantic search:', error);
    res.status(500).json({ error: error.message });
  }
});

/*
  API Endpoints:
  1. GET /api/historical - Lấy tất cả bản ghi
  2. GET /api/historical/:id - Lấy bản ghi theo id
  3. GET /api/historical/search?q=... - Tìm kiếm theo từ khóa (tên, mô tả, keywords)
*/

// 1. Lấy tất cả bản ghi trả về Json
app.get('/api/historical', async (req, res) => {
  try {
    const data = await HistoricalData.find({});
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Lấy bản ghi theo ID
app.get('/api/historical/:id', async (req, res) => {
  try {
    const record = await HistoricalData.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Tìm kiếm theo từ khóa: Có thể tìm kiếm theo tên, mô tả hoặc keywords trong additionalInfo
//Endpoint tìm kiếm cho phép truy vấn theo một từ khóa.
// Hệ thống sẽ kiểm tra các trường name, description và additionalInfo.keywords với một biểu thức chính quy (regex) tìm kiếm không phân biệt chữ hoa chữ thường.
app.get('/api/historical/search', async (req, res) => {
  const { q } = req.query;
  if (!q) {
    return res.status(400).json({ error: 'Missing query parameter "q"' });
  }
  try {
    const regex = new RegExp(q, 'i'); // tìm kiếm không phân biệt hoa thường
    const results = await HistoricalData.find({
      $or: [
        { name: regex },
        { description: regex },
        { 'additionalInfo.keywords': regex }
      ]
    });
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
  
});
// API để thêm bản ghi mới
app.post('/api/historical', async (req, res) => {
  try {
    // Lấy dữ liệu từ body gửi lên và tạo bản ghi mới
    const newRecord = new HistoricalData(req.body);
    const savedRecord = await newRecord.save();
    res.status(201).json(savedRecord);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API để sửa (cập nhật) bản ghi theo ID
app.put('/api/historical/:id', async (req, res) => {
  try {
    // Tìm bản ghi theo ID và cập nhật với dữ liệu mới từ req.body
    // Option { new: true } đảm bảo trả về bản ghi sau cập nhật
    const updatedRecord = await HistoricalData.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedRecord) {
      return res.status(404).json({ error: 'Bản ghi không tồn tại' });
    }
    res.json(updatedRecord);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API để xóa bản ghi theo ID
app.delete('/api/historical/:id', async (req, res) => {
  try {
    // Tìm bản ghi theo ID và xóa
    const deletedRecord = await HistoricalData.findByIdAndDelete(req.params.id);
    if (!deletedRecord) {
      return res.status(404).json({ error: 'Bản ghi không tồn tại' });
    }
    res.json({ message: 'Xóa bản ghi thành công' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Khởi động server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
