import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import * as xlsx from 'xlsx';

const prisma = new PrismaClient();

function parseCertType(rawCertType) {
  const parts = rawCertType.trim().split(/\s+/);
  if (parts.length >= 2) {
    const certType = parts[parts.length - 1]; // "안전인증" or "안전확인"
    const majorCategory = parts.slice(0, parts.length - 1).join(' '); 
    return { majorCategory, certType };
  }
  return { majorCategory: rawCertType, certType: '기타' };
}

export async function GET(request) {
  try {
    console.log('🔄 Starting automated background sync process...');

    const url = 'https://docs.google.com/spreadsheets/d/1LjxspbUmxGZJf5brnFwQusEqZpY6GVhXQRT7VkiFY6E/export?format=xlsx';
    const res = await fetch(url);
    const buffer = await res.arrayBuffer();
    
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    
    // Determine today's KST date in YY.MM.DD format
    const now = new Date();
    const kst = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
    const yy = String(kst.getFullYear()).slice(-2);
    const mm = String(kst.getMonth() + 1).padStart(2, '0');
    const dd = String(kst.getDate()).padStart(2, '0');
    const todaySheetName = `${yy}.${mm}.${dd}`;

    console.log(`Checking for sheet: ${todaySheetName}`);
    
    // Just in case today's sheet doesn't exist, we can fallback or gracefully stop
    if (!workbook.SheetNames.includes(todaySheetName)) {
      console.log(`⚠️ Sheet ${todaySheetName} not found. Skipping sync.`);
      return NextResponse.json({ success: true, message: `Sheet ${todaySheetName} not found. Skipped.` });
    }

    const sheet = workbook.Sheets[todaySheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });
    
    console.log(`📊 Parsed ${rows.length} rows for ${todaySheetName}.`);

    let insertedCount = 0;
    let skippedCount = 0;

    for (const row of rows) {
      const recordDateRaw = row['집계일시'];
      const rawCertType = row['인증유형'];
      const itemName = row['품목명'];
      const count = parseInt(row['총건수'], 10);

      if (!itemName || isNaN(count)) { skippedCount++; continue; }

      const { majorCategory, certType } = parseCertType(rawCertType);

      // Floor recordDate to 00:00:00 of KST Date
      let recordDate = new Date(kst.getFullYear(), kst.getMonth(), kst.getDate(), 0, 0, 0, 0);

      const parts = itemName.toString().split('>').map(s => s.trim());
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
        // Skip duplicate unique constraint issues
        console.warn(`⚠️ Skipped row: ${itemName} - ${e.message}`);
        skippedCount++;
      }
    }

    console.log(`✅ Sync complete. Inserted: ${insertedCount}, Skipped: ${skippedCount}`);
    
    return NextResponse.json({ 
      success: true, 
      message: `Sync complete for ${todaySheetName}. Inserted: ${insertedCount}, Skipped: ${skippedCount}`
    });

  } catch (error) {
    console.error('Error during automated sync:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
