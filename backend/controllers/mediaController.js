const Media = require('../models/Media');
const { uploadMedia } = require('../services/cloudinaryService');
const { AppError } = require('../middlewares/authMiddleware');

async function getMedia(req, res, next) {
  try {
    const { matchId } = req.query;
    const filter = {};
    if (matchId) filter.matchId = matchId;

    const media = await Media.find(filter)
      .populate('uploadedBy', 'name avatar')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: media });
  } catch (err) {
    next(err);
  }
}

async function uploadFile(req, res, next) {
  try {
    const { title, matchId } = req.body;
    
    // We expect a base64 string from frontend for simplicity, 
    // or we can handle multer. For this app, let's assume req.body.file contains base64 string
    const { file } = req.body;
    
    if (!file) {
      throw new AppError('VALIDATION_ERROR', 'Vui lòng chọn file để upload', 400);
    }

    // Determine type from base64 string
    const isVideo = file.startsWith('data:video');
    const type = isVideo ? 'video' : 'image';

    const url = await uploadMedia(file);

    const media = new Media({
      title: title || '',
      type,
      url,
      matchId: matchId || null,
      uploadedBy: req.user._id
    });

    await media.save();

    const populatedMedia = await Media.findById(media._id).populate('uploadedBy', 'name avatar');

    res.json({ success: true, data: populatedMedia });
  } catch (err) {
    next(err);
  }
}

async function addLink(req, res, next) {
  try {
    const { title, matchId, url } = req.body;
    
    if (!url) {
      throw new AppError('VALIDATION_ERROR', 'Vui lòng nhập đường dẫn liên kết', 400);
    }

    const media = new Media({
      title: title || '',
      type: 'link',
      url,
      matchId: matchId || null,
      uploadedBy: req.user._id
    });

    await media.save();

    const populatedMedia = await Media.findById(media._id).populate('uploadedBy', 'name avatar');

    res.json({ success: true, data: populatedMedia });
  } catch (err) {
    next(err);
  }
}

async function deleteMedia(req, res, next) {
  try {
    const { id } = req.params;
    const media = await Media.findById(id);

    if (!media) {
      throw new AppError('NOT_FOUND', 'Không tìm thấy media', 404);
    }

    if (media.uploadedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      throw new AppError('FORBIDDEN', 'Bạn không có quyền xóa ảnh này', 403);
    }

    await Media.findByIdAndDelete(id);

    res.json({ success: true, message: 'Đã xóa media thành công' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getMedia,
  uploadFile,
  addLink,
  deleteMedia
};
