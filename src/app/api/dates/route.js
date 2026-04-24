import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request) {
  try {
    const dates = await prisma.dataRecord.findMany({
      select: { recordDate: true },
      distinct: ['recordDate'],
      orderBy: { recordDate: 'asc' },
    });

    const dateList = dates.map(d => {
      const date = new Date(d.recordDate);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    });

    return NextResponse.json({ success: true, data: dateList });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
