import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const majorCategory = searchParams.get('major');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    const where = {};
    if (majorCategory && majorCategory !== 'ALL') {
      where.majorCategory = majorCategory;
    }

    if (startDateParam || endDateParam) {
      where.recordDate = {};
      if (startDateParam) where.recordDate.gte = new Date(startDateParam + 'T00:00:00.000Z');
      if (endDateParam) where.recordDate.lte = new Date(endDateParam + 'T00:00:00.000Z');
    }

    // Group by recordDate and majorCategory
    const rawData = await prisma.dataRecord.groupBy({
      by: ['recordDate', 'majorCategory'],
      where,
      _sum: {
        count: true
      },
      orderBy: {
        recordDate: 'asc'
      }
    });

    // Structure the data
    const dateMap = {}; // { 'YY.MM.DD': { name: 'YY.MM.DD', total: 0, 전기용품: 0, 생활용품: 0, 어린이제품: 0 } }

    rawData.forEach(item => {
      const d = new Date(item.recordDate);
      const dateStr = `${d.getUTCFullYear().toString().slice(2)}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.${String(d.getUTCDate()).padStart(2, '0')}`;
      
      if (!dateMap[dateStr]) {
        dateMap[dateStr] = { name: dateStr, total: 0, 전기용품: 0, 생활용품: 0, 어린이제품: 0 };
      }
      
      const sum = item._sum.count || 0;
      dateMap[dateStr].total += sum;
      if (item.majorCategory) {
        dateMap[dateStr][item.majorCategory] = sum;
      }
    });

    const cumulativeData = Object.values(dateMap).sort((a, b) => a.name.localeCompare(b.name));

    // Calculate Daily Deltas and Ratios
    const dailyDelta = [];
    const dailyRatio = [];

    for (let i = 1; i < cumulativeData.length; i++) {
      const current = cumulativeData[i];
      const prev = cumulativeData[i - 1];
      
      const deltaTotal = current.total - prev.total;
      const deltaE = current.전기용품 - prev.전기용품;
      const deltaL = current.생활용품 - prev.생활용품;
      const deltaC = current.어린이제품 - prev.어린이제품;

      dailyDelta.push({
        name: current.name,
        totalDelta: deltaTotal,
        전기용품: deltaE,
        생활용품: deltaL,
        어린이제품: deltaC,
      });

      // Calculate ratios (percentages 0-100)
      if (deltaTotal > 0) {
        dailyRatio.push({
          name: current.name,
          전기용품: (deltaE / deltaTotal) * 100,
          생활용품: (deltaL / deltaTotal) * 100,
          어린이제품: (deltaC / deltaTotal) * 100,
        });
      } else {
        dailyRatio.push({
          name: current.name,
          전기용품: 0,
          생활용품: 0,
          어린이제품: 0,
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        dailyDelta,
        dailyRatio
      }
    });
  } catch (error) {
    console.error('Trends API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
