const cron = require('node-cron');
const db = require('./db');

function initCronJobs() {
  console.log('⏰ Initializing Node-Cron Background Jobs...');

  // Cron job running every 15 minutes to simulate live Yatra updates
  cron.schedule('*/15 * * * *', () => {
    try {
      const status = db.getYatraStatus();
      if (status) {
        // Increment statistics slightly for realistic live movement simulation
        status.distance_covered_km = Math.min(status.total_distance_km, status.distance_covered_km + 1);
        status.meals_served_today += Math.floor(Math.random() * 25) + 10;
        status.last_updated = new Date();
        
        db.addLog('CRON', `Live Yatra status updated. Distance: ${status.distance_covered_km} km, Meals: ${status.meals_served_today}`);
      }
    } catch (err) {
      console.error('Error running cron job:', err.message);
    }
  });

  // Daily midnight summary cron job
  cron.schedule('0 0 * * *', () => {
    db.addLog('CRON', 'Daily midnight data rollup completed.');
  });
}

module.exports = { initCronJobs };
