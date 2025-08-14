const Post = require('../models/Post');
const AppError = require('../utils/appError');
const mongoose = require('mongoose');
// Tạo bài viết mới
exports.createPost = async (req, res, next) => {
    try {
      // Validate URL media
      // if (req.body.featuredImage && !isValidUrl(req.body.featuredImage)) {
      //   return next(new AppError('URL ảnh không hợp lệ', 400));
      // }
      // Editor chỉ có thể tạo bài viết cho chính mình
      if (req.user.role === 'editor') {
        req.body.authorId = req.user.id;
        req.body.status = 'draft'; // Editor phải gửi duyệt
      }
      const post = await Post.create({
        ...req.body,
        authorId: req.user.id // Gán tự động
      });
  
      res.status(201).json({ post });
    } catch (err) {
      next(err);
    }
  };
  
  // Hàm kiểm tra URL
  const isValidUrl = (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };
  exports.updatePost = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { title, content, categoryId, featuredImage, images, videos, status } = req.body;
  
      // 1. Kiểm tra bài viết tồn tại
      const post = await Post.findById(id);
      if (!post) {
        return next(new AppError('Không tìm thấy bài viết', 404));
      }
  
      // 2. Validate category (nếu có thay đổi)
      if (categoryId && !mongoose.Types.ObjectId.isValid(categoryId)) {
        return next(new AppError('Danh mục không hợp lệ', 400));
      }
       // Kiểm tra quyền
      if (req.user.role === 'editor' && post.authorId.toString() !== req.user.id) {
        return next(new AppError('Bạn chỉ có thể sửa bài viết của mình', 403));
      }
      // 3. Cập nhật các trường được phép thay đổi
      const updates = {};
      if (title) updates.title = title;
      if (content) updates.content = content;
      if (categoryId) updates.categoryId = categoryId;
      if (featuredImage) updates.featuredImage = featuredImage;
      if (images) updates.images = images;
      if (videos) updates.videos = videos;
      if (status) updates.status = status;
  
      // 4. Tự động cập nhật slug nếu title thay đổi
      if (title) {
        updates.slug = title.toLowerCase().replace(/ /g, '-');
      }
  
      // 5. Lưu thay đổi
      const updatedPost = await Post.findByIdAndUpdate(id, updates, {
        new: true, // Trả về document sau khi update
        runValidators: true // Chạy validator trong schema
      }).populate('categoryId', 'name');
  
      res.status(200).json({
        status: 'success',
        data: { post: updatedPost }
      });
    } catch (err) {
      next(err);
    }
  };
exports.checkPostOwnership = async (req, res, next) => {
  const post = await Post.findById(req.params.id);
  
  // Chỉ admin hoặc tác giả bài viết được sửa
  if (req.user.role !== 'admin' && post.authorId.toString() !== req.user.id) {
    return next(new AppError('Bạn không có quyền chỉnh sửa bài viết này', 403));
  }
  
  next();
};
//Xóa
exports.deletePost = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 1. Kiểm tra bài viết tồn tại
    const post = await Post.findById(id);
    if (!post) {
      return next(new AppError('Không tìm thấy bài viết', 404));
    }

    // 2. SOFT DELETE (khuyến nghị) - Đánh dấu đã xóa thay vì xóa thật
    await Post.findByIdAndUpdate(id, { 
      status: 'deleted',
      deletedAt: Date.now(),
      deletedBy: req.user.id 
    });

    // Hoặc HARD DELETE (xóa thật) - Chỉ dùng nếu chắc chắn
    // await Post.findByIdAndDelete(id);

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (err) {
    next(err);
  }
};
// Lấy bài viết theo danh mục
exports.getPostsByCategory = async (req, res, next) => {
  const posts = await Post.find({ 
    categoryId: req.params.categoryId,
    status: 'published' 
  }).populate('authorId', 'username');

  res.status(200).json({
    status: 'success',
    results: posts.length,
    data: { posts }
  });
};