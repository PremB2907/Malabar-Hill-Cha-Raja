const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Public Admin Auth Routes
router.get('/admin/login', adminController.renderLoginPage);
router.post('/admin/login', adminController.handleLogin);
router.get('/admin/logout', adminController.handleLogout);

// Protected Admin Dashboard Routes
router.get('/admin', adminController.requireAuth, adminController.renderDashboard);
router.post('/admin/broadcast-sms', adminController.requireAuth, adminController.sendBroadcastSMS);
router.get('/admin/download-receipt/:receiptNo', adminController.requireAuth, adminController.downloadAdminReceipt);

module.exports = router;
