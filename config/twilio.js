const twilio = require('twilio');
require('dotenv').config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromPhone = process.env.TWILIO_PHONE_NUMBER || '+15005550006';

let client = null;

if (accountSid && authToken && !accountSid.includes('dummy')) {
  try {
    client = twilio(accountSid, authToken);
  } catch (err) {
    console.log('⚠️ Twilio client error, falling back to SMS logger.');
  }
}

module.exports = {
  async sendSMS(toPhone, message) {
    const formattedPhone = toPhone.startsWith('+') ? toPhone : `+91${toPhone.replace(/\D/g, '')}`;
    
    if (client) {
      try {
        const result = await client.messages.create({
          body: message,
          from: fromPhone,
          to: formattedPhone
        });
        console.log(`📱 Twilio SMS dispatched successfully. SID: ${result.sid}`);
        return { success: true, sid: result.sid, simulated: false };
      } catch (err) {
        console.warn(`⚠️ Twilio API error: ${err.message}. Logging SMS simulation.`);
      }
    }

    // Simulation log output
    console.log('---------------------------------------------------------');
    console.log(`📱 [SIMULATED SMS DISPATCH via Twilio]`);
    console.log(`To: ${formattedPhone}`);
    console.log(`Message: ${message}`);
    console.log('---------------------------------------------------------');
    return { success: true, sid: `SIM_SMS_${Date.now()}`, simulated: true };
  },

  async sendPassConfirmation(passData) {
    const msg = `Om Sai Ram! Your Shri Saileela Palkhi Yatra 2026 Pass is confirmed. Pass Code: ${passData.pass_code}. Batch: ${passData.batch}. Download PDF pass at website. - Sai Leela Trust`;
    return this.sendSMS(passData.phone, msg);
  },

  async sendDonationReceiptSMS(donationData) {
    const msg = `Om Sai Ram! Thank you ${donationData.donor_name} for your generous donation of Rs. ${donationData.amount} towards ${donationData.category}. Receipt No: ${donationData.receipt_no}. - Sai Leela Seva Trust`;
    return this.sendSMS(donationData.phone, msg);
  }
};
