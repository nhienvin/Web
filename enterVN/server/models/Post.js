const mongoose = require('mongoose');

const timelineSchema = new mongoose.Schema({
  year: { type: Number, required: true },
  period: String, // Ví dụ: "Thời kỳ Bắc thuộc"
  events: [{
    title: String,
    description: String,
    exactDate: Date,
    images: [String]
  }]
});
const postSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Tiêu đề không được trống'],
    trim: true
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  content: {
    type: String,
    required: true
  },
  excerpt: {
    type: String,
    maxlength: 160 // Mô tả ngắn cho SEO
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  featuredImage: String,
  images: [String],
  videos: [String],
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  tags: [String],
  isDeleted: {
    type: Boolean,
    default: false,
    select: false // Ẩn khỏi kết quả mặc định
  },
  deletedAt: Date,
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

// Tự động tạo slug và excerpt
postSchema.pre('save', function(next) {
  this.slug = this.title.toLowerCase().replace(/ /g, '-');
  this.excerpt = this.content.substring(0, 160) + '...';
  next();
});
// Lọc tự động bài viết chưa xóa
postSchema.pre(/^find/, function(next) {
  this.where({ isDeleted: { $ne: true } });
  next();
});
postSchema.methods.addTimelineEvent = function(newEvent) {
  if (!this.isTimeline) {
    throw new Error('Chỉ áp dụng cho bài viết timeline');
  }
  
  this.timelineData.events.push(newEvent);
  return this.save();
};

postSchema.methods.removeTimelineEvent = function(eventId) {
  if (!this.isTimeline) {
    throw new Error('Chỉ áp dụng cho bài viết timeline');
  }

  this.timelineData.events = this.timelineData.events.filter(
    event => event._id.toString() !== eventId
  );
  return this.save();
};
// thêm validation cho timeline
postSchema.pre('validate', function(next) {
  if (this.isTimeline && !this.timelineData) {
    this.invalidate('timelineData', 'Timeline posts require timeline data');
  }
  if (this.isTimeline && !this.timelineData.year) {
    this.invalidate('timelineData.year', 'Year is required for timeline events');
  }
  next();
});
//Bổ sung timeline
postSchema.add({
  isTimeline: { type: Boolean, default: false },
  timelineData: timelineSchema
});
//Thêm hook tự động sắp xếp khi thêm sự kiện mới:
// server/models/Post.js
timelineSchema.pre('save', function(next) {
  if (this.isModified('timelineData.events')) {
    this.timelineData.events.sort((a, b) => {
      if (a.exactDate && b.exactDate) {
        return a.exactDate - b.exactDate;
      }
      return 0;
    });
  }
  next();
});
module.exports = mongoose.model('Post', postSchema);    