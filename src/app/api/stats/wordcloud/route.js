import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

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

    const endDate = endDateParam ? new Date(endDateParam + 'T00:00:00.000Z') : latestRecord.recordDate;

    const whereEnd = { recordDate: endDate };
    if (majorCategory) whereEnd.majorCategory = majorCategory;
    const endRecords = await prisma.dataRecord.findMany({ where: whereEnd });

    let records = [];

    if (startDateParam) {
      const startDate = new Date(startDateParam + 'T00:00:00.000Z');
      const whereStart = { recordDate: startDate };
      if (majorCategory) whereStart.majorCategory = majorCategory;
      const startRecords = await prisma.dataRecord.findMany({ where: whereStart });

      const deltaMap = {};
      const getKey = (r) => `${r.majorCategory}|${r.certType}|${r.depth1}|${r.depth2 || ''}|${r.depth3 || ''}`;

      endRecords.forEach(r => {
        const k = getKey(r);
        deltaMap[k] = { ...r, count: r.count };
      });

      startRecords.forEach(r => {
        const k = getKey(r);
        if (deltaMap[k]) {
          deltaMap[k].count -= r.count;
        } else {
          deltaMap[k] = { ...r, count: -r.count };
        }
      });

      records = Object.values(deltaMap).filter(r => r.count > 0);
    } else {
      records = endRecords;
    }

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
