// server/middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  try {
    // 1. Lấy token từ header
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ error: 'Vui lòng đăng nhập' });
    }

    // 2. Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. Kiểm tra user còn tồn tại
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return res.status(401).json({ error: 'Người dùng không tồn tại' });
    }

    // 4. Gán user vào request
    req.user = currentUser;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Phiên đăng nhập không hợp lệ' });
  }
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Bạn không có quyền thực hiện hành động này' 
      });
    }
    next();
  };
};