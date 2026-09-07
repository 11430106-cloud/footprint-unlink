import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
 title: '足跡斷鏈｜跨平台數位足跡情境測驗',
 description: '用約五分鐘完成八題虛構情境，練習辨識、斷鏈與回查跨平台數位足跡。無須提供真實個資，附 A4 防護檢核卡。',
 icons: { icon: '/favicon.svg' },
};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>) {
 return <html lang="zh-Hant"><body>{children}</body></html>;
}
