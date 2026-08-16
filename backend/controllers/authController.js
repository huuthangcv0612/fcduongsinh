const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const MonthlyFund = require('../models/MonthlyFund');
const { AppError } = require('../middlewares/authMiddleware');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function generateToken(user) {
  return jwt.sign(
    { userId: user._id, role: user.role, email: user.email },
    process.env.JWT_SECRET || 'football_team_super_secret_jwt_key_2026',
    { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
  );
}

// Ensure primary Admin user exists & purge mock accounts
async function ensureAdminUser() {
  const adminEmail = (process.env.GMAIL_USER || 'tranduchoangh20@gmail.com').toLowerCase().trim();
  
  // Clean up mock demo accounts from DB
  await User.deleteMany({
    email: {
      $in: [
        'admin@fcnhatre.com',
        'nam.tran@fcnhatre.com',
        'duc.le@fcnhatre.com',
        'user.google@fcnhatre.com'
      ]
    }
  });

  let admin = await User.findOne({ email: adminEmail });

  if (!admin) {
    admin = await User.create({
      name: 'Trần Đức Hoàng (Admin)',
      email: adminEmail,
      role: 'admin',
      position: 'Tiền vệ',
      phone: '0901234567',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'
    });
    console.log(`🌱 Created primary Admin user: ${adminEmail}`);

    // Auto-create MonthlyFund for Admin
    await MonthlyFund.create({
      year: 2025,
      userId: admin._id,
      memberName: admin.name,
      months: { m1: 200000, m2: 200000, m3: 200000, m4: 200000, m5: 200000, m6: 200000, m7: 200000, m8: 200000, m9: 200000, m10: 200000, m11: 200000, m12: 200000 }
    }).catch(() => {});
  } else if (admin.role !== 'admin') {
    admin.role = 'admin';
    await admin.save();
  }
}

async function googleAuth(req, res, next) {
  try {
    const { id_token, credential, email: bodyEmail, name: bodyName, avatar: bodyAvatar } = req.body;
    const tokenToVerify = id_token || credential;

    let userEmail = bodyEmail;
    let userName = bodyName;
    let userPicture = bodyAvatar;
    let googleSubId = null;

    if (tokenToVerify) {
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken: tokenToVerify,
          audience: process.env.GOOGLE_CLIENT_ID
        });
        const payload = ticket.getPayload();
        userEmail = payload.email;
        userName = payload.name;
        userPicture = payload.picture;
        googleSubId = payload.sub;
      } catch (verifyErr) {
        console.warn('⚠️ Google Token verification fallback to payload:', verifyErr.message);
      }
    }

    if (!userEmail) {
      throw new AppError('VALIDATION_ERROR', 'Không thể xác thực thông tin Email từ Google', 400);
    }

    userEmail = userEmail.toLowerCase().trim();
    let user = await User.findOne({ email: userEmail });

    const adminEmail = (process.env.GMAIL_USER || 'tranduchoangh20@gmail.com').toLowerCase().trim();
    const isPrimaryAdmin = userEmail === adminEmail;

    if (!user) {
      user = await User.create({
        email: userEmail,
        name: userName || userEmail.split('@')[0],
        googleId: googleSubId,
        role: isPrimaryAdmin ? 'admin' : 'pending',
        avatar: userPicture || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(userEmail)}`
      });

      // ⚡ AUTOMATICALLY ADD NEW USER TO MONTHLY FUND GRID FOR 2025 & CURRENT YEAR!
      const currentYear = new Date().getFullYear();
      const yearsToInit = Array.from(new Set([2025, currentYear]));
      
      for (const y of yearsToInit) {
        await MonthlyFund.create({
          year: y,
          userId: user._id,
          memberName: user.name,
          months: { m1: 0, m2: 0, m3: 0, m4: 0, m5: 0, m6: 0, m7: 0, m8: 0, m9: 0, m10: 0, m11: 0, m12: 0 }
        }).catch(err => console.error('Auto MonthlyFund creation warning:', err.message));
      }
    } else {
      if (isPrimaryAdmin && user.role !== 'admin') {
        user.role = 'admin';
        await user.save();
      }
      if (googleSubId && !user.googleId) {
        user.googleId = googleSubId;
        await user.save();
      }
    }

    const token = generateToken(user);

    res.json({
      success: true,
      data: {
        token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          position: user.position,
          phone: user.phone
        }
      }
    });
  } catch (err) {
    next(err);
  }
}

async function devBypass(req, res, next) {
  try {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const adminEmail = (process.env.GMAIL_USER || 'tranduchoangh20@gmail.com').toLowerCase().trim();
    let user = await User.findOne({ email: adminEmail });

    if (!user) {
       await ensureAdminUser();
       user = await User.findOne({ email: adminEmail });
    }

    const token = generateToken(user);

    res.json({
      success: true,
      data: {
        token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          position: user.position,
          phone: user.phone
        }
      }
    });
  } catch (err) {
    next(err);
  }
}

async function getMe(req, res, next) {
  try {
    res.json({
      success: true,
      data: req.user
    });
  } catch (err) {
    next(err);
  }
}

async function updateProfile(req, res, next) {
  try {
    const { name, phone, position, avatar } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      throw new AppError('NOT_FOUND', 'Không tìm thấy thông tin tài khoản', 404);
    }

    if (name !== undefined) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (position !== undefined) user.position = position;
    if (avatar !== undefined) user.avatar = avatar;

    await user.save();

    // Also sync memberName in MonthlyFund if name changed
    if (name) {
      await MonthlyFund.updateMany({ userId: user._id }, { $set: { memberName: name } });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  googleAuth,
  getMe,
  updateProfile,
  ensureAdminUser,
  devBypass
};
