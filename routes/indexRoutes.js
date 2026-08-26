const express = require('express');
const router = express.Router();
const yatraController = require('../controllers/yatraController');
const tshirtController = require('../controllers/tshirtController');
const mailer = require('../config/mailer');

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
  res.render('advertise', { title: 'Advertisement Opportunities | Malabar Hill Cha Raja', activeTab: 'advertise', query: req.query });
});

router.post('/advertise/enquire', async (req, res) => {
  const name = String(req.body.name || '').trim();
  const phone = String(req.body.phone || '').trim();
  const email = String(req.body.email || '').trim();
  const message = String(req.body.message || '').trim();
  if (!name || !phone) return res.status(400).send('Name and mobile number are required.');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).send('Please provide a valid email address.');
  try {
    await mailer.sendAdvertisementEnquiry({ name, phone, email, message });
    res.redirect('/advertise?enquiry=sent');
  } catch (error) {
    console.error('Advertisement enquiry error:', error.message);
    res.redirect('/advertise?enquiry=unavailable');
  }
});

router.get('/dbt', (req, res) => {
  res.render('dbt', { title: 'Direct Bank Transfer | Malabar Hill Cha Raja', activeTab: 'dbt', query: req.query });
});

// Contact Us Page (With Embedded Google Maps)
router.get('/contact', (req, res) => {
  res.render('contact', {
    title: 'आमचे संपर्क | Malabar Hill Cha Raja',
    activeTab: 'contact',
    query: req.query
  });
});

router.post('/contact/enquire', async (req, res) => {
  const name = String(req.body.name || '').trim();
  const phone = String(req.body.phone || '').trim();
  const email = String(req.body.email || '').trim();
  const message = String(req.body.message || '').trim();
  if (!name || !phone || !message) return res.status(400).send('Name, mobile number and message are required.');
  if (email && !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).send('Please provide a valid email address.');
  try {
    await mailer.sendMandalEnquiry({ subject: 'Contact enquiry', name, phone, email, message });
    res.redirect('/contact?enquiry=sent');
  } catch (error) {
    console.error('Contact enquiry error:', error.message);
    res.redirect('/contact?enquiry=unavailable');
  }
});

// Official T-Shirt Booking Routes (Renamed from Tshirt Store)
router.get('/tshirt', tshirtController.renderTshirtPage);
router.post('/tshirt/create-order', tshirtController.createPaymentOrder);
router.post('/tshirt/confirm', tshirtController.confirmTshirtOrder);
router.get('/download-tshirt-receipt/:receiptNo', tshirtController.downloadTshirtReceipt);

module.exports = router;
