// routes/index.js

const express = require('express');
const router = express.Router();
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const userCtrl = require('../controllers/userController');
const questCtrl = require('../controllers/questController');
const taskCtrl = require('../controllers/taskController');
const adminCtrl = require('../controllers/adminController');
const webhookCtrl = require('../controllers/webhookController');

router.post('/webhooks/ton-payment', webhookCtrl.handleTonPayment);

router.use(authMiddleware);

// User routes
router.get('/users/me', userCtrl.getMe);
router.put('/users/me', userCtrl.updateMe);
router.get('/users/me/stats', userCtrl.getMyStats);
router.get('/users/me/rewards', userCtrl.getMyRewards);
router.post('/users/me/wallet', userCtrl.connectWallet);
router.delete('/users/me/wallet', userCtrl.disconnectWallet);

// Quest routes 
router.get('/quests', questCtrl.listQuests);
router.get('/quests/my', questCtrl.getMyQuests);      
router.get('/quests/:id', questCtrl.getQuest);
router.get('/quests/:id/leaderboard', questCtrl.getLeaderboard);
router.post('/quests/:id/join', questCtrl.joinQuest);

// Task routes 
router.post('/quests/:questId/tasks/:taskId/submit', taskCtrl.submitTask);

// Admin routes 
router.use('/admin', adminMiddleware);

// Stats
router.get('/admin/stats', adminCtrl.getStats);

// Quest management
router.get('/admin/quests', adminCtrl.getAdminQuests);      
router.post('/admin/quests', adminCtrl.createQuest);
router.put('/admin/quests/:id', adminCtrl.updateQuest);
router.delete('/admin/quests/:id', adminCtrl.deleteQuest);

// Task management
router.post('/admin/quests/:id/tasks', adminCtrl.createTask);
router.put('/admin/tasks/:taskId', adminCtrl.updateTask);
router.delete('/admin/tasks/:taskId', adminCtrl.deleteTask);

// Participants & quest lifecycle
router.get('/admin/quests/:id/participants', adminCtrl.getParticipants);
router.post('/admin/quests/:id/complete', adminCtrl.completeQuest);

// Reward distribution 
router.get('/admin/rewards/pending', adminCtrl.getPendingRewards);
router.post('/admin/rewards/:rewardId/processing', adminCtrl.markRewardProcessing);
router.post('/admin/rewards/:rewardId/distribute', adminCtrl.distributeReward);

module.exports = router;