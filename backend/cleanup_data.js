require('dotenv').config();
const connectDB = require('./config/db');
const User = require('./models/User');
const MonthlyFund = require('./models/MonthlyFund');
const Finance = require('./models/Finance');

async function cleanOldData() {
  try {
    await connectDB();
    console.log('🧹 Cleaning old mock/fake data from MongoDB...');

    // 1. Delete placeholder .local seed users
    const deleteUsersRes = await User.deleteMany({ email: { $regex: /@fcnhatre\.local$/i } });
    console.log(`🗑️ Deleted ${deleteUsersRes.deletedCount} placeholder seed users.`);

    // 2. Delete all old MonthlyFund documents
    const deleteFundsRes = await MonthlyFund.deleteMany({});
    console.log(`🗑️ Cleared ${deleteFundsRes.deletedCount} old MonthlyFund documents.`);

    // 3. Find remaining REAL DB Users (e.g. Google Auth / Registered Admin)
    const realUsers = await User.find({ isActive: true });
    console.log(`👥 Found ${realUsers.length} real active users in MongoDB:`, realUsers.map(u => u.name));

    // 4. Create fresh 2025 MonthlyFund records for each real user
    for (const u of realUsers) {
      await MonthlyFund.create({
        year: 2025,
        userId: u._id,
        memberName: u.name,
        months: {
          m1: 200000, m2: 200000, m3: 200000, m4: 200000, m5: 200000, m6: 200000,
          m7: 200000, m8: 200000, m9: 200000, m10: 200000, m11: 200000, m12: 200000
        }
      });
      console.log(`✨ Created fresh 2025 MonthlyFund record for Real User: ${u.name}`);
    }

    console.log('🎉 DATABASE CLEANUP COMPLETED! FRESH START READY.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Cleanup Error:', err);
    process.exit(1);
  }
}

cleanOldData();
