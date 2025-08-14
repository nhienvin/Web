// server/controllers/authController.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/appError');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '90d'
  });
};
exports.register = async (req, res, next) => {
  try {
    const { username, email, password, role } = req.body;
    
    // [SỬA TẠI ĐÂY] 
    // Chỉ cho phép tạo role 'user' mặc định nếu không có quyền admin
    const finalRole = req.user?.role === 'admin' ? role || 'user' : 'user';

    const newUser = await User.create({
      username,
      email,
      password,
      role: finalRole // Sử dụng role đã kiểm tra
    });

    const token = signToken(newUser._id);

    res.status(201).json({
      status: 'success',
      token,
      data: {
        user: {
          id: newUser._id,
          role: newUser.role
        }
      }
    });
  } catch (err) {
    next(err);
  }
};


exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // 1. Check username và password có tồn tại
    if (!username || !password) {
      return next(new AppError('Vui lòng cung cấp username và mật khẩu', 400));
    }
    // 2. Kiểm tra user tồn tại
    const user = await User.findOne({ username }).select('+password');
    if (!user) {
      return next(new AppError('User không tồn tại', 401));
    }
    // 3. Kiểm tra password (sử dụng phương thức mới)ư
    const isCorrect = await user.correctPassword(password, user.password);
    if (!isCorrect) {
      return next(new AppError('Mật khẩu không đúng', 401));
    }
    // 4. Tạo token
    const token = signToken(user._id);
    // 5. Gửi response (loại bỏ password)
    user.password = undefined;
    res.status(200).json({
      status: 'success',
      token,
      data: {
        user: { // Đảm bảo có đủ thông tin user
          _id: user._id,
          username: user.username,
          role: user.role
          // ... các trường khác
        }
      }
    });
  } catch (err) {
    next(err);
  }
};
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.status(200).json({
      status: 'success',
      data: { user }
    });
  } catch (err) {
    res.status(401).json({
      status: 'fail',
      message: 'Phiên đăng nhập hết hạn'
    });
  }
};
// server/controllers/authController.js
exports.logout = async (req, res) => {
  try {
    // Nếu dùng JWT qua cookie
    //res.clearCookie('token');
    
    // Hoặc nếu dùng JWT qua header (thường chỉ cần client xóa token)
    res.status(200).json({
      status: 'success',
      message: 'Đăng xuất thành công'
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Lỗi khi đăng xuất'
    });
  }
};
