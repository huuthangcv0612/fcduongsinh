const Finance = require('../models/Finance');
const MonthlyFund = require('../models/MonthlyFund');
const FundSubmission = require('../models/FundSubmission');
const TeamConfig = require('../models/TeamConfig');
const User = require('../models/User');
const { AppError } = require('../middlewares/authMiddleware');
const { CreateFinanceSchema, BulkUpdateFinanceSchema } = require('../validators/schemas');
const { sendFundNotification } = require('../services/mailerService');
const { uploadImage } = require('../services/cloudinaryService');
const Notification = require('../models/Notification');
const PushSubscription = require('../models/PushSubscription');
const { sendNotification } = require('../utils/webPush');

const ZERO_MONTHS = {
  m1: 0, m2: 0, m3: 0, m4: 0, m5: 0, m6: 0,
  m7: 0, m8: 0, m9: 0, m10: 0, m11: 0, m12: 0
};

async function createFinance(req, res, next) {
  try {
    const validation = CreateFinanceSchema.safeParse(req.body);
    if (!validation.success) {
      throw new AppError('VALIDATION_ERROR', 'Dữ liệu phiếu thu/chi không hợp lệ', 400, validation.error.issues);
    }

    const finance = await Finance.create({
      ...validation.data,
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      data: finance
    });
  } catch (err) {
    next(err);
  }
}

async function bulkUpdateFinances(req, res, next) {
  try {
    const validation = BulkUpdateFinanceSchema.safeParse(req.body);
    if (!validation.success) {
      throw new AppError('VALIDATION_ERROR', 'Dữ liệu chỉnh sửa Data Grid không hợp lệ', 400, validation.error.issues);
    }

    const { updates } = validation.data;
    const bulkOps = [];
    const updatedIds = [];
    const failedItems = [];

    for (const item of updates) {
      const { _id, ...fieldsToUpdate } = item;
      if (!_id) continue;

      bulkOps.push({
        updateOne: {
          filter: { _id },
          update: { $set: fieldsToUpdate }
        }
      });
      updatedIds.push(_id);
    }

    if (bulkOps.length > 0) {
      await Finance.bulkWrite(bulkOps);
    }

    res.json({
      success: true,
      data: {
        updated: updatedIds,
        failed: failedItems
      }
    });
  } catch (err) {
    next(err);
  }
}

async function getFinances(req, res, next) {
  try {
    const finances = await Finance.find()
      .sort({ createdAt: -1 })
      .populate('userId', 'name email avatar')
      .populate('matchId', 'date time stadium opponent')
      .populate('createdBy', 'name')
      .lean();

    res.json({
      success: true,
      data: finances
    });
  } catch (err) {
    next(err);
  }
}

async function getBalance(req, res, next) {
  try {
    const result = await Finance.aggregate([
      {
        $group: {
          _id: null,
          totalIn: { $sum: { $cond: [{ $eq: ['$type', 'IN'] }, '$amount', 0] } },
          totalOut: { $sum: { $cond: [{ $eq: ['$type', 'OUT'] }, '$amount', 0] } }
        }
      },
      {
        $project: {
          _id: 0,
          totalIn: 1,
          totalOut: 1,
          balance: { $subtract: ['$totalIn', '$totalOut'] }
        }
      }
    ]);

    const stats = result[0] || { totalIn: 0, totalOut: 0, balance: 0 };

    // Bổ sung tổng quỹ tháng thu được từ bảng ma trận (MonthlyFund)
    const monthlyFunds = await MonthlyFund.find().lean();
    let totalMonthlyFund = 0;
    
    monthlyFunds.forEach(fund => {
      if (fund.months) {
        Object.values(fund.months).forEach(amount => {
          if (typeof amount === 'number' && amount > 0) {
            totalMonthlyFund += amount;
          }
        });
      }
    });

    stats.totalIn += totalMonthlyFund;
    stats.balance += totalMonthlyFund;

    res.json({
      success: true,
      data: stats
    });
  } catch (err) {
    next(err);
  }
}

async function deleteFinance(req, res, next) {
  try {
    const { id } = req.params;
    const item = await Finance.findByIdAndDelete(id);

    if (!item) {
      throw new AppError('NOT_FOUND', 'Không tìm thấy phiếu thu/chi', 404);
    }

    res.json({
      success: true,
      data: { id }
    });
  } catch (err) {
    next(err);
  }
}

// -------------------------------------------------------------
// 📊 GOOGLE SHEETS STYLE MONTHLY FUND MATRIX CONTROLLERS
// -------------------------------------------------------------

async function getMonthlyGrid(req, res, next) {
  try {
    const year = Number(req.query.year) || 2025;

    // 1. Auto-sync active DB users into MonthlyFund table for this year
    const activeUsers = await User.find({ isActive: true }).lean();
    for (const u of activeUsers) {
      const existing = await MonthlyFund.findOne({ year, userId: u._id });
      if (!existing) {
        await MonthlyFund.create({
          year,
          userId: u._id,
          memberName: u.name,
          months: ZERO_MONTHS
        });
      }
    }

    // 2. Fetch and populate real User data
    let list = await MonthlyFund.find({ year })
      .populate('userId', 'name email avatar position role phone')
      .sort({ createdAt: 1 })
      .lean();

    res.json({
      success: true,
      data: list
    });
  } catch (err) {
    next(err);
  }
}

async function updateMonthlyCell(req, res, next) {
  try {
    const { id, monthKey, amount } = req.body;
    if (!id || !monthKey) {
      throw new AppError('VALIDATION_ERROR', 'Thiếu ID hoặc ô tháng cần cập nhật', 400);
    }

    const numAmount = Number(amount) || 0;
    const updateObj = {};
    updateObj[`months.${monthKey}`] = numAmount;

    const updated = await MonthlyFund.findByIdAndUpdate(
      id,
      { $set: updateObj },
      { new: true }
    ).populate('userId', 'name email avatar position role phone');

    res.json({
      success: true,
      data: updated
    });
  } catch (err) {
    next(err);
  }
}

async function addMonthlyMember(req, res, next) {
  try {
    const { memberName, year } = req.body;
    if (!memberName || !memberName.trim()) {
      throw new AppError('VALIDATION_ERROR', 'Vui lòng nhập tên thành viên', 400);
    }

    const cleanName = memberName.trim();
    // 1. Create a real User document in User collection if not already exists
    let user = await User.findOne({ name: { $regex: new RegExp(`^${cleanName}$`, 'i') } });
    if (!user) {
      const slug = cleanName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
      user = await User.create({
        name: cleanName,
        email: `${slug || 'member'}_${Date.now()}@fcnhatre.local`,
        role: 'member',
        monthlyFund: 200000,
        position: 'Tự do'
      });
    }

    const targetYear = Number(year) || new Date().getFullYear();

    let newDoc = await MonthlyFund.findOne({ year: targetYear, userId: user._id });
    if (!newDoc) {
      newDoc = await MonthlyFund.create({
        year: targetYear,
        userId: user._id,
        memberName: user.name,
        months: ZERO_MONTHS
      });
    }

    const populated = await MonthlyFund.findById(newDoc._id).populate('userId', 'name email avatar position role phone').lean();

    res.status(201).json({
      success: true,
      data: populated
    });
  } catch (err) {
    next(err);
  }
}

async function deleteMonthlyMember(req, res, next) {
  try {
    const { id } = req.params;
    await MonthlyFund.findByIdAndDelete(id);
    res.json({
      success: true,
      data: { id }
    });
  } catch (err) {
    next(err);
  }
}

async function sendFundEmail(req, res, next) {
  try {
    const { month, message, qrImage, sendEmail = true } = req.body;
    
    if (!month) {
      throw new AppError('VALIDATION_ERROR', 'Vui lòng chọn tháng đóng quỹ', 400);
    }

    let qrUrl = null;
    if (qrImage) {
      qrUrl = await uploadImage(qrImage, 'finances');
    }

    const users = await User.find({});
    
    // Fire and forget email
    if (sendEmail) {
      sendFundNotification(users, month, message, qrUrl).catch(err => {
        console.error('Non-blocking mail error:', err.message);
      });
    }

    // Create in-app notification
    const title = `Thông báo quỹ tháng ${month}`;
    const link = `/finances${qrUrl ? `?qrUrl=${encodeURIComponent(qrUrl)}` : ''}`;
    
    await Notification.create({
      recipient: null, // all users
      title,
      message,
      type: 'fund',
      link
    });

    // Send Push Notification
    const subscriptions = await PushSubscription.find();
    const pushPayload = { title, body: message, url: link, type: 'fund' };
    
    subscriptions.forEach(async (sub) => {
      try {
        await sendNotification(sub.subscription, pushPayload);
      } catch (error) {
        if (error.message === 'SubscriptionExpired') {
          await PushSubscription.findByIdAndDelete(sub._id);
        }
      }
    });

    res.json({
      success: true,
      message: 'Đã gửi thông báo đóng quỹ thành công đến tất cả thành viên.'
    });
  } catch (err) {
    next(err);
  }
}

async function getMyFundStatus(req, res, next) {
  try {
    const user = req.user;
    if (!user) {
      return res.json({ success: true, data: { isUnpaid: false } });
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentMonthKey = `m${currentMonth}`;
    const monthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

    // Get Fund Config for monthly fee
    const fundConfig = await TeamConfig.findOne({ key: 'fund_config' }).lean();
    const requiredAmount = fundConfig?.monthlyFee || user.monthlyFund || 200000;

    // 1. Find user's MonthlyFund for this year
    let monthlyRecord = await MonthlyFund.findOne({ year: currentYear, userId: user._id }).lean();
    if (!monthlyRecord && user.name) {
      monthlyRecord = await MonthlyFund.findOne({ year: currentYear, memberName: user.name }).lean();
    }

    const paidAmount = monthlyRecord?.months?.[currentMonthKey] || 0;

    // 2. Check if user has a pending fund submission for this month
    const pendingSubmission = await FundSubmission.findOne({
      userId: user._id,
      status: 'pending',
      months: monthStr
    }).lean();

    const isPaidInFull = paidAmount >= requiredAmount;
    const isUnpaid = !isPaidInFull && !pendingSubmission;

    res.json({
      success: true,
      data: {
        isUnpaid,
        isPaidInFull,
        hasPendingSubmission: Boolean(pendingSubmission),
        currentMonth,
        currentYear,
        paidAmount,
        requiredAmount,
        remainingAmount: Math.max(0, requiredAmount - paidAmount),
        fundConfig: fundConfig ? {
          bankName: fundConfig.bankName,
          bankCode: fundConfig.bankCode,
          accountNumber: fundConfig.accountNumber,
          accountName: fundConfig.accountName,
          customQrUrl: fundConfig.customQrUrl,
          transferPrefix: fundConfig.transferPrefix
        } : null
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createFinance,
  getFinances,
  getBalance,
  bulkUpdateFinances,
  deleteFinance,
  getMonthlyGrid,
  updateMonthlyCell,
  addMonthlyMember,
  deleteMonthlyMember,
  sendFundEmail,
  getMyFundStatus
};
