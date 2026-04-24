import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import * as xlsx from 'xlsx';

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
    
    // Find all sheets that follow the YY.MM.DD pattern
    const datePattern = /^\d{2}\.\d{2}\.\d{2}$/;
    const dateSheets = workbook.SheetNames.filter(name => datePattern.test(name)).sort();
    
    if (dateSheets.length === 0) {
      console.log('⚠️ No date sheets found in the workbook.');
      return NextResponse.json({ success: false, message: 'No date sheets found.' });
    }

    // Process all date sheets
    console.log(`Found ${dateSheets.length} date sheets to sync.`);
    
    let totalInserted = 0;
    let totalSkipped = 0;

    for (const sheetName of dateSheets) {
      console.log(`Processing sheet: ${sheetName}`);
      const sheet = workbook.Sheets[sheetName];
      const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });
      
      const [yy, mm, dd] = sheetName.split('.').map(s => parseInt(s, 10));
      const recordDate = new Date(2000 + yy, mm - 1, dd, 0, 0, 0, 0);

      let insertedCount = 0;
      let skippedCount = 0;

      for (const row of rows) {
        const rawCertType = row['인증유형'];
        const itemName = row['품목명'];
        const count = parseInt(row['총건수'], 10);

        if (!itemName || isNaN(count)) { skippedCount++; continue; }

        const { majorCategory, certType } = parseCertType(rawCertType);

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
          skippedCount++;
        }
      }
      console.log(`✅ ${sheetName} complete. Inserted: ${insertedCount}, Skipped: ${skippedCount}`);
      totalInserted += insertedCount;
      totalSkipped += skippedCount;
    }

    console.log(`🎉 Full sync complete. Total Inserted: ${totalInserted}, Total Skipped: ${totalSkipped}`);
    
    return NextResponse.json({ 
      success: true, 
      message: `Full sync complete for ${dateSheets.length} sheets. Total Inserted: ${totalInserted}, Skipped: ${totalSkipped}`
    });

  } catch (error) {
    console.error('Error during automated sync:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
