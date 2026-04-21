import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import fs from 'fs';
import path from 'path';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const majorCategory = searchParams.get('major'); // 대분류 filter
    const certType = searchParams.get('cert');       // 중분류 filter

    const where = {};
    if (majorCategory) where.majorCategory = majorCategory;
    if (certType) where.certType = certType;

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

    // === 2. Hierarchy tree data for drilldown (Major > CertType > D1 > D2 > D3) ===
    const treeMap = {};
    records.forEach(r => {
      // Level 1: Major Category
      const keyM = r.majorCategory;
      if (!treeMap[keyM]) treeMap[keyM] = { name: keyM, total: 0, children: {} };
      treeMap[keyM].total += r.count;

      // Level 2: Cert Type
      const keyC = r.certType;
      if (!treeMap[keyM].children[keyC]) treeMap[keyM].children[keyC] = { name: keyC, total: 0, children: {} };
      treeMap[keyM].children[keyC].total += r.count;

      // Level 3: Depth 1
      const key1 = r.depth1;
      if (!treeMap[keyM].children[keyC].children[key1])
        treeMap[keyM].children[keyC].children[key1] = { name: key1, total: 0, children: {} };
      treeMap[keyM].children[keyC].children[key1].total += r.count;

      // Level 4: Depth 2
      if (r.depth2) {
        const key2 = r.depth2;
        if (!treeMap[keyM].children[keyC].children[key1].children[key2])
          treeMap[keyM].children[keyC].children[key1].children[key2] = { name: key2, total: 0, children: {} };
        treeMap[keyM].children[keyC].children[key1].children[key2].total += r.count;

        // Level 5: Depth 3
        if (r.depth3) {
          const key3 = r.depth3;
          if (!treeMap[keyM].children[keyC].children[key1].children[key2].children[key3])
            treeMap[keyM].children[keyC].children[key1].children[key2].children[key3] = { name: key3, total: 0 };
          treeMap[keyM].children[keyC].children[key1].children[key2].children[key3].total += r.count;
        }
      }
    });

    // Helper to recursively convert Map to Array
    const convertToArray = (nodes) => {
      return Object.values(nodes).map(node => ({
        name: node.name,
        total: node.total,
        children: node.children ? convertToArray(node.children) : []
      })).sort((a, b) => b.total - a.total);
    };

    const hierarchy = convertToArray(treeMap);

    // === 3. Overall totals ===
    const grandTotal = records.reduce((sum, r) => sum + r.count, 0);
    const totalCertification = records.filter(r => r.certType === '안전인증').reduce((sum, r) => sum + r.count, 0);
    const totalConfirmation = records.filter(r => r.certType === '안전확인').reduce((sum, r) => sum + r.count, 0);

    // === 4. Get last update time (Safe check for Vercel) ===
    let lastUpdated = null;
    try {
      // Look for the database file mtime as aproxy for last update
      const stats = fs.statSync(path.join(process.cwd(), 'prisma', 'dev.db'));
      lastUpdated = stats.mtime;
    } catch (e) {
      lastUpdated = new Date();
    }

    return NextResponse.json({
      success: true,
      data: {
        summary,
        hierarchy,
        grandTotal,
        totalCertification,
        totalConfirmation,
        lastUpdated: lastUpdated.toISOString()
      }
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
