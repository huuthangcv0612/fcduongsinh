require('dotenv').config();
const connectDB = require('./config/db');
const User = require('./models/User');
const MonthlyFund = require('./models/MonthlyFund');

const DEFAULT_MEMBERS_SEED = [
  { memberName: 'thắng lớn', email: 'thanglon@fcnhatre.local', months: { m1: 0, m2: 300000, m3: 200000, m4: 1500000, m5: 300000, m6: 200000, m7: 200000, m8: 1000000, m9: 500000, m10: 500000, m11: 500000, m12: 500000 } },
  { memberName: 'long', email: 'long@fcnhatre.local', months: { m1: 0, m2: 0, m3: 100000, m4: 0, m5: 150000, m6: 0, m7: 150000, m8: 150000, m9: 200000, m10: 200000, m11: 200000, m12: 200000 } },
  { memberName: 'bùi dũng', email: 'buidung@fcnhatre.local', months: { m1: 0, m2: 150000, m3: 150000, m4: 150000, m5: 200000, m6: 150000, m7: 150000, m8: 150000, m9: 200000, m10: 200000, m11: 200000, m12: 200000 } },
  { memberName: 'Trung', email: 'trung@fcnhatre.local', months: { m1: 0, m2: 0, m3: 150000, m4: 0, m5: 0, m6: 0, m7: 0, m8: 0, m9: 200000, m10: 200000, m11: 200000, m12: 200000 } },
  { memberName: 'nam', email: 'nam@fcnhatre.local', months: { m1: 0, m2: 150000, m3: 150000, m4: 150000, m5: 150000, m6: 150000, m7: 150000, m8: 150000, m9: 200000, m10: 200000, m11: 200000, m12: 200000 } },
  { memberName: 'nhất', email: 'nhat@fcnhatre.local', months: { m1: 0, m2: 200000, m3: 150000, m4: 150000, m5: 200000, m6: 200000, m7: 150000, m8: 150000, m9: 200000, m10: 200000, m11: 200000, m12: 200000 } },
  { memberName: 'thắng bé', email: 'thangbe@fcnhatre.local', months: { m1: 0, m2: 0, m3: 0, m4: 0, m5: 150000, m6: 200000, m7: 0, m8: 0, m9: 100000, m10: 200000, m11: 200000, m12: 200000 } },
  { memberName: 'hưng thỏ', email: 'hungtho@fcnhatre.local', months: { m1: 0, m2: 0, m3: 0, m4: 0, m5: 0, m6: 0, m7: 0, m8: 0, m9: 200000, m10: 200000, m11: 200000, m12: 200000 } },
  { memberName: 'vương', email: 'vuong@fcnhatre.local', months: { m1: 0, m2: 200000, m3: 150000, m4: 150000, m5: 150000, m6: 150000, m7: 150000, m8: 150000, m9: 200000, m10: 200000, m11: 200000, m12: 200000 } },
  { memberName: 'hoàng bo', email: 'hoangbo@fcnhatre.local', months: { m1: 0, m2: 200000, m3: 150000, m4: 150000, m5: 150000, m6: 200000, m7: 150000, m8: 150000, m9: 200000, m10: 200000, m11: 200000, m12: 200000 } },
  { memberName: 'đạt', email: 'dat@fcnhatre.local', months: { m1: 0, m2: 200000, m3: 150000, m4: 150000, m5: 200000, m6: 200000, m7: 150000, m8: 150000, m9: 200000, m10: 200000, m11: 200000, m12: 200000 } },
  { memberName: 'lai', email: 'lai@fcnhatre.local', months: { m1: 0, m2: 150000, m3: 0, m4: 0, m5: 200000, m6: 150000, m7: 200000, m8: 150000, m9: 200000, m10: 0, m11: 0, m12: 200000 } },
  { memberName: 'vanh', email: 'vanh@fcnhatre.local', months: { m1: 0, m2: 150000, m3: 150000, m4: 150000, m5: 200000, m6: 150000, m7: 200000, m8: 150000, m9: 200000, m10: 200000, m11: 200000, m12: 200000 } },
  { memberName: 'nam ken', email: 'namken@fcnhatre.local', months: { m1: 0, m2: 200000, m3: 150000, m4: 150000, m5: 150000, m6: 150000, m7: 200000, m8: 150000, m9: 200000, m10: 200000, m11: 200000, m12: 200000 } },
  { memberName: 'kiên vũ', email: 'kienvu@fcnhatre.local', months: { m1: 0, m2: 150000, m3: 150000, m4: 150000, m5: 150000, m6: 150000, m7: 150000, m8: 150000, m9: 200000, m10: 200000, m11: 200000, m12: 200000 } }
];

async function syncRealUsers() {
  try {
    await connectDB();
    console.log('🔄 Syncing Real Users in MongoDB Database...');

    // 1. Create/Ensure all team members exist as real Users in User collection
    for (const item of DEFAULT_MEMBERS_SEED) {
      let user = await User.findOne({ 
        $or: [
          { email: item.email }, 
          { name: { $regex: new RegExp(`^${item.memberName.trim()}$`, 'i') } }
        ] 
      });

      if (!user) {
        user = await User.create({
          name: item.memberName,
          email: item.email,
          role: 'member',
          monthlyFund: 200000,
          position: 'Tự do'
        });
        console.log(`✅ Created Real DB User: ${user.name} (${user.email})`);
      }

      // 2. Create/Ensure MonthlyFund document exists and links to user._id
      let fundDoc = await MonthlyFund.findOne({ year: 2025, userId: user._id });
      if (!fundDoc) {
        fundDoc = await MonthlyFund.findOne({ year: 2025, memberName: { $regex: new RegExp(`^${item.memberName.trim()}$`, 'i') } });
        if (fundDoc) {
          fundDoc.userId = user._id;
          fundDoc.memberName = user.name;
          await fundDoc.save();
          console.log(`🔗 Linked MonthlyFund document to User ${user.name}`);
        } else {
          await MonthlyFund.create({
            year: 2025,
            userId: user._id,
            memberName: user.name,
            months: item.months
          });
          console.log(`✨ Created MonthlyFund document for User ${user.name}`);
        }
      }
    }

    // 3. Ensure any existing users in User collection also have a MonthlyFund document!
    const allUsers = await User.find({ isActive: true });
    for (const user of allUsers) {
      let fundDoc = await MonthlyFund.findOne({ year: 2025, userId: user._id });
      if (!fundDoc) {
        await MonthlyFund.create({
          year: 2025,
          userId: user._id,
          memberName: user.name,
          months: { m1: 200000, m2: 200000, m3: 200000, m4: 200000, m5: 200000, m6: 200000, m7: 200000, m8: 200000, m9: 200000, m10: 200000, m11: 200000, m12: 200000 }
        });
        console.log(`✨ Created default MonthlyFund document for existing DB User ${user.name}`);
      }
    }

    console.log('🎉 REAL USERS & MONTHLY FUND GRID SYNC COMPLETED SUCCESSFULLY!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration Error:', err);
    process.exit(1);
  }
}

syncRealUsers();
