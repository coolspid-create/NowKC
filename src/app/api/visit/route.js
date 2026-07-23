import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(request) {
  try {
    const headers = request.headers;
    const xForwardedFor = headers.get('x-forwarded-for');
    const ip = xForwardedFor ? xForwardedFor.split(',')[0].trim() : headers.get('x-real-ip') || '127.0.0.1';
    const userAgent = headers.get('user-agent') || 'Unknown';
    const { path = '/' } = await request.json().catch(() => ({}));

    // Save visit log
    const log = await prisma.visitLog.create({
      data: {
        path,
        ip,
        userAgent,
      },
    });

    return NextResponse.json({ success: true, id: log.id });
  } catch (error) {
    console.error('Visit log POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate'); // YYYY-MM-DD
    const endDateParam = searchParams.get('endDate');     // YYYY-MM-DD
    const daysParam = parseInt(searchParams.get('days') || '7', 10);
    const days = isNaN(daysParam) ? 7 : daysParam;

    // Helper for KST Date String
    const kstOffset = 9 * 60 * 60 * 1000;
    const now = new Date();
    const nowKst = new Date(now.getTime() + kstOffset);

    // Today Start in UTC for KST 00:00
    const todayKstDateStr = nowKst.toISOString().split('T')[0]; // YYYY-MM-DD
    const todayStart = new Date(`${todayKstDateStr}T00:00:00.000+09:00`);
    
    // Yesterday Start
    const yesterdayKstDate = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);

    // Total PV
    const totalPV = await prisma.visitLog.count();

    // Today Logs
    const todayLogs = await prisma.visitLog.findMany({
      where: {
        createdAt: { gte: todayStart },
      },
      select: { ip: true, createdAt: true },
    });

    const todayPV = todayLogs.length;
    const todayUVSet = new Set(todayLogs.map(l => l.ip || '127.0.0.1'));
    const todayUV = todayUVSet.size;

    // Yesterday Logs
    const yesterdayLogs = await prisma.visitLog.findMany({
      where: {
        createdAt: {
          gte: yesterdayKstDate,
          lt: todayStart,
        },
      },
      select: { ip: true },
    });

    const yesterdayPV = yesterdayLogs.length;
    const yesterdayUVSet = new Set(yesterdayLogs.map(l => l.ip || '127.0.0.1'));
    const yesterdayUV = yesterdayUVSet.size;

    // Growth rates
    const pvGrowth = yesterdayPV === 0 ? (todayPV > 0 ? 100 : 0) : Math.round(((todayPV - yesterdayPV) / yesterdayPV) * 100);
    const uvGrowth = yesterdayUV === 0 ? (todayUV > 0 ? 100 : 0) : Math.round(((todayUV - yesterdayUV) / yesterdayUV) * 100);

    // Determine Range for Daily Stats
    let rangeStart;
    let rangeEnd;
    let datesList = [];

    if (startDateParam && endDateParam) {
      rangeStart = new Date(`${startDateParam}T00:00:00.000+09:00`);
      rangeEnd = new Date(`${endDateParam}T23:59:59.999+09:00`);

      let curr = new Date(rangeStart.getTime());
      while (curr.getTime() <= rangeEnd.getTime()) {
        const currKst = new Date(curr.getTime() + kstOffset);
        const dateStr = currKst.toISOString().split('T')[0];
        datesList.push(dateStr);
        curr = new Date(curr.getTime() + 24 * 60 * 60 * 1000);
      }
    } else {
      rangeStart = new Date(todayStart.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
      rangeEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1);

      for (let i = 0; i < days; i++) {
        const d = new Date(rangeStart.getTime() + i * 24 * 60 * 60 * 1000);
        const dKst = new Date(d.getTime() + kstOffset);
        datesList.push(dKst.toISOString().split('T')[0]);
      }
    }

    const rangeLogs = await prisma.visitLog.findMany({
      where: {
        createdAt: {
          gte: rangeStart,
          lte: rangeEnd,
        },
      },
      select: { ip: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    // Group logs by Date string (KST)
    const dailyMap = {};
    datesList.forEach(dateStr => {
      const monthDay = dateStr.slice(5); // MM-DD
      dailyMap[dateStr] = { date: monthDay, fullDate: dateStr, pv: 0, ips: new Set() };
    });

    rangeLogs.forEach(log => {
      const logKst = new Date(new Date(log.createdAt).getTime() + kstOffset);
      const dateStr = logKst.toISOString().split('T')[0];
      if (dailyMap[dateStr]) {
        dailyMap[dateStr].pv += 1;
        dailyMap[dateStr].ips.add(log.ip || '127.0.0.1');
      }
    });

    const dailyStats = Object.values(dailyMap).map(item => ({
      date: item.date,
      fullDate: item.fullDate,
      pv: item.pv,
      uv: item.ips.size,
    }));

    // Hourly Distribution for Today
    const hourlyMap = Array.from({ length: 24 }, (_, i) => ({ hour: `${i}시`, hourNum: i, pv: 0 }));
    todayLogs.forEach(log => {
      const logKst = new Date(new Date(log.createdAt).getTime() + kstOffset);
      const hour = logKst.getUTCHours();
      if (hourlyMap[hour]) {
        hourlyMap[hour].pv += 1;
      }
    });

    // Recent 50 logs
    const recentLogs = await prisma.visitLog.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
    });

    const formattedRecentLogs = recentLogs.map(log => {
      const logKst = new Date(new Date(log.createdAt).getTime() + kstOffset);
      return {
        id: log.id,
        path: log.path,
        ip: log.ip || '미상',
        userAgent: log.userAgent || '미상',
        createdAt: logKst.toISOString().replace('T', ' ').slice(0, 19),
      };
    });

    return NextResponse.json({
      success: true,
      summary: {
        totalPV,
        todayPV,
        todayUV,
        yesterdayPV,
        yesterdayUV,
        pvGrowth,
        uvGrowth,
      },
      dailyStats,
      hourlyStats: hourlyMap,
      recentLogs: formattedRecentLogs,
    });
  } catch (error) {
    console.error('Visit stats GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
