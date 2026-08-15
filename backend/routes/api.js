const express = require('express');
const router = express.Router();

const { authMiddleware } = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');

const authController = require('../controllers/authController');
const matchController = require('../controllers/matchController');
const financeController = require('../controllers/financeController');
const opponentController = require('../controllers/opponentController');
const facebookGroupController = require('../controllers/facebookGroupController');
const userController = require('../controllers/userController');
const mediaController = require('../controllers/mediaController');
const uploadController = require('../controllers/uploadController');

// --- Auth & Upload Routes ---
router.post('/auth/google', authController.googleAuth);
router.get('/auth/me', authMiddleware, authController.getMe);
router.put('/auth/profile', authMiddleware, authController.updateProfile);
router.post('/upload/avatar', authMiddleware, uploadController.uploadAvatar);

// --- Match Routes ---
router.get('/matches', authMiddleware, matchController.getMatches);
router.get('/matches/force-checkin', authMiddleware, matchController.getForceCheckInMatch);
router.post('/matches', authMiddleware, adminMiddleware, matchController.createMatch);
router.put('/matches/:id/checkin', authMiddleware, matchController.updateCheckIn);
router.put('/matches/:id', authMiddleware, adminMiddleware, matchController.updateMatch);
router.put('/matches/:id/result', authMiddleware, adminMiddleware, matchController.updateMatchResult);
router.delete('/matches/:id', authMiddleware, adminMiddleware, matchController.deleteMatch);
router.post('/matches/:id/clone', authMiddleware, adminMiddleware, matchController.cloneMatch);
router.post('/matches/:id/notify', authMiddleware, adminMiddleware, matchController.notifyMatch);

// --- Finance Routes ---
router.get('/finances', authMiddleware, financeController.getFinances);
router.get('/finances/balance', authMiddleware, financeController.getBalance);
router.post('/finances', authMiddleware, adminMiddleware, financeController.createFinance);
router.put('/finances/bulk-update', authMiddleware, adminMiddleware, financeController.bulkUpdateFinances);
router.delete('/finances/:id', authMiddleware, adminMiddleware, financeController.deleteFinance);

// --- Monthly Fund Grid Routes (Google Sheets Style Matrix) ---
router.get('/finances/monthly-grid', authMiddleware, financeController.getMonthlyGrid);
router.put('/finances/monthly-grid/cell', authMiddleware, adminMiddleware, financeController.updateMonthlyCell);
router.post('/finances/monthly-grid/member', authMiddleware, adminMiddleware, financeController.addMonthlyMember);
router.delete('/finances/monthly-grid/member/:id', authMiddleware, adminMiddleware, financeController.deleteMonthlyMember);
router.post('/finances/send-notification', authMiddleware, adminMiddleware, financeController.sendFundEmail);

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

// --- User / Member Routes ---
router.get('/users', authMiddleware, userController.getUsers);
router.put('/users/:id', authMiddleware, adminMiddleware, userController.updateUser);
router.delete('/users/:id', authMiddleware, adminMiddleware, userController.deleteUser);

// --- Media Routes ---
router.get('/media', authMiddleware, mediaController.getMedia);
router.post('/media/upload', authMiddleware, mediaController.uploadFile);
router.post('/media/link', authMiddleware, mediaController.addLink);
router.delete('/media/:id', authMiddleware, mediaController.deleteMedia);

module.exports = router;
