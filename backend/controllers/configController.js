const TeamConfig = require('../models/TeamConfig');
const { AppError } = require('../middlewares/authMiddleware');

// Get Fund and Bank Configuration
async function getFundConfig(req, res, next) {
  try {
    let config = await TeamConfig.findOne({ key: 'fund_config' });
    if (!config) {
      config = await TeamConfig.create({
        key: 'fund_config',
        bankName: 'MB Bank',
        bankCode: 'MB',
        accountNumber: '0352526868',
        accountName: 'TRAN DUC HOANG',
        monthlyFee: 200000,
        transferPrefix: 'FCNHATRE'
      });
    } else if (!config.monthlyFee || config.monthlyFee === 100000) {
      config.monthlyFee = 200000;
      await config.save();
    }

    res.json({
      success: true,
      data: config
    });
  } catch (err) {
    next(err);
  }
}

// Update Fund and Bank Configuration (Treasurer or Admin only)
async function updateFundConfig(req, res, next) {
  try {
    const {
      bankName,
      bankCode,
      accountNumber,
      accountName,
      monthlyFee,
      customQrUrl,
      transferPrefix,
      note
    } = req.body;

    let config = await TeamConfig.findOne({ key: 'fund_config' });
    if (!config) {
      config = new TeamConfig({ key: 'fund_config' });
    }

    if (bankName !== undefined) config.bankName = bankName;
    if (bankCode !== undefined) config.bankCode = bankCode.toUpperCase();
    if (accountNumber !== undefined) config.accountNumber = accountNumber.trim();
    if (accountName !== undefined) config.accountName = accountName.trim().toUpperCase();
    if (monthlyFee !== undefined) config.monthlyFee = Number(monthlyFee) || 200000;
    if (customQrUrl !== undefined) config.customQrUrl = customQrUrl;
    if (transferPrefix !== undefined) config.transferPrefix = transferPrefix.trim().toUpperCase();
    if (note !== undefined) config.note = note;

    await config.save();

    res.json({
      success: true,
      message: 'Đã cập nhật cấu hình thông tin quỹ và tài khoản ngân hàng thành công!',
      data: config
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getFundConfig,
  updateFundConfig
};
