const FundSubmission = require('../models/FundSubmission');
const MonthlyFund = require('../models/MonthlyFund');
const Finance = require('../models/Finance');
const Match = require('../models/Match');
const User = require('../models/User');
const Notification = require('../models/Notification');
const PushSubscription = require('../models/PushSubscription');
const { sendNotification } = require('../utils/webPush');
const { AppError } = require('../middlewares/authMiddleware');
const { isUserTreasurer, isUserAdmin } = require('../middlewares/adminMiddleware');
const { uploadProofImage } = require('../services/cloudinaryService');

// Helper to notify all Treasurers and Admins
async function notifyTreasurersAndAdmins({ title, message, link, type = 'fund' }) {
  try {
    const managers = await User.find({
      $or: [
        { role: { $in: ['admin', 'treasurer'] } },
        { roles: { $in: ['admin', 'treasurer'] } }
      ]
    }).lean();

    if (managers.length === 0) return;

    const managerIds = managers.map(m => m._id);

    // 1. Create in-app notifications for all managers in one batch insert
    await Notification.insertMany(
      managerIds.map(recipient => ({
        recipient,
        title,
        message,
        type,
        link: link || '/finances'
      }))
    );

    // 2. Send Web Push Notifications for all managers' subscriptions in one query
    const subs = await PushSubscription.find({ userId: { $in: managerIds } });
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
  } catch (err) {
    console.error('Error notifying treasurers & admins:', err);
  }
}

// 1. Submit a fund payment with proof image for a match (or legacy months)
async function submitFundPayment(req, res, next) {
  try {
    const { matchId, months, amount, proofImage, note } = req.body;
    const userId = req.user._id;
    const memberName = req.user.name;

    if (!amount || Number(amount) < 1000) {
      throw new AppError('VALIDATION_ERROR', 'Số tiền nộp không hợp lệ (tối thiểu 1.000đ)', 400);
    }

    if (!proofImage || typeof proofImage !== 'string') {
      throw new AppError('VALIDATION_ERROR', 'Vui lòng tải lên ảnh chụp bill chuyển khoản', 400);
    }

    let matchDoc = null;
    let descriptionText = '';

    if (matchId) {
      matchDoc = await Match.findById(matchId);
      if (!matchDoc) {
        throw new AppError('NOT_FOUND', 'Không tìm thấy trận đấu', 404);
      }
      descriptionText = `trận ngày ${matchDoc.date} (${matchDoc.opponent?.teamName || (matchDoc.matchType === 'internal' ? 'Nội bộ' : 'Giao hữu')})`;

      // Check if there is already a pending submission for this match
      const existingPending = await FundSubmission.findOne({
        userId,
        status: 'pending',
        matchId: matchDoc._id
      });

      if (existingPending) {
        throw new AppError(
          'DUPLICATE_SUBMISSION',
          `Bạn đã có một yêu cầu nộp tiền cho ${descriptionText} đang chờ duyệt. Vui lòng chờ Thủ quỹ xác nhận!`,
          400
        );
      }
    } else if (months && Array.isArray(months) && months.length > 0) {
      descriptionText = `tháng ${months.join(', ')}`;
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
    } else {
      throw new AppError('VALIDATION_ERROR', 'Vui lòng chọn trận đấu đóng tiền', 400);
    }

    let finalProofImage = proofImage;
    if (proofImage.startsWith('data:image')) {
      try {
        finalProofImage = await uploadProofImage(proofImage, 'fc_duongsinh_bills');
      } catch (uploadErr) {
        console.warn('⚠️ Cloudinary proof upload failed, falling back to direct image data:', uploadErr.message);
      }
    }

    const submission = await FundSubmission.create({
      userId,
      memberName,
      matchId: matchDoc ? matchDoc._id : null,
      months: months || [],
      amount: Number(amount),
      proofImage: finalProofImage,
      note: note || '',
      status: 'pending'
    });

    // Notify all Treasurers & Admins
    const formattedAmount = Number(amount).toLocaleString('vi-VN');
    await notifyTreasurersAndAdmins({
      title: '💰 Yêu cầu xác nhận đóng tiền trận mới',
      message: `${memberName} vừa nộp chuyển khoản ${formattedAmount}đ cho ${descriptionText}`,
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

// 2. Get fund submissions list with filtering, search, and pagination
async function getFundSubmissions(req, res, next) {
  try {
    const isManager = isUserTreasurer(req.user) || isUserAdmin(req.user);
    const { status, month, userId, search, hasProof, page, limit } = req.query;

    const query = {};
    if (!isManager) {
      // Normal member only sees their own submissions
      query.userId = req.user._id;
    } else if (userId) {
      query.userId = userId;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (month && month !== 'all') {
      query.months = month;
    }

    if (hasProof === 'true') {
      query.proofImage = { $exists: true, $ne: '' };
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [
        { memberName: regex },
        { note: regex }
      ];
    }

    // Counts across statuses for badge counts
    const baseFilter = {};
    if (!isManager) {
      baseFilter.userId = req.user._id;
    } else if (userId) {
      baseFilter.userId = userId;
    }
    if (month && month !== 'all') {
      baseFilter.months = month;
    }

    const [totalCount, pendingCount, approvedCount, rejectedCount] = await Promise.all([
      FundSubmission.countDocuments(baseFilter),
      FundSubmission.countDocuments({ ...baseFilter, status: 'pending' }),
      FundSubmission.countDocuments({ ...baseFilter, status: 'approved' }),
      FundSubmission.countDocuments({ ...baseFilter, status: 'rejected' })
    ]);

    const counts = {
      all: totalCount,
      pending: pendingCount,
      approved: approvedCount,
      rejected: rejectedCount
    };

    const filteredTotal = await FundSubmission.countDocuments(query);

    let queryBuilder = FundSubmission.find(query)
      .select('-proofImage')
      .populate('userId', 'name email avatar phone position')
      .populate('reviewedBy', 'name email avatar')
      .populate('matchId', 'date time stadium opponent matchType pitchCost serviceCost')
      .sort({ createdAt: -1 });

    let pagination = null;
    if (page !== undefined || limit !== undefined) {
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
      const totalPages = Math.ceil(filteredTotal / limitNum) || 1;
      queryBuilder = queryBuilder.skip((pageNum - 1) * limitNum).limit(limitNum);
      pagination = {
        page: pageNum,
        limit: limitNum,
        total: filteredTotal,
        totalPages
      };
    }

    const submissions = await queryBuilder.lean();

    res.json({
      success: true,
      data: submissions,
      pagination: pagination || {
        page: 1,
        limit: submissions.length,
        total: filteredTotal,
        totalPages: 1
      },
      counts
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
      .populate('matchId', 'date time stadium opponent matchType pitchCost serviceCost')
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
    let approvalMessage = '';

    if (submission.matchId) {
      // 1. Update Match CheckIn payment status
      const match = await Match.findById(submission.matchId);
      let matchDesc = 'trận đấu';
      if (match) {
        matchDesc = `trận ngày ${match.date}`;
        const checkInItem = (match.checkInList || []).find(
          c => c.userId?.toString() === submission.userId.toString()
        );
        if (checkInItem) {
          checkInItem.isPaid = true;
          checkInItem.paidAmount = Number(submission.amount);
          checkInItem.paidAt = new Date();
          await match.save();
        }
      }

      // 2. Create Finance IN record
      const financeDoc = await Finance.create({
        type: 'IN',
        category: 'quy_tran',
        amount: Number(submission.amount),
        description: `Thu tiền ${matchDesc} (${submission.memberName})`,
        userId: submission.userId,
        matchId: submission.matchId,
        proofImage: submission.proofImage,
        createdBy: req.user._id
      });

      createdFinanceIds.push(financeDoc._id);
      approvalMessage = `tiền ${matchDesc}`;
    } else if (submission.months && submission.months.length > 0) {
      // Legacy Monthly Fund support
      const monthCount = submission.months.length;
      const perMonthAmount = Math.round(submission.amount / monthCount);

      for (const monthStr of submission.months) {
        const [yearStr, monthNumStr] = monthStr.split('-');
        const year = parseInt(yearStr, 10) || new Date().getFullYear();
        const monthNum = parseInt(monthNumStr, 10) || (new Date().getMonth() + 1);
        const monthKey = `m${monthNum}`;

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
      approvalMessage = `khoản đóng quỹ tháng ${submission.months.join(', ')}`;
    }

    // Link created finance docs
    submission.financeIds = createdFinanceIds;
    await submission.save();

    // 3. Notify the member about approval
    const formattedAmount = Number(submission.amount).toLocaleString('vi-VN');
    await Notification.create({
      recipient: submission.userId,
      title: '✅ Đã duyệt nộp quỹ thành công',
      message: `Thủ quỹ đã xác nhận ${approvalMessage} (${formattedAmount}đ). Cảm ơn bạn!`,
      type: 'fund',
      link: '/finances'
    });

    // Send push notification to member
    const memberSubs = await PushSubscription.find({ userId: submission.userId });
    for (const sub of memberSubs) {
      try {
        await sendNotification(sub.subscription, {
          title: '✅ Đã duyệt nộp quỹ thành công',
          body: `Khoản đóng (${formattedAmount}đ) cho ${approvalMessage} đã được Thủ quỹ xác nhận!`,
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
