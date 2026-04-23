'use client';

import React from 'react';

export default function ConsumerHazard() {
  return (
    <div className="coming-soon-container">
      <div className="coming-soon-card glass-card">
        <div className="coming-soon-icon-wrapper">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="url(#comingSoonGrad)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <defs>
              <linearGradient id="comingSoonGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#a78bfa" />
              </linearGradient>
            </defs>
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>

        <h2 className="coming-soon-title">소비자위해정보</h2>
        <p className="coming-soon-subtitle">서비스 준비 중입니다</p>

        <div className="coming-soon-divider"></div>

        <p className="coming-soon-desc">
          소비자위해정보 통계 대시보드를 준비하고 있습니다.<br />
          빠른 시일 내에 서비스를 제공할 수 있도록 하겠습니다.
        </p>

        <div className="coming-soon-progress">
          <div className="coming-soon-progress-bar">
            <div className="coming-soon-progress-fill"></div>
          </div>
          <span className="coming-soon-progress-text">개발 진행 중</span>
        </div>

        <div className="coming-soon-features">
          <div className="coming-soon-feature-item">
            <div className="feature-dot"></div>
            <span>소비자 위해 사고 유형별 통계</span>
          </div>
          <div className="coming-soon-feature-item">
            <div className="feature-dot"></div>
            <span>위해 물품 분류별 분석</span>
          </div>
          <div className="coming-soon-feature-item">
            <div className="feature-dot"></div>
            <span>지역별 위해정보 현황</span>
          </div>
        </div>
      </div>
    </div>
  );
}
