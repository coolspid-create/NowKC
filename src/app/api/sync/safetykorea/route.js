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
    const { searchParams } = new URL(request.url);
    const targetDate = searchParams.get('date'); // YYYYMMDD
    if (!targetDate) return NextResponse.json({ success: false, error: 'Date is required' }, { status: 400 });

    const url = `${BASE_URL}?conditionKey=signDate&conditionValue=${targetDate}`;
    
    console.log(`[SafetyKorea Sync] Fetching for ${targetDate}...`);
    const res = await fetch(url, { headers: { 'AuthKey': API_KEY } });
    const result = await res.json();

    if (result.resultCode !== '2000') {
      return NextResponse.json({ success: false, message: result.resultMsg });
    }

    const items = result.resultData || [];
    if (items.length === 0) {
      return NextResponse.json({ success: true, message: 'No data for this date', count: 0 });
    }

    // 1. Group new items from API
    const newStats = {}; // key -> count
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

    // 2. Get Previous Total from DB
    // We need to find the latest record date before our targetDate
    const currentRecordDate = new Date(targetDate.slice(0,4) + '-' + targetDate.slice(4,6) + '-' + targetDate.slice(6,8) + 'T00:00:00.000Z');
    
    const latestPrevRecord = await prisma.dataRecord.findFirst({
      where: { recordDate: { lt: currentRecordDate } },
      orderBy: { recordDate: 'desc' },
      select: { recordDate: true }
    });

    if (!latestPrevRecord) {
      // If no previous data, we can only store the new registrations (as total)
      // This might not be accurate if we don't have the baseline.
      console.log('[SafetyKorea Sync] No previous records found. Storing new registrations as totals.');
      
      for (const [key, count] of Object.entries(newStats)) {
        const [major, type, d1, d2, d3] = key.split('|');
        await prisma.dataRecord.create({
          data: {
            majorCategory: major,
            certType: type,
            depth1: d1,
            depth2: d2,
            depth3: d3,
            count: count,
            recordDate: currentRecordDate
          }
        });
      }
    } else {
      // Inherit totals and add new ones
      const prevRecords = await prisma.dataRecord.findMany({
        where: { recordDate: latestPrevRecord.recordDate }
      });

      const totalMap = {}; // key -> count
      prevRecords.forEach(r => {
        const key = `${r.majorCategory}|${r.certType}|${r.depth1}|${r.depth2}|${r.depth3}`;
        totalMap[key] = r.count;
      });

      // Update with new stats
      Object.entries(newStats).forEach(([key, count]) => {
        totalMap[key] = (totalMap[key] || 0) + count;
      });

      // Save to DB
      for (const [key, count] of Object.entries(totalMap)) {
        const [major, type, d1, d2, d3] = key.split('|');
        await prisma.dataRecord.upsert({
          where: {
            majorCategory_certType_depth1_depth2_depth3_recordDate: {
              majorCategory: major,
              certType: type,
              depth1: d1,
              depth2: d2,
              depth3: d3,
              recordDate: currentRecordDate
            }
          },
          update: { count },
          create: {
            majorCategory: major,
            certType: type,
            depth1: d1,
            depth2: d2,
            depth3: d3,
            count,
            recordDate: currentRecordDate
          }
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Sync complete for ${targetDate}`, 
      newItems: items.length,
      categories: Object.keys(newStats).length
    });

  } catch (error) {
    console.error('SafetyKorea Sync Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
