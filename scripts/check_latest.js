const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const latest = await prisma.dataRecord.findFirst({
    orderBy: { recordDate: 'desc' },
  });
  console.log('Latest record in DB:', latest);
  
  const count = await prisma.dataRecord.count();
  console.log('Total records in DB:', count);
  
  const distinctDates = await prisma.dataRecord.findMany({
    select: { recordDate: true },
    distinct: ['recordDate'],
    orderBy: { recordDate: 'desc' },
    take: 10
  });
  console.log('Recent 10 distinct dates:', distinctDates.map(d => d.recordDate.toISOString().split('T')[0]));

  await prisma.$disconnect();
}

main();
