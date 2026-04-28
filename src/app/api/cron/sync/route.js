import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

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

export async function GET(request) {
  try {
    console.log('🔄 Starting SafetyKorea API automated sync...');

    const latestRecord = await prisma.dataRecord.findFirst({
      orderBy: { recordDate: 'desc' },
      select: { recordDate: true }
    });

    let startDate = new Date();
    if (latestRecord) {
      startDate = new Date(latestRecord.recordDate);
      startDate.setDate(startDate.getDate() + 1); // Start from the next day
    } else {
      startDate.setDate(startDate.getDate() - 1); // Default to yesterday if empty
    }

    const today = new Date();
    let currentDate = new Date(startDate);
    let totalNewRecords = 0;
    let daysSynced = 0;

    while (currentDate <= today) {
      const yyyy = currentDate.getUTCFullYear();
      const mm = String(currentDate.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(currentDate.getUTCDate()).padStart(2, '0');
      const dateStr = `${yyyy}${mm}${dd}`;

      console.log(`[Sync] Fetching for ${dateStr}...`);
      const url = `${BASE_URL}?conditionKey=certDate&conditionValue=${dateStr}`;
      const res = await fetch(url, { headers: { 'AuthKey': API_KEY } });
      const result = await res.json();

      if (result.resultCode === '2000' && result.resultData) {
        const items = result.resultData;
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

        const recordDate = new Date(currentDate);
        recordDate.setUTCHours(0,0,0,0);

        console.log(`[Sync] Found ${items.length} items for ${dateStr}. Saving to DB...`);
        for (const [key, count] of Object.entries(stats)) {
          const [major, type, d1, d2, d3] = key.split('|');
          await prisma.dataRecord.upsert({
            where: {
              majorCategory_certType_depth1_depth2_depth3_recordDate: {
                majorCategory: major, certType: type, depth1: d1, depth2: d2, depth3: d3, recordDate
              }
            },
            update: { count },
            create: { majorCategory: major, certType: type, depth1: d1, depth2: d2, depth3: d3, count, recordDate }
          });
        }
        totalNewRecords += items.length;
        daysSynced++;
      }
      
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }

    return NextResponse.json({ 
      success: true, 
      message: `Sync complete. Synced ${daysSynced} days, Total ${totalNewRecords} new items.` 
    });

  } catch (error) {
    console.error('API Sync Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
