const { AppError } = require('./authMiddleware');

function isUserAdmin(user) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (Array.isArray(user.roles) && user.roles.includes('admin')) return true;
  return false;
}

function isUserTreasurer(user) {
  if (!user) return false;
  if (user.role === 'treasurer' || user.role === 'admin') return true;
  if (Array.isArray(user.roles) && (user.roles.includes('treasurer') || user.roles.includes('admin'))) return true;
  return false;
}

function adminMiddleware(req, res, next) {
  if (!isUserAdmin(req.user)) {
    return next(new AppError('FORBIDDEN', 'Quyền hạn không đủ. Yêu cầu tài khoản Admin.', 403));
  }
  next();
}

function treasurerOrAdminMiddleware(req, res, next) {
  if (!isUserTreasurer(req.user) && !isUserAdmin(req.user)) {
    return next(new AppError('FORBIDDEN', 'Quyền hạn không đủ. Yêu cầu tài khoản Thủ quỹ hoặc Admin.', 403));
  }
  next();
}

adminMiddleware.adminMiddleware = adminMiddleware;
adminMiddleware.treasurerOrAdminMiddleware = treasurerOrAdminMiddleware;
adminMiddleware.isUserAdmin = isUserAdmin;
adminMiddleware.isUserTreasurer = isUserTreasurer;

module.exports = adminMiddleware;

