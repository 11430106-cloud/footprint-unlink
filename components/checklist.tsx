'use client';
import { useState } from 'react';
import { ArrowLeft, Printer, Fingerprint, Link2, ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
export const checklistSections=[
 {title:'辨識',subtitle:'先看公開了什麼',Icon:Fingerprint,items:['身分：姓名、學校、學號、信箱、照片是否可見？','位置：路線、固定起訖點、常去地點是否可見？','時間：是否透露固定行程、開始時間或即時位置？','關聯：帳號名稱、頭像、簡介能否連到其他平台？']},
 {title:'斷鏈',subtitle:'減少可以被比對的線索',Icon:Link2,items:['運動紀錄：限制可見度，隱藏起訖點、地圖與開始時間。','發布方式：避免即時分享固定路線，回頭檢查舊紀錄。','公開文件：另製公開版，移除識別欄位、QR Code 與中繼資料。','帳號分流：依用途區分名稱、頭像與簡介，檢查跨平台連結。']},
 {title:'回查',subtitle:'登出後，只檢查自己的公開資料',Icon:ScanLine,items:['能否找出我的真實姓名？','能否判斷我經常出現的地點？','能否推測我的固定時間？','能否連結到我的另一個平台帳號？']}
];
export function Checklist({onBack}:{onBack:()=>void}) {
 const [checked,setChecked]=useState<string[]>([]);
 return <main className="checklist-view"><div className="print-toolbar"><Button variant="ghost" className="text-button" onClick={onBack}><ArrowLeft/>返回測驗</Button><Button className="primary-button" onClick={()=>window.print()}><Printer/>列印／另存 PDF</Button></div>
 <article className="checklist-paper"><header className="checklist-heading"><div><div className="paper-kicker">FOOTPRINT / UNLINK</div><h1>辨識・斷鏈・回查</h1><p>我的數位足跡防護檢核卡</p></div><ScanLine size={40}/></header>
 <p className="checklist-intro">先辨識，再調整，最後從陌生人視角回查。勾選代表已完成檢查；若仍看得到資訊，就回到「斷鏈」再調整。</p>
 {checklistSections.map(({title,subtitle,Icon,items},i)=><section className="checklist-section" key={title}><div className="checklist-section-title"><span className="paper-step">0{i+1}</span><Icon size={21}/><h2>{title}</h2><span>{subtitle}</span></div><div className="checklist-items">{items.map((item,j)=>{const id=i+'-'+j;return <label className="checklist-item" key={id}><Checkbox checked={checked.includes(id)} onCheckedChange={value=>setChecked(c=>value?[...c,id]:c.filter(x=>x!==id))}/><span>{item}</span></label>})}</div></section>)}
 <aside className="paper-reminder"><strong>再請另一位信任的人交叉檢查。</strong><p>只檢查自己的公開內容，不蒐集或追蹤他人的資料。這張卡用於降低可被串聯的機會，無法保證完全安全。</p></aside><footer className="paper-footer">足跡斷鏈｜跨平台數位足跡風險防護 <span>A4 檢核卡 · 1 / 1</span></footer></article>
 <p className="print-help">列印時選擇 A4、直向、縮放 100%，關閉瀏覽器頁首與頁尾；目的地選「另存為 PDF」即可保存。檢核狀態只留在本次頁面。</p></main>;
}
