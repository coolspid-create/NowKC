const API_KEY = '3d6d1a7f-3792-4eeb-9d75-b2f68a59ac38';
const BASE_URL = 'http://www.safetykorea.kr/openapi/api/cert/certificationList.json';

async function findLifeProducts() {
  const targetDate = '20260423'; 
  const url = `${BASE_URL}?conditionKey=certDate&conditionValue=${targetDate}`;
  
  const res = await fetch(url, { headers: { 'AuthKey': API_KEY } });
  const result = await res.json();
  const items = result.resultData || [];

  console.log(`Total items on ${targetDate}: ${items.length}`);
  
  const samples = items.filter(i => {
    if (!i.certDiv || !i.certDiv.includes('>')) return false;
    const secondPart = i.certDiv.split('>')[1];
    return secondPart.includes('생활용품');
  });
  
  console.log(`\nFound ${samples.length} items mentioning '생활용품'`);
  samples.slice(0, 10).forEach(i => {
    console.log(`- certDiv: ${i.certDiv} | categoryName: ${i.categoryName}`);
  });
}

findLifeProducts();
