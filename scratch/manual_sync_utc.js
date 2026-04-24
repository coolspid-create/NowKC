const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const xlsx = require('xlsx');

function parseCertType(rawCertType) {
  const parts = rawCertType.trim().split(/\s+/);
  if (parts.length >= 2) {
    const certType = parts[parts.length - 1];
    const majorCategory = parts.slice(0, parts.length - 1).join(' '); 
    return { majorCategory, certType };
  }
  return { majorCategory: rawCertType, certType: '기타' };
}

async function sync() {
  const url = 'https://docs.google.com/spreadsheets/d/1LjxspbUmxGZJf5brnFwQusEqZpY6GVhXQRT7VkiFY6E/export?format=xlsx';
  const res = await fetch(url);
  const buffer = await res.arrayBuffer();
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const datePattern = /^\d{2}\.\d{2}\.\d{2}$/;
  const dateSheets = workbook.SheetNames.filter(name => datePattern.test(name)).sort();

  for (const sheetName of dateSheets) {
    console.log(`Processing ${sheetName}...`);
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });
    const [dd, mm, yy] = sheetName.split('.').map(s => parseInt(s, 10));
    const recordDate = new Date(Date.UTC(2000 + yy, mm - 1, dd));

    for (const row of rows) {
      const rawCertType = row['인증유형'];
      const itemName = row['품목명'];
      const count = parseInt(row['총건수'], 10);
      if (!itemName || isNaN(count)) continue;
      const { majorCategory, certType } = parseCertType(rawCertType);
      const parts = itemName.toString().split('>').map(s => s.trim());
      const depth1 = parts[0] || '';
      const depth2 = parts[1] || '';
      const depth3 = parts[2] || '';
      if (!depth1) continue;

      await prisma.dataRecord.upsert({
        where: {
          majorCategory_certType_depth1_depth2_depth3_recordDate: {
            majorCategory, certType, depth1, depth2, depth3, recordDate
          }
        },
        update: { count },
        create: { majorCategory, certType, depth1, depth2, depth3, count, recordDate }
      });
    }
  }
  console.log('Sync complete');
}

sync();
