const db = require('../config/db');
const razorpay = require('../config/razorpay');
const twilio = require('../config/twilio');
const pdfController = require('./pdfController');

module.exports = {
  // Render Donation Page
  renderDonationPage(req, res) {
    res.render('donate', {
      title: 'ऑनलाइन देणगी पोर्टल (८०जी कर सवलत) | Malabar Hill Cha Raja',
      activeTab: 'donate',
      razorpayKeyId: razorpay.getKeyId()
    });
  },

  // Create Razorpay Payment Order
  async createPaymentOrder(req, res) {
    try {
      const { amount } = req.body;
      if (!amount || parseFloat(amount) <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid donation amount.' });
      }

      const tempReceiptNo = `MCC-REC-2026-${Math.floor(100 + Math.random() * 900)}`;
      const orderResponse = await razorpay.createOrder(amount, tempReceiptNo);

      res.json({
        success: true,
        receipt_no: tempReceiptNo,
        order: orderResponse
      });
    } catch (err) {
      console.error('Create payment order error:', err);
      res.status(500).json({ success: false, message: 'Failed to initiate donation payment.' });
    }
  },

  // Confirm Donation & Save Record
  async confirmDonation(req, res) {
    try {
      const {
        receipt_no, donor_name, phone, email, amount,
        payment_id, order_id, signature, pan_number
      } = req.body;

      if (!donor_name || !phone || !amount) {
        return res.status(400).json({ success: false, message: 'Missing required donation details.' });
      }

      const isValidSignature = razorpay.verifyPaymentSignature(order_id, payment_id, signature);
      if (!isValidSignature) {
        return res.status(400).json({ success: false, message: 'Payment verification failed.' });
      }

      const donationData = {
        receipt_no: receipt_no || `MCC-REC-2026-${Math.floor(100 + Math.random() * 900)}`,
        donor_name: donor_name.trim(),
        phone: phone.trim(),
        email: (email || '').trim(),
        amount: parseFloat(amount),
        gross_amount: parseFloat(amount),
        net_amount: Math.round(parseFloat(amount) * 0.98 * 100) / 100,
        category: 'General Mandal Donation & Seva',
        payment_id: payment_id || `pay_sim_${Date.now()}`,
        order_id: order_id || `order_sim_${Date.now()}`,
        pan_number: (pan_number || '').toUpperCase().trim(),
        status: 'SUCCESS'
      };

      const createdDonation = await db.createDonation(donationData);
      db.addLog('DONATION', `New Donation received: ₹${createdDonation.amount} from ${createdDonation.donor_name}`);

      // Dispatch SMS notification via Twilio
      twilio.sendDonationReceiptSMS(createdDonation).catch(err => console.error('Donation SMS error:', err));

      res.json({
        success: true,
        receipt_no: createdDonation.receipt_no,
        message: 'Donation successfully processed. Thank you for your Seva!'
      });
    } catch (err) {
      console.error('Confirm donation error:', err);
      res.status(500).json({ success: false, message: 'Error recording donation payment.' });
    }
  },

  // Download 80G PDF Receipt
  async downloadDonationReceipt(req, res) {
    const { receiptNo } = req.params;
    const donation = await db.getDonationByReceipt(receiptNo);

    if (!donation) {
      return res.status(404).send('Donation receipt not found.');
    }

    pdfController.generateDonationPDF(donation, res);
  }
};
