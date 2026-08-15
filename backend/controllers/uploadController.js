const { uploadImage } = require('../services/cloudinaryService');
const User = require('../models/User');
const { AppError } = require('../middlewares/authMiddleware');

async function uploadAvatar(req, res, next) {
  try {
    const { image } = req.body;
    if (!image) {
      throw new AppError('VALIDATION_ERROR', 'Vui lòng cung cấp dữ liệu hình ảnh', 400);
    }

    const imageUrl = await uploadImage(image, 'avatars');

    // Automatically update req.user avatar in DB if logged in
    if (req.user) {
      req.user.avatar = imageUrl;
      await req.user.save();
    }

    res.json({
      success: true,
      data: {
        url: imageUrl,
        user: req.user
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  uploadAvatar
};
