const db = require('../config/db');
const razorpay = require('../config/razorpay');
const twilio = require('../config/twilio');
const pdfController = require('./pdfController');

module.exports = {
  // Render Official T-Shirt Store Page
  renderTshirtPage(req, res) {
    res.render('tshirt', {
      title: 'Official T-Shirt & Merchandise Store | Malabar Hill Cha Raja',
      activeTab: 'tshirt',
      razorpayKeyId: razorpay.getKeyId()
    });
  },

  // Create Razorpay Payment Order for T-Shirt
  async createPaymentOrder(req, res) {
    try {
      const { quantity, size, buyer_name, phone } = req.body;
      const qty = parseInt(quantity, 10) || 1;
      const pricePerUnit = 320;
      const totalAmount = qty * pricePerUnit;

      const tempReceiptNo = `MCC-TSHIRT-2026-${Math.floor(100 + Math.random() * 900)}`;
      const orderResponse = await razorpay.createOrder(totalAmount, tempReceiptNo);

      res.json({
        success: true,
        receipt_no: tempReceiptNo,
        total_amount: totalAmount,
        order: orderResponse
      });
    } catch (err) {
      console.error('Create tshirt payment order error:', err);
      res.status(500).json({ success: false, message: 'Failed to initiate T-Shirt payment.' });
    }
  },

  // Confirm T-Shirt Purchase & Save Order Record
  async confirmTshirtOrder(req, res) {
    try {
      const {
        receipt_no, buyer_name, phone, email, size, quantity, total_amount, address,
        payment_id, order_id, signature
      } = req.body;

      if (!buyer_name || !phone || !size || !quantity || !total_amount) {
        return res.status(400).json({ success: false, message: 'Missing required T-Shirt order details.' });
      }

      if (!payment_id || !order_id || !signature || [payment_id, order_id, signature].some(value => /(?:^|_)sim(?:_|$)|mock/i.test(value))) {
        return res.status(400).json({ success: false, message: 'A successful Razorpay payment is required before booking.' });
      }

      const isValidSignature = razorpay.verifyPaymentSignature(order_id, payment_id, signature);
      if (!isValidSignature) {
        return res.status(400).json({ success: false, message: 'Payment verification failed.' });
      }

      const orderData = {
        receipt_no: receipt_no || `MCC-TSHIRT-2026-${Math.floor(100 + Math.random() * 900)}`,
        buyer_name: buyer_name.trim(),
        phone: phone.trim(),
        email: (email || '').trim(),
        size,
        color: 'Royal Maroon',
        quantity: parseInt(quantity, 10),
        total_amount: parseFloat(total_amount),
        address: (address || '').trim(),
        payment_id: payment_id || `pay_tshirt_${Date.now()}`,
        status: 'SUCCESS'
      };

      const createdOrder = await db.createTshirtOrder(orderData);
      db.addLog('MERCHANDISE', `New T-Shirt Order: ₹${createdOrder.total_amount} (${createdOrder.size} - ${createdOrder.color}) from ${createdOrder.buyer_name}`);

      res.json({
        success: true,
        receipt_no: createdOrder.receipt_no,
        message: 'T-Shirt order booked successfully! Download your official pickup token receipt below.'
      });
    } catch (err) {
      console.error('Confirm tshirt order error:', err);
      res.status(500).json({ success: false, message: 'Error recording T-Shirt order.' });
    }
  },

  // Download T-Shirt Booking Token PDF Receipt
  async downloadTshirtReceipt(req, res) {
    const { receiptNo } = req.params;
    const order = await db.getTshirtOrderByReceipt(receiptNo);

    if (!order) {
      return res.status(404).send('T-Shirt order token not found.');
    }

    pdfController.generateTshirtPDF(order, res);
  }
};
