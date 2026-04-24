'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Treemap, LabelList
} from 'recharts';

const SOURCE_LABELS = {
  US_CPSC: '미국', EU: '유럽연합', AU: '호주', CA: '캐나다', CN: '중국',
  EN: '영국', FR: '프랑스', GE: '독일', JP_METI: '일본(METI)',
  JP_RECALLPLUS: '일본(Recall+)', NZ: '뉴질랜드', OECD: 'OECD', US_NHTSA: '미국(NHTSA)'
};

const SOURCE_COLORS = [
  '#ef4444','#f97316','#f59e0b','#84cc16','#22c55e',
  '#14b8a6','#06b6d4','#3b82f6','#6366f1','#8b5cf6',
  '#a855f7','#d946ef','#ec4899'
];

const SEVERITY_COLORS = ['#22c55e','#84cc16','#f59e0b','#f97316','#ef4444'];
const SEVERITY_LABELS = { 1: '매우 낮음', 2: '낮음', 3: '보통', 4: '높음', 5: '매우 높음' };

const TREEMAP_COLORS = [
  '#3b82f6','#6366f1','#8b5cf6','#ec4899','#ef4444',
  '#f97316','#f59e0b','#22c55e','#14b8a6','#06b6d4',
  '#0ea5e9','#a855f7','#d946ef','#84cc16','#64748b',
  '#475569','#1e40af','#9333ea'
];

const DT_CODE_LABELS = {
  'DT.CHEMICAL.POISON': '화학적 중독',
  'DT.ASPHYX.CHOKE': '질식 (삼킴)',
  'DT.THERMAL.FIRE': '화재',
  'DT.MECHANICAL.INJ': '물리적 부상',
  'DT.BODY.DEATH': '사망',
  'DT.MECHANICAL.FALL': '추락/넘어짐',
  'DT.OTHER.NEARMI': '기타 아차사고',
  'DT.THERMAL.BURN': '화상',
  'DT.ASPHYX.STRANG': '끈 졸림',
  'DT.ELECTRIC.SHOCK': '감전'
};

const HF_CODE_LABELS = {
  'HF.H.CHEM.ETC': '기타 화학물질',
  'HF.H.ELEC.OHT': '과열 (전기)',
  'HF.H.ELEC.BAT': '배터리 결함',
  'HF.H.PHY.FRAC': '파손/부서짐',
  'HF.H.PHY.SMALL': '소형 부품 이탈',
  'HF.H.ELEC': '전기적 결함',
  'HF.H.PHY.CORD': '끈/줄 얽힘',
  'HF.H.PHY.MAG': '자석',
  'HF.H.PHY.SHARP': '날카로운 마감',
  'HF.S.INFO': '표시사항 오류',
  'HF.H.CHEM.HEAVY': '중금속',
  'HF.H.CHEM.PHTH': '프탈레이트',
  'HF.H.PHY': '물리적 결함',
  'HF.H.CHEM.FORM': '폼알데하이드',
  'HF.H.CHEM.LEAD': '납 성분',
  'HF.H.ELEC.INS': '절연 불량',
  'HF.H.ELEC.NPC': '감전 방지 미흡',
  'HF.M.DES': '설계 결함',
  'HF.S.NATL.DEF': '안전기준 미달',
  'HF.UNKNOWN': '알 수 없음'
};

export default function RecallDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('all');

  useEffect(() => { fetchData(); }, [period]);

  async function fetchData() {
    setLoading(true);
    try {
      let statsUrl = '/api/recall/stats';
      if (period === '30d') {
        const d = new Date(); d.setDate(d.getDate()-30);
        statsUrl += `?date_from=${d.toISOString().slice(0,10)}`;
      } else if (period === '90d') {
        const d = new Date(); d.setDate(d.getDate()-90);
        statsUrl += `?date_from=${d.toISOString().slice(0,10)}`;
      }
      const sRes = await fetch(statsUrl).then(r=>r.json());
      if (sRes.success) setStats(sRes.data);
    } catch(e) { console.error(e); }
    setLoading(false);
  }

  const seriousCount = useMemo(() => {
    if (!stats?.by_severity) return 0;
    return stats.by_severity.filter(s => s.severity >= 4).reduce((a,b) => a+b.count, 0);
  }, [stats]);

  const seriousPercent = useMemo(() => {
    if (!stats) return 0;
    return stats.total_recalls > 0 ? ((seriousCount / stats.total_recalls) * 100).toFixed(0) : 0;
  }, [stats, seriousCount]);

  const monthlyData = useMemo(() => {
    if (!stats?.by_month) return [];
    return stats.by_month.map(m => ({ name: m.month.slice(2), count: m.count }));
  }, [stats]);

  const sourceData = useMemo(() => {
    if (!stats?.by_source) return [];
    return stats.by_source.map(s => ({
      name: SOURCE_LABELS[s.source] || s.source, count: s.count, source: s.source
    }));
  }, [stats]);

  const hfData = useMemo(() => {
    if (!stats?.by_hf_code) return [];
    return stats.by_hf_code
      .sort((a,b) => b.count - a.count).slice(0, 10)
      .map(d => ({ name: HF_CODE_LABELS[d.hf_code] || d.hf_code, count: d.count }));
  }, [stats]);

  const dtData = useMemo(() => {
    if (!stats?.by_dt_code) return [];
    return stats.by_dt_code
      .sort((a,b) => b.count - a.count).slice(0, 10)
      .map(d => ({ name: DT_CODE_LABELS[d.dt_code] || d.dt_code, count: d.count }));
  }, [stats]);

  const severityData = useMemo(() => {
    if (!stats?.by_severity) return [];
    return stats.by_severity.map(s => ({
      name: SEVERITY_LABELS[s.severity] || `Level ${s.severity}`,
      value: s.count, severity: s.severity
    }));
  }, [stats]);

  const categoryData = useMemo(() => {
    if (!stats?.by_category_level2) return [];
    return stats.by_category_level2.sort((a,b) => b.count - a.count);
  }, [stats]);

  const productGroupTable = useMemo(() => {
    const targetGroups = ['전기용품', '생활용품', '어린이제품'];
    const dataByCountry = {};
    
    // Initialize with all countries from SOURCE_LABELS
    Object.values(SOURCE_LABELS).forEach(label => {
      dataByCountry[label] = { '전기용품': 0, '생활용품': 0, '어린이제품': 0 };
    });

    if (stats?.by_product_group_country) {
      stats.by_product_group_country.forEach(d => {
        if (targetGroups.includes(d.product_group)) {
          if (!dataByCountry[d.country]) {
            dataByCountry[d.country] = { '전기용품': 0, '생활용품': 0, '어린이제품': 0 };
          }
          dataByCountry[d.country][d.product_group] += d.count;
        }
      });
    }

    const countries = Object.keys(dataByCountry).sort((a, b) => a.localeCompare(b, 'ko'));
    return { countries, data: dataByCountry, targetGroups };
  }, [stats]);

  if (loading) {
    return (
      <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'60vh', flexDirection:'column', gap:'1rem' }}>
        <div className="pulse" style={{ width:'12px', height:'12px', background:'#f97316', borderRadius:'50%' }}></div>
        <div style={{ color:'var(--text-muted)', fontSize:'0.9rem', fontWeight:500 }}>리콜 데이터를 불러오는 중입니다...</div>
      </div>
    );
  }
  if (!stats) {
    return (
      <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'60vh', flexDirection:'column', gap:'1rem' }}>
        <div style={{ color:'#ef4444', fontSize:'1.2rem', fontWeight:600 }}>데이터를 불러오지 못했습니다.</div>
        <div style={{ color:'var(--text-muted)', fontSize:'0.9rem' }}>API 서버 문제이거나 환경 변수(API 키)가 설정되지 않았을 수 있습니다. 서버를 재시작해 보세요.</div>
        <button onClick={fetchData} style={{ marginTop:'1rem', padding:'0.5rem 1rem', background:'#f97316', color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer' }}>다시 시도</button>
      </div>
    );
  }

  const hfChartHeight = Math.max(300, hfData.length * 36 + 60);
  const dtChartHeight = Math.max(300, dtData.length * 36 + 60);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'2.5rem', opacity:loading?0.4:1, transition:'opacity 0.3s ease' }}>

      {/* Top Period Filter (matching dashboard style) */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '-1rem' }}>
        <div style={{ display:'flex', background:'var(--glass-bg)', padding:'6px', borderRadius:'12px', border: '1px solid var(--glass-border)', boxShadow: 'var(--glass-shadow)' }}>
          {[['all','전체'],['90d','최근 90일'],['30d','최근 30일']].map(([k,l]) => (
            <button key={k} onClick={()=>setPeriod(k)}
              style={{ padding:'6px 16px', border:'none', borderRadius:'8px', fontSize:'0.85rem', fontWeight:600, cursor:'pointer',
                background: period===k?'#fff':'transparent', color: period===k?'#f97316':'var(--text-secondary)',
                boxShadow: period===k?'0 2px 8px rgba(0,0,0,0.05)':'none', transition:'all 0.2s' }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Recall Summary Overview (Style matched to Dashboard.js) */}
      <section className="glass-card lifetime-overview animate-slide-up stagger-1" style={{ borderLeft: '5px solid #f97316', padding: '1.5rem' }}>
        <h3 className="section-title" style={{ marginBottom: '1rem', color: 'var(--text-primary)', fontSize: '1.1rem' }}>
          글로벌 리콜 통계 요약 (Recall Hub 제공)
        </h3>
        <div className="lifetime-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
          <div className="lifetime-item" style={{ textAlign: 'center', borderRight: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>총 리콜 건수</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f97316' }}>{stats.total_recalls.toLocaleString()}</div>
          </div>
          <div className="lifetime-item" style={{ textAlign: 'center', borderRight: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>실제 부상 보고</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#ef4444' }}>{stats.with_injuries_count.toLocaleString()}</div>
          </div>
          <div className="lifetime-item" style={{ textAlign: 'center', borderRight: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>심각 등급 비율</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#7c3aed' }}>{seriousPercent}%</div>
          </div>
          <div className="lifetime-item" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>데이터 출처</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>{sourceData.length}개국</div>
          </div>
        </div>
      </section>

      {/* Charts Row 1: Monthly Trend + Source Distribution */}
      <div className="charts-grid animate-slide-up stagger-2">
        <div className="glass-card chart-container">
          <h3 className="section-title">월별 리콜 발생 추이</h3>
          <ResponsiveContainer width="100%" height={380}>
            <AreaChart data={monthlyData} margin={{ top:10, right:30, left:0, bottom:0 }}>
              <defs>
                <linearGradient id="recallGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)"/>
              <XAxis dataKey="name" tick={{ fill:'var(--text-secondary)', fontSize:12 }}/>
              <YAxis tick={{ fill:'var(--text-secondary)', fontSize:12 }}/>
              <Tooltip content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="glass-card" style={{ padding:'10px 14px', border:'1px solid var(--border-color)', boxShadow:'var(--glass-shadow)', background:'#fff' }}>
                    <div style={{ fontWeight:700, fontSize:'14px', marginBottom:'4px' }}>{label}</div>
                    <div style={{ fontSize:'12px', color:'var(--text-secondary)' }}>리콜 건수: <strong style={{ color:'#f97316' }}>{payload[0].value}건</strong></div>
                  </div>
                );
              }}/>
              <Area type="monotone" dataKey="count" stroke="#f97316" strokeWidth={3} fill="url(#recallGrad)" dot={{ r:5, fill:'#f97316', strokeWidth:2, stroke:'#fff' }}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card chart-container">
          <h3 className="section-title">출처(국가)별 리콜 비중</h3>
          <div className="summary-layout" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="pie-area" style={{ flex: 1 }}>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={sourceData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} dataKey="count" nameKey="name" stroke="#fff" strokeWidth={2}>
                    {sourceData.map((_, i) => <Cell key={i} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]}/>)}
                  </Pie>
                  <Tooltip content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    const pct = stats.total_recalls > 0 ? ((d.count / stats.total_recalls) * 100).toFixed(1) : '0';
                    return (
                      <div className="glass-card" style={{ padding:'10px 14px', border:'1px solid var(--border-color)', boxShadow:'var(--glass-shadow)', background:'#fff' }}>
                        <div style={{ fontWeight:700, fontSize:'14px', marginBottom:'4px' }}>{d.name}</div>
                        <div style={{ fontSize:'12px', color:'var(--text-secondary)' }}>{d.count}건 ({pct}%)</div>
                      </div>
                    );
                  }}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:'0.75rem', justifyContent:'center', marginTop:'0.5rem', padding: '0 1rem' }}>
              {sourceData.slice(0,8).map((s,i) => (
                <span key={i} style={{ display:'flex', alignItems:'center', gap:'6px', fontSize:'0.75rem', color:'var(--text-secondary)', background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: '20px' }}>
                  <span style={{ width:'6px', height:'6px', borderRadius:'50%', background:SOURCE_COLORS[i], display:'inline-block' }}></span>
                  {s.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 2: Hazard Factor + Damage Type */}
      <div className="charts-grid animate-slide-up stagger-3">
        <div className="glass-card chart-container">
          <h3 className="section-title">주요 위해요인 분포</h3>
          <ResponsiveContainer width="100%" height={hfChartHeight}>
            <BarChart data={hfData} layout="vertical" margin={{ left:20, right:40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)"/>
              <XAxis type="number" tick={{ fill:'var(--text-secondary)', fontSize:12 }}/>
              <YAxis dataKey="name" type="category" width={110} tick={{ fill:'var(--text-primary)', fontSize:11, fontWeight:300 }} interval={0}/>
              <Tooltip content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const v = payload[0].value;
                const pct = stats.total_recalls > 0 ? ((v / stats.total_recalls) * 100).toFixed(1) : '0';
                return (
                  <div className="glass-card" style={{ padding:'10px 14px', border:'1px solid var(--border-color)', boxShadow:'var(--glass-shadow)', background:'#fff' }}>
                    <div style={{ fontWeight:700, fontSize:'14px', marginBottom:'4px' }}>{label}</div>
                    <div style={{ fontSize:'12px', color:'var(--text-secondary)' }}>{v}건 ({pct}%)</div>
                  </div>
                );
              }}/>
              <Bar dataKey="count" radius={[0,6,6,0]} fill="url(#hfGrad)">
                <LabelList dataKey="count" position="right" formatter={(v) => {
                  const pct = stats.total_recalls > 0 ? ((v / stats.total_recalls) * 100).toFixed(1) : '0';
                  return `${v}건 (${pct}%)`;
                }} style={{ fill: 'var(--text-secondary)', fontSize: '10px', fontWeight: 500 }} offset={8} />
              </Bar>
              <defs>
                <linearGradient id="hfGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#8b5cf6"/><stop offset="100%" stopColor="#ec4899"/>
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card chart-container">
          <h3 className="section-title">주요 피해유형 분포</h3>
          <ResponsiveContainer width="100%" height={dtChartHeight}>
            <BarChart data={dtData} layout="vertical" margin={{ left:20, right:40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)"/>
              <XAxis type="number" tick={{ fill:'var(--text-secondary)', fontSize:12 }}/>
              <YAxis dataKey="name" type="category" width={110} tick={{ fill:'var(--text-primary)', fontSize:11, fontWeight:300 }} interval={0}/>
              <Tooltip content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const v = payload[0].value;
                const pct = stats.total_recalls > 0 ? ((v / stats.total_recalls) * 100).toFixed(1) : '0';
                return (
                  <div className="glass-card" style={{ padding:'10px 14px', border:'1px solid var(--border-color)', boxShadow:'var(--glass-shadow)', background:'#fff' }}>
                    <div style={{ fontWeight:700, fontSize:'14px', marginBottom:'4px' }}>{label}</div>
                    <div style={{ fontSize:'12px', color:'var(--text-secondary)' }}>{v}건 ({pct}%)</div>
                  </div>
                );
              }}/>
              <Bar dataKey="count" radius={[0,6,6,0]} fill="url(#dtGrad)">
                <LabelList dataKey="count" position="right" formatter={(v) => {
                  const pct = stats.total_recalls > 0 ? ((v / stats.total_recalls) * 100).toFixed(1) : '0';
                  return `${v}건 (${pct}%)`;
                }} style={{ fill: 'var(--text-secondary)', fontSize: '10px', fontWeight: 500 }} offset={8} />
              </Bar>
              <defs>
                <linearGradient id="dtGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#14b8a6"/><stop offset="100%" stopColor="#3b82f6"/>
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 3: Severity + Cross-tab Table */}
      <div className="charts-grid animate-slide-up stagger-4">
        <div className="glass-card chart-container" style={{ display:'flex', flexDirection:'column' }}>
          <h3 className="section-title">AI분석 심각도 분포</h3>
          <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={severityData} cx="50%" cy="50%" innerRadius={55} outerRadius={95} dataKey="value" nameKey="name" stroke="#fff" strokeWidth={2}
                  label={({ name, percent }) => percent > 0.05 ? `${name}` : null}
                  labelLine={true}>
                  {severityData.map((entry, i) => <Cell key={i} fill={SEVERITY_COLORS[entry.severity - 1] || '#94a3b8'}/>)}
                </Pie>
                <Tooltip content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="glass-card" style={{ padding:'10px 14px', border:'1px solid var(--border-color)', boxShadow:'var(--glass-shadow)', background:'#fff' }}>
                      <div style={{ fontWeight:700, fontSize:'14px', marginBottom:'4px' }}>{d.name} (Level {d.severity})</div>
                      <div style={{ fontSize:'12px', color:'var(--text-secondary)' }}>{d.value}건</div>
                    </div>
                  );
                }}/>
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display:'flex', gap:'0.75rem', justifyContent:'center', flexWrap:'wrap', marginTop:'0.5rem' }}>
              {severityData.map((s, i) => (
                <span key={i} style={{ display:'flex', alignItems:'center', gap:'5px', fontSize:'0.75rem', color:'var(--text-secondary)' }}>
                  <span style={{ width:'6px', height:'6px', borderRadius:'50%', background:SEVERITY_COLORS[s.severity-1], display:'inline-block' }}></span>
                  {s.name}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="glass-card chart-container" style={{ position: 'relative' }}>
          <h3 className="section-title">국가 및 품목군별 상세 현황</h3>
          <div style={{ overflowX:'auto', marginTop: '1rem' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.85rem', textAlign:'center' }}>
              <thead>
                <tr style={{ borderBottom:'2px solid var(--border-color)', color:'var(--text-secondary)', fontWeight:600 }}>
                  <th style={{ padding:'12px 8px', textAlign:'left' }}>국가</th>
                  {productGroupTable.targetGroups.map(g => <th key={g} style={{ padding:'12px 8px' }}>{g}</th>)}
                  <th style={{ padding:'12px 8px', color:'#f97316' }}>소계</th>
                </tr>
              </thead>
              <tbody>
                {productGroupTable.countries.map(country => {
                  const data = productGroupTable.data[country];
                  const total = productGroupTable.targetGroups.reduce((s, g) => s + data[g], 0);
                  return (
                    <tr key={country} style={{ borderBottom:'1px solid var(--border-color)' }}>
                      <td style={{ padding:'12px 8px', textAlign:'left', fontWeight:500, color:'var(--text-primary)' }}>{country}</td>
                      {productGroupTable.targetGroups.map(g => (
                        <td key={g} style={{ padding:'12px 8px', color: data[g] > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                          {data[g]}
                        </td>
                      ))}
                      <td style={{ padding:'12px 8px', fontWeight:700, color:'#f97316' }}>{total}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {productGroupTable.countries.length === 0 && (
              <div style={{ padding:'2rem', textAlign:'center', color:'var(--text-muted)' }}>데이터가 없습니다.</div>
            )}
          </div>
          <div style={{ marginTop: '1.5rem', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'right' }}>
            데이터 출처: Recall Hub — 13개국 정부기관 리콜 데이터 통합 (실시간)
          </div>
        </div>
      </div>

      {/* Category Treemap */}
      {categoryData.length > 0 && (
        <div className="glass-card animate-slide-up" style={{ padding:'2rem' }}>
          <h3 className="section-title">제품 카테고리별 리콜 현황</h3>
          <ResponsiveContainer width="100%" height={400}>
            <Treemap
              data={categoryData.map((c,i) => ({ name: c.name, size: c.count, fill: TREEMAP_COLORS[i % TREEMAP_COLORS.length] }))}
              dataKey="size" nameKey="name" stroke="#fff" animationDuration={200}
              content={(props) => {
                const { x, y, width, height, name, size, fill, depth } = props;
                if (width < 40 || height < 25) return null;
                const isRoot = depth === 0 || !name;
                const validSize = Number(size) || 0;
                const total = categoryData.reduce((a,b)=>a+b.count,0);
                const pct = total > 0 ? ((validSize/total)*100).toFixed(1) : '0';
                return (
                  <g>
                    <rect x={x} y={y} width={width} height={height} rx={4} style={{ fill: fill||'#3b82f6', stroke:'#fff', strokeWidth:2, opacity:0.9 }} className="treemap-rect"/>
                    {!isRoot && width > 60 && height > 35 && (
                      <>
                        <text x={x+width/2} y={y+height/2-6} textAnchor="middle" fill="#fff" fontSize={13} fontWeight={100}>
                          {name?.length > 10 ? name?.slice(0,10)+'…' : name}
                        </text>
                        <text x={x+width/2} y={y+height/2+12} textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize={11} fontWeight={100}>
                          {validSize}건 ({pct}%)
                        </text>
                      </>
                    )}
                  </g>
                );
              }}>
              <Tooltip content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                const total = categoryData.reduce((a,b)=>a+b.count,0);
                const v = d.size || d.count || 0;
                const pct = total > 0 ? ((v/total)*100).toFixed(1) : '0';
                return (
                  <div style={{ backgroundColor:'#fff', padding:'10px 14px', border:'1px solid var(--border-color)', borderRadius:'10px', boxShadow:'var(--glass-shadow)' }}>
                    <div style={{ fontWeight:700, fontSize:'14px', marginBottom:'4px' }}>{d.name}</div>
                    <div style={{ fontSize:'12px', color:'var(--text-secondary)' }}>{v}건 ({pct}%)</div>
                  </div>
                );
              }}/>
            </Treemap>
          </ResponsiveContainer>
        </div>
      )}


    </div>
  );
}
