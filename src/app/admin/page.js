import AdminDashboard from './AdminDashboard';

export const metadata = {
  title: 'Now KC - 접속 통계 관리자',
  description: '사용자 방문 및 접속 트래픽 통계 분석 관리자 대시보드',
};

export default function AdminPage() {
  return (
    <main className="dashboard-container">
      <AdminDashboard />
    </main>
  );
}
