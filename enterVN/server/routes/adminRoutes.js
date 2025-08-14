const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect, restrictTo } = require('../middleware/auth');

//Chỉ admin và editor đăng nhập được vào hệ thống
router.get(
  '/stats',
  protect,
  restrictTo('admin', 'editor'),
  adminController.getStats
);

module.exports = router;