import AppContainer from './AppContainer';

export const metadata = {
  title: 'Now KC - 통합 데이터 플랫폼',
  description: 'KC 안전인증, 태양광 공공데이터를 기반으로 한 실시간 통계 대시보드.',
};

export default function Page() {
  return (
    <main className="dashboard-container">
      <header>
        <div className="logo">Now KC</div>
        <div className="header-right">
          <div className="header-title">
            <span className="pulse"></span>
            Now KC 데이터 통합 플랫폼
          </div>
          <div className="header-desc">
            *제품안전, 태양광 데이터의 통합 분석 통계를 제공합니다.
          </div>
        </div>
      </header>
      <AppContainer />
    </main>
  );
}
