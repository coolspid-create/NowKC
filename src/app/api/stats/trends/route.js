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

    if ((startDateParam && startDateParam.trim() !== '') || (endDateParam && endDateParam.trim() !== '')) {
      where.recordDate = {};
      if (startDateParam && startDateParam.trim() !== '') where.recordDate.gte = new Date(startDateParam + 'T00:00:00.000Z');
      if (endDateParam && endDateParam.trim() !== '') where.recordDate.lte = new Date(endDateParam + 'T23:59:59.999Z');
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
    const dateMap = {}; 

    rawData.forEach(item => {
      const d = new Date(item.recordDate);
      const dateStr = `${d.getUTCFullYear().toString().slice(2)}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.${String(d.getUTCDate()).padStart(2, '0')}`;
      
      if (!dateMap[dateStr]) {
        dateMap[dateStr] = { name: dateStr, totalDelta: 0, 전기용품: 0, 생활용품: 0, 어린이제품: 0 };
      }
      
      const sum = item._sum.count || 0;
      dateMap[dateStr].totalDelta += sum;
      if (item.majorCategory) {
        dateMap[dateStr][item.majorCategory] = sum;
      }
    });

    const dailyDelta = Object.values(dateMap).sort((a, b) => a.name.localeCompare(b.name));

    const dailyRatio = dailyDelta.map(current => {
      const deltaTotal = current.totalDelta;
      if (deltaTotal > 0) {
        return {
          name: current.name,
          totalDelta: deltaTotal,
          전기용품: (current.전기용품 / deltaTotal) * 100,
          전기용품_count: current.전기용품,
          생활용품: (current.생활용품 / deltaTotal) * 100,
          생활용품_count: current.생활용품,
          어린이제품: (current.어린이제품 / deltaTotal) * 100,
          어린이제품_count: current.어린이제품,
        };
      } else {
        return {
          name: current.name,
          totalDelta: 0,
          전기용품: 0, 전기용품_count: 0,
          생활용품: 0, 생활용품_count: 0,
          어린이제품: 0, 어린이제품_count: 0,
        };
      }
    });

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
