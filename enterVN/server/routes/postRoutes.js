const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const { protect, restrictTo } = require('../middleware/auth');

// Public routes
router.get('/category/:categoryId', postController.getPostsByCategory);

// Protected routes (require login)
router.use(protect);

router.post('/', restrictTo('editor', 'admin'), postController.createPost);
router.patch(
    '/:id',
    protect,
    restrictTo('editor', 'admin'),
    postController.checkPostOwnership, // Middleware kiểm tra quyền
    postController.updatePost
  );

// Chỉ admin được xóa
router.delete('/:id', restrictTo('admin'), postController.deletePost);

module.exports = router;