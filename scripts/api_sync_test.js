

async function testApiSync() {
  const API_KEY = '3d6d1a7f-3792-4eeb-9d75-b2f68a59ac38';
  const targetDate = '20260424'; // YYYYMMDD
  const url = `http://www.safetykorea.kr/openapi/api/cert/certificationList.json?conditionKey=signDate&conditionValue=${targetDate}`;

  console.log(`🚀 Fetching data for ${targetDate}...`);
  
  try {
    const response = await fetch(url, {
      headers: {
        'AuthKey': API_KEY
      }
    });

    const result = await response.json();
    console.log('📦 API Full Response Structure:', Object.keys(result));
    if (result.resultData && result.resultData.length > 0) {
      console.log('📄 First Record Sample:', JSON.stringify(result.resultData[0], null, 2));
    }
    if (result.resultCode !== '2000') {
      console.error(`❌ API Error: ${result.resultMsg} (${result.resultCode})`);
      return;
    }

    const data = result.resultData || [];
    console.log(`✅ Received ${data.length} records.`);

    if (data.length === 0) {
      console.log('ℹ️ No data found for this date.');
      return;
    }

    // Processing Logic
    const stats = {}; // { key: count }

    data.forEach(item => {
      // 1. Parse Major Category & Cert Type from certDiv
      // e.g. "전기용품안전관리법 대상 > 안전확인 대상"
      let major = '기타';
      let certType = '기타';
      if (item.certDiv && item.certDiv.includes('>')) {
        const parts = item.certDiv.split('>').map(s => s.trim());
        major = parts[0].replace('안전관리법 대상', '').trim();
        certType = parts[1].trim();
      }

      // 2. Parse Hierarchy from categoryName
      // e.g. "전기기기 > 가구 > 의자"
      const catParts = (item.categoryName || '').split('>').map(s => s.trim());
      const d1 = catParts[0] || '미분류';
      const d2 = catParts[1] || '';
      const d3 = catParts[2] || '';

      const key = `${major}|${certType}|${d1}|${d2}|${d3}`;
      stats[key] = (stats[key] || 0) + 1;
    });

    console.log('\n📊 --- Statistics Summary ---');
    Object.entries(stats).slice(0, 15).forEach(([key, count]) => {
      console.log(`${key.padEnd(60)} : ${count} items`);
    });
    if (Object.keys(stats).length > 15) console.log('... and more');

  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

testApiSync();
