const TeamConfig = require('../models/TeamConfig');
const { AppError } = require('../middlewares/authMiddleware');

// Get Fund and Bank Configuration
async function getFundConfig(req, res, next) {
  try {
    let config = await TeamConfig.findOne({ key: 'fund_config' });
    if (!config) {
      config = await TeamConfig.create({
        key: 'fund_config',
        bankName: 'Techcombank',
        bankCode: 'TCB',
        accountNumber: '4645199999',
        accountName: 'NGUYEN HUU THANG',
        monthlyFee: 200000,
        transferPrefix: 'FCDUONGSINH'
      });
    } else {
      let changed = false;
      if (config.accountNumber === '0352526868' || config.accountName === 'TRAN DUC HOANG' || !config.accountNumber) {
        config.bankName = 'Techcombank';
        config.bankCode = 'TCB';
        config.accountNumber = '4645199999';
        config.accountName = 'NGUYEN HUU THANG';
        changed = true;
      }
      if (!config.monthlyFee || config.monthlyFee === 100000) {
        config.monthlyFee = 200000;
        changed = true;
      }
      if (changed) {
        await config.save();
      }
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
