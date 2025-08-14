// server/server.js
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

// Kết nối MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('DB connected!'))
  .catch(err => console.error('DB connection error:', err));
const app = express();

//Rate Limiting: Chống brute force attack  
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api', limiter);



// Middleware
app.use(cors());
app.use(express.json());
//XSS & SQL Injection Protection

const helmet = require('helmet');
const xss = require('xss-clean');
app.use(helmet());
// app.use(xss());
const sanitize = require('./middleware/sanitize');
app.use(sanitize()); // Thay cho xss-clean
// Routes
app.use('/api/v1/auth', require('./routes/authRoutes'));
app.use('/api/v1/users', require('./routes/userRoutes'));

const categoryRoutes = require('./routes/categoryRoutes');
app.use('/api/v1/categories', categoryRoutes); // ✅ Quan trọng
//Bài viết
const postRoutes = require('./routes/postRoutes');
app.use('/api/v1/posts', postRoutes); // ✅ Quan trọng
//timeline
app.use('/api/v1/timeline', require('./routes/timelineRoutes'));

// Thêm static files middleware
app.use('/uploads', express.static('public/uploads'));

// Thêm upload routes
app.use('/api/v1/upload', require('./routes/uploadRoutes'));

// Đặt cuối cùng sau các routes
app.use((err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  res.status(err.statusCode).json({
    status: err.status,
    message: err.message
  });
});
// Khởi động server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});