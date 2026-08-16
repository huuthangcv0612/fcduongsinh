const cron = require('node-cron');
const Match = require('./models/Match');
const PushSubscription = require('./models/PushSubscription');
const Notification = require('./models/Notification');
const { sendNotification } = require('./utils/webPush');

function startCronJobs() {
  // Run at 10:00 AM every day
  cron.schedule('0 10 * * *', async () => {
    try {
      console.log('⏰ Running daily match reminder check (10:00 AM VN Time)...');
      
      // Get today's date formatted as YYYY-MM-DD in VN timezone
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      const dateString = formatter.format(new Date());

      const matches = await Match.find({ date: dateString, status: 'upcoming' });

      for (const match of matches) {
        // Find users who have checked in as 'joined' or 'uncertain'
        const targetUserIds = match.checkInList
          .filter(c => c.status === 'joined' || c.status === 'uncertain')
          .map(c => c.userId);

        if (targetUserIds.length === 0) continue;

        const title = '⚽ Đừng quên trận đấu hôm nay nhé!';
        const message = `Trận đấu với ${match.opponent?.teamName || 'đối thủ'} sẽ diễn ra lúc ${match.time} tại ${match.stadium}. Nhớ chuẩn bị đồ và đến đúng giờ nhé!`;
        const link = '/matches';

        // Create in-app notifications
        const notifs = targetUserIds.map(userId => ({
          recipient: userId,
          title,
          message,
          type: 'match',
          link
        }));
        await Notification.insertMany(notifs);

        // Get push subscriptions for these users
        const subscriptions = await PushSubscription.find({ userId: { $in: targetUserIds } });
        const pushPayload = { title, body: message, url: link, type: 'match' };
        
        for (const sub of subscriptions) {
          try {
            await sendNotification(sub.subscription, pushPayload);
          } catch (error) {
            if (error.message === 'SubscriptionExpired') {
              await PushSubscription.findByIdAndDelete(sub._id);
            }
          }
        }
        console.log(`✅ Sent daily reminder for match ${match._id} to ${targetUserIds.length} users.`);
      }
    } catch (error) {
      console.error('Error in cron job match reminder:', error);
    }
  }, {
    scheduled: true,
    timezone: "Asia/Ho_Chi_Minh"
  });
}

module.exports = startCronJobs;
