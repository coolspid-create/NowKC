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

    const url = `${BASE_URL}?conditionKey=certDate&conditionValue=${targetDate}`;
    
    console.log(`[SafetyKorea Sync API] Fetching for ${targetDate} using certDate...`);
    const res = await fetch(url, { headers: { 'AuthKey': API_KEY } });
    const result = await res.json();

    if (result.resultCode !== '2000') {
      return NextResponse.json({ success: false, message: result.resultMsg });
    }

    const items = result.resultData || [];
    if (items.length === 0) {
      return NextResponse.json({ success: true, message: 'No data for this date', count: 0 });
    }

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

    return NextResponse.json({ 
      success: true, 
      message: `Sync complete for ${targetDate}`, 
      newItems: items.length,
      categories: Object.keys(stats).length
    });

  } catch (error) {
    console.error('SafetyKorea Sync API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
