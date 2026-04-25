import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';


export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const majorCategory = searchParams.get('major');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    const latestRecord = await prisma.dataRecord.findFirst({
      orderBy: { recordDate: 'desc' },
      select: { recordDate: true }
    });

    if (!latestRecord) {
      return NextResponse.json({ success: true, data: [] });
    }

    const where = {};
    if (majorCategory) where.majorCategory = majorCategory;
    
    if ((startDateParam && startDateParam.trim() !== '') || (endDateParam && endDateParam.trim() !== '')) {
      where.recordDate = {};
      if (startDateParam && startDateParam.trim() !== '') where.recordDate.gte = new Date(startDateParam + 'T00:00:00.000Z');
      if (endDateParam && endDateParam.trim() !== '') where.recordDate.lte = new Date(endDateParam + 'T23:59:59.999Z');
    }

    const records = await prisma.dataRecord.findMany({ where });

    const itemMap = {};
    records.forEach(r => {
      const leafName = r.depth3 || r.depth2 || r.depth1;
      const key = `${r.majorCategory}|${r.certType}|${leafName}`;
      
      // Since records now might contain multiple sub-categories with same leafName but different path,
      // it's safer to sum them or just group them by the same key
      if (!itemMap[key]) {
        itemMap[key] = {
          name: leafName,
          majorCategory: r.majorCategory,
          certType: r.certType,
          depth1: r.depth1,
          value: 0,
        };
      }
      itemMap[key].value += r.count;
    });

    const topWords = Object.values(itemMap)
      .filter(w => w.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 30);

    return NextResponse.json({ success: true, data: topWords });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
