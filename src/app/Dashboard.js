'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Treemap
} from 'recharts';
import WordCloud from './components/WordCloud';

const Icons = {
  All: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  ),
  Electric: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  Life: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  Child: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <line x1="9" y1="9" x2="9.01" y2="9" />
      <line x1="15" y1="9" x2="15.01" y2="9" />
    </svg>
  )
};

const TABS = [
  { key: 'ALL', label: '통합', icon: <Icons.All /> },
  { key: '전기용품', label: '전기용품', icon: <Icons.Electric /> },
  { key: '생활용품', label: '생활용품', icon: <Icons.Life /> },
  { key: '어린이제품', label: '어린이제품', icon: <Icons.Child /> },
];

const PIE_COLORS = [
  '#3b82f6', '#4f46e5', '#6366f1', '#7c3aed', '#8b5cf6', 
  '#9333ea', '#a855f7', '#d946ef', '#0ea5e9', '#0284c7'
];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [wordcloudData, setWordcloudData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [drilldownPath, setDrilldownPath] = useState([]); // Array of node names for drilling down

  useEffect(() => {
    setDrilldownPath(activeTab === 'ALL' ? [] : [activeTab]);
    fetchData();
  }, [activeTab]);

  async function fetchData() {
    try {
      const params = activeTab !== 'ALL' ? `?major=${encodeURIComponent(activeTab)}` : '';
      const [catRes, wordRes] = await Promise.all([
        fetch(`/api/categories${params}`).then(r => r.json()),
        fetch(`/api/stats/wordcloud${params ? params : ''}`).then(r => r.json()),
      ]);
      
      if (catRes.success) {
        setData(catRes.data);
      } else {
        console.error("Categories error:", catRes.error);
        setData({ error: catRes.error }); // Hack to break out of loading
      }
      
      if (wordRes.success) setWordcloudData(wordRes.data);
    } catch (e) {
      console.error(e);
      setData({ error: e.message });
    }
    setLoading(false);
  }

  // Sunburst chart data from summary
  const { sunburstInner, sunburstOuter } = useMemo(() => {
    if (!data) return { sunburstInner: [], sunburstOuter: [] };
    
    const inner = [];
    const outer = [];

    data.summary.forEach((s) => {
      inner.push({ name: s.name, value: s.total });
      if (s.certification > 0) outer.push({ parent: s.name, name: '안전인증', value: s.certification });
      if (s.confirmation > 0) outer.push({ parent: s.name, name: '안전확인', value: s.confirmation });
    });
    return { sunburstInner: inner, sunburstOuter: outer };
  }, [data]);

  // Handle drilldown data for Bar Chart and Treemap
  const currentChartData = useMemo(() => {
    if (!data) return { nodes: [], total: 0 };
    let currentNodes = data.hierarchy;
    let total = data.grandTotal;

    for (const step of drilldownPath) {
      const found = currentNodes.find(n => n.name === step);
      if (found && found.children) {
        currentNodes = found.children;
        total = found.total;
      }
    }

    const sorted = [...currentNodes].sort((a,b) => b.total - a.total);
    return { nodes: sorted, total };
  }, [data, drilldownPath]);

  const handleDrilldown = (nodeName) => {
    // Check if the current level has children
    let currentNodes = data.hierarchy;
    for (const step of drilldownPath) {
      const found = currentNodes.find(n => n.name === step);
      if (found && found.children) currentNodes = found.children;
    }
    
    const targetNode = currentNodes.find(n => n.name === nodeName);
    if (targetNode && targetNode.children && targetNode.children.length > 0) {
      setDrilldownPath([...drilldownPath, nodeName]);
    }
  };

  const handleDrillup = () => {
    const minDepth = activeTab === 'ALL' ? 0 : 1;
    if (drilldownPath.length > minDepth) {
      setDrilldownPath(drilldownPath.slice(0, -1));
    }
  };

  if (loading || !data) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', flexDirection: 'column', gap: '1rem' }}>
        <div className="pulse" style={{ width: '12px', height: '12px', background: 'var(--accent-electric)', borderRadius: '50%' }}></div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 500 }}>데이터를 불러오는 중입니다...</div>
      </div>
    );
  }

  if (data.error) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ color: 'red', fontSize: '1rem', fontWeight: 600 }}>데이터 로딩 오류 발생</div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{data.error}</div>
      </div>
    );
  }

  const dynamicChartHeight = Math.max(380, currentChartData.nodes.length * 28 + 60);

  return (
    <>
      {/* Tab Navigation */}
      <nav className="tab-nav">
        {TABS.map(tab => (
          <button
            key={tab.key}
            className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Summary Table */}
      <section className="glass-card summary-section animate-slide-up stagger-1">
        <h3 className="section-title">등록누계 현황</h3>
        <div className="summary-layout">
          <div className="pie-area">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Tooltip 
                  cursor={false}
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid var(--border-color)', borderRadius: '10px', boxShadow: 'var(--glass-shadow)', padding: '8px 12px' }}
                  itemStyle={{ fontSize: '12px' }}
                  formatter={(v, name, props) => {
                    const total = props.payload.parent 
                      ? sunburstInner.find(i => i.name === props.payload.parent)?.value 
                      : data.grandTotal;
                    const percent = total > 0 ? ((v / total) * 100).toFixed(1) : '0.0';
                    return [`${v.toLocaleString()}건 (${percent}%)`, props.payload.parent ? `${props.payload.parent} - ${name}` : name];
                  }}
                />
                
                {/* Inner Pie: Major Categories (Only shown in ALL tab) */}
                {activeTab === 'ALL' && (
                  <Pie
                    data={sunburstInner}
                    cx="50%" cy="50%"
                    outerRadius={60}
                    dataKey="value"
                    labelLine={false}
                    stroke="#fff"
                    strokeWidth={2}
                    isAnimationActive={true}
                    animationDuration={500}
                    activeShape={false}
                  >
                    {sunburstInner.map((entry, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                )}

                {/* Outer Pie: Certification Types */}
                <Pie
                  data={sunburstOuter}
                  cx="50%" cy="50%"
                  innerRadius={activeTab === 'ALL' ? 70 : 55} outerRadius={105}
                  dataKey="value"
                  stroke="#fff"
                  strokeWidth={2}
                  labelLine={false}
                  isAnimationActive={true}
                  animationDuration={500}
                  activeShape={false}
                  label={({ name, percent, x, y, cx }) => {
                    if (percent < 0.05) return null;
                    return (
                      <text 
                        x={x} y={y} 
                        fill="var(--text-secondary)" 
                        fontSize="10" 
                        fontWeight="600" 
                        textAnchor={x > cx ? 'start' : 'end'} 
                        dominantBaseline="central"
                      >
                        {name === '안전인증' ? '인증' : '확인'}
                      </text>
                    );
                  }}
                >
                  {sunburstOuter.map((entry, i) => {
                    const parentIdx = sunburstInner.findIndex(item => item.name === entry.parent);
                    const baseColor = PIE_COLORS[parentIdx % PIE_COLORS.length];
                    const opacity = entry.name === '안전인증' ? 0.85 : 0.55;
                    return <Cell key={i} fill={baseColor} fillOpacity={opacity} />;
                  })}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pie-legend">
              {sunburstInner.map((entry, i) => (
                <span key={i} className="legend-item">
                  <span className="legend-dot" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}></span>
                  {entry.name}
                </span>
              ))}
            </div>
          </div>
          <div className="table-area">
            <table className="summary-table">
              <thead>
                <tr>
                  <th>구분</th>
                  <th>계</th>
                  <th>안전인증</th>
                  <th>안전확인</th>
                </tr>
              </thead>
              <tbody>
                {data.summary.map((row, i) => (
                  <tr key={row.name} className={`row-${i}`}>
                    <td className="row-label">
                      <span className="row-dot" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}></span>
                      {row.name}
                    </td>
                    <td className="num">{row.total.toLocaleString()}</td>
                    <td className="num">{row.certification.toLocaleString()}</td>
                    <td className="num">{row.confirmation.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="total-row">
                  <td className="row-label"><strong>합계</strong></td>
                  <td className="num"><strong>{data.grandTotal.toLocaleString()}</strong></td>
                  <td className="num"><strong>{data.totalCertification.toLocaleString()}</strong></td>
                  <td className="num"><strong>{data.totalConfirmation.toLocaleString()}</strong></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </section>

      {/* Stats Cards */}
      <div className="overview-grid animate-slide-up stagger-2">
        <div className="glass-card stat-card">
          <div className="stat-title">총 인증/확인 건수</div>
          <div className="stat-value">{data.grandTotal.toLocaleString()}</div>
        </div>
        <div className="glass-card stat-card stat-card-blue">
          <div className="stat-title">안전인증</div>
          <div className="stat-value">{data.totalCertification.toLocaleString()}</div>
        </div>
        <div className="glass-card stat-card stat-card-green">
          <div className="stat-title">안전확인</div>
          <div className="stat-value">{data.totalConfirmation.toLocaleString()}</div>
        </div>
        <div className="glass-card stat-card stat-card-grey">
          <div className="stat-title">최종 업데이트</div>
          <div className="stat-value" style={{ fontSize: '1.4rem', marginTop: '0.5rem' }}>
            {data.lastUpdated ? new Date(data.lastUpdated).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '-'}
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="charts-grid animate-slide-up stagger-3">
        {/* Bar Chart */}
        <div className="glass-card chart-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <h3 className="section-title" style={{ margin: 0, marginBottom: '6px' }}>
                분류별 인증건수
              </h3>
              {drilldownPath.length > (activeTab === 'ALL' ? 0 : 1) && (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ opacity: 0.7 }}>{activeTab === 'ALL' ? '통합' : activeTab}</span>
                  {drilldownPath.slice(activeTab === 'ALL' ? 0 : 1).map((path, idx, arr) => (
                    <React.Fragment key={idx}>
                      <span style={{ opacity: 0.5 }}>›</span>
                      <span style={{ fontWeight: idx === arr.length - 1 ? 600 : 400, color: idx === arr.length - 1 ? 'var(--text-primary)' : 'inherit' }}>
                        {path}
                      </span>
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>
            {drilldownPath.length > (activeTab === 'ALL' ? 0 : 1) && (
              <button 
                onClick={handleDrillup}
                style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', background: '#fff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', boxShadow: 'var(--glass-shadow)', transition: 'all 0.2s' }}
                onMouseEnter={(e) => e.target.style.background = '#f8fafc'}
                onMouseLeave={(e) => e.target.style.background = '#fff'}
              >
                ← 상위로 이동
              </button>
            )}
          </div>
          <div style={{ width: '100%', overflowY: 'auto', overflowX: 'hidden' }}>
            <ResponsiveContainer width="100%" height={dynamicChartHeight}>
              <BarChart data={currentChartData.nodes} layout="vertical" margin={{ left: 20, right: 30 }} animationDuration={400} barCategoryGap="10%">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis type="number" tickFormatter={(value) => value.toLocaleString()} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={150}
                  tick={{ fill: 'var(--text-primary)', fontSize: 11, fontWeight: 300 }}
                  interval={0}
                />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload || !payload.length) return null;
                  const data = payload[0].payload;
                  const v = payload[0].value;
                  const percent = currentChartData.total > 0 ? ((v / currentChartData.total) * 100).toFixed(1) : '0.0';
                  return (
                    <div className="glass-card custom-tooltip" style={{ padding: '10px 14px', border: '1px solid var(--border-color)', boxShadow: 'var(--glass-shadow)', background: '#fff' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px', fontSize: '14px', letterSpacing: '-0.01em' }}>{label || data.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', gap: '8px' }}>
                        <span>건수: <strong>{v.toLocaleString()}</strong></span>
                        <span style={{ color: 'var(--border-color)' }}>|</span>
                        <span>비중: <strong>{percent}%</strong></span>
                      </div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="total" radius={[0, 6, 6, 0]} fill="url(#barGradient)">
              </Bar>
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#a78bfa" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
          </div>
        </div>

        {/* Treemap Chart (replacement for Sunburst) */}
        <div className="glass-card chart-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <h3 className="section-title" style={{ margin: 0, marginBottom: '6px' }}>
                카테고리 비중 (Treemap)
                {drilldownPath.length === (activeTab === 'ALL' ? 0 : 1) && (
                  <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-muted)', marginLeft: '10px' }}>
                    (클릭하여 드릴다운)
                  </span>
                )}
              </h3>
              {drilldownPath.length > (activeTab === 'ALL' ? 0 : 1) && (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ opacity: 0.7 }}>{activeTab === 'ALL' ? '통합' : activeTab}</span>
                  {drilldownPath.slice(activeTab === 'ALL' ? 0 : 1).map((path, idx, arr) => (
                    <React.Fragment key={idx}>
                      <span style={{ opacity: 0.5 }}>›</span>
                      <span style={{ fontWeight: idx === arr.length - 1 ? 600 : 400, color: idx === arr.length - 1 ? 'var(--text-primary)' : 'inherit' }}>
                        {path}
                      </span>
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>
            {drilldownPath.length > (activeTab === 'ALL' ? 0 : 1) && (
              <button 
                onClick={handleDrillup}
                style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', background: '#fff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', boxShadow: 'var(--glass-shadow)', transition: 'all 0.2s' }}
                onMouseEnter={(e) => e.target.style.background = '#f8fafc'}
                onMouseLeave={(e) => e.target.style.background = '#fff'}
              >
                ← 상위로 이동
              </button>
            )}
          </div>
          <ResponsiveContainer width="100%" height={dynamicChartHeight}>
            <Treemap
              data={currentChartData.nodes.map((item, i) => ({
                name: item.name,
                size: item.total || 0,
                hasChildren: item.children && item.children.length > 0,
                fill: PIE_COLORS[i % PIE_COLORS.length],
              }))}
              dataKey="size"
              nameKey="name"
              stroke="#fff"
              animationDuration={200}
              content={(props) => {
                const { x, y, width, height, name, size, fill, hasChildren, depth } = props;
                if (width < 40 || height < 25) return null;
                
                // Do not render text for the root container to prevent ghost NaN%
                const isRoot = depth === 0 || name === 'root' || !name;
                
                const validSize = Number(size) || 0;
                const percent = currentChartData.total > 0 ? ((validSize / currentChartData.total) * 100).toFixed(1) : '0.0';
                
                return (
                  <g 
                    onClick={() => { if (!isRoot) handleDrilldown(name); }}
                    style={{ cursor: hasChildren && !isRoot ? 'pointer' : 'default' }}
                  >
                    <rect x={x} y={y} width={width} height={height} rx={4}
                      style={{ fill: fill || '#3b82f6', stroke: '#ffffff', strokeWidth: 2, opacity: 0.9 }}
                      className="treemap-rect"
                    />
                    {!isRoot && width > 60 && height > 35 && (
                      <>
                        <text 
                          x={x + width / 2} 
                          y={y + height / 2 - 6} 
                          textAnchor="middle" 
                          fill="#ffffff" 
                          fontSize={14} 
                          fontWeight={100}
                        >
                          {name?.length > 12 ? name?.slice(0, 12) + '…' : name}
                        </text>
                        <text 
                          x={x + width / 2} 
                          y={y + height / 2 + 14} 
                          textAnchor="middle" 
                          fill="rgba(255,255,255,0.85)" 
                          fontSize={12} 
                          fontWeight={100}
                        >
                          {validSize.toLocaleString()} ({percent}%)
                        </text>
                      </>
                    )}
                  </g>
                );
              }}
            >
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const data = payload[0].payload;
                  const v = data.size !== undefined ? data.size : (data.total !== undefined ? data.total : payload[0].value);
                  const percent = currentChartData.total > 0 ? ((v / currentChartData.total) * 100).toFixed(1) : '0.0';
                  return (
                    <div style={{ backgroundColor: '#fff', padding: '10px 14px', border: '1px solid var(--border-color)', borderRadius: '10px', boxShadow: 'var(--glass-shadow)' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px', fontSize: '14px', letterSpacing: '-0.01em' }}>{data.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', gap: '8px' }}>
                        <span>건수: <strong>{v.toLocaleString()}</strong></span>
                        <span style={{ color: 'var(--border-color)' }}>|</span>
                        <span>비중: <strong>{percent}%</strong></span>
                      </div>
                    </div>
                  );
                }}
              />
            </Treemap>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Word Cloud */}
      <div className="glass-card wordcloud-section animate-slide-up stagger-4">
        <h3 className="section-title">인증 건수 상위 품목 (Word Cloud)</h3>
        <p className="section-subtitle">마우스를 올리면 상세 정보를 확인할 수 있습니다</p>
        <WordCloud words={wordcloudData} height={480} />
      </div>
    </>
  );
}
