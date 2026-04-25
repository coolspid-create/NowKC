import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';


export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const majorCategory = searchParams.get('major'); // 대분류 filter
    const certType = searchParams.get('cert');       // 중분류 filter
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    const latestRecord = await prisma.dataRecord.findFirst({
      orderBy: { recordDate: 'desc' },
      select: { recordDate: true }
    });

    if (!latestRecord) {
      return NextResponse.json({
        success: true,
        data: { summary: [], hierarchy: [], grandTotal: 0, totalCertification: 0, totalConfirmation: 0, lastUpdated: null }
      });
    }

    const endDate = (endDateParam && endDateParam.trim() !== '') 
      ? new Date(endDateParam + 'T00:00:00.000Z') 
      : latestRecord.recordDate;
    
    const where = {};
    if (majorCategory) where.majorCategory = majorCategory;
    if (certType) where.certType = certType;
    
    if ((startDateParam && startDateParam.trim() !== '') || (endDateParam && endDateParam.trim() !== '')) {
      where.recordDate = {};
      if (startDateParam && startDateParam.trim() !== '') where.recordDate.gte = new Date(startDateParam + 'T00:00:00.000Z');
      if (endDateParam && endDateParam.trim() !== '') where.recordDate.lte = new Date(endDateParam + 'T23:59:59.999Z');
    }

    const records = await prisma.dataRecord.findMany({ where });

    // === 1. Summary table: 대분류별 계/안전인증/안전확인 ===
    const summaryMap = {};
    records.forEach(r => {
      if (!summaryMap[r.majorCategory]) {
        summaryMap[r.majorCategory] = { total: 0, '안전인증': 0, '안전확인': 0 };
      }
      summaryMap[r.majorCategory].total += r.count;
      summaryMap[r.majorCategory][r.certType] = (summaryMap[r.majorCategory][r.certType] || 0) + r.count;
    });

    const summary = Object.entries(summaryMap).map(([name, data]) => ({
      name,
      total: data.total,
      certification: data['안전인증'] || 0,
      confirmation: data['안전확인'] || 0,
    }));

    // === 2. Hierarchy tree data for drilldown ===
    const treeMap = {};
    records.forEach(r => {
      if (r.count <= 0) return;
      const keyM = r.majorCategory;
      if (!treeMap[keyM]) treeMap[keyM] = { name: keyM, total: 0, children: {} };
      treeMap[keyM].total += r.count;

      const keyC = r.certType;
      if (!treeMap[keyM].children[keyC]) treeMap[keyM].children[keyC] = { name: keyC, total: 0, children: {} };
      treeMap[keyM].children[keyC].total += r.count;

      const key1 = r.depth1;
      if (!treeMap[keyM].children[keyC].children[key1])
        treeMap[keyM].children[keyC].children[key1] = { name: key1, total: 0, children: {} };
      treeMap[keyM].children[keyC].children[key1].total += r.count;

      if (r.depth2) {
        const key2 = r.depth2;
        if (!treeMap[keyM].children[keyC].children[key1].children[key2])
          treeMap[keyM].children[keyC].children[key1].children[key2] = { name: key2, total: 0, children: {} };
        treeMap[keyM].children[keyC].children[key1].children[key2].total += r.count;

        if (r.depth3) {
          const key3 = r.depth3;
          if (!treeMap[keyM].children[keyC].children[key1].children[key2].children[key3])
            treeMap[keyM].children[keyC].children[key1].children[key2].children[key3] = { name: key3, total: 0 };
          treeMap[keyM].children[keyC].children[key1].children[key2].children[key3].total += r.count;
        }
      }
    });

    const convertToArray = (nodes) => {
      return Object.values(nodes).map(node => ({
        name: node.name,
        total: node.total,
        children: node.children ? convertToArray(node.children) : []
      })).sort((a, b) => b.total - a.total);
    };

    const hierarchy = convertToArray(treeMap);

    // === 3. Overall totals for selected period ===
    const grandTotal = records.reduce((sum, r) => sum + r.count, 0);
    const totalCertification = records.filter(r => r.certType === '안전인증').reduce((sum, r) => sum + r.count, 0);
    const totalConfirmation = records.filter(r => r.certType === '안전확인').reduce((sum, r) => sum + r.count, 0);

    // === 4. Lifetime Totals (Total sum of all records in DB) ===
    const totalSnapshot = await prisma.dataRecord.groupBy({
      by: ['majorCategory'],
      _sum: { count: true }
    });

    const lifetimeTotals = {
      total: totalSnapshot.reduce((acc, curr) => acc + (curr._sum.count || 0), 0),
      전기용품: totalSnapshot.find(s => s.majorCategory === '전기용품')?._sum.count || 0,
      생활용품: totalSnapshot.find(s => s.majorCategory === '생활용품')?._sum.count || 0,
      어린이제품: totalSnapshot.find(s => s.majorCategory === '어린이제품')?._sum.count || 0,
    };

    return NextResponse.json({
      success: true,
      data: {
        summary,
        hierarchy,
        grandTotal,
        totalCertification,
        totalConfirmation,
        lifetimeTotals,
        lastUpdated: latestRecord.recordDate
      }
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
