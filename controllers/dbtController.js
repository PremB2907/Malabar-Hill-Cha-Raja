const path = require('path');
const db = require('../config/db');

module.exports = {
  async submitReceipt(req, res) {
    try {
      const { donor_name, phone, email, amount, transaction_ref } = req.body;
      const trimmedName = String(donor_name || '').trim();
      const trimmedPhone = String(phone || '').trim();
      const trimmedReference = String(transaction_ref || '').trim();
      const parsedAmount = parseFloat(amount);

      if (!trimmedName || !trimmedPhone || !Number.isFinite(parsedAmount) || parsedAmount <= 0 || !trimmedReference || !req.file) {
        if (req.file) await db.removeDbtReceiptFile(req.file.path);
        return res.redirect('/dbt?error=Please fill all required fields and upload your payment receipt.');
      }

      const receipt = await db.createDbtReceipt({
        donor_name: trimmedName,
        phone: trimmedPhone,
        email: String(email || '').trim(),
        amount: parsedAmount,
        transaction_ref: trimmedReference,
        original_filename: req.file.originalname,
        stored_filename: req.file.filename,
        file_path: path.relative(path.join(__dirname, '..'), req.file.path),
        status: 'PENDING VERIFICATION'
      });

      res.redirect(`/dbt?success=Receipt uploaded successfully. Reference ID: ${receipt.reference_id}`);
    } catch (err) {
      if (req.file) await db.removeDbtReceiptFile(req.file.path);
      console.error('DBT receipt upload error:', err);
      res.redirect('/dbt?error=Receipt upload failed. Please try again.');
    }
  },

  async downloadReceipt(req, res) {
    try {
      const receipt = await db.getDbtReceiptById(req.params.id);
      if (!receipt || !receipt.file_path) return res.status(404).send('Receipt file not found.');
      res.download(path.join(__dirname, '..', receipt.file_path), receipt.original_filename || receipt.stored_filename);
    } catch (err) {
      console.error('DBT receipt download error:', err);
      res.status(404).send('Receipt file not found.');
    }
  }
};
