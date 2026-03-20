//routes/index.js

const express = require('express');
const router = express.Router();
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const userCtrl = require('../controllers/userController');
const questCtrl = require('../controllers/questController');
const taskCtrl = require('../controllers/taskController');
const adminCtrl = require('../controllers/adminController');

router.use(authMiddleware);

// user routes
router.get('/users/me', userCtrl.getMe);
router.put('/users/me', userCtrl.updateMe);
router.get('/users/me/stats', userCtrl.getMyStats);
router.get('/users/me/rewards', userCtrl.getMyRewards);
router.post('/users/me/wallet', userCtrl.connectWallet);
router.delete('/users/me/wallet', userCtrl.disconnectWallet);


// quest routes
router.get('/quests', questCtrl.listQuests);
router.get('/quests/my', questCtrl.getMyQuests);
router.get('/quests/:id', questCtrl.getQuest);
router.get('/quests/:id/leaderboard', questCtrl.getLeaderboard);
router.post('/quests/:id/join', questCtrl.joinQuest);

// task routes
router.post('/quests/:questId/tasks/:taskId/submit', taskCtrl.submitTask);

//admin routes (require admin role) 
router.use('/admin', adminMiddleware);

router.get('/admin/stats', adminCtrl.getStats);
router.post('/admin/quests', adminCtrl.createQuest);
router.put('/admin/quests/:id', adminCtrl.updateQuest);
router.delete('/admin/quests/:id', adminCtrl.deleteQuest);
router.post('/admin/quests/:id/tasks', adminCtrl.createTask);
router.put('/admin/tasks/:taskId', adminCtrl.updateTask);
router.delete('/admin/tasks/:taskId', adminCtrl.deleteTask);
router.get('/admin/quests/:id/participants', adminCtrl.getParticipants);
router.post('/admin/quests/:id/complete', adminCtrl.completeQuest);
router.post('/admin/rewards/:rewardId/distribute', adminCtrl.distributeReward);

module.exports = router;