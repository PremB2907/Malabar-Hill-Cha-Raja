const db = require('../config/db');
const twilio = require('../config/twilio');
const pdfController = require('./pdfController');

const ADMIN_USER = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'admin123';

let activeAdminSessions = new Set();

module.exports = {
  requireAuth(req, res, next) {
    const authHeader = req.headers.cookie || '';
    const sessionMatch = authHeader.match(/saileela_admin_session=([^;]+)/);
    const sessionToken = sessionMatch ? sessionMatch[1] : null;

    if (sessionToken && activeAdminSessions.has(sessionToken)) {
      req.isAdmin = true;
      return next();
    }

    if (req.xhr || req.headers.accept?.includes('json')) {
      return res.status(401).json({ success: false, message: 'Admin authentication required.' });
    }
    res.redirect('/admin/login');
  },

  renderLoginPage(req, res) {
    const authHeader = req.headers.cookie || '';
    const sessionMatch = authHeader.match(/saileela_admin_session=([^;]+)/);
    const sessionToken = sessionMatch ? sessionMatch[1] : null;

    if (sessionToken && activeAdminSessions.has(sessionToken)) return res.redirect('/admin');

    res.render('admin/login', {
      title: 'Admin Desk | Malabar Hill Cha Raja',
      activeTab: 'admin',
      error: null,
      username: 'admin'
    });
  },

  handleLogin(req, res) {
    const { username, password } = req.body;
    if (username === ADMIN_USER && password === ADMIN_PASS) {
      const sessionToken = `session_${Date.now()}_${Math.random().toString(36).substring(2)}`;
      activeAdminSessions.add(sessionToken);
      res.setHeader('Set-Cookie', `saileela_admin_session=${sessionToken}; Path=/; HttpOnly; SameSite=Lax`);
      db.addLog('AUTH', `Admin logged in successfully (${username}).`);
      return res.redirect('/admin');
    }

    res.render('admin/login', {
      title: 'Admin Desk | Malabar Hill Cha Raja',
      activeTab: 'admin',
      error: 'Invalid username or password. Please try again.',
      username: username || 'admin'
    });
  },

  handleLogout(req, res) {
    const authHeader = req.headers.cookie || '';
    const sessionMatch = authHeader.match(/saileela_admin_session=([^;]+)/);
    const sessionToken = sessionMatch ? sessionMatch[1] : null;
    if (sessionToken) activeAdminSessions.delete(sessionToken);
    res.setHeader('Set-Cookie', 'saileela_admin_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
    db.addLog('AUTH', 'Admin logged out.');
    res.redirect('/admin/login');
  },

  async renderDashboard(req, res) {
    try {
      const donations = await db.getDonations();
      const tshirtOrders = await db.getTshirtOrders();
      const offlineDonations = await db.getOfflineDonations();
      const offlineTshirtOrders = await db.getOfflineTshirtOrders();
      const excelSheets = await db.getOfflineExcelSheets();
      const currentYear = new Date().getFullYear();
      const recentCutoff = new Date(currentYear - 2, 0, 1);
      const recentDonations = donations.filter(d => new Date(d.created_at) >= recentCutoff);
      const yatraStatus = db.getYatraStatus();
      const logs = db.getLogs();

      const totalDonations = donations.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
      const offlineDonationTotal = offlineDonations.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
      const combinedDonationTotal = totalDonations + offlineDonationTotal;

      const onlineTshirtTotal = tshirtOrders.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);
      const offlineTshirtTotal = offlineTshirtOrders.reduce((sum, o) => sum + (parseFloat(o.amount) || 0), 0);
      const combinedTshirtTotal = onlineTshirtTotal + offlineTshirtTotal;

      res.render('admin/dashboard', {
        title: 'Admin Control Panel | Malabar Hill Cha Raja',
        activeTab: 'admin',
        donations,
        tshirtOrders,
        offlineDonations,
        offlineTshirtOrders,
        excelSheets,
        recentDonations,
        recentDonationYears: `${currentYear - 2}-${currentYear}`,
        yatraStatus,
        logs,
        totalDonations,
        offlineDonationTotal,
        combinedDonationTotal,
        onlineTshirtTotal,
        offlineTshirtTotal,
        combinedTshirtTotal,
        query: req.query
      });
    } catch (error) {
      console.error('ADMIN DASHBOARD ERROR:', error);
      res.status(500).send(`Unhandled Server Error: ${error.message}`);
    }
  },

  async downloadAdminReceipt(req, res) {
    const donation = await db.getDonationByReceipt(req.params.receiptNo);
    if (!donation) return res.status(404).send('Donation receipt not found.');
    pdfController.generateDonationPDF(donation, res, { adminCopy: true });
  },

  async verifyPassApi(req, res) {
    const { code } = req.body;
    if (!code) return res.status(400).json({ success: false, message: 'Pass code is required.' });
    const pass = await db.getPassByCode(code);
    if (!pass) return res.json({ success: false, message: 'Invalid or unregistered pass code.' });
    res.json({ success: true, pass, message: `Pass Verified: ${pass.full_name} (${pass.batch})` });
  },

  async sendBroadcastSMS(req, res) {
    try {
      const { message } = req.body;
      if (!message || message.trim().length === 0) return res.redirect('/admin?broadcast_error=Message content cannot be empty.');
      const passes = await db.getPasses();
      let sentCount = 0;
      for (const pass of passes) {
        if (pass.phone) {
          await twilio.sendSMS(pass.phone, `[SAI LEELA PALKHI ANNOUNCEMENT] ${message.trim()}`);
          sentCount++;
        }
      }
      db.addLog('BROADCAST', `SMS broadcast sent to ${sentCount} registered devotees.`);
      res.redirect(`/admin?broadcast_success=Announcement sent successfully to ${sentCount} registered devotees.`);
    } catch (err) {
      console.error('Broadcast error:', err);
      res.redirect('/admin?broadcast_error=Failed to dispatch broadcast messages.');
    }
  }
};
