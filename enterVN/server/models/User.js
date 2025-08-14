// server/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false },
  email: { type: String, required: true, unique: true },
  role: { 
    type: String, 
    enum: ['admin', 'editor', 'user'], 
    default: 'user' 
  },
  isActive: { type: Boolean, default: true }
});

// Hash password trước khi lưu
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Thêm phương thức so sánh password
// userSchema.methods.correctPassword = async function(
//   candidatePassword,
//    // Password người dùng nhập
//   userPassword // Password đã hash trong DB
// ) {
//   return await bcrypt.compare(candidatePassword, userPassword);
// };

// Ngăn chặn timing attack
userSchema.methods.correctPassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};
module.exports = mongoose.model('User', userSchema);