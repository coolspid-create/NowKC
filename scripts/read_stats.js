const fs = require('fs');

try {
  const data = fs.readFileSync('c:/Users/user/.antigravity/NowKC/now-kc/stats.json', 'utf16le');
  console.log('Stats.json (UTF-16LE) first 200 chars:');
  console.log(data.substring(0, 200));
} catch (e) {
  console.error('Failed to read as UTF-16LE:', e.message);
  try {
    const data = fs.readFileSync('c:/Users/user/.antigravity/NowKC/now-kc/stats.json', 'utf8');
    console.log('Stats.json (UTF-8) first 200 chars:');
    console.log(data.substring(0, 200));
  } catch (e2) {
    console.error('Failed to read as UTF-8:', e2.message);
  }
}
