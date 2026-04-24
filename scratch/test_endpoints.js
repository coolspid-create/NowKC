const http = require('http');

const optionsCategories = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/categories?major=ALL&startDate=2026-04-21&endDate=2026-04-24',
  method: 'GET'
};

const req1 = http.request(optionsCategories, res => {
  console.log(`categories status: ${res.statusCode}`);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('categories res:', data.substring(0, 100)));
});
req1.on('error', e => console.error(e));
req1.end();

const optionsTrends = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/stats/trends?major=ALL&startDate=2026-04-21&endDate=2026-04-24',
  method: 'GET'
};

const req2 = http.request(optionsTrends, res => {
  console.log(`trends status: ${res.statusCode}`);
});
req2.end();

const optionsWordcloud = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/stats/wordcloud?major=ALL&startDate=2026-04-21&endDate=2026-04-24',
  method: 'GET'
};

const req3 = http.request(optionsWordcloud, res => {
  console.log(`wordcloud status: ${res.statusCode}`);
});
req3.end();
