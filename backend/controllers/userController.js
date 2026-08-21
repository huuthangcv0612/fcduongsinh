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
    const { role, roles, isActive, position, phone, name } = req.body;

    const user = await User.findById(id);
    if (!user) {
      throw new AppError('NOT_FOUND', 'Không tìm thấy thành viên', 404);
    }

    const oldRole = user.role;

    if (roles !== undefined && Array.isArray(roles)) {
      user.roles = roles;
      if (roles.includes('admin')) {
        user.role = 'admin';
      } else if (roles.includes('treasurer')) {
        user.role = 'treasurer';
      } else if (roles.includes('member')) {
        user.role = 'member';
      } else {
        user.role = 'pending';
      }
    } else if (role !== undefined) {
      user.role = role;
      user.roles = [role];
    }

    if (isActive !== undefined) user.isActive = isActive;
    if (position !== undefined) user.position = position;
    if (phone !== undefined) user.phone = phone;
    if (name !== undefined) user.name = name;

    await user.save();

    // Nếu user được duyệt (từ pending sang member/admin/treasurer) và đang active,
    // thêm vào danh sách điểm danh của các trận đấu sắp tới
    if (oldRole === 'pending' && user.role !== 'pending' && user.isActive) {
      const Match = require('../models/Match');
      await Match.updateMany(
        { status: 'upcoming' },
        { 
          $addToSet: { 
            checkInList: { 
              userId: user._id, 
              status: 'pending',
              reason: '',
              updatedAt: new Date()
            } 
          } 
        }
      );
    }

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

    // Also delete user's finances and monthly funds
    const MonthlyFund = require('../models/MonthlyFund');
    await MonthlyFund.deleteMany({ userId: id });
    const Finance = require('../models/Finance');
    // If we want to delete their created transactions we can, but let's keep it to monthly funds for the grid
    // await Finance.deleteMany({ createdBy: id });
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
