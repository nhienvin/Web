require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

const createAdmin = async () => {
  // Kết nối DB
  await mongoose.connect(process.env.MONGO_URI);

  // Kiểm tra đã có admin chưa
  const existingAdmin = await User.findOne({ role: 'admin' });
  if (existingAdmin) {
    console.log('Admin đã tồn tại:', existingAdmin.email);
    process.exit();
  }

  // Tạo admin
  const admin = await User.create({
    username: 'admin',
    email: 'admin@gmail.com',
    password: 'abc@123', 
    role: 'admin'
  });
  await admin.save({ validateBeforeSave: false }); // Bỏ qua validate
  console.log('✅ Tạo admin thành công:\n', {
    email: admin.email,
    password: 'abc@123' // Nhớ đổi sau khi ghi lại
  });
  process.exit();
};

const testHash = async () => {
  const hash = await bcrypt.hash('abc@123', 12);
  console.log('New hash:', hash);
  console.log('Compare result:', await bcrypt.compare('abc@123', hash));
};
// testHash();

createAdmin();