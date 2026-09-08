import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
 title: '足跡斷鏈｜AI 時代的跨平台數位足跡風險體驗',
 description: '從八題虛構情境練習辨識、斷鏈與回查，再透過自我檢核取得個人回查建議。不需登入或提供真實個資，附可列印 A4 檢核卡。',
 icons: { icon: (process.env.NEXT_PUBLIC_BASE_PATH ?? '').replace(/\/$/, '') + '/favicon.svg' },
};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>) {
 return <html lang="zh-Hant"><body>{children}</body></html>;
}
