const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Tên danh mục không được trống'],
    trim: true
  },
  slug: { 
    type: String, 
    unique: true,
    lowercase: true
  },
  parentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Category',
    default: null 
  },
  level: { 
    type: Number, 
    enum: [1, 2, 3], // 3 cấp
    required: true 
  }
}, { timestamps: true });

// Tự động tạo slug trước khi save
categorySchema.pre('save', function(next) {
  // Chỉ cập nhật slug khi name thay đổi hoặc slug chưa tồn tại
  if (this.isModified('name') || !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/ /g, '-');
      //.replace(/[^\w-]+/g, ''); // Loại bỏ ký tự đặc biệt
  }
  if (this.parentId && this.level > 3) {
    throw new Error('Không thể vượt quá 3 cấp danh mục');
  }
  next();
});
categorySchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate();
  if (update.name) {
    update.slug = update.name
      .toLowerCase()
      .replace(/ /g, '-');
      //.replace(/[^\w-]+/g, '');
  }
  next();
});
categorySchema.index({ parentId: 1 });
module.exports = mongoose.model('Category', categorySchema);