const express = require('express');
const multer = require('multer');
const router = express.Router();
const excelController = require('../controllers/excelController');
const adminController = require('../controllers/adminController');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /\.xlsx$/i.test(file.originalname);
    if (!ok) return cb(new Error('Only .xlsx Excel files are allowed.'));
    cb(null, true);
  }
});

router.get('/admin/excel', adminController.requireAuth, excelController.renderExcelPage);
router.post('/admin/excel/upload', adminController.requireAuth, upload.single('excel_file'), excelController.uploadExcel);
router.post('/admin/excel/delete/:id', adminController.requireAuth, excelController.deleteSheet);
router.get('/admin/excel/export', adminController.requireAuth, excelController.exportExcel);
router.get('/admin/excel/export-combined', adminController.requireAuth, excelController.exportCombined);

module.exports = router;
