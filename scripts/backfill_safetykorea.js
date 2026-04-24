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
  
  // Fallback to the first part
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

async function fetchAndStore(targetDate) {
  const url = `${BASE_URL}?conditionKey=certDate&conditionValue=${targetDate}`;
  
  try {
    const res = await fetch(url, { headers: { 'AuthKey': API_KEY } });
    const result = await res.json();

    if (result.resultCode !== '2000') {
      console.log(`[${targetDate}] API Error: ${result.resultMsg}`);
      return 0;
    }

    const items = result.resultData || [];
    if (items.length === 0) return 0;

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

    const ops = Object.entries(stats).map(([key, count]) => {
      const [major, type, d1, d2, d3] = key.split('|');
      return prisma.dataRecord.upsert({
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
    });

    await prisma.$transaction(ops);
    console.log(`✅ [${targetDate}] Saved ${items.length} items in ${Object.keys(stats).length} categories.`);
    return items.length;
  } catch (error) {
    console.error(`❌ [${targetDate}] Failed:`, error.message);
    return 0;
  }
}

async function main() {
  // 1. Wipe existing data (optional, but requested to "forget excel data")
  console.log('🗑️ Wiping existing dataRecord table...');
  await prisma.dataRecord.deleteMany({});

  // 2. Range from 2025-01-01 to today
  const start = new Date('2025-01-01');
  const end = new Date();
  
  let current = new Date(start);
  while (current <= end) {
    const yyyy = current.getFullYear();
    const mm = String(current.getMonth() + 1).padStart(2, '0');
    const dd = String(current.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}${mm}${dd}`;
    
    await fetchAndStore(dateStr);
    
    // Add a small delay to avoid overwhelming the API
    await new Promise(r => setTimeout(r, 200));
    
    current.setDate(current.getDate() + 1);
  }

  console.log('🎉 Backfill complete!');
  await prisma.$disconnect();
}

main();
