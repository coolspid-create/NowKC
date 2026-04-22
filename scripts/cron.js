const cron = require('node-cron');
const fetch = require('node-fetch');

// Runs at 10:30 AM system local time every day
console.log("⏱️  Local Cron started. Scheduling /api/cron/sync at 10:30 AM every day...");

cron.schedule('30 10 * * *', async () => {
  console.log(`\n[${new Date().toISOString()}] 🕒 Triggering daily dataset sync...`);
  try {
    const res = await fetch('http://localhost:3000/api/cron/sync');
    const data = await res.json();
    if (data.success) {
      console.log(`✅ Success: ${data.message}`);
    } else {
      console.error(`❌ Error:`, data);
    }
  } catch (error) {
    console.error(`❌ Connection Error. Is Next.js server running on localhost:3000?`, error.message);
  }
});
