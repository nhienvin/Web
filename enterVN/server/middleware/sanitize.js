// server/middleware/sanitize.js
const xss = require('xss-clean');

module.exports = () => (req, res, next) => {
  // [FIX] Whitelist tất cả API routes
  if (req.path.startsWith('/api/v1')) {
    return next();
  }

  // Xử lý XSS cho các route khác
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = xss(req.body[key]);
      }
    });
  }
  next();
};