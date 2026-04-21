import "./globals.css";

export const metadata = {
  title: 'Now KC - 실시간 대시보드',
  description: 'KC 안전인증 등계 데이터',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
