'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';

// Simple spiral-based word cloud layout (no external dependency)
function layoutWords(words, width, height) {
  const placed = [];
  const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  if (!canvas) return [];
  const ctx = canvas.getContext('2d');

  const maxVal = Math.max(...words.map(w => w.value));
  const minVal = Math.min(...words.map(w => w.value));
  const range = maxVal - minVal || 1;

  const sized = words.map(w => {
    const t = (w.value - minVal) / range;
    const fontSize = 14 + t * 46; // 14px to 60px
    return { ...w, fontSize };
  });

  // Sort by size descending for better packing
  sized.sort((a, b) => b.fontSize - a.fontSize);

  for (const word of sized) {
    ctx.font = `700 ${word.fontSize}px 'Outfit', sans-serif`;
    const metrics = ctx.measureText(word.name);
    const textW = metrics.width + 12;
    const textH = word.fontSize * 1.3;

    let placed_ok = false;
    // Archimedes spiral
    for (let angle = 0; angle < 300; angle += 0.3) {
      const r = 4 * angle;
      const x = width / 2 + r * Math.cos(angle) - textW / 2;
      const y = height / 2 + r * Math.sin(angle) * 0.6 - textH / 2;

      // Check bounds
      if (x < 5 || y < 5 || x + textW > width - 5 || y + textH > height - 5) continue;

      // Check overlap
      const rect = { x, y, w: textW, h: textH };
      let overlap = false;
      for (const p of placed) {
        if (rect.x < p.x + p.w && rect.x + rect.w > p.x &&
          rect.y < p.y + p.h && rect.y + rect.h > p.y) {
          overlap = true;
          break;
        }
      }
      if (!overlap) {
        placed.push({ ...word, x, y, w: textW, h: textH });
        placed_ok = true;
        break;
      }
    }
    if (!placed_ok) {
      // Place off-screen as fallback (won't render)
    }
  }
  return placed;
}

const COLOR_MAP = {
  '전기용품': ['#60a5fa', '#3b82f6', '#2563eb', '#93c5fd', '#1d4ed8'],
  '생활용품': ['#34d399', '#10b981', '#059669', '#6ee7b7', '#047857'],
  '어린이제품': ['#fbbf24', '#f59e0b', '#d97706', '#fcd34d', '#b45309'],
};

function getColor(majorCategory, index) {
  const palette = COLOR_MAP[majorCategory] || COLOR_MAP['전기용품'];
  return palette[index % palette.length];
}

export default function WordCloud({ words, width = 800, height = 450 }) {
  const [layout, setLayout] = useState([]);
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(width);

  useEffect(() => {
    if (containerRef.current) {
      const rw = containerRef.current.offsetWidth;
      if (rw > 0) setContainerWidth(rw);
    }
  }, []);

  useEffect(() => {
    if (words.length === 0) return;
    const w = containerWidth || width;
    const result = layoutWords(words, w, height);
    setLayout(result);
  }, [words, containerWidth, width, height]);

  return (
    <div ref={containerRef} className="wordcloud-wrapper" style={{ width: '100%', height: `${height}px`, position: 'relative', overflow: 'hidden' }}>
      <svg width="100%" height={height} viewBox={`0 0 ${containerWidth} ${height}`} style={{ overflow: 'visible' }}>
        {layout.map((w, i) => {
          const isHovered = hoveredIdx === i;
          const color = getColor(w.majorCategory, i);
          return (
            <g key={`${w.name}-${i}`}>
              <text
                x={w.x + w.w / 2}
                y={w.y + w.h * 0.75}
                textAnchor="middle"
                style={{
                  fontSize: `${w.fontSize}px`,
                  fontFamily: "'Outfit', sans-serif",
                  fontWeight: 700,
                  fill: color,
                  cursor: 'pointer',
                  filter: isHovered ? `drop-shadow(0 0 12px ${color})` : 'none',
                  transform: isHovered ? `scale(1.25)` : 'scale(1)',
                  transformOrigin: `${w.x + w.w / 2}px ${w.y + w.h / 2}px`,
                  transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.3s ease, opacity 0.3s ease',
                  opacity: hoveredIdx !== null && !isHovered ? 0.35 : 1,
                  zIndex: isHovered ? 999 : 1,
                }}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {w.name}
              </text>
              {isHovered && (
                <title>{`${w.name}: ${w.value.toLocaleString()}건 (${w.majorCategory})`}</title>
              )}
            </g>
          );
        })}
      </svg>
      {hoveredIdx !== null && layout[hoveredIdx] && (
        <div className="wordcloud-tooltip" style={{
          position: 'absolute',
          left: `${layout[hoveredIdx].x + layout[hoveredIdx].w / 2}px`,
          top: `${layout[hoveredIdx].y - 8}px`,
          transform: 'translate(-50%, -100%)',
          background: 'rgba(15, 18, 25, 0.95)',
          border: `1px solid ${getColor(layout[hoveredIdx].majorCategory, hoveredIdx)}`,
          borderRadius: '10px',
          padding: '8px 14px',
          color: '#fff',
          fontSize: '13px',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          backdropFilter: 'blur(8px)',
          boxShadow: `0 4px 20px ${getColor(layout[hoveredIdx].majorCategory, hoveredIdx)}40`,
        }}>
          <strong>{layout[hoveredIdx].name}</strong>
          <span style={{ marginLeft: '8px', color: getColor(layout[hoveredIdx].majorCategory, hoveredIdx) }}>
            {layout[hoveredIdx].value.toLocaleString()}건
          </span>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
            {layout[hoveredIdx].majorCategory} · {layout[hoveredIdx].depth1}
          </div>
        </div>
      )}
    </div>
  );
}
