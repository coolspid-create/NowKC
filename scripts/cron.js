const cron = require('node-cron');
const fetch = require('node-fetch');

// Excludes weekends, runs at 09:00 system local time (Assuming server is in KST)
console.log("⏱️  Local Cron started. Scheduling /api/cron/sync at 9:00 AM Mon-Fri...");

cron.schedule('0 9 * * 1-5', async () => {
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
