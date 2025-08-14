// utils/cloudinary.js
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: 'your_cloud',
  api_key: 'your_key',
  api_secret: 'your_secret'
});

exports.optimizeImageUrl = (url) => {
  // Thêm param chất lượng/tối ưu
  if (url.includes('res.cloudinary.com')) {
    return url.replace('/upload/', '/upload/q_auto,f_auto/');
  }
  return url;
};