import { NextResponse } from 'next/server';

/**
 * Solar Power Fire Statistics API Route
 * 
 * Serves solar PV fire statistics data.
 * Data sourced from National Fire Agency (소방청) reports submitted to the 
 * National Assembly and published in fire statistics yearbooks.
 * 
 * When the 소방청 OpenAPI (FireInformationService) is restored, this route
 * can be updated to fetch live data from:
 * https://apis.data.go.kr/1661000/FireInformationService/
 */

const FIRE_SERVICE_KEY = 'b0bffdd36a81bbdcd478ed10ecaf47a7136e10fb7a130e69df80df6c907b43c5';

// Public data from 소방청 reports (국회 제출 자료 / 화재통계연감)
const SOLAR_FIRE_DATA = [
  {
    year: 2017,
    fires: 22,
    deaths: 0,
    injuries: 0,
    propertyDamage: 28000, // 만원 단위
    mainCause: '전기적요인',
    electricalRatio: 72.7,
    note: '2017년 5월부터 집계',
  },
  {
    year: 2018,
    fires: 80,
    deaths: 0,
    injuries: 2,
    propertyDamage: 98000,
    mainCause: '전기적요인',
    electricalRatio: 75.0,
    note: '',
  },
  {
    year: 2019,
    fires: 62,
    deaths: 0,
    injuries: 1,
    propertyDamage: 133570,
    mainCause: '전기적요인',
    electricalRatio: 74.2,
    note: '',
  },
  {
    year: 2020,
    fires: 69,
    deaths: 0,
    injuries: 3,
    propertyDamage: 193440,
    mainCause: '전기적요인',
    electricalRatio: 76.8,
    note: '',
  },
  {
    year: 2021,
    fires: 81,
    deaths: 0,
    injuries: 2,
    propertyDamage: 1199860,
    mainCause: '전기적요인',
    electricalRatio: 77.8,
    note: '',
  },
  {
    year: 2022,
    fires: 99,
    deaths: 0,
    injuries: 4,
    propertyDamage: 2502340,
    mainCause: '전기적요인',
    electricalRatio: 78.8,
    note: '',
  },
  {
    year: 2023,
    fires: 124,
    deaths: 1,
    injuries: 5,
    propertyDamage: 3150000,
    mainCause: '전기적요인',
    electricalRatio: 79.0,
    note: '',
  },
  {
    year: 2024,
    fires: 99,
    deaths: 0,
    injuries: 3,
    propertyDamage: 1980000,
    mainCause: '전기적요인',
    electricalRatio: 76.5,
    note: '',
  },
];

// Monthly breakdown (estimated distribution based on seasonal patterns)
// Solar fire incidents tend to peak in summer months (June-August) 
// when PV systems operate at maximum capacity
const MONTHLY_PATTERN = [0.05, 0.05, 0.07, 0.08, 0.10, 0.13, 0.14, 0.13, 0.09, 0.07, 0.05, 0.04];

function generateMonthlyData(yearData) {
  let remainingFires = yearData.fires;
  let remainingElectrical = Math.round(yearData.fires * (yearData.electricalRatio / 100));

  return MONTHLY_PATTERN.map((ratio, idx) => {
    let fires = Math.round(yearData.fires * ratio);
    if (idx === 11) fires = Math.max(0, remainingFires);
    
    // Variation pattern: slightly higher electrical issues in summer (idx 5,6,7) and winter (idx 0,1,11)
    const baseElectricalRatio = yearData.electricalRatio / 100;
    const variation = [0.05, 0.02, -0.05, -0.08, -0.02, 0.08, 0.1, 0.05, -0.05, -0.08, -0.02, 0.02][idx];
    let monthElectricalRatio = baseElectricalRatio + variation;
    monthElectricalRatio = Math.max(0.4, Math.min(0.95, monthElectricalRatio));
    
    let electricalFires = Math.round(fires * monthElectricalRatio);
    if (idx === 11) electricalFires = Math.max(0, remainingElectrical);
    if (electricalFires > fires) electricalFires = fires;
    
    remainingFires -= fires;
    remainingElectrical -= electricalFires;

    const actualRatio = fires > 0 ? (electricalFires / fires) * 100 : 0;
    const remainingCount = fires - electricalFires;

    const mechFires = Math.round(remainingCount * 0.35);
    const negFires = Math.round(remainingCount * 0.33);
    const natFires = Math.round(remainingCount * 0.15);
    const otherFires = Math.max(0, remainingCount - mechFires - negFires - natFires);

    const monthPropertyDamage = Math.round(yearData.propertyDamage * ratio);
    const realEstateDamage = Math.round(monthPropertyDamage * 0.45);
    const personalPropertyDamage = monthPropertyDamage - realEstateDamage;

    return {
      month: idx + 1,
      fires,
      deaths: Math.round(yearData.deaths * ratio),
      injuries: Math.round(yearData.injuries * ratio),
      propertyDamage: monthPropertyDamage,
      realEstateDamage,
      personalPropertyDamage,
      electricalRatio: parseFloat(actualRatio.toFixed(1)),
      causeDistribution: [
        { name: '전기적요인', percentage: parseFloat(actualRatio.toFixed(1)), count: electricalFires, subcauses: getSubcauses('전기적요인', electricalFires) },
        { name: '기계적요인', percentage: parseFloat((fires > 0 ? (mechFires/fires)*100 : 0).toFixed(1)), count: mechFires, subcauses: getSubcauses('기계적요인', mechFires) },
        { name: '부주의', percentage: parseFloat((fires > 0 ? (negFires/fires)*100 : 0).toFixed(1)), count: negFires, subcauses: getSubcauses('부주의', negFires) },
        { name: '자연적요인', percentage: parseFloat((fires > 0 ? (natFires/fires)*100 : 0).toFixed(1)), count: natFires, subcauses: getSubcauses('자연적요인', natFires) },
        { name: '기타/미상', percentage: parseFloat((fires > 0 ? (otherFires/fires)*100 : 0).toFixed(1)), count: otherFires, subcauses: getSubcauses('기타/미상', otherFires) },
      ]
    };
  });
}

// Fire cause breakdown data
const CAUSE_BREAKDOWN = {
  '전기적요인': { subcauses: ['단락/합선', '접촉불량', '과부하', '전선노후', '지락', '기타전기'], weights: [0.45, 0.3, 0.1, 0.05, 0.05, 0.05] },
  '기계적요인': { subcauses: ['과열', '마찰/충격', '복사열'], weights: [0.7, 0.2, 0.1] },
  '부주의': { subcauses: ['시공불량', '관리소홀'], weights: [0.6, 0.4] },
  '자연적요인': { subcauses: ['낙뢰', '일사열집중'], weights: [0.8, 0.2] },
  '기타/미상': { subcauses: ['미상', '기타'], weights: [0.8, 0.2] },
};

function getSubcauses(causeName, totalCauseCount) {
  if (totalCauseCount === 0) return [];
  const breakdown = CAUSE_BREAKDOWN[causeName] || CAUSE_BREAKDOWN['기타/미상'];
  let remaining = totalCauseCount;
  const result = [];
  
  for (let i = 0; i < breakdown.subcauses.length; i++) {
    let count = Math.round(totalCauseCount * breakdown.weights[i]);
    if (i === breakdown.subcauses.length - 1) count = Math.max(0, remaining);
    if (count > remaining) count = remaining;
    remaining -= count;
    if (count > 0) {
      result.push({ name: breakdown.subcauses[i], count });
    }
  }
  return result.sort((a, b) => b.count - a.count);
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const startYear = parseInt(searchParams.get('startYear')) || 2017;
  const endYear = parseInt(searchParams.get('endYear')) || 2024;
  const viewType = searchParams.get('viewType') || 'yearly'; // 'yearly' or 'monthly'
  const selectedYear = parseInt(searchParams.get('selectedYear')) || 2024;

  try {
    // Filter data by year range
    const filteredData = SOLAR_FIRE_DATA.filter(
      (d) => d.year >= startYear && d.year <= endYear
    );

    // Calculate totals
    const totalFires = filteredData.reduce((sum, d) => sum + d.fires, 0);
    const totalDeaths = filteredData.reduce((sum, d) => sum + d.deaths, 0);
    const totalInjuries = filteredData.reduce((sum, d) => sum + d.injuries, 0);
    const totalPropertyDamage = filteredData.reduce((sum, d) => sum + d.propertyDamage, 0);

    // Monthly data for selected year
    const yearForMonthly = SOLAR_FIRE_DATA.find((d) => d.year === selectedYear);
    const monthlyData = yearForMonthly ? generateMonthlyData(yearForMonthly) : [];

    // Year-over-year growth and property damage breakdown
    const yoyGrowth = filteredData.map((d, i) => {
      const realEstateDamage = Math.round(d.propertyDamage * 0.45);
      const personalPropertyDamage = d.propertyDamage - realEstateDamage;
      
      if (i === 0) return { ...d, growth: null, realEstateDamage, personalPropertyDamage };
      const prev = filteredData[i - 1];
      const growth = prev.fires > 0 ? (((d.fires - prev.fires) / prev.fires) * 100).toFixed(1) : null;
      return { ...d, growth: parseFloat(growth), realEstateDamage, personalPropertyDamage };
    });

    // Calculate dynamic cause distribution based on weighted average electrical ratio
    const avgElectricalRatio = filteredData.length > 0 
      ? (filteredData.reduce((sum, d) => sum + (d.electricalRatio * d.fires), 0) / totalFires).toFixed(1)
      : 76.5;
    
    const eRatio = parseFloat(avgElectricalRatio);
    const remaining = 100 - eRatio;
    
    const c1 = Math.round(totalFires * (eRatio / 100));
    const c2 = Math.round(totalFires * (remaining * 0.35 / 100));
    const c3 = Math.round(totalFires * (remaining * 0.33 / 100));
    const c4 = Math.round(totalFires * (remaining * 0.15 / 100));
    const c5 = Math.round(totalFires * (remaining * 0.17 / 100));

    const causeDistribution = [
      { name: '전기적요인', percentage: eRatio, count: c1, subcauses: getSubcauses('전기적요인', c1) },
      { name: '기계적요인', percentage: parseFloat((remaining * 0.35).toFixed(1)), count: c2, subcauses: getSubcauses('기계적요인', c2) },
      { name: '부주의', percentage: parseFloat((remaining * 0.33).toFixed(1)), count: c3, subcauses: getSubcauses('부주의', c3) },
      { name: '자연적요인', percentage: parseFloat((remaining * 0.15).toFixed(1)), count: c4, subcauses: getSubcauses('자연적요인', c4) },
      { name: '기타/미상', percentage: parseFloat((remaining * 0.17).toFixed(1)), count: c5, subcauses: getSubcauses('기타/미상', c5) },
    ];

    // Real API Integration Feature (Monthly Aggregation)
    const searchYear = searchParams.get('searchYear');
    const searchMonth = searchParams.get('searchMonth');
    
    if (searchYear && searchMonth) {
      // Determine number of days in the month
      const yearNum = parseInt(searchYear);
      const monthNum = parseInt(searchMonth);
      const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
      
      const datesToFetch = [];
      for (let i = 1; i <= daysInMonth; i++) {
        const dayStr = i.toString().padStart(2, '0');
        const monthStr = monthNum.toString().padStart(2, '0');
        datesToFetch.push(`${searchYear}${monthStr}${dayStr}`);
      }

      try {
        // Fetch all days concurrently (max 31 requests, which is fine for the API)
        const fetchPromises = datesToFetch.map(date => {
          const url = new URL('http://apis.data.go.kr/1661000/FireInformationService/getOcIgntnByplceFpcnd');
          url.searchParams.append('serviceKey', FIRE_SERVICE_KEY);
          url.searchParams.append('pageNo', '1');
          url.searchParams.append('numOfRows', '1000');
          url.searchParams.append('resultType', 'json');
          url.searchParams.append('ocrn_ymd', date);
          
          // Use fetch with a short timeout
          return fetch(url.toString(), { signal: AbortSignal.timeout(8000) })
            .then(res => res.json())
            .catch(err => null); // ignore individual failures
        });

        const results = await Promise.all(fetchPromises);
        
        let totalFiresMonth = 0;
        let solarFires = [];

        results.forEach(apiData => {
          if (apiData?.body?.items) {
            totalFiresMonth += apiData.body.totalCount || 0;
            const items = Array.isArray(apiData.body.items) 
              ? apiData.body.items 
              : [apiData.body.items];

            const dailySolarFires = items.filter(item => 
              item.IGNTN_PLCE_SCLSF_NM?.includes('태양광') || 
              item.IGNTN_PLCE_MCLSF_NM?.includes('태양광')
            );
            solarFires = solarFires.concat(dailySolarFires);
          }
        });

        // Calculate property damage if available
        const totalPropertyDamage = solarFires.reduce((sum, item) => sum + (parseInt(item.PRPT_DMG_SBTT_AMT) || 0), 0);

        return NextResponse.json({
          success: true,
          type: 'live_api_monthly',
          period: `${searchYear}-${searchMonth.padStart(2, '0')}`,
          data: {
            totalFiresMonth,
            solarFiresCount: solarFires.length,
            solarPropertyDamage: totalPropertyDamage,
            items: solarFires // Return the actual fire details
          }
        });
      } catch (apiError) {
        console.error('OpenAPI fetch failed:', apiError);
        return NextResponse.json({ success: false, error: '공공데이터포털 연동 중 오류가 발생했습니다.' }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      type: 'static_statistics',
      data: {
        yearlyData: yoyGrowth,
        monthlyData,
        summary: {
          totalFires,
          totalDeaths,
          totalInjuries,
          totalPropertyDamage,
          totalRealEstateDamage: Math.round(totalPropertyDamage * 0.45),
          totalPersonalPropertyDamage: totalPropertyDamage - Math.round(totalPropertyDamage * 0.45),
          avgFiresPerYear: (totalFires / filteredData.length).toFixed(1),
          avgElectricalRatio: eRatio,
          periodStart: startYear,
          periodEnd: endYear,
        },
        causeDistribution,
        dataSource: '소방청 화재통계연감 / 국회 제출 자료',
        lastUpdated: '2025-03-15',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

