require('dotenv').config();
const connectDB = require('./config/db');
const MonthlyFund = require('./models/MonthlyFund');

async function resetAmounts() {
  try {
    await connectDB();
    const zeroMonths = {
      m1: 0, m2: 0, m3: 0, m4: 0, m5: 0, m6: 0,
      m7: 0, m8: 0, m9: 0, m10: 0, m11: 0, m12: 0
    };
    const res = await MonthlyFund.updateMany({}, { $set: { months: zeroMonths } });
    console.log(`✅ Reset monthly fund amounts to 0 for ${res.modifiedCount} records in MongoDB!`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error resetting funds:', err);
    process.exit(1);
  }
}

resetAmounts();
