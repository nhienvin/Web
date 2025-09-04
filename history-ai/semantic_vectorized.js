// semantic_vectorized.js
const tf = require('@tensorflow/tfjs-node');
const HistoricalData = require('./HistoricalData');

// Vectorized semantic search function
async function semanticSearchVectorized(queryEmbedding, topK = 5, threshold = 0.6) {
  // 1. Lấy embeddings từ DB
  const docs = await HistoricalData.find({ 'embedding.0': { $exists: true } }, 'embedding name');
  if (!docs.length) return [];

  // 2. Xây dựng tensor N×D
  const recEmbArray = docs.map(d => d.embedding);
  const recEmbTensor = tf.tensor2d(recEmbArray);

  // 3. L2‑normalize hàng
  const recNorms = recEmbTensor.norm('euclidean', 1).expandDims(1);
  const recNormalized = recEmbTensor.div(recNorms);

  // 4. Chuẩn hoá query vector
  const queryTensor = tf.tensor1d(queryEmbedding);
  const queryNorm    = queryTensor.norm();
  const queryNormed  = queryTensor.div(queryNorm).expandDims(0);

  // 5. Tính similarity hàng loạt: [1×D] × [D×N] → [1×N]
  const simsTensor = queryNormed.matMul(recNormalized.transpose());
  const sims       = simsTensor.dataSync();

  // 6. Ghép, lọc, sort, slice
  return docs
    .map((doc, i) => ({ record: doc, similarity: sims[i] }))
    .filter(x => x.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}

module.exports = { semanticSearchVectorized };
// Giải thích bước vectorized

// Tạo một tensor 2D (recEmbTensor) kích thước N×D với N là số record, D là độ dài embedding.

// L2‑normalize mỗi hàng (embedding của bản ghi) để chuẩn hoá dài vector về 1.

// L2‑normalize query vector, mở rộng thành tensor shape 1×D.

// Tính dot‑product (matrix multiplication) 1×D × D×N ⇒ 1×N là mảng similarity cho mọi record cùng lúc.

// Trích chọn những record có similarity vượt ngưỡng và sort để lấy top K.