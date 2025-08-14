const Post = require('../models/Post');
const AppError = require('../utils/appError');

exports.createTimelineEvent = async (req, res, next) => {
  try {
    const { year, period, events } = req.body;
    
    // Kiểm tra quyền editor chỉ được thêm vào category Lịch sử
    if (req.user.role === 'editor') {
      const category = await Category.findById(req.body.categoryId);
      if (category.name !== 'Lịch sử') {
        return next(new AppError('Editor chỉ được thêm sự kiện vào mục Lịch sử', 403));
      }
    }

    const timelinePost = await Post.create({
      title: `Timeline ${period || year}`,
      categoryId: req.body.categoryId,
      authorId: req.user.id,
      isTimeline: true,
      timelineData: { year, period, events }
    });

    res.status(201).json({
      status: 'success',
      data: { post: timelinePost }
    });
  } catch (err) {
    next(err);
  }
};

exports.getAllTimelineEvents = async (req, res, next) => {
  try {
    // Admin xem tất cả, Editor chỉ xem bài của mình
    const filter = { isTimeline: true };
    if (req.user.role === 'editor') {
      filter.authorId = req.user.id;
    }

    const posts = await Post.find(filter).sort('-timelineData.year');

    res.status(200).json({
      status: 'success',
      results: posts.length,
      data: { posts }
    });
  } catch (err) {
    next(err);
  }
};
// server/controllers/timelineController.js
exports.getTimelineByYear = async (req, res, next) => {
  try {
    const posts = await Post.find({
      'timelineData.year': req.params.year,
      isTimeline: true
    }).sort('timelineData.events.exactDate');

    res.status(200).json({
      status: 'success',
      results: posts.length,
      data: { posts }
    });
  } catch (err) {
    next(err);
  }
};
exports.updateTimelineEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { year, period, events } = req.body;

    // 1. Kiểm tra bài viết tồn tại và là timeline
    const post = await Post.findOne({
      _id: id,
      isTimeline: true
    });

    if (!post) {
      return next(new AppError('Không tìm thấy timeline sự kiện', 404));
    }

    // 2. Kiểm tra quyền: Editor chỉ được sửa bài của mình
    if (req.user.role === 'editor' && post.authorId.toString() !== req.user.id) {
      return next(new AppError('Bạn chỉ có thể sửa timeline của mình', 403));
    }

    // 3. Cập nhật dữ liệu
    const updatedData = {
      'timelineData.year': year || post.timelineData.year,
      'timelineData.period': period || post.timelineData.period,
      'timelineData.events': events || post.timelineData.events
    };

    // 4. Thực hiện update
    const updatedPost = await Post.findByIdAndUpdate(
      id,
      updatedData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      status: 'success',
      data: { post: updatedPost }
    });
  } catch (err) {
    next(err);
  }
};
exports.deleteTimelineEvent = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 1. Kiểm tra bài viết tồn tại
    const post = await Post.findById(id);
    if (!post || !post.isTimeline) {
      return next(new AppError('Không tìm thấy timeline sự kiện', 404));
    }

    // 2. Chỉ admin mới được xóa
    if (req.user.role !== 'admin') {
      return next(new AppError('Chỉ admin mới được xóa timeline', 403));
    }

    // 3. Thực hiện soft delete (không xóa hoàn toàn)
    post.isDeleted = true;
    post.deletedAt = new Date();
    post.deletedBy = req.user.id;
    await post.save();

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (err) {
    next(err);
  }
};
//Lấy sự kiện theo thời kỳ/ năm
exports.getEventsByPeriod = async (req, res, next) => {
  try {
    const { period } = req.params;
    let query = { isTimeline: true };

    // Xử lý query theo period (có thể là năm hoặc tên thời kỳ)
    if (!isNaN(period)) {
      // Nếu period là số => tìm theo năm
      query['timelineData.year'] = parseInt(period);
    } else {
      // Tìm theo tên thời kỳ (không phân biệt hoa thường)
      query['timelineData.period'] = new RegExp(period, 'i');
    }

    // Admin xem tất cả, Editor chỉ xem bài của mình
    if (req.user.role === 'editor') {
      query.authorId = req.user.id;
    }

    const posts = await Post.find(query)
      .sort('timelineData.events.exactDate')
      .populate('authorId', 'username');

    // Gom nhóm sự kiện theo năm/thời kỳ
    const timelineData = posts.reduce((acc, post) => {
      const key = post.timelineData.period || post.timelineData.year.toString();
      if (!acc[key]) {
        acc[key] = {
          period: post.timelineData.period,
          year: post.timelineData.year,
          events: []
        };
      }
      acc[key].events.push(...post.timelineData.events);
      return acc;
    }, {});

    res.status(200).json({
      status: 'success',
      data: {
        timeline: Object.values(timelineData),
        totalEvents: posts.reduce((sum, post) => sum + post.timelineData.events.length, 0)
      }
    });
  } catch (err) {
    next(err);
  }
};
// Thêm vào timelineController.js
exports.addEventToTimeline = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    
    // Kiểm tra quyền
    if (req.user.role === 'editor' && post.authorId.toString() !== req.user.id) {
      return next(new AppError('Bạn chỉ có thể thêm sự kiện vào timeline của mình', 403));
    }

    const updatedPost = await post.addTimelineEvent(req.body);
    
    res.status(201).json({
      status: 'success',
      data: { post: updatedPost }
    });
  } catch (err) {
    next(err);
  }
};

exports.removeEventFromTimeline = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    
    // Kiểm tra quyền
    if (req.user.role === 'editor' && post.authorId.toString() !== req.user.id) {
      return next(new AppError('Bạn chỉ có thể xóa sự kiện trong timeline của mình', 403));
    }

    const updatedPost = await post.removeTimelineEvent(req.body.eventId);
    
    res.status(200).json({
      status: 'success',
      data: { post: updatedPost }
    });
  } catch (err) {
    next(err);
  }
};