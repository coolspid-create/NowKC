'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Area, AreaChart, Legend
} from 'recharts';

const FIRE_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#64748b'];

export default function SolarPower() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startYear, setStartYear] = useState(2017);
  const [endYear, setEndYear] = useState(2024);
  const [selectedYear, setSelectedYear] = useState(2024);
  const [viewMode, setViewMode] = useState('yearly'); // 'yearly' or 'monthly'
  const CAUSE_COLOR_MAP = useMemo(() => ({
    '전기적요인': FIRE_COLORS[0],
    '기계적요인': FIRE_COLORS[1],
    '부주의': FIRE_COLORS[2],
    '자연적요인': FIRE_COLORS[3],
    '기타/미상': FIRE_COLORS[4],
  }), []);

  const [activeMonthIndex, setActiveMonthIndex] = useState(null); // null means year-to-date or annual summary
  const [activeCauseName, setActiveCauseName] = useState('전기적요인');

  const [liveYear, setLiveYear] = useState('2023');
  const [liveMonth, setLiveMonth] = useState('05');
  const [liveData, setLiveData] = useState(null);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState(null);

  const yearOptions = [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024];

  const fetchLiveMonthlyData = async () => {
    setLiveLoading(true);
    setLiveError(null);
    try {
      const res = await fetch(`/api/solar-fire?searchYear=${liveYear}&searchMonth=${liveMonth}`);
      const json = await res.json();
      if (json.success) {
        setLiveData(json.data);
      } else {
        setLiveError(json.error || '데이터를 불러오는데 실패했습니다.');
      }
    } catch (e) {
      setLiveError('통신 중 오류가 발생했습니다.');
    }
    setLiveLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [startYear, endYear, selectedYear]);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/solar-fire?startYear=${startYear}&endYear=${endYear}&selectedYear=${selectedYear}`
      );
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  const monthLabels = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

  const monthlyChartData = useMemo(() => {
    if (!data?.monthlyData) return [];
    return data.monthlyData.map((d, i) => ({
      ...d,
      name: monthLabels[i],
      propertyDamageM: Math.round(d.propertyDamage / 100), // 백만원 단위
      realEstateDamageM: Math.round(d.realEstateDamage / 100),
      personalPropertyDamageM: Math.round(d.personalPropertyDamage / 100),
    }));
  }, [data]);

  const yearlyChartData = useMemo(() => {
    if (!data?.yearlyData) return [];
    return data.yearlyData.map(d => ({
      ...d,
      name: `${d.year}`,
      propertyDamageM: Math.round(d.propertyDamage / 100), // 백만원 단위
      realEstateDamageM: Math.round(d.realEstateDamage / 100),
      personalPropertyDamageM: Math.round(d.personalPropertyDamage / 100),
    }));
  }, [data]);

  const displayCauseDistribution = useMemo(() => {
    if (!data?.causeDistribution) return [];
    
    if (viewMode === 'monthly' && activeMonthIndex !== null && data.monthlyData) {
      const monthData = data.monthlyData[activeMonthIndex];
      if (monthData && monthData.causeDistribution) {
        return monthData.causeDistribution;
      }
    }
    return data.causeDistribution;
  }, [data, viewMode, activeMonthIndex]);

  // Reset active month when switching year or mode
  useEffect(() => {
    setActiveMonthIndex(null);
  }, [selectedYear, viewMode]);

  if (loading && !data) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', flexDirection: 'column', gap: '1rem' }}>
        <div className="pulse" style={{ width: '12px', height: '12px', background: '#ef4444', borderRadius: '50%' }}></div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 500 }}>태양광 화재 데이터를 불러오는 중입니다...</div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: '2.5rem',
      opacity: loading ? 0.4 : 1,
      transition: 'opacity 0.3s ease',
    }}>
      {/* Header Section */}
      <section className="glass-card solar-header animate-slide-up stagger-1">
        <div className="solar-header-top">
          <div>
            <h2 className="solar-main-title">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px', color: '#ef4444' }}>
                <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
              </svg>
              태양광 발전시설 화재 통계
            </h2>
            <p className="solar-source-text">
              데이터 출처: 소방청 화재통계연감 / 국회 제출 자료 &nbsp;|&nbsp; 최종 업데이트: {data.lastUpdated}
            </p>
          </div>
        </div>

        {/* Period Filter */}
        <div className="solar-filter-bar">
          <div className="solar-filter-group">
            <label className="solar-filter-label">조회기간</label>
            <select
              className="solar-select"
              value={startYear}
              onChange={(e) => setStartYear(parseInt(e.target.value))}
            >
              {yearOptions.map(y => (
                <option key={y} value={y}>{y}년</option>
              ))}
            </select>
            <span className="solar-filter-separator">~</span>
            <select
              className="solar-select"
              value={endYear}
              onChange={(e) => setEndYear(parseInt(e.target.value))}
            >
              {yearOptions.map(y => (
                <option key={y} value={y}>{y}년</option>
              ))}
            </select>
          </div>
          <div className="solar-filter-group">
            <label className="solar-filter-label">월별 상세</label>
            <select
              className="solar-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            >
              {yearOptions.map(y => (
                <option key={y} value={y}>{y}년</option>
              ))}
            </select>
          </div>
          <div className="solar-view-toggle">
            <button
              className={`solar-view-btn ${viewMode === 'yearly' ? 'active' : ''}`}
              onClick={() => setViewMode('yearly')}
            >
              연도별
            </button>
            <button
              className={`solar-view-btn ${viewMode === 'monthly' ? 'active' : ''}`}
              onClick={() => setViewMode('monthly')}
            >
              월별
            </button>
          </div>
        </div>
      </section>

      {/* Summary Stats */}
      <div className="overview-grid animate-slide-up stagger-2">
        <div className="glass-card stat-card solar-stat-fire">
          <div className="stat-title">총 화재건수</div>
          <div className="stat-value">{data.summary.totalFires.toLocaleString()}</div>
          <div className="solar-stat-sub">{data.summary.periodStart}~{data.summary.periodEnd}</div>
        </div>
        <div className="glass-card stat-card solar-stat-death">
          <div className="stat-title">사망</div>
          <div className="stat-value">{data.summary.totalDeaths.toLocaleString()}</div>
          <div className="solar-stat-sub">인명피해</div>
        </div>
        <div className="glass-card stat-card solar-stat-injury">
          <div className="stat-title">부상</div>
          <div className="stat-value">{data.summary.totalInjuries.toLocaleString()}</div>
          <div className="solar-stat-sub">인명피해</div>
        </div>
        <div className="glass-card stat-card solar-stat-avg">
          <div className="stat-title">연평균 화재</div>
          <div className="stat-value">{data.summary.avgFiresPerYear.toLocaleString()}</div>
          <div className="solar-stat-sub">건/년</div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid animate-slide-up stagger-3">
        {/* Main Chart: Yearly or Monthly */}
        {/* Main Chart: Yearly or Monthly */}
        <div className="glass-card chart-container">
          <h3 className="section-title">
            {viewMode === 'yearly'
              ? `연도별 화재 발생 추이 (${startYear}~${endYear})`
              : `${selectedYear}년 월별 화재 발생 현황`
            }
          </h3>
          <ResponsiveContainer width="100%" height={400}>
            {viewMode === 'yearly' ? (
              <AreaChart data={yearlyChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="fireGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 13 }} />
                <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload || !payload.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="glass-card" style={{ padding: '12px 16px', border: '1px solid var(--border-color)', boxShadow: 'var(--glass-shadow)', background: '#fff', pointerEvents: 'none' }}>
                        <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '8px', color: 'var(--text-primary)' }}>{label}년</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span>화재건수: <strong style={{ color: '#ef4444' }}>{d.fires.toLocaleString()}건</strong></span>
                          <span>재산피해: <strong>{Math.round(d.propertyDamage / 100).toLocaleString()}백만원</strong></span>
                          {d.growth !== null && <span>전년대비: <strong style={{ color: d.growth >= 0 ? '#ef4444' : '#22c55e' }}>{d.growth > 0 ? '+' : ''}{d.growth}%</strong></span>}
                        </div>
                      </div>
                    );
                  }}
                />
                <Area type="monotone" dataKey="fires" stroke="#ef4444" strokeWidth={3} fill="url(#fireGradient)" dot={{ r: 5, fill: '#ef4444', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 7, strokeWidth: 2 }} />
              </AreaChart>
            ) : (
              <BarChart data={monthlyChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload || !payload.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="glass-card" style={{ padding: '12px 16px', border: '1px solid var(--border-color)', boxShadow: 'var(--glass-shadow)', background: '#fff', pointerEvents: 'none' }}>
                        <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '8px', color: 'var(--text-primary)' }}>{selectedYear}년 {label}</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span>화재건수: <strong style={{ color: '#ef4444' }}>{d.fires.toLocaleString()}건</strong></span>
                          <span>재산피해: <strong>{d.propertyDamageM.toLocaleString()}백만원</strong></span>
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar 
                  dataKey="fires" 
                  radius={[6, 6, 0, 0]} 
                  fill="url(#barFireGradient)" 
                  onClick={(data, index) => setActiveMonthIndex(index)}
                  style={{ cursor: 'pointer' }}
                >
                  {monthlyChartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={activeMonthIndex === index ? '#ef4444' : 'url(#barFireGradient)'}
                      stroke={activeMonthIndex === index ? '#fff' : 'none'}
                      strokeWidth={2}
                    />
                  ))}
                </Bar>
                <defs>
                  <linearGradient id="barFireGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" />
                    <stop offset="100%" stopColor="#f97316" />
                  </linearGradient>
                </defs>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Cause Distribution Pie and Subcauses */}
        <div className="glass-card chart-container" style={{ padding: '24px' }}>
          <h3 className="section-title" style={{ marginBottom: '24px' }}>
            {viewMode === 'monthly' && activeMonthIndex !== null 
              ? `${selectedYear}년 ${monthLabels[activeMonthIndex]} 화재 원인 분석`
              : '화재 원인 및 주요 발화요인 소분류 분석 (누적)'
            }
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-start' }}>
            <div style={{ flex: '1 1 220px', minWidth: '220px' }}>
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={displayCauseDistribution.filter(d => d.count > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    dataKey="count"
                    nameKey="name"
                    stroke="#fff"
                    strokeWidth={2}
                    labelLine={true}
                    onClick={(data) => setActiveCauseName(data.name)}
                    onMouseEnter={(_, index) => setActiveCauseName(displayCauseDistribution.filter(d => d.count > 0)[index].name)}
                    label={({ name, percentage, cx, cy, midAngle, outerRadius }) => {
                      const RADIAN = Math.PI / 180;
                      const radius = outerRadius + 15;
                      const x = cx + radius * Math.cos(-midAngle * RADIAN);
                      const y = cy + radius * Math.sin(-midAngle * RADIAN);
                      return (
                        <text 
                          x={x} y={y} 
                          fill="var(--text-secondary)" 
                          fontSize="11" 
                          fontWeight="600" 
                          textAnchor={x > cx ? 'start' : 'end'} 
                          dominantBaseline="central"
                          style={{ cursor: 'pointer' }}
                        >
                          {name} ({percentage}%)
                        </text>
                      );
                    }}
                  >
                    {displayCauseDistribution.filter(d => d.count > 0).map((entry, i) => (
                      <Cell 
                        key={i} 
                        fill={CAUSE_COLOR_MAP[entry.name]} 
                        style={{ cursor: 'pointer', opacity: activeCauseName === entry.name ? 1 : 0.6, transition: 'opacity 0.3s' }}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="glass-card" style={{ padding: '10px 14px', border: '1px solid var(--border-color)', boxShadow: 'var(--glass-shadow)', background: '#fff', pointerEvents: 'none' }}>
                          <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>{d.name}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            {d.count.toLocaleString()}건 ({d.percentage}%)
                          </div>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Sub-cause Breakdown Column */}
            <div style={{ flex: '1 1 220px', maxWidth: '280px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              {(() => {
                const activeData = displayCauseDistribution.find(d => d.name === activeCauseName) || displayCauseDistribution[0] || {};
                const subcauses = activeData.subcauses || [];
                
                return (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px', gap: '8px' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: CAUSE_COLOR_MAP[activeData.name] }}></div>
                      <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>
                        {activeData.name} <span style={{ fontWeight: 500, color: 'var(--text-secondary)', fontSize: '14px' }}>상세 현황</span>
                      </h4>
                    </div>
                    
                    {subcauses.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {subcauses.map((sub, idx) => {
                          const maxCount = subcauses[0]?.count || 1;
                          const barWidth = Math.max(5, (sub.count / maxCount) * 100);
                          return (
                            <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600 }}>
                                <span style={{ color: '#475569' }}>{sub.name}</span>
                                <span style={{ color: CAUSE_COLOR_MAP[activeData.name] }}>{sub.count}건</span>
                              </div>
                              <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                <div 
                                  style={{ 
                                    height: '100%', 
                                    width: `${barWidth}%`, 
                                    background: CAUSE_COLOR_MAP[activeData.name],
                                    borderRadius: '4px',
                                    transition: 'width 0.5s ease-in-out'
                                  }} 
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '20px 0', textAlign: 'center' }}>
                        선택된 요인의 상세 데이터가 없습니다.
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Property Damage Chart */}
      <div className="glass-card chart-container animate-slide-up stagger-4">
        <h3 className="section-title">
          {viewMode === 'yearly'
            ? '연도별 재산피해액 추이 (백만원)'
            : `${selectedYear}년 월별 재산피해액 현황 (백만원)`
          }
        </h3>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={viewMode === 'yearly' ? yearlyChartData : monthlyChartData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
            <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 13 }} />
            <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} tickFormatter={(v) => `${v}`} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="glass-card" style={{ padding: '12px 16px', border: '1px solid var(--border-color)', boxShadow: 'var(--glass-shadow)', background: '#fff', pointerEvents: 'none' }}>
                    <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '6px' }}>{viewMode === 'yearly' ? `${label}년` : label}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      재산피해: <strong style={{ color: '#f97316' }}>{d.propertyDamageM.toLocaleString()}백만원</strong>
                    </div>
                  </div>
                );
              }}
            />
            <Bar dataKey="propertyDamageM" radius={[6, 6, 0, 0]} fill="url(#propDmgGradient)" />
            <defs>
              <linearGradient id="propDmgGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f97316" />
                <stop offset="100%" stopColor="#fbbf24" />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Data Table */}
      <section className="glass-card animate-slide-up" style={{ padding: '2rem' }}>
        <h3 className="section-title">
          {viewMode === 'yearly' ? '연도별 상세 데이터' : `${selectedYear}년 월별 상세 데이터`}
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="summary-table solar-data-table">
            <thead>
              {viewMode === 'yearly' ? (
                <tr>
                  <th>연도</th>
                  <th>화재건수</th>
                  <th>사망</th>
                  <th>부상</th>
                  <th>재산피해(백만원)</th>
                  <th>부동산(백만원)</th>
                  <th>동산(백만원)</th>
                  <th>전기적 요인 비율</th>
                  <th>전년대비 증감</th>
                </tr>
              ) : (
                <tr>
                  <th>월</th>
                  <th>화재건수</th>
                  <th>사망</th>
                  <th>부상</th>
                  <th>재산피해(백만원)</th>
                  <th>부동산(백만원)</th>
                  <th>동산(백만원)</th>
                  <th>전기적 요인 비율</th>
                  <th>전월대비 증감</th>
                </tr>
              )}
            </thead>
            <tbody>
              {viewMode === 'yearly' ? (
                data.yearlyData.map((row, i) => (
                  <tr key={row.year}>
                    <td className="row-label">
                      <span className="row-dot" style={{ background: '#ef4444' }}></span>
                      {row.year}년
                    </td>
                    <td className="num" style={{ fontWeight: 700, color: '#ef4444' }}>{row.fires.toLocaleString()}</td>
                    <td className="num">{row.deaths.toLocaleString()}</td>
                    <td className="num">{row.injuries.toLocaleString()}</td>
                    <td className="num">{Math.round(row.propertyDamage / 100).toLocaleString()}</td>
                    <td className="num" style={{ color: 'var(--text-secondary)' }}>{Math.round(row.realEstateDamage / 100).toLocaleString()}</td>
                    <td className="num" style={{ color: 'var(--text-secondary)' }}>{Math.round(row.personalPropertyDamage / 100).toLocaleString()}</td>
                    <td className="num">{row.electricalRatio}%</td>
                    <td className="num">
                      {row.growth !== null ? (
                        <span style={{ color: row.growth >= 0 ? '#ef4444' : '#22c55e', fontWeight: 600 }}>
                          {row.growth > 0 ? '▲' : '▼'} {Math.abs(row.growth)}%
                        </span>
                      ) : '-'}
                    </td>
                  </tr>
                ))
              ) : (
                monthlyChartData.map((row, i) => {
                  const prevRow = i > 0 ? monthlyChartData[i-1] : null;
                  const momGrowth = prevRow && prevRow.fires > 0 
                    ? (((row.fires - prevRow.fires) / prevRow.fires) * 100).toFixed(1) 
                    : null;
                  const yearData = data.yearlyData.find(y => y.year === selectedYear);
                  
                  return (
                    <tr 
                      key={i} 
                      onClick={() => setActiveMonthIndex(i)}
                      style={{ cursor: 'pointer', background: activeMonthIndex === i ? 'rgba(239, 68, 68, 0.05)' : 'transparent' }}
                    >
                      <td className="row-label">
                        <span className="row-dot" style={{ background: activeMonthIndex === i ? '#ef4444' : '#cbd5e1' }}></span>
                        {row.name}
                      </td>
                      <td className="num" style={{ fontWeight: 700, color: '#ef4444' }}>{row.fires.toLocaleString()}</td>
                      <td className="num">{row.deaths?.toLocaleString() || 0}</td>
                      <td className="num">{row.injuries?.toLocaleString() || 0}</td>
                      <td className="num">{row.propertyDamageM.toLocaleString()}</td>
                      <td className="num" style={{ color: 'var(--text-secondary)' }}>{row.realEstateDamageM.toLocaleString()}</td>
                      <td className="num" style={{ color: 'var(--text-secondary)' }}>{row.personalPropertyDamageM.toLocaleString()}</td>
                      <td className="num">{row.electricalRatio}%</td>
                      <td className="num">
                        {momGrowth !== null ? (
                          <span style={{ color: momGrowth >= 0 ? '#ef4444' : '#22c55e', fontWeight: 600 }}>
                            {momGrowth > 0 ? '▲' : '▼'} {Math.abs(momGrowth)}%
                          </span>
                        ) : '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot>
              <tr className="total-row">
                <td className="row-label"><strong>{viewMode === 'yearly' ? '전체 합계' : `${selectedYear}년 합계`}</strong></td>
                <td className="num"><strong>{data.summary.totalFires.toLocaleString()}</strong></td>
                <td className="num"><strong>{data.summary.totalDeaths.toLocaleString()}</strong></td>
                <td className="num"><strong>{data.summary.totalInjuries.toLocaleString()}</strong></td>
                <td className="num"><strong>{Math.round(data.summary.totalPropertyDamage / 100).toLocaleString()}</strong></td>
                <td className="num" style={{ color: 'var(--text-secondary)' }}><strong>{Math.round(data.summary.totalRealEstateDamage / 100).toLocaleString()}</strong></td>
                <td className="num" style={{ color: 'var(--text-secondary)' }}><strong>{Math.round(data.summary.totalPersonalPropertyDamage / 100).toLocaleString()}</strong></td>
                <td className="num">-</td>
                <td className="num">-</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </div>
  );
}

