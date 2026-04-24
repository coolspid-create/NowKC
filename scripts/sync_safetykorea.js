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

async function syncForDate(targetDate) {
  const url = `${BASE_URL}?conditionKey=signDate&conditionValue=${targetDate}`;
  
  console.log(`🚀 [SafetyKorea Sync] Fetching for ${targetDate}...`);
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

    const newStats = {};
    items.forEach(item => {
      const major = parseMajor(item.certDiv);
      const certType = parseCertType(item.certDiv);
      const catParts = (item.categoryName || '').split('>').map(s => s.trim());
      const d1 = catParts[0] || '미분류';
      const d2 = catParts[1] || '';
      const d3 = catParts[2] || '';

      const key = `${major}|${certType}|${d1}|${d2}|${d3}`;
      newStats[key] = (newStats[key] || 0) + 1;
    });

    const currentRecordDate = new Date(targetDate.slice(0,4) + '-' + targetDate.slice(4,6) + '-' + targetDate.slice(6,8) + 'T00:00:00.000Z');
    
    const latestPrevRecord = await prisma.dataRecord.findFirst({
      where: { recordDate: { lt: currentRecordDate } },
      orderBy: { recordDate: 'desc' },
      select: { recordDate: true }
    });

    if (!latestPrevRecord) {
      console.log('ℹ️ No previous records found. Storing new registrations as totals.');
      for (const [key, count] of Object.entries(newStats)) {
        const [major, type, d1, d2, d3] = key.split('|');
        await prisma.dataRecord.create({
          data: {
            majorCategory: major, certType: type, depth1: d1, depth2: d2, depth3: d3,
            count: count, recordDate: currentRecordDate
          }
        });
      }
    } else {
      console.log(`📊 Inheriting totals from ${latestPrevRecord.recordDate.toISOString()}...`);
      const prevRecords = await prisma.dataRecord.findMany({
        where: { recordDate: latestPrevRecord.recordDate }
      });

      const totalMap = {};
      prevRecords.forEach(r => {
        const key = `${r.majorCategory}|${r.certType}|${r.depth1}|${r.depth2}|${r.depth3}`;
        totalMap[key] = r.count;
      });

      Object.entries(newStats).forEach(([key, count]) => {
        totalMap[key] = (totalMap[key] || 0) + count;
      });

      console.log(`💾 Saving ${Object.keys(totalMap).length} categories to DB...`);
      for (const [key, count] of Object.entries(totalMap)) {
        const [major, type, d1, d2, d3] = key.split('|');
        await prisma.dataRecord.upsert({
          where: {
            majorCategory_certType_depth1_depth2_depth3_recordDate: {
              majorCategory: major, certType: type, depth1: d1, depth2: d2, depth3: d3,
              recordDate: currentRecordDate
            }
          },
          update: { count },
          create: {
            majorCategory: major, certType: type, depth1: d1, depth2: d2, depth3: d3,
            count, recordDate: currentRecordDate
          }
        });
      }
    }
    console.log(`🎉 Sync for ${targetDate} complete!`);
  } catch (error) {
    console.error('❌ Sync failed:', error.message);
  }
}

async function main() {
  const dates = ['20260424']; // Add more dates here if needed
  for (const date of dates) {
    await syncForDate(date);
  }
  await prisma.$disconnect();
}

main();
