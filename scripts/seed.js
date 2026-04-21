const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

const prisma = new PrismaClient();

function parseCertType(rawCertType) {
  // "전기용품 안전인증" → { majorCategory: "전기용품", certType: "안전인증" }
  // "생활용품 안전확인" → { majorCategory: "생활용품", certType: "안전확인" }
  // "어린이제품 안전인증" → { majorCategory: "어린이제품", certType: "안전인증" }
  const parts = rawCertType.trim().split(/\s+/);
  if (parts.length >= 2) {
    const certType = parts[parts.length - 1]; // "안전인증" or "안전확인"
    const majorCategory = parts.slice(0, parts.length - 1).join(' '); // "전기용품" etc.
    return { majorCategory, certType };
  }
  return { majorCategory: rawCertType, certType: '기타' };
}

async function seed() {
  console.log('🔄 Starting data seed process...');

  const csvPath = path.resolve(__dirname, '../../data.csv');
  let csvData;
  try {
    csvData = fs.readFileSync(csvPath, 'utf8');
  } catch (e) {
    console.log('Local data.csv not found. Fetching from Google Sheets...');
    const url = 'https://docs.google.com/spreadsheets/d/1LjxspbUmxGZJf5brnFwQusEqZpY6GVhXQRT7VkiFY6E/export?format=csv&gid=0';
    const res = await fetch(url);
    csvData = await res.text();
  }

  const result = Papa.parse(csvData, {
    header: true,
    skipEmptyLines: true,
  });

  const rows = result.data;
  console.log(`📊 Parsed ${rows.length} rows.`);

  let insertedCount = 0;
  let skippedCount = 0;

  for (const row of rows) {
    const recordDateRaw = row['집계일시'];
    const rawCertType = row['인증유형'];
    const itemName = row['품목명'];
    const count = parseInt(row['총건수'], 10);

    if (!itemName || isNaN(count)) { skippedCount++; continue; }

    const { majorCategory, certType } = parseCertType(rawCertType);

    // Parse record date, truncated to start of week (Monday)
    let recordDate = new Date();
    try {
      recordDate = new Date(Date.parse(recordDateRaw));
      if (isNaN(recordDate.getTime())) recordDate = new Date();
    } catch (e) { /* fallback to current date */ }

    recordDate.setHours(0, 0, 0, 0);

    // Split 품목명 by > into depth1, depth2, depth3
    const parts = itemName.split('>').map(s => s.trim());
    const depth1 = parts[0] || '';
    const depth2 = parts[1] || '';
    const depth3 = parts[2] || '';

    if (!depth1) { skippedCount++; continue; }

    try {
      await prisma.dataRecord.upsert({
        where: {
          majorCategory_certType_depth1_depth2_depth3_recordDate: {
            majorCategory,
            certType,
            depth1,
            depth2,
            depth3,
            recordDate,
          }
        },
        update: { count },
        create: {
          majorCategory,
          certType,
          depth1,
          depth2,
          depth3,
          count,
          recordDate,
        }
      });
      insertedCount++;
    } catch (e) {
      console.warn(`⚠️ Skipped row: ${itemName} - ${e.message}`);
      skippedCount++;
    }
  }

  console.log(`✅ Seed complete. Inserted: ${insertedCount}, Skipped: ${skippedCount}`);
}

seed().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
