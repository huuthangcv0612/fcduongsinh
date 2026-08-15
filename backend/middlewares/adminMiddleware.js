const { AppError } = require('./authMiddleware');

function adminMiddleware(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return next(new AppError('FORBIDDEN', 'Quyền hạn không đủ. Yêu cầu tài khoản Admin.', 403));
  }
  next();
}

module.exports = adminMiddleware;
