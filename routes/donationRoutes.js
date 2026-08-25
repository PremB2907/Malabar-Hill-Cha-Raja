const express = require('express');
const router = express.Router();
const donationController = require('../controllers/donationController');

router.get('/donate', donationController.renderDonationPage);
router.post('/api/create-donation-order', donationController.createPaymentOrder);
router.post('/api/confirm-donation', donationController.confirmDonation);
router.get('/download-receipt/:receiptNo', donationController.downloadDonationReceipt);

module.exports = router;
