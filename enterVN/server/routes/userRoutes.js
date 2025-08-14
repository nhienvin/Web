// server/routes/userRoutes.js
const express = require('express');
const userController = require('../controllers/userController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

// Áp dụng middleware xác thực cho tất cả routes
router.use(protect);

// Admin mới được truy cập các route sau
router.use(restrictTo('admin', 'editor'));

router.route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);

router.route('/:id')
  .get(userController.getUser)
  .patch(
    userController.checkUserPermission, // Kiểm tra quyền trước
    userController.updateUser
  )
  .delete(userController.deleteUser);

// Route đặc biệt chỉ dành cho admin
router.patch('/:id/role', 
  restrictTo('admin'),
  userController.updateUserRole
);

module.exports = router;