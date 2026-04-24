// Since I can't fetch localhost, I'll just run the logic manually
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function logic() {
  const rawData = await prisma.dataRecord.groupBy({
    by: ['recordDate', 'majorCategory'],
    _sum: { count: true },
    orderBy: { recordDate: 'asc' }
  });

  const dateMap = {};
  rawData.forEach(item => {
    const d = new Date(item.recordDate);
    const dateStr = `${d.getUTCFullYear().toString().slice(2)}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.${String(d.getUTCDate()).padStart(2, '0')}`;
    if (!dateMap[dateStr]) {
      dateMap[dateStr] = { name: dateStr, total: 0, 전기용품: 0, 생활용품: 0, 어린이제품: 0 };
    }
    dateMap[dateStr].total += item._sum.count;
    dateMap[dateStr][item.majorCategory] = item._sum.count;
  });

  const cumulativeData = Object.values(dateMap).sort((a, b) => a.name.localeCompare(b.name));
  const dailyDelta = [];
  for (let i = 0; i < cumulativeData.length; i++) {
    const current = cumulativeData[i];
    let deltaTotal = 0;
    if (i > 0) {
      deltaTotal = current.total - cumulativeData[i-1].total;
    }
    dailyDelta.push({ name: current.name, totalDelta: deltaTotal });
  }
  console.log(JSON.stringify(dailyDelta, null, 2));
}

logic();
