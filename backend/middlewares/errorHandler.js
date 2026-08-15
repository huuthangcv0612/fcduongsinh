function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const code = err.code || 'INTERNAL_SERVER_ERROR';
  const message = err.message || 'Đã xảy ra lỗi hệ thống';
  const details = err.details || null;

  if (status === 500) {
    console.error('🔥 [Server Error]:', err);
  }

  res.status(status).json({
    success: false,
    error: {
      code,
      message,
      details
    }
  });
}

module.exports = errorHandler;
