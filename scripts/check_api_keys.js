const API_KEY = '3d6d1a7f-3792-4eeb-9d75-b2f68a59ac38';
const BASE_URL = 'http://www.safetykorea.kr/openapi/api/cert/certificationList.json';

async function checkDate(dateStr, key) {
  const url = `${BASE_URL}?conditionKey=${key}&conditionValue=${dateStr}`;
  try {
    const res = await fetch(url, { headers: { 'AuthKey': API_KEY } });
    const result = await res.json();
    if (result.resultCode === '2000') {
      console.log(`[${dateStr}] [${key}] Found ${result.resultData?.length || 0} items.`);
    } else {
      console.log(`[${dateStr}] [${key}] Error: ${result.resultMsg}`);
    }
  } catch (e) {
    console.log(`[${dateStr}] [${key}] Failed: ${e.message}`);
  }
}

async function main() {
  const dates = ['20260506', '20260507', '20260508'];
  for (const date of dates) {
    await checkDate(date, 'certDate');
    await checkDate(date, 'signDate');
  }
}

main();
