import './globals.css'

export const metadata = {
  title: 'ad-studio · 빼기 광고 소재 자동 제작',
  description: '빼기(BBAEGI) 광고 소재 자동 제작 에이전트',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
