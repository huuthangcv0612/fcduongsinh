const User = require('../models/User');
const MonthlyFund = require('../models/MonthlyFund');
const { AppError } = require('../middlewares/authMiddleware');

async function getUsers(req, res, next) {
  try {
    const currentYear = new Date().getFullYear();
    const currentMonthNum = new Date().getMonth() + 1;
    const monthKey = `m${currentMonthNum}`;
    
    const users = await User.find().sort({ role: 1, name: 1 }).lean();

    // Check monthly fund payments for each user in current month from MonthlyFund
    const monthlyFunds = await MonthlyFund.find({ year: currentYear }).lean();
    
    const fundPaidAmount = new Map();
    monthlyFunds.forEach(fund => {
      if (fund.months && fund.months[monthKey] > 0) {
        fundPaidAmount.set(fund.userId?.toString(), fund.months[monthKey]);
      }
    });

    const formatted = users.map(user => ({
      ...user,
      isFundPaidThisMonth: fundPaidAmount.has(user._id.toString()),
      fundPaidThisMonth: fundPaidAmount.get(user._id.toString()) || 0
    }));

    res.json({
      success: true,
      data: formatted
    });
  } catch (err) {
    next(err);
  }
}

async function updateUser(req, res, next) {
  try {
    const { id } = req.params;
    const { role, isActive, position, phone, name } = req.body;

    const user = await User.findById(id);
    if (!user) {
      throw new AppError('NOT_FOUND', 'Không tìm thấy thành viên', 404);
    }

    if (role !== undefined) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;
    if (position !== undefined) user.position = position;
    if (phone !== undefined) user.phone = phone;
    if (name !== undefined) user.name = name;

    await user.save();

    res.json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
}

async function deleteUser(req, res, next) {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    
    if (!user) {
      throw new AppError('NOT_FOUND', 'Không tìm thấy thành viên', 404);
    }

    if (user.role === 'admin' && user.email === (process.env.GMAIL_USER || 'tranduchoangh20@gmail.com').toLowerCase()) {
      throw new AppError('FORBIDDEN', 'Không thể xóa tài khoản Admin gốc', 403);
    }

    await User.findByIdAndDelete(id);

    // Also delete user's finances if needed (optional, keeping it simple for now)
    
    res.json({
      success: true,
      message: 'Đã xóa tài khoản thành công'
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getUsers,
  updateUser,
  deleteUser
};
