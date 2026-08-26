const express = require('express');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const db = require('./config/db');
const { initCronJobs } = require('./config/cron');

const indexRoutes = require('./routes/indexRoutes');
const dbtRoutes = require('./routes/dbtRoutes');
const donationRoutes = require('./routes/donationRoutes');
const adminRoutes = require('./routes/adminRoutes');
const excelRoutes = require('./routes/excelRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure directories exist
['views', 'public', 'receipts', 'logs', 'modules'].forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  } catch (err) {}
});

// View Engine Setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/gallery/celebrities', express.static(path.join(__dirname, 'Celebrities')));
app.use('/gallery/bappa', express.static(path.join(__dirname, 'Bappa Pics')));
app.get('/assets/brochure-2026.pdf', (req, res) => res.sendFile(path.join(__dirname, 'Broucher 2026.pdf')));

// i18n Language Cookie Middleware
app.use((req, res, next) => {
  let lang = 'mr';
  const cookieHeader = req.headers.cookie || '';
  const match = cookieHeader.match(/mhr_lang=(mr|en)/);
  if (match) {
    lang = match[1];
  } else if (req.query.lang === 'mr' || req.query.lang === 'en') {
    lang = req.query.lang;
  }
  res.locals.lang = lang;
  next();
});

// Mount Routes
app.use('/', indexRoutes);
app.use('/', dbtRoutes);
app.use('/', donationRoutes);
app.use('/', adminRoutes);
app.use('/', excelRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err.stack);
  res.status(500).send(`
    <div style="font-family: sans-serif; padding: 40px; text-align: center;">
      <h2>Ganpati Bappa Morya - Server Encountered an Unexpected Issue</h2>
      <p style="color: #64748b;">${err.message}</p>
      <a href="/" style="display: inline-block; margin-top: 15px; background: #800020; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 6px;">Return to Home</a>
    </div>
  `);
});

// 404 Handler
app.use((req, res) => {
  res.status(404).render('index', {
    title: '404 - Page Not Found | Malabar Hill Cha Raja',
    activeTab: 'home',
    yatraStatus: db.getYatraStatus(),
    scheduleData: [],
    glimpsesData: [],
    socialWorkData: []
  });
});

// Export Express app for Vercel Serverless Functions
module.exports = app;

// Start Server & Database when running locally
if (process.env.VERCEL !== '1') {
  app.listen(PORT, async () => {
    console.log(`=======================================================`);
    console.log(`🌺 Malabar Hill Cha Raja Official Web Server Started`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log(`=======================================================`);
    
    await db.initDB();
    initCronJobs();
  });
}
