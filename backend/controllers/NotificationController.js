const Notification = require('../models/Notification');
const PushSubscription = require('../models/PushSubscription');
const { sendNotification } = require('../utils/webPush');

// Get notifications for current user with pagination / lazy loading
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(50, parseInt(req.query.limit) || 15));
    const skip = (page - 1) * limit;

    const filter = {
      $or: [
        { recipient: userId },
        { recipient: null }
      ]
    };

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({
        ...filter,
        read: false
      })
    ]);

    const hasMore = skip + notifications.length < total;

    res.json({
      success: true,
      notifications,
      unreadCount,
      page,
      limit,
      total,
      hasMore
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Mark a notification as read
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    
    notification.read = true;
    await notification.save();
    
    res.json({ success: true, notification });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Mark all notifications as read for current user
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    await Notification.updateMany(
      {
        $or: [
          { recipient: userId },
          { recipient: null }
        ],
        read: false
      },
      { $set: { read: true } }
    );
    res.json({ success: true, message: 'All marked as read' });
  } catch (error) {
    console.error('Error marking all as read:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Subscribe to push notifications
exports.subscribePush = async (req, res) => {
  try {
    const { subscription } = req.body;
    const userId = req.user.id;
    
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ success: false, message: 'Invalid subscription object' });
    }
    
    // Check if subscription already exists for this user and endpoint
    let existingSub = await PushSubscription.findOne({
      userId,
      'subscription.endpoint': subscription.endpoint
    });

    if (existingSub) {
      // Update existing
      existingSub.subscription = subscription;
      await existingSub.save();
    } else {
      // Create new
      await PushSubscription.create({ userId, subscription });
    }
    
    res.status(201).json({ success: true, message: 'Subscribed to push notifications' });
  } catch (error) {
    console.error('Error saving push subscription:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Admin: Send notification to all users
exports.sendAdminNotification = async (req, res) => {
  try {
    const { title, message, link, recipients } = req.body;
    
    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'Title and message are required' });
    }
    
    // Check admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied. Admin only.' });
    }
    
    let notificationsToCreate = [];
    let isSendToAll = !recipients || !Array.isArray(recipients) || recipients.length === 0;

    if (isSendToAll) {
      notificationsToCreate = [{
        recipient: null, // all
        title,
        message,
        type: 'admin',
        link: link || ''
      }];
    } else {
      notificationsToCreate = recipients.map(userId => ({
        recipient: userId,
        title,
        message,
        type: 'admin',
        link: link || ''
      }));
    }

    // Create notifications in DB
    const notifications = await Notification.insertMany(notificationsToCreate);
    
    // Send push to active subscriptions
    let subscriptionQuery = {};
    if (!isSendToAll) {
      subscriptionQuery = { userId: { $in: recipients } };
    }
    const subscriptions = await PushSubscription.find(subscriptionQuery);
    
    const pushPayload = {
      title,
      body: message,
      url: link || '/',
      type: 'admin'
    };
    
    // Send in parallel
    const pushPromises = subscriptions.map(async (sub) => {
      try {
        await sendNotification(sub.subscription, pushPayload);
      } catch (error) {
        if (error.message === 'SubscriptionExpired') {
          // Remove expired subscription
          await PushSubscription.findByIdAndDelete(sub._id);
        }
      }
    });
    
    await Promise.all(pushPromises);
    
    res.status(201).json({ 
      success: true, 
      message: 'Notification sent successfully', 
      count: notifications.length
    });
  } catch (error) {
    console.error('Error sending admin notification:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
