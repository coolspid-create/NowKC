const fs = require('fs');
const path = require('path');

const FIRE_SERVICE_KEY = 'b0bffdd36a81bbdcd478ed10ecaf47a7136e10fb7a130e69df80df6c907b43c5';
const BASE_URL = 'http://apis.data.go.kr/1661000/FireInformationService/getOcIgntnByplceFpcnd';

// Helper to generate dates for a year
function getDatesForYear(year) {
  const dates = [];
  const start = new Date(`${year}-01-01`);
  const end = new Date(`${year}-12-31`);
  let current = new Date(start);
  while (current <= end) {
    const yyyy = current.getFullYear();
    const mm = String(current.getMonth() + 1).padStart(2, '0');
    const dd = String(current.getDate()).padStart(2, '0');
    dates.push(`${yyyy}${mm}${dd}`);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

async function fetchDay(dateStr) {
  const url = `${BASE_URL}?serviceKey=${FIRE_SERVICE_KEY}&pageNo=1&numOfRows=1000&resultType=json&ocrn_ymd=${dateStr}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const json = await res.json();
    if (json.body && json.body.items) {
      const items = Array.isArray(json.body.items) ? json.body.items : [json.body.items];
      return items.filter(item => 
        (item.IGNTN_PLCE_SCLSF_NM && item.IGNTN_PLCE_SCLSF_NM.includes('태양광')) ||
        (item.IGNTN_PLCE_MCLSF_NM && item.IGNTN_PLCE_MCLSF_NM.includes('태양광')) ||
        (item.IGNTN_PLCE_LCLS_NM && item.IGNTN_PLCE_LCLS_NM.includes('태양광'))
      );
    }
  } catch (e) {
    console.error(`Error fetching date ${dateStr}:`, e.message);
  }
  return [];
}

async function main() {
  const dates = getDatesForYear(2025);
  console.log(`Starting to fetch ${dates.length} days of 2025...`);
  
  let allSolarFires = [];
  const batchSize = 15; // batch requests to avoid rate limit or timeout
  
  for (let i = 0; i < dates.length; i += batchSize) {
    const batch = dates.slice(i, i + batchSize);
    console.log(`Fetching batch ${i / batchSize + 1} / ${Math.ceil(dates.length / batchSize)}...`);
    const results = await Promise.all(batch.map(date => fetchDay(date)));
    results.forEach(dayResults => {
      allSolarFires = allSolarFires.concat(dayResults);
    });
    // small sleep between batches
    await new Promise(r => setTimeout(r, 100));
  }
  
  console.log(`\nFetch complete! Found ${allSolarFires.length} solar fire incidents in 2025.`);
  
  // Aggregate data by month
  const monthlyStats = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    fires: 0,
    deaths: 0,
    injuries: 0,
    propertyDamage: 0 // in thousand won (1,000 KRW)
  }));
  
  allSolarFires.forEach(item => {
    // OCRN_YMD format: YYYYMMDD
    const month = parseInt(item.OCRN_YMD.substring(4, 6));
    const stats = monthlyStats[month - 1];
    stats.fires++;
    stats.deaths += parseInt(item.VCTM_PERCNT) || 0;
    stats.injuries += parseInt(item.INJRDPR_PERCNT) || 0;
    stats.propertyDamage += parseInt(item.PRPT_DMG_SBTT_AMT) || 0; // PRPT_DMG_SBTT_AMT is in thousand won (천원 단위)
  });
  
  console.log('\n--- Monthly Statistics for 2025 ---');
  let totalFires = 0;
  let totalDeaths = 0;
  let totalInjuries = 0;
  let totalDamage = 0;
  
  monthlyStats.forEach(m => {
    // Conversion of property damage: in 10,000 won (만원) units for SOLAR_FIRE_DATA compatibility
    // PRPT_DMG_SBTT_AMT is in thousand won (천원) in OpenAPI, so divide by 10 to get 만원.
    const damageInManWon = Math.round(m.propertyDamage / 10);
    console.log(`Month ${String(m.month).padStart(2, '0')}: ${m.fires} fires, ${m.deaths} deaths, ${m.injuries} injuries, Property Damage: ${damageInManWon.toLocaleString()} 만원`);
    totalFires += m.fires;
    totalDeaths += m.deaths;
    totalInjuries += m.injuries;
    totalDamage += damageInManWon;
  });
  
  console.log('\n--- Yearly Summary for 2025 ---');
  console.log(`Total Fires: ${totalFires}`);
  console.log(`Total Deaths: ${totalDeaths}`);
  console.log(`Total Injuries: ${totalInjuries}`);
  console.log(`Total Property Damage: ${totalDamage.toLocaleString()} 만원`);
  
  // Save output to JSON
  const outputData = {
    year: 2025,
    fires: totalFires,
    deaths: totalDeaths,
    injuries: totalInjuries,
    propertyDamage: totalDamage,
    mainCause: '전기적요인', // Default cause pattern
    electricalRatio: 78.0, // Historical average
    monthly: monthlyStats.map(m => ({
      month: m.month,
      fires: m.fires,
      deaths: m.deaths,
      injuries: m.injuries,
      propertyDamage: Math.round(m.propertyDamage / 10)
    }))
  };
  
  fs.writeFileSync(
    path.join(__dirname, 'solar_fire_2025_stats.json'),
    JSON.stringify(outputData, null, 2)
  );
  console.log('\nSaved statistics to scratch/solar_fire_2025_stats.json');
}

main();
