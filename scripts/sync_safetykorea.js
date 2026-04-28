const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const API_KEY = '3d6d1a7f-3792-4eeb-9d75-b2f68a59ac38';
const BASE_URL = 'http://www.safetykorea.kr/openapi/api/cert/certificationList.json';

function parseMajor(certDiv) {
  if (!certDiv) return '기타';
  const parts = certDiv.split('>');
  const target = parts.length > 1 ? parts[1] : parts[0];
  
  if (target.includes('전기용품')) return '전기용품';
  if (target.includes('생활용품')) return '생활용품';
  if (target.includes('어린이제품')) return '어린이제품';
  
  const first = parts[0];
  if (first.includes('전기용품')) return '전기용품';
  if (first.includes('생활용품')) return '생활용품';
  if (first.includes('어린이제품')) return '어린이제품';
  
  return first.trim();
}

function parseCertType(certDiv) {
  if (!certDiv) return '기타';
  const parts = certDiv.split('>');
  if (parts.length < 2) return '기타';
  const typePart = parts[1].trim();
  if (typePart.includes('안전인증')) return '안전인증';
  if (typePart.includes('안전확인')) return '안전확인';
  if (typePart.includes('공급자적합성')) return '공급자적합성';
  return typePart;
}

async function syncForDate(targetDate) {
  const url = `${BASE_URL}?conditionKey=certDate&conditionValue=${targetDate}`;
  
  console.log(`🚀 [SafetyKorea Sync] Fetching for ${targetDate} using certDate...`);
  try {
    const res = await fetch(url, { headers: { 'AuthKey': API_KEY } });
    const result = await res.json();

    if (result.resultCode !== '2000') {
      console.error(`❌ API Error: ${result.resultMsg}`);
      return;
    }

    const items = result.resultData || [];
    console.log(`✅ Received ${items.length} records.`);
    
    if (items.length === 0) return;

    const stats = {};
    items.forEach(item => {
      const major = parseMajor(item.certDiv);
      const certType = parseCertType(item.certDiv);
      const catParts = (item.categoryName || '').split('>').map(s => s.trim());
      const d1 = catParts[0] || '미분류';
      const d2 = catParts[1] || '';
      const d3 = catParts[2] || '';

      const key = `${major}|${certType}|${d1}|${d2}|${d3}`;
      stats[key] = (stats[key] || 0) + 1;
    });

    const recordDate = new Date(targetDate.slice(0,4) + '-' + targetDate.slice(4,6) + '-' + targetDate.slice(6,8) + 'T00:00:00.000Z');
    
    console.log(`💾 Saving categories to DB for ${targetDate}...`);
    for (const [key, count] of Object.entries(stats)) {
      const [major, type, d1, d2, d3] = key.split('|');
      await prisma.dataRecord.upsert({
        where: {
          majorCategory_certType_depth1_depth2_depth3_recordDate: {
            majorCategory: major, certType: type, depth1: d1, depth2: d2, depth3: d3,
            recordDate: recordDate
          }
        },
        update: { count },
        create: {
          majorCategory: major, certType: type, depth1: d1, depth2: d2, depth3: d3,
          count, recordDate: recordDate
        }
      });
    }
    console.log(`🎉 Sync for ${targetDate} complete!`);
  } catch (error) {
    console.error('❌ Sync failed:', error.message);
  }
}

async function main() {
  // Auto-sync from latest date to today
  const latestRecord = await prisma.dataRecord.findFirst({
    orderBy: { recordDate: 'desc' },
    select: { recordDate: true }
  });

  let startDate = new Date();
  if (latestRecord) {
    startDate = new Date(latestRecord.recordDate);
    startDate.setUTCDate(startDate.getUTCDate() + 1);
  } else {
    startDate.setUTCDate(startDate.getUTCDate() - 1);
  }

  const today = new Date();
  let current = new Date(startDate);

  while (current <= today) {
    const yyyy = current.getUTCFullYear();
    const mm = String(current.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(current.getUTCDate()).padStart(2, '0');
    const dateStr = `${yyyy}${mm}${dd}`;
    
    await syncForDate(dateStr);
    current.setUTCDate(current.getUTCDate() + 1);
  }

  await prisma.$disconnect();
}

main();
