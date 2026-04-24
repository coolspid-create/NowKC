const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const dates = await prisma.dataRecord.groupBy({
    by: ['recordDate'],
    _sum: { count: true },
    orderBy: { recordDate: 'asc' }
  });
  console.log(JSON.stringify(dates, null, 2));
}

check();
