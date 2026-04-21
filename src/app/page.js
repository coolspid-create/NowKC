import Dashboard from './Dashboard';

export const metadata = {
  title: 'Now KC - KC 안전인증 실시간 통계 대시보드',
  description: 'KC 안전인증 및 안전확인 공공데이터를 기반으로 한 실시간 통계 대시보드. 전기용품, 생활용품, 어린이제품 인증 현황을 한눈에 파악합니다.',
};

export default function Page() {
  return (
    <main className="dashboard-container">
      <header>
        <div className="logo">Now KC</div>
        <div className="header-subtitle">
          <span className="pulse"></span>
          KC 안전인증 · 안전확인 실시간 통계 대시보드
        </div>
      </header>
      <Dashboard />
    </main>
  );
}
