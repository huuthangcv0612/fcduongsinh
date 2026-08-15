const FacebookGroup = require('../models/FacebookGroup');
const { AppError } = require('../middlewares/authMiddleware');

let hasSeededOnce = false;

// Seed default Facebook Groups for Hanoi ONLY ONCE at server startup
async function ensureSeedGroups(userId) {
  if (hasSeededOnce) return;

  const count = await FacebookGroup.countDocuments();
  if (count === 0) {
    await FacebookGroup.create([
      {
        name: 'Hội Tìm Đối Đá Bóng Hà Nội - Sân 7',
        url: 'https://facebook.com/groups/capkeobongdahanoi',
        homeArea: 'Hà Nội',
        isActive: true,
        createdBy: userId
      },
      {
        name: 'Cáp Kèo Bóng Đá Cầu Giấy & Nam Từ Liêm',
        url: 'https://facebook.com/groups/timdoibongdacaugiay',
        homeArea: 'Cầu Giấy',
        isActive: true,
        createdBy: userId
      },
      {
        name: 'Giao Hữu Bóng Đá Phủ Hà Nội / Thanh Xuân',
        url: 'https://facebook.com/groups/giaohubongdahanoi',
        homeArea: 'Thanh Xuân',
        isActive: true,
        createdBy: userId
      }
    ]);
    console.log('🌱 Seeded default Hanoi Facebook Groups for opponent searching');
  }
  hasSeededOnce = true;
}

async function getFacebookGroups(req, res, next) {
  try {
    await ensureSeedGroups(req.user._id);
    const groups = await FacebookGroup.find().sort({ createdAt: -1 }).lean();
    res.json({
      success: true,
      data: groups
    });
  } catch (err) {
    next(err);
  }
}

async function createFacebookGroup(req, res, next) {
  try {
    const { name, url, homeArea, description } = req.body;

    if (!url || !url.includes('facebook.com')) {
      throw new AppError('VALIDATION_ERROR', 'Đường dẫn Facebook Group phải là URL facebook.com hợp lệ', 400);
    }

    const group = await FacebookGroup.create({
      name: name || 'Group Cáp Kèo Hà Nội',
      url,
      homeArea: homeArea || 'Hà Nội',
      description: description || '',
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      data: group
    });
  } catch (err) {
    if (err.code === 11000) {
      return next(new AppError('CONFLICT', 'Đường dẫn Facebook Group này đã tồn tại trong hệ thống', 409));
    }
    next(err);
  }
}

async function updateFacebookGroup(req, res, next) {
  try {
    const { id } = req.params;
    const { name, url, homeArea, isActive, description } = req.body;

    const group = await FacebookGroup.findById(id);
    if (!group) {
      throw new AppError('NOT_FOUND', 'Không tìm thấy Facebook Group', 404);
    }

    if (name !== undefined) group.name = name;
    if (url !== undefined) group.url = url;
    if (homeArea !== undefined) group.homeArea = homeArea;
    if (isActive !== undefined) group.isActive = isActive;
    if (description !== undefined) group.description = description;

    await group.save();

    res.json({
      success: true,
      data: group
    });
  } catch (err) {
    next(err);
  }
}

async function deleteFacebookGroup(req, res, next) {
  try {
    const { id } = req.params;
    const group = await FacebookGroup.findByIdAndDelete(id);

    if (!group) {
      throw new AppError('NOT_FOUND', 'Không tìm thấy Facebook Group để xóa', 404);
    }

    res.json({
      success: true,
      data: { id }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getFacebookGroups,
  createFacebookGroup,
  updateFacebookGroup,
  deleteFacebookGroup
};
