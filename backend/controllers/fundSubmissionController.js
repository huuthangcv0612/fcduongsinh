const FundSubmission = require('../models/FundSubmission');
const MonthlyFund = require('../models/MonthlyFund');
const Finance = require('../models/Finance');
const User = require('../models/User');
const Notification = require('../models/Notification');
const PushSubscription = require('../models/PushSubscription');
const { sendNotification } = require('../utils/webPush');
const { AppError } = require('../middlewares/authMiddleware');
const { isUserTreasurer, isUserAdmin } = require('../middlewares/adminMiddleware');

// Helper to notify all Treasurers and Admins
async function notifyTreasurersAndAdmins({ title, message, link, type = 'fund' }) {
  try {
    const managers = await User.find({
      $or: [
        { role: { $in: ['admin', 'treasurer'] } },
        { roles: { $in: ['admin', 'treasurer'] } }
      ]
    }).lean();

    for (const manager of managers) {
      // 1. Create in-app notification
      await Notification.create({
        recipient: manager._id,
        title,
        message,
        type,
        link: link || '/finances'
      });

      // 2. Send Web Push Notification if subscribed
      const subs = await PushSubscription.find({ userId: manager._id });
      for (const sub of subs) {
        try {
          await sendNotification(sub.subscription, {
            title,
            body: message,
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-96.png',
            data: {
              url: link || '/finances'
            }
          });
        } catch (pushErr) {
          if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
            await PushSubscription.deleteOne({ _id: sub._id });
          }
        }
      }
    }
  } catch (err) {
    console.error('Error notifying treasurers & admins:', err);
  }
}

// 1. Submit a fund payment with proof image & multiple months
async function submitFundPayment(req, res, next) {
  try {
    const { months, amount, proofImage, note } = req.body;
    const userId = req.user._id;
    const memberName = req.user.name;

    if (!months || !Array.isArray(months) || months.length === 0) {
      throw new AppError('VALIDATION_ERROR', 'Vui lòng chọn ít nhất một tháng đóng quỹ', 400);
    }

    if (!amount || Number(amount) < 1000) {
      throw new AppError('VALIDATION_ERROR', 'Số tiền nộp không hợp lệ (tối thiểu 1.000đ)', 400);
    }

    if (!proofImage || typeof proofImage !== 'string') {
      throw new AppError('VALIDATION_ERROR', 'Vui lòng tải lên ảnh chụp bill chuyển khoản', 400);
    }

    // Check if there is already a pending submission for the exact same months
    const existingPending = await FundSubmission.findOne({
      userId,
      status: 'pending',
      months: { $in: months }
    });

    if (existingPending) {
      throw new AppError(
        'DUPLICATE_SUBMISSION',
        `Bạn đã có một yêu cầu nộp quỹ cho tháng (${existingPending.months.join(', ')}) đang chờ duyệt. Vui lòng chờ Thủ quỹ xác nhận!`,
        400
      );
    }

    const submission = await FundSubmission.create({
      userId,
      memberName,
      months,
      amount: Number(amount),
      proofImage,
      note: note || '',
      status: 'pending'
    });

    // Notify all Treasurers & Admins
    const monthText = months.join(', ');
    const formattedAmount = Number(amount).toLocaleString('vi-VN');
    await notifyTreasurersAndAdmins({
      title: '💰 Yêu cầu xác nhận đóng quỹ mới',
      message: `${memberName} vừa nộp chuyển khoản ${formattedAmount}đ cho tháng ${monthText}`,
      link: `/finances?submissionId=${submission._id}`
    });

    res.status(201).json({
      success: true,
      message: 'Gửi yêu cầu đóng quỹ thành công! Thủ quỹ sẽ xác nhận trong thời gian sớm nhất.',
      data: submission
    });
  } catch (err) {
    next(err);
  }
}

// 2. Get fund submissions list
async function getFundSubmissions(req, res, next) {
  try {
    const isManager = isUserTreasurer(req.user) || isUserAdmin(req.user);
    const { status, month, userId } = req.query;

    const query = {};
    if (!isManager) {
      // Normal member only sees their own submissions
      query.userId = req.user._id;
    } else if (userId) {
      query.userId = userId;
    }

    if (status) {
      query.status = status;
    }

    if (month) {
      query.months = month;
    }

    const submissions = await FundSubmission.find(query)
      .populate('userId', 'name email avatar phone position')
      .populate('reviewedBy', 'name email avatar')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: submissions
    });
  } catch (err) {
    next(err);
  }
}

// 3. Get single submission detail
async function getFundSubmissionById(req, res, next) {
  try {
    const { id } = req.params;
    const isManager = isUserTreasurer(req.user) || isUserAdmin(req.user);

    const submission = await FundSubmission.findById(id)
      .populate('userId', 'name email avatar phone position')
      .populate('reviewedBy', 'name email avatar')
      .lean();

    if (!submission) {
      throw new AppError('NOT_FOUND', 'Không tìm thấy yêu cầu đóng quỹ này', 404);
    }

    if (!isManager && submission.userId?._id?.toString() !== req.user._id.toString()) {
      throw new AppError('FORBIDDEN', 'Bạn không có quyền xem yêu cầu này', 403);
    }

    res.json({
      success: true,
      data: submission
    });
  } catch (err) {
    next(err);
  }
}

// 4. Approve fund submission (Treasurer or Admin only)
async function approveFundSubmission(req, res, next) {
  try {
    const { id } = req.params;

    // Atomic update to prevent double-approval race condition
    const submission = await FundSubmission.findOneAndUpdate(
      { _id: id, status: 'pending' },
      {
        $set: {
          status: 'approved',
          reviewedBy: req.user._id,
          reviewedAt: new Date()
        }
      },
      { new: true }
    );

    if (!submission) {
      throw new AppError('INVALID_STATUS', 'Yêu cầu này đã được xử lý hoặc không tồn tại', 400);
    }

    const createdFinanceIds = [];
    const monthCount = submission.months.length;
    const perMonthAmount = Math.round(submission.amount / monthCount);

    for (const monthStr of submission.months) {
      const [yearStr, monthNumStr] = monthStr.split('-');
      const year = parseInt(yearStr, 10) || new Date().getFullYear();
      const monthNum = parseInt(monthNumStr, 10) || (new Date().getMonth() + 1);
      const monthKey = `m${monthNum}`;

      // 1. Update or create MonthlyFund record for the member
      let monthlyFund = await MonthlyFund.findOne({
        year,
        $or: [
          { userId: submission.userId },
          { memberName: submission.memberName }
        ]
      });

      if (!monthlyFund) {
        monthlyFund = await MonthlyFund.create({
          year,
          memberName: submission.memberName,
          userId: submission.userId,
          months: { [monthKey]: perMonthAmount }
        });
      } else {
        if (!monthlyFund.userId) {
          monthlyFund.userId = submission.userId;
        }
        await MonthlyFund.findByIdAndUpdate(
          monthlyFund._id,
          { 
            $set: { 
              [`months.${monthKey}`]: perMonthAmount,
              userId: submission.userId,
              memberName: submission.memberName
            } 
          }
        );
      }

      // 2. Create income Finance record in general ledger
      const financeDoc = await Finance.create({
        type: 'IN',
        category: 'quy_thang',
        amount: perMonthAmount,
        description: `Thu quỹ tháng ${monthNum}/${year} (${submission.memberName})`,
        userId: submission.userId,
        fundMonth: monthStr,
        proofImage: submission.proofImage,
        createdBy: req.user._id
      });

      createdFinanceIds.push(financeDoc._id);
    }

    // Link created finance docs
    submission.financeIds = createdFinanceIds;
    await submission.save();

    // 3. Notify the member about approval
    const monthText = submission.months.join(', ');
    const formattedAmount = Number(submission.amount).toLocaleString('vi-VN');
    await Notification.create({
      recipient: submission.userId,
      title: '✅ Đã duyệt nộp quỹ thành công',
      message: `Thủ quỹ đã xác nhận khoản đóng quỹ tháng ${monthText} (${formattedAmount}đ). Cảm ơn bạn!`,
      type: 'fund',
      link: '/finances'
    });

    // Send push notification to member
    const memberSubs = await PushSubscription.find({ userId: submission.userId });
    for (const sub of memberSubs) {
      try {
        await sendNotification(sub.subscription, {
          title: '✅ Đã duyệt nộp quỹ thành công',
          body: `Khoản đóng quỹ tháng ${monthText} (${formattedAmount}đ) đã được Thủ quỹ xác nhận!`,
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-96.png',
          data: { url: '/finances' }
        });
      } catch (pushErr) {
        if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
          await PushSubscription.deleteOne({ _id: sub._id });
        }
      }
    }

    res.json({
      success: true,
      message: 'Đã xác nhận nộp quỹ và cập nhật vào bảng quỹ thành công!',
      data: submission
    });
  } catch (err) {
    next(err);
  }
}

// 5. Reject fund submission (Treasurer or Admin only)
async function rejectFundSubmission(req, res, next) {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    const submission = await FundSubmission.findOneAndUpdate(
      { _id: id, status: 'pending' },
      {
        $set: {
          status: 'rejected',
          rejectionReason: rejectionReason || 'Biên lai hoặc số tiền không trùng khớp',
          reviewedBy: req.user._id,
          reviewedAt: new Date()
        }
      },
      { new: true }
    );

    if (!submission) {
      throw new AppError('INVALID_STATUS', 'Yêu cầu này đã được xử lý hoặc không tồn tại', 400);
    }

    // Notify member about rejection
    const monthText = submission.months.join(', ');
    const reasonText = rejectionReason || 'Biên lai hoặc số tiền không trùng khớp';
    await Notification.create({
      recipient: submission.userId,
      title: '❌ Yêu cầu nộp quỹ chưa được duyệt',
      message: `Khoản nộp quỹ tháng ${monthText} chưa được xác nhận. Lý do: ${reasonText}`,
      type: 'fund',
      link: '/finances'
    });

    // Send push notification
    const memberSubs = await PushSubscription.find({ userId: submission.userId });
    for (const sub of memberSubs) {
      try {
        await sendNotification(sub.subscription, {
          title: '❌ Yêu cầu nộp quỹ chưa được duyệt',
          body: `Khoản nộp quỹ tháng ${monthText} bị từ chối: ${reasonText}`,
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-96.png',
          data: { url: '/finances' }
        });
      } catch (pushErr) {
        if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
          await PushSubscription.deleteOne({ _id: sub._id });
        }
      }
    }

    res.json({
      success: true,
      message: 'Đã từ chối yêu cầu đóng quỹ.',
      data: submission
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  submitFundPayment,
  getFundSubmissions,
  getFundSubmissionById,
  approveFundSubmission,
  rejectFundSubmission
};
