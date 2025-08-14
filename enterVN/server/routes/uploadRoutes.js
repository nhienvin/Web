const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

// Cấu hình storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'public/uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${Date.now()}${ext}`);
  }
});

// Lọc file
const fileFilter = (req, file, cb) => {
  const filetypes = /jpeg|jpg|png|gif|mp4|mov|avi/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  }
  cb(new Error('Chỉ chấp nhận file ảnh/video!'));
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// Bảo vệ route với authController.protect
router.post(
  '/',
  protect, // Thêm middleware bảo vệ
  upload.single('file'),
  async (req, res) => {
    try {
      // Kiểm tra quyền upload
      if (req.user.role !== 'admin' && req.user.role !== 'editor') {
        return res.status(403).json({
          status: 'fail',
          message: 'Không có quyền upload file'
        });
      }

      res.status(200).json({
        status: 'success',
        data: {
          url: `/uploads/${req.file.filename}`,
          type: req.file.mimetype.split('/')[0] // image hoặc video
        }
      });
    } catch (err) {
      res.status(500).json({
        status: 'error',
        message: err.message
      });
    }
  }
);

// Route lấy danh sách media (chỉ admin)
router.get(
  '/',
  protect,
  restrictTo('admin'),
  async (req, res) => {
    try {
      const directoryPath = path.join(__dirname, '../../public/uploads');
      const files = fs.readdirSync(directoryPath)
        .filter(file => fs.statSync(path.join(directoryPath, file)).isFile())
        .map(file => ({
          name: file,
          url: `/uploads/${file}`,
          createdAt: fs.statSync(path.join(directoryPath, file)).birthtime
        }));

      res.status(200).json({
        status: 'success',
        results: files.length,
        data: { files }
      });
    } catch (err) {
      res.status(500).json({
        status: 'error',
        message: err.message
      });
    }
  }
);

// Thêm vào uploadRoutes.js
router.delete(
  '/:filename',
  protect,
  restrictTo('admin'),
  async (req, res) => {
    try {
      const filePath = path.join(__dirname, '../../public/uploads', req.params.filename);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          status: 'fail',
          message: 'File không tồn tại'
        });
      }

      fs.unlinkSync(filePath);
      res.status(204).json({
        status: 'success',
        data: null
      });
    } catch (err) {
      res.status(500).json({
        status: 'error',
        message: err.message
      });
    }
  }
);

module.exports = router;