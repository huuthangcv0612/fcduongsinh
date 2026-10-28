const webpush = require('web-push');
require('dotenv').config();

const publicVapidKey = process.env.VAPID_PUBLIC_KEY;
const privateVapidKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT || 'mailto:admin@fcduongsinh.local';

if (publicVapidKey && privateVapidKey) {
  webpush.setVapidDetails(subject, publicVapidKey, privateVapidKey);
} else {
  console.warn('VAPID keys are missing. Web push notifications will not work.');
}

const sendNotification = async (subscription, payload) => {
  try {
    if (!publicVapidKey || !privateVapidKey) {
      console.warn('Cannot send web push, VAPID keys not configured.');
      return;
    }
    await webpush.sendNotification(subscription, JSON.stringify(payload));
  } catch (error) {
    if (error.statusCode === 410 || error.statusCode === 404) {
      // The subscription is no longer valid, should be removed from database
      console.log('Subscription has expired or is no longer valid');
      throw new Error('SubscriptionExpired');
    }
    console.error('Error sending web push notification', error);
  }
};

module.exports = {
  sendNotification
};
