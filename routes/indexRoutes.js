const express = require('express');
const router = express.Router();
const yatraController = require('../controllers/yatraController');
const tshirtController = require('../controllers/tshirtController');

// Home & About Routes
router.get('/', yatraController.renderHomePage);
router.get('/about', yatraController.renderAboutPage);

// Festival Schedule & API Routes
router.get('/schedule', yatraController.renderSchedulePage);
router.get('/api/live-status', yatraController.getLiveStatusApi);

// Glimpses & Decade Gallery Combined
router.get('/glimpses', yatraController.renderGlimpsesPage);
router.get('/photo-booth', (req, res) => res.redirect(301, '/glimpses'));

// Social Work Page (Separate Page & Photos)
router.get('/social-work', yatraController.renderSocialWorkPage);

// Executive Committee Page (Public - Separate from Admin Login)
router.get('/committee', yatraController.renderCommitteePage);

router.get('/advertise', (req, res) => {
  res.render('advertise', { title: 'Advertisement Opportunities | Malabar Hill Cha Raja', activeTab: 'advertise' });
});

router.get('/dbt', (req, res) => {
  res.render('dbt', { title: 'Direct Bank Transfer | Malabar Hill Cha Raja', activeTab: 'dbt' });
});

// Contact Us Page (With Embedded Google Maps)
router.get('/contact', (req, res) => {
  res.render('contact', {
    title: 'आमचे संपर्क | Malabar Hill Cha Raja',
    activeTab: 'contact'
  });
});

// Official T-Shirt Booking Routes (Renamed from Tshirt Store)
router.get('/tshirt', tshirtController.renderTshirtPage);
router.post('/tshirt/create-order', tshirtController.createPaymentOrder);
router.post('/tshirt/confirm', tshirtController.confirmTshirtOrder);
router.get('/download-tshirt-receipt/:receiptNo', tshirtController.downloadTshirtReceipt);

module.exports = router;
