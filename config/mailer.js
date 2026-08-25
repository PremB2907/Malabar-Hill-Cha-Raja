const nodemailer = require('nodemailer');
require('dotenv').config();

const smtpUser = process.env.SMTP_USER || '';
const smtpPass = process.env.SMTP_APP_PASSWORD || '';
const transporter = smtpUser && smtpPass ? nodemailer.createTransport({
  service: 'gmail',
  auth: { user: smtpUser, pass: smtpPass }
}) : null;

module.exports = {
  async sendAdvertisementEnquiry({ name, phone, email, message }) {
    if (!transporter) throw new Error('SMTP is not configured.');
    const cc = ['marketing.malabarhillcharaja@gmail.com'];
    if (email) cc.push(email);
    return transporter.sendMail({
      from: `Malabar Hill Cha Raja Website <${smtpUser}>`,
      to: 'Mcroffical1973@gmail.com',
      cc,
      replyTo: email || smtpUser,
      subject: `Advertisement enquiry from ${name}`,
      text: `Name: ${name}\nMobile: ${phone}\nEmail: ${email || 'Not provided'}\n\nMessage: ${message || 'Advertisement enquiry'}`
    });
  }
};