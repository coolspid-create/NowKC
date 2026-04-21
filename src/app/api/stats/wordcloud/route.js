import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const majorCategory = searchParams.get('major');

    const where = {};
    if (majorCategory) where.majorCategory = majorCategory;

    // Get all items matching the category
    const records = await prisma.dataRecord.findMany({
      where,
      orderBy: { recordDate: 'desc' }
    });

    // Group by the deepest available categorization (leaf node) + certType, take latest data
    const itemMap = {};
    records.forEach(r => {
      const leafName = r.depth3 || r.depth2 || r.depth1;
      
      // If we've already tracked this leafName for this category today, skip older dates
      const key = `${r.majorCategory}|${r.certType}|${leafName}`;
      if (!itemMap[key]) {
        itemMap[key] = {
          name: leafName,
          majorCategory: r.majorCategory,
          certType: r.certType,
          depth1: r.depth1,
          value: r.count,
        };
      }
    });

    // Sort by value descending and take top 30
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
