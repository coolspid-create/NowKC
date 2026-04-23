'use client';

import React, { useState } from 'react';
import Dashboard from './Dashboard';
import ConsumerHazard from './ConsumerHazard';
import SolarPower from './SolarPower';

const MAIN_TABS = [
  {
    key: 'product-safety',
    label: '제품안전',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    key: 'consumer-hazard',
    label: '소비자위해정보',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
  },
  {
    key: 'solar-power',
    label: '태양광',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </svg>
    ),
  },
];

export default function AppContainer() {
  const [activeMainTab, setActiveMainTab] = useState('product-safety');

  return (
    <>
      {/* Top Global Navigation */}
      <nav className="main-nav">
        {MAIN_TABS.map((tab) => (
          <button
            key={tab.key}
            className={`main-nav-btn ${activeMainTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveMainTab(tab.key)}
          >
            <span className="main-nav-icon">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Content Area with animated transitions */}
      <div className="main-content-area">
        {activeMainTab === 'product-safety' && <Dashboard />}
        {activeMainTab === 'consumer-hazard' && <ConsumerHazard />}
        {activeMainTab === 'solar-power' && <SolarPower />}
      </div>
    </>
  );
}
