const User = require('../models/User');
const Post = require('../models/Post');
const Category = require('../models/Category');
const AppError = require('../utils/appError');

// Stats endpoint (ví dụ)
exports.getStats = async (req, res, next) => {
  // try {
  //   const userCount = await User.countDocuments();
  //   const activeUsers = await User.countDocuments({ isActive: true });
    
  //   res.status(200).json({
  //     status: 'success',
  //     data: {
  //       stats: {
  //         userCount,
  //         activeUsers
  //         // Thêm các thống kê khác tại đây
  //       }
  //     }
  //   });
  // } catch (err) {
  //   next(err);
  // }
  try {
    const posts = await Post.countDocuments();
    const users = await User.countDocuments({ isActive: true });
    const categories = await Category.countDocuments();
    const timelineEvents = await Post.countDocuments({ isTimeline: true });
    res.json({
      status: 'success',
      data: { posts, users, categories, timelineEvents }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
};
// Thêm các hàm quản trị khác tại đây...