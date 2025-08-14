const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { protect, restrictTo } = require('../middleware/auth');

router.post('/', protect, restrictTo('admin'), categoryController.createCategory);
router.patch('/:id', protect, restrictTo('admin'), categoryController.updateCategory);
router.delete('/:id',protect,restrictTo('admin'),categoryController.deleteCategory);
// Hoặc dùng PUT nếu muốn thay thế toàn bộ document
router.get('/tree', categoryController.getCategoryTree);

module.exports = router;