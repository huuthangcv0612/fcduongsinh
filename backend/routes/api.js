const express = require('express');
const router = express.Router();

const { authMiddleware } = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');
const { treasurerOrAdminMiddleware } = require('../middlewares/adminMiddleware');

const authController = require('../controllers/authController');
const matchController = require('../controllers/matchController');
const financeController = require('../controllers/financeController');
const fundSubmissionController = require('../controllers/fundSubmissionController');
const opponentController = require('../controllers/opponentController');
const facebookGroupController = require('../controllers/facebookGroupController');
const userController = require('../controllers/userController');
const mediaController = require('../controllers/mediaController');
const uploadController = require('../controllers/uploadController');
const notificationController = require('../controllers/NotificationController');
const configController = require('../controllers/configController');
const statsController = require('../controllers/statsController');

// --- Auth & Upload Routes ---
router.post('/auth/google', authController.googleAuth);
router.post('/auth/dev-bypass', authController.devBypass);
router.get('/auth/me', authMiddleware, authController.getMe);
router.put('/auth/profile', authMiddleware, authController.updateProfile);
router.post('/upload/avatar', authMiddleware, uploadController.uploadAvatar);

// --- Match Routes ---
router.get('/matches', authMiddleware, matchController.getMatches);
router.get('/matches/force-checkin', authMiddleware, matchController.getForceCheckInMatch);
router.get('/matches/force-mvp-vote', authMiddleware, matchController.getForceMvpVoteMatch);
router.get('/matches/:id/mvp-stats', authMiddleware, matchController.getMatchMvpStats);
router.post('/matches/:id/vote-mvp', authMiddleware, matchController.voteMvp);
router.post('/matches/:id/finalize-mvp', authMiddleware, adminMiddleware, matchController.finalizeMvp);
router.post('/matches', authMiddleware, adminMiddleware, matchController.createMatch);
router.put('/matches/:id/checkin', authMiddleware, matchController.updateCheckIn);
router.put('/matches/:id/payment', authMiddleware, treasurerOrAdminMiddleware, matchController.updateMatchPayment);
router.put('/matches/:id/fund', authMiddleware, treasurerOrAdminMiddleware, matchController.updateMatchFund);
router.put('/matches/:id', authMiddleware, adminMiddleware, matchController.updateMatch);
router.put('/matches/:id/result', authMiddleware, adminMiddleware, matchController.updateMatchResult);
router.delete('/matches/:id', authMiddleware, adminMiddleware, matchController.deleteMatch);
router.post('/matches/:id/clone', authMiddleware, adminMiddleware, matchController.cloneMatch);
router.post('/matches/:id/notify', authMiddleware, adminMiddleware, matchController.notifyMatch);
router.post('/matches/:id/notify-push', authMiddleware, adminMiddleware, matchController.notifyMatchPush);
router.get('/matches/:id/lineup', authMiddleware, matchController.getMatchLineup);
router.put('/matches/:id/lineup', authMiddleware, adminMiddleware, matchController.updateMatchLineup);
router.post('/matches/:id/lineup/notify', authMiddleware, adminMiddleware, matchController.notifyLineupPush);
router.post('/matches/:id/split-teams', authMiddleware, adminMiddleware, matchController.splitInternalTeams);
router.put('/matches/:id/internal-teams', authMiddleware, adminMiddleware, matchController.updateInternalTeams);

// --- Finance Routes ---
router.get('/finances', authMiddleware, financeController.getFinances);
router.get('/finances/balance', authMiddleware, financeController.getBalance);
router.post('/finances', authMiddleware, adminMiddleware, financeController.createFinance);
router.put('/finances/bulk-update', authMiddleware, adminMiddleware, financeController.bulkUpdateFinances);
router.delete('/finances/:id', authMiddleware, adminMiddleware, financeController.deleteFinance);

// --- Match Fund & Finance Routes ---
router.get('/finances/match-funds', authMiddleware, financeController.getMatchFunds);
router.get('/finances/my-fund-status', authMiddleware, financeController.getMyFundStatus);
router.get('/finances/monthly-grid', authMiddleware, financeController.getMonthlyGrid);
router.put('/finances/monthly-grid/cell', authMiddleware, adminMiddleware, financeController.updateMonthlyCell);
router.post('/finances/monthly-grid/member', authMiddleware, adminMiddleware, financeController.addMonthlyMember);
router.delete('/finances/monthly-grid/member/:id', authMiddleware, adminMiddleware, financeController.deleteMonthlyMember);
router.post('/finances/send-notification', authMiddleware, adminMiddleware, financeController.sendFundEmail);

// --- Fund Submissions & Proof Upload Routes ---
router.post('/fund-submissions', authMiddleware, fundSubmissionController.submitFundPayment);
router.get('/fund-submissions', authMiddleware, fundSubmissionController.getFundSubmissions);
router.get('/fund-submissions/:id', authMiddleware, fundSubmissionController.getFundSubmissionById);
router.put('/fund-submissions/:id/approve', authMiddleware, treasurerOrAdminMiddleware, fundSubmissionController.approveFundSubmission);
router.put('/fund-submissions/:id/reject', authMiddleware, treasurerOrAdminMiddleware, fundSubmissionController.rejectFundSubmission);

// --- Fund & Bank Configuration Routes ---
router.get('/config/fund', authMiddleware, configController.getFundConfig);
router.put('/config/fund', authMiddleware, treasurerOrAdminMiddleware, configController.updateFundConfig);

// --- Opponent & AI Routes ---
router.get('/opponents', authMiddleware, opponentController.getOpponents);
router.get('/opponents/scrape', authMiddleware, opponentController.triggerScrape);
router.post('/opponents/save', authMiddleware, opponentController.saveOpponent);
router.delete('/opponents/:id', authMiddleware, opponentController.deleteOpponent);

// --- Facebook Group Target URLs Routes ---
router.get('/facebook-groups', authMiddleware, facebookGroupController.getFacebookGroups);
router.post('/facebook-groups', authMiddleware, facebookGroupController.createFacebookGroup);
router.put('/facebook-groups/:id', authMiddleware, facebookGroupController.updateFacebookGroup);
router.delete('/facebook-groups/:id', authMiddleware, facebookGroupController.deleteFacebookGroup);

// --- Stats Routes ---
router.get('/stats', authMiddleware, statsController.getStats);

// --- User / Member Routes ---
router.get('/users', authMiddleware, userController.getUsers);
router.put('/users/:id', authMiddleware, adminMiddleware, userController.updateUser);
router.delete('/users/:id', authMiddleware, adminMiddleware, userController.deleteUser);

// --- Media Routes ---
router.get('/media', authMiddleware, mediaController.getMedia);
router.post('/media/upload', authMiddleware, mediaController.uploadFile);
router.post('/media/link', authMiddleware, mediaController.addLink);
router.delete('/media/:id', authMiddleware, mediaController.deleteMedia);

// --- Notification Routes ---
router.get('/notifications', authMiddleware, notificationController.getNotifications);
router.put('/notifications/read-all', authMiddleware, notificationController.markAllAsRead);
router.put('/notifications/:id/read', authMiddleware, notificationController.markAsRead);
router.post('/notifications/subscribe', authMiddleware, notificationController.subscribePush);
router.post('/notifications/admin-send', authMiddleware, adminMiddleware, notificationController.sendAdminNotification);

module.exports = router;
