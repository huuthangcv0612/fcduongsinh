const jwt = require('jsonwebtoken');
const User = require('../models/User');

class AppError extends Error {
  constructor(code, message, status = 400, details = null) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('UNAUTHORIZED', 'Thiếu hoặc sai định dạng Auth token', 401);
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new AppError('UNAUTHORIZED', 'Token không hợp lệ', 401);
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'football_team_super_secret_jwt_key_2026');
    } catch (jwtErr) {
      throw new AppError('UNAUTHORIZED', 'Token đã hết hạn hoặc không hợp lệ', 401);
    }

    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      throw new AppError('UNAUTHORIZED', 'Tài khoản không tồn tại hoặc đã bị khóa', 401);
    }

    if (user.role === 'pending' && !req.originalUrl.includes('/auth/me')) {
      throw new AppError('FORBIDDEN', 'Tài khoản của bạn đang chờ Admin phê duyệt', 403);
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { authMiddleware, AppError };
