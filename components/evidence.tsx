import { Activity, FileText, Link2, Mountain, LockKeyhole, QrCode, Eye, ArrowRight, MessageCircle } from 'lucide-react';

function CardHead({kind,label,protectedView=false}:{kind:string;label:string;protectedView?:boolean}) {
 const Icon=kind==='activity'?Activity:kind==='document'?FileText:Link2;
 return <div className="card-head"><span><Icon size={18}/>{label}</span><small>{protectedView?<LockKeyhole size={14}/>:<Eye size={14}/>}公開頁面</small></div>;
}
function Profile({name='ridge_17',different=false}:{name?:string;different?:boolean}) {
 return <div className="profile"><span className={'avatar '+(different?'avatar-alt':'')}>{name==='little_weekend'?<MessageCircle size={20}/>:different?<FileText size={20}/>:<Mountain size={20}/>}</span><div><strong>@{name}</strong><small>模擬帳號</small></div></div>;
}
export function RouteMap() {
 return <figure className="route-map"><svg viewBox="0 0 330 112" role="img" aria-label="虛構路線：星橋步道入口經過河岸，繞回相同起點">
 <path d="M35 48 L110 23 L208 26 L287 71 L211 88 L112 86 Z" fill="#dfece6" stroke="#378571" strokeWidth="3" strokeLinejoin="round"/><path d="M110 23 L112 86 M208 26 L211 88" stroke="#b1ccc0" strokeDasharray="4 5"/>
 <circle cx="35" cy="48" r="7" fill="#215947" stroke="white" strokeWidth="3"/><circle cx="287" cy="71" r="5" fill="#378571"/><text x="15" y="18">相同起訖點</text><text x="133" y="59">星橋步道</text><text x="245" y="105">河岸段</text>
 </svg><figcaption>路線示意・所有地點均為虛構</figcaption></figure>;
}
function ActivityCard({safe=false,compact=false}:{safe?:boolean;compact?:boolean}) {
 return <article className="evidence-card"><CardHead kind="activity" label="步頻 · 運動紀錄" protectedView={safe}/><Profile name={safe?'trail_notes':'ridge_17'}/><h3>{safe?'今日的運動小記':'晨間河岸騎乘'}</h3>
 {safe?<div className="safe-record"><LockKeyhole size={25}/><strong>只分享運動心得</strong><p>路線、起訖點與開始日期／時間不公開。</p><span>活動限指定對象可見 · 摘要延後分享</span></div>:<><div className="record-metrics"><div><small>重複時段</small><strong>每週二、四</strong></div><div><small>開始時間</small><strong>08:20</strong></div></div>{!compact&&<RouteMap/>}<div className="record-foot">星橋步道入口出發 · 完整路線公開</div></>}
 </article>;
}
function DocumentCard({safe=false,compact=false}:{safe?:boolean;compact?:boolean}) {
 return <article className="evidence-card"><CardHead kind="document" label="頁間 · 公開文件" protectedView={safe}/><Profile name={safe?'page_studio':'ridge_17'} different={safe}/><div className="document-sheet"><div className="doc-label">DOCUMENT / {safe?'公開版':'原始檔'}</div><h3>{safe?'申請文件寫作筆記':'學習計畫申請書'}</h3>
 {safe?<><p>分享段落架構與寫作方法。</p><div className="removed-fields">姓名、學校、學號、信箱：已移除<br/>個人資料 QR Code：已移除<br/>檔案作者中繼資料：已清除</div></>:<><dl className="document-fields"><div><dt>申請人</dt><dd>沈有稜</dd></div><div><dt>學校</dt><dd>青嶼學苑（虛構）</dd></div><div><dt>信箱</dt><dd>ridge17@example.com</dd></div>{!compact&&<div><dt>學號</dt><dd>F260017（虛構）</dd></div>}</dl>{!compact&&<div className="qr-note"><QrCode size={29}/><span>個人資料頁 QR Code<small>示意圖示，無法掃描</small></span></div>}<div className="metadata">檔案屬性 → 作者：沈有稜</div></>}
 </div></article>;
}
function SocialCard({safe=false}:{safe?:boolean}) {
 return <article className="evidence-card"><CardHead kind="social" label="片刻 · 社群簡介" protectedView={safe}/><Profile name={safe?'little_weekend':'ridge_17'} different={safe}/><div className="social-copy"><h3>{safe?'收藏日常的小片刻':'騎車，也分享學習筆記'}</h3><p>{safe?'沒有姓名、學校、固定行程，也沒有其他平台連結。':'運動紀錄與學習文件都使用 @ridge_17。'}</p><span className={safe?'safe-chip':'account-chip'}>{safe?'名稱、頭像與簡介依用途分流':'與其他平台使用相同名稱與頭像'}</span></div></article>;
}
export function Evidence({kind}:{kind:string}) {
 return <section className={'evidence-stack '+(kind==='protected'?'protected-stack':'')} aria-label={kind==='protected'?'示範修正後的公開資料':'虛構案例公開資料'}>
 <div className="evidence-context"><span>{kind==='protected'?'CASE 001 · 示範修正版':'CASE 001 · 沈有稜'}</span><span>全部資料均為虛構</span></div>
 {kind==='activity'&&<ActivityCard/>}
 {kind==='document'&&<DocumentCard/>}
 {kind==='accounts'&&<><ActivityCard compact/><DocumentCard compact/></>}
 {kind==='all'&&<><ActivityCard compact/><DocumentCard compact/><SocialCard/></>}
 {kind==='protected'&&<><div className="reference-note">示範修正版 · 與前題選項無關</div><ActivityCard safe/><DocumentCard safe/><SocialCard safe/></>}
 </section>;
}
export function ConnectionDiagram() {
 return <figure className="chain-figure"><figcaption>公開線索如何串在一起</figcaption><ol>{['相同帳號','公開文件','姓名與學校','公開運動路線','固定時間與地點'].map((text,i)=><li key={text}><span>{text}</span>{i<4&&<ArrowRight size={15}/>}</li>)}</ol></figure>;
}
