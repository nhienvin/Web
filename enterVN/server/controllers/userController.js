// server/controllers/userController.js
const User = require('../models/User');
const AppError = require('../utils/appError'); // Tạo file utils/appError.js nếu chưa có

// Helper function: Kiểm tra hợp lệ khi thay đổi role
const validateRoleChange = (currentUserRole, targetRole) => {
  const roleHierarchy = ['admin', 'editor', 'user'];
  
  // Admin có thể thay đổi tất cả role
  if (currentUserRole === 'admin') return true;
  
  // Editor chỉ có thể thay đổi role 'user'
  if (currentUserRole === 'editor' && targetRole === 'user') return true;
  
  return false;
};
// server/controllers/userController.js
exports.createUser = async (req, res) => {
  try {
    const newUser = await User.create(req.body);
    
    // Trả về dữ liệu user đã tạo (không bao gồm password)
    const userWithoutPassword = newUser.toObject();
    delete userWithoutPassword.password;
    
    res.status(201).json({
      status: 'success',
      data: userWithoutPassword
    });
  } catch (err) {
    res.status(400).json({
      status: 'error',
      message: err.message
    });
  }
};
// [1] Cập nhật role cho user (Admin/Editor)
exports.updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    const targetUser = await User.findById(req.params.id);
    
    // Kiểm tra điều kiện
    if (!targetUser) {
      return next(new AppError('Không tìm thấy user', 404));
    }
    
    if (!validateRoleChange(req.user.role, role)) {
      return next(new AppError('Bạn không có quyền thực hiện thay đổi này', 403));
    }
    
    // Cập nhật role
    targetUser.role = role;
    await targetUser.save();
    
    res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: targetUser._id,
          username: targetUser.username,
          role: targetUser.role
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

// [2] Lấy danh sách user theo role (Admin)
exports.getUsersByRole = async (req, res, next) => {
  try {
    const { role } = req.query;
    
    // Validate role query
    const validRoles = ['admin', 'editor', 'user'];
    if (role && !validRoles.includes(role)) {
      return next(new AppError('Role không hợp lệ', 400));
    }
    
    const filter = role ? { role } : {};
    const users = await User.find(filter).select('-password');
    
    res.status(200).json({
      status: 'success',
      results: users.length,
      data: { users }
    });
  } catch (err) {
    next(err);
  }
};


// Get user by id
exports.getUser = async (req, res) => {
  try {
    console.log("req.params.id: " + req.params.id);
    const user = await User.findById(req.params.id).select('-password');
    res.status(200).json({
      status: 'success',
      data: { user }
    });
  } catch (err) {
    res.status(404).json({
      status: 'fail',
      message: 'User not found'
    });
  }
};
// [3] Middleware kiểm tra quyền chỉnh sửa user
exports.checkUserPermission = async (req, res, next) => {
  try {
    const targetUser = await User.findById(req.params.id);
    
    // Admin có thể chỉnh sửa tất cả
    if (req.user.role === 'admin') return next();
    
    // Editor chỉ được sửa chính mình
    if (req.user.role === 'editor' && targetUser._id.equals(req.user._id)) {
      return next();
    }
    
    // User thường không có quyền
    next(new AppError('Bạn không có quyền thực hiện hành động này', 403));
  } catch (err) {
    next(err);
  }
};

// [4] Cập nhật thông tin user (có kiểm tra permission)
exports.updateUser = async (req, res, next) => {
  try {
    // Loại bỏ trường không được phép cập nhật
    
    const filteredBody = { ...req.body };
    const restrictedFields = ['password'];
    restrictedFields.forEach(field => delete filteredBody[field]);
    
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      filteredBody,
      { new: true, runValidators: true }
    ).select('-password');
    
    res.status(200).json({
      status: 'success',
      data: { user: updatedUser }
    });
  } catch (err) {
    next(err);
  }
};
//Xóa user
exports.deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: 'Xóa user thất bại'
    });
  }
};
//Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.status(200).json({
      status: 'success',
      data: {users}
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};