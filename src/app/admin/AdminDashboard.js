'use client';

import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

const formatDate = (date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export default function AdminDashboard() {
  const today = new Date();
  const defaultStart = new Date();
  defaultStart.setDate(today.getDate() - 6);

  const [startDate, setStartDate] = useState(formatDate(defaultStart));
  const [endDate, setEndDate] = useState(formatDate(today));
  const [activeQuick, setActiveQuick] = useState(7);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({
    summary: {
      totalPV: 0,
      todayPV: 0,
      todayUV: 0,
      yesterdayPV: 0,
      yesterdayUV: 0,
      pvGrowth: 0,
      uvGrowth: 0,
    },
    dailyStats: [],
    hourlyStats: [],
    recentLogs: [],
  });

  const fetchStats = async (sDate = startDate, eDate = endDate) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/visit?startDate=${sDate}&endDate=${eDate}`, { cache: 'no-store' });
      const json = await res.json();
      if (json.success) {
        setData(json);
      } else {
        setError(json.error || '접속 통계 데이터를 불러오는 중 오류가 발생했습니다.');
      }
    } catch (err) {
      console.error('Failed to fetch visit stats:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (startDate && endDate) {
      fetchStats(startDate, endDate);
    }
  }, [startDate, endDate]);

  const handleQuickPeriod = (daysCount) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (daysCount - 1));
    setStartDate(formatDate(start));
    setEndDate(formatDate(end));
    setActiveQuick(daysCount);
  };

  const handleStartDateChange = (e) => {
    setStartDate(e.target.value);
    setActiveQuick(null);
  };

  const handleEndDateChange = (e) => {
    setEndDate(e.target.value);
    setActiveQuick(null);
  };

  const { summary, dailyStats, hourlyStats, recentLogs } = data;

  return (
    <div className="admin-dashboard">
      {/* Top Header Navigation */}
      <header className="admin-header">
        <div className="admin-title-group">
          <a href="/" className="back-home-btn" title="메인 대시보드로 돌아가기">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            메인 대시보드
          </a>
          <div className="admin-page-title">
            <span className="pulse-dot"></span>
            Now KC 접속 통계 관리자 (Analytics Admin)
          </div>
        </div>

        <div className="admin-actions">
          <div className="days-filter">
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                className={`filter-btn ${activeQuick === d ? 'active' : ''}`}
                onClick={() => handleQuickPeriod(d)}
              >
                최근 {d}일
              </button>
            ))}
          </div>

          <div className="custom-date-range">
            <input
              type="date"
              className="date-picker-input"
              value={startDate}
              onChange={handleStartDateChange}
              max={endDate}
            />
            <span className="date-separator">~</span>
            <input
              type="date"
              className="date-picker-input"
              value={endDate}
              onChange={handleEndDateChange}
              min={startDate}
            />
          </div>

          <button
            className="refresh-btn"
            onClick={() => fetchStats(startDate, endDate)}
            disabled={loading}
            title="새로고침"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={loading ? 'spin' : ''}
            >
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
            새로고침
          </button>
        </div>
      </header>

      {error && (
        <div className="admin-error-banner">
          ⚠️ 데이터 로딩 실패: {error}
        </div>
      )}

      {/* Overview Cards */}
      <div className="admin-summary-grid">
        {/* Today UV */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">오늘 방문자 (UV)</span>
            <span className="stat-icon uv-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </span>
          </div>
          <div className="stat-value">{loading ? '-' : summary.todayUV.toLocaleString()} 명</div>
          <div className="stat-footer">
            <span className={`badge ${summary.uvGrowth >= 0 ? 'up' : 'down'}`}>
              {summary.uvGrowth >= 0 ? `+${summary.uvGrowth}%` : `${summary.uvGrowth}%`}
            </span>
            <span className="subtext">전일 대비 (어제 {summary.yesterdayUV}명)</span>
          </div>
        </div>

        {/* Today PV */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">오늘 페이지뷰 (PV)</span>
            <span className="stat-icon pv-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </span>
          </div>
          <div className="stat-value">{loading ? '-' : summary.todayPV.toLocaleString()} 회</div>
          <div className="stat-footer">
            <span className={`badge ${summary.pvGrowth >= 0 ? 'up' : 'down'}`}>
              {summary.pvGrowth >= 0 ? `+${summary.pvGrowth}%` : `${summary.pvGrowth}%`}
            </span>
            <span className="subtext">전일 대비 (어제 {summary.yesterdayPV}회)</span>
          </div>
        </div>

        {/* Total PV */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">누적 페이지뷰</span>
            <span className="stat-icon total-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            </span>
          </div>
          <div className="stat-value">{loading ? '-' : summary.totalPV.toLocaleString()} 회</div>
          <div className="stat-footer">
            <span className="badge info">전체 기록</span>
            <span className="subtext">시스템 가동 후 총 누적 수치</span>
          </div>
        </div>

        {/* System Status */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">실시간 추적 상태</span>
            <span className="stat-icon status-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </span>
          </div>
          <div className="stat-value text-success">정상 작동 중</div>
          <div className="stat-footer">
            <span className="badge active-badge">Live</span>
            <span className="subtext">클라이언트 로깅 자동 수집 활성화</span>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="admin-charts-grid">
        {/* Daily Trend Chart */}
        <div className="chart-card">
          <div className="chart-card-header">
            <h3>일별 접속 트렌드 (PV vs UV)</h3>
            <span className="chart-subtitle">조회 기간: {startDate} ~ {endDate} ({dailyStats.length}일간)</span>
          </div>
          <div className="chart-body">
            {loading ? (
              <div className="chart-placeholder">데이터를 로딩 중입니다...</div>
            ) : dailyStats.length === 0 ? (
              <div className="chart-placeholder">선택된 기간에 기록된 접속 통계 데이터가 없습니다.</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={dailyStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(255, 255, 255, 0.95)',
                      borderRadius: '10px',
                      boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
                      border: '1px solid #e2e8f0',
                    }}
                  />
                  <Area type="monotone" dataKey="pv" name="페이지뷰 (PV)" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorPv)" />
                  <Area type="monotone" dataKey="uv" name="방문자 수 (UV)" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorUv)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Hourly Distribution Chart */}
        <div className="chart-card">
          <div className="chart-card-header">
            <h3>오늘 시간대별 접속 분포 (0시~23시)</h3>
            <span className="chart-subtitle">피크 타임 및 시간별 방문 패턴</span>
          </div>
          <div className="chart-body">
            {loading ? (
              <div className="chart-placeholder">데이터를 로딩 중입니다...</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={hourlyStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="hour" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} interval={2} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(255, 255, 255, 0.95)',
                      borderRadius: '10px',
                      boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
                      border: '1px solid #e2e8f0',
                    }}
                  />
                  <Bar dataKey="pv" name="접속 횟수" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Recent Access Logs Table */}
      <div className="admin-table-card">
        <div className="table-card-header">
          <h3>최근 실시간 접속 로그 (최근 50건)</h3>
          <span className="table-subtitle">실시간 감지된 방문자의 IP 및 디바이스 환경</span>
        </div>
        <div className="table-wrapper">
          {recentLogs.length === 0 ? (
            <div className="empty-table">아직 수집된 접속 로그가 없습니다.</div>
          ) : (
            <table className="admin-log-table">
              <thead>
                <tr>
                  <th>접속 시각 (KST)</th>
                  <th>IP 주소</th>
                  <th>접속 경로</th>
                  <th>사용자 브라우저 / User-Agent</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="time-td">{log.createdAt}</td>
                    <td className="ip-td">
                      <span className="ip-badge">{log.ip}</span>
                    </td>
                    <td className="path-td">{log.path}</td>
                    <td className="ua-td" title={log.userAgent}>
                      {log.userAgent}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
