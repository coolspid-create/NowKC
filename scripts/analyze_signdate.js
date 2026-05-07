const API_KEY = '3d6d1a7f-3792-4eeb-9d75-b2f68a59ac38';
const BASE_URL = 'http://www.safetykorea.kr/openapi/api/cert/certificationList.json';

async function main() {
  const dateStr = '20260506';
  const url = `${BASE_URL}?conditionKey=signDate&conditionValue=${dateStr}`;
  const res = await fetch(url, { headers: { 'AuthKey': API_KEY } });
  const result = await res.json();
  if (result.resultData && result.resultData.length > 0) {
    console.log('Sample item from signDate 20260506:');
    console.log(JSON.stringify(result.resultData[0], null, 2));
    
    // Check distribution of certDate within these items
    const certDates = {};
    result.resultData.forEach(item => {
      certDates[item.certDate] = (certDates[item.certDate] || 0) + 1;
    });
    console.log('\ncertDate distribution for these items:');
    console.log(certDates);
  }
}

main();
