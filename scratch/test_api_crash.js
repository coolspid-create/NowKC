const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const latestRecord = await prisma.dataRecord.findFirst({
      orderBy: { recordDate: 'desc' }
    });

    if (!latestRecord) {
      console.log('No records found');
      return;
    }

    const latestSnapshot = await prisma.dataRecord.groupBy({
      by: ['majorCategory'],
      _sum: { count: true },
      where: { recordDate: latestRecord.recordDate }
    });

    const lifetimeTotals = {
      total: latestSnapshot.reduce((acc, curr) => acc + (curr._sum.count || 0), 0),
      전기용품: latestSnapshot.find(s => s.majorCategory === '전기용품')?._sum.count || 0,
      생활용품: latestSnapshot.find(s => s.majorCategory === '생활용품')?._sum.count || 0,
      어린이제품: latestSnapshot.find(s => s.majorCategory === '어린이제품')?._sum.count || 0,
    };

    console.log('Success:', JSON.stringify(lifetimeTotals, null, 2));
  } catch (e) {
    console.error('Error:', e);
  }
}

test();
