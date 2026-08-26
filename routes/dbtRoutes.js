const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const dbtController = require('../controllers/dbtController');
const adminController = require('../controllers/adminController');

const router = express.Router();
const uploadDirectory = path.join(__dirname, '..', 'receipts', 'dbt');
fs.mkdirSync(uploadDirectory, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDirectory,
    filename: (req, file, cb) => {
      const extension = path.extname(file.originalname).toLowerCase();
      cb(null, `dbt-${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'].includes(path.extname(file.originalname).toLowerCase());
    if (!allowed) return cb(new Error('Only JPG, PNG, WEBP or PDF receipts are allowed.'));
    cb(null, true);
  }
});

router.post('/dbt/upload', (req, res, next) => {
  upload.single('payment_receipt')(req, res, err => {
    if (err) return res.redirect(`/dbt?error=${encodeURIComponent(err.message || 'Invalid receipt file.')}`);
    next();
  });
}, dbtController.submitReceipt);
router.get('/admin/dbt-receipt/:id', adminController.requireAuth, dbtController.downloadReceipt);

module.exports = router;
