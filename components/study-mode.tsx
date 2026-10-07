'use client';
import { useEffect, useRef, useState } from 'react';
import { ResearchMode, type StudyContext } from './research-mode';
type Question={id:string;prompt:string;type:'single'|'multiple';category:number;options:{id:string;text:string}[]};
type Choice={id:string;text:string};
type StudyState={id:string;stage:'pre'|'learning'|'post'|'survey'|'done';order:'AB'|'BA';version:string;preVersion:string;postVersion:string;questions:Question[];draft:Record<string,unknown>|null;surveyCatalog:{actions:Choice[];assistance:Choice[];problems:Choice[]}};
type Credential={requestId:string;token:string};
const api=process.env.NEXT_PUBLIC_RESEARCH_API_URL?.replace(/\/$/,'');
const key='footprint-paired-credentials-v1';
const local={get:(k:string)=>{try{return localStorage.getItem(k);}catch{return null;}},set:(k:string,v:string)=>{try{localStorage.setItem(k,v);}catch{}},remove:(k:string)=>{try{localStorage.removeItem(k);}catch{}}};
const toggle=(values:string[],id:string,exclusive:string)=>values.includes(id)?values.filter(x=>x!==id):id===exclusive?[id]:[...values.filter(x=>x!==exclusive),id];
export function StudyMode({experience}:{experience:(study:StudyContext|null)=>React.ReactNode}){
 const [mode,setMode]=useState<'loading'|'general'|'research'|'legacy'>('loading'),[config,setConfig]=useState<{enabled:boolean;retentionDays:number}|null>(null);
 const [credential,setCredential]=useState<Credential|null>(null),[current,setCurrent]=useState<StudyState|null>(null),[draft,setDraft]=useState<Record<string,unknown>>({});
 const [consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[sync,setSync]=useState('');
 const currentRef=useRef(current);currentRef.current=current;
 async function request<T=StudyState>(path:string,credentials?:Credential|null,input?:unknown):Promise<T>{
  if(!api)throw Error('研究服務尚未設定。');const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
  try{const response=await fetch(api+'/api/study/'+path,{method:input===undefined?'GET':'POST',headers:{...(input===undefined?{}:{'Content-Type':'application/json'}),...(credentials?{Authorization:'Bearer '+credentials.token}:{})},body:input===undefined?undefined:JSON.stringify(input),cache:'no-store',signal:controller.signal});const value=await response.json() as T&{error?:string};if(!response.ok)throw Error(value.error||'目前無法連線。');return value;}finally{clearTimeout(timer);}
 }
 function adopt(value:StudyState,creds:Credential){setCurrent(value);let saved:null|{stage:string;answers:Record<string,unknown>}=null;try{saved=JSON.parse(local.get(key+'-draft-'+creds.requestId)||'null');}catch{}
  const base=value.stage==='survey'?{actions:[],assistance:'',usability:0,problems:[],feedback:''}:{};
  setDraft({...base,...(saved?.stage===value.stage?saved.answers:value.draft||{})});setError('');
 }
 useEffect(()=>{const query=new URLSearchParams(window.location.search);setMode(query.get('research')==='1'?'research':query.get('legacy')==='1'?'legacy':'general');},[]);
 useEffect(()=>{if(mode!=='research')return;let active=true;
  request<{enabled:boolean;retentionDays:number}>('config').then(v=>{if(active)setConfig(v);}).catch(()=>{if(active)setError('研究服務目前無法連線，一般體驗仍可使用。');});
  let creds:Credential|null=null;try{creds=JSON.parse(local.get(key)||'null');}catch{}
  if(creds&&typeof creds.requestId==='string'&&typeof creds.token==='string'){setCredential(creds);const c=creds;request('session',c).then(v=>{if(active)adopt(v,c);}).catch(()=>{if(active)setError('連線中斷，已保留此裝置進度。按「重新連線／續填」重試。');});}
  return()=>{active=false;};
 // Only the research URL runs these requests; general visitors never call the API.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[mode]);
 useEffect(()=>{if(!credential||!current||!['pre','post','survey'].includes(current.stage))return;const stage=current.stage;
  local.set(key+'-draft-'+credential.requestId,JSON.stringify({stage,answers:draft}));setSync('進度已暫存在此裝置。');
  const timer=setTimeout(()=>{request('draft',credential,{stage,answers:draft}).then(()=>{if(currentRef.current?.stage===stage)setSync('進度已暫存並同步。');}).catch(()=>{if(currentRef.current?.stage===stage)setSync('網路暫斷，進度仍在此裝置；恢復連線後重試同步。');});},700);
  return()=>clearTimeout(timer);
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[draft,current?.stage,credential]);
 useEffect(()=>{if(mode!=='research')return;const online=()=>{if(credential)request('session',credential).then(v=>adopt(v,credential)).catch(()=>{});};window.addEventListener('online',online);return()=>window.removeEventListener('online',online);
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[mode,credential]);
 async function begin(){if(busy||!consent||!config?.enabled)return;setBusy(true);setError('');let creds=credential;
  if(!creds){creds={requestId:crypto.randomUUID(),token:Array.from(crypto.getRandomValues(new Uint8Array(32))).map(x=>x.toString(16).padStart(2,'0')).join('')};local.set(key,JSON.stringify(creds));setCredential(creds);}
  try{adopt(await request('start',undefined,{consent:true,...creds}),creds);}catch(e){setError(e instanceof Error?e.message:'開始失敗，請重試。');}finally{setBusy(false);}
 }
 async function resume(){if(!credential||busy)return;setBusy(true);try{adopt(await request('start',undefined,{consent:true,...credential}),credential);}catch(e){setError(e instanceof Error?e.message:'續填失敗。');}finally{setBusy(false);}}
 async function submit(answers:unknown,reviewCompleted=false){if(!credential||!current||busy)return;setBusy(true);setError('');try{const result=await request('submit',credential,{stage:current.stage,answers,...(reviewCompleted?{reviewCompleted:true}:{})});local.remove(key+'-draft-'+credential.requestId);adopt(result,credential);window.scrollTo(0,0);}catch(e){setError(e instanceof Error?e.message:'送出失敗，請重試。');}finally{setBusy(false);}}
 function next(){if(current)local.remove('footprint-research-experience-v1-'+current.id);if(credential)local.remove(key+'-draft-'+credential.requestId);local.remove(key);setCredential(null);setCurrent(null);setDraft({});setConsent(false);setError('');}
 if(mode==='loading')return <main className="research-main">載入中…</main>;
 if(mode==='general')return <><div className="research-entry"><a href="?research=1">參加研究測試（前測／後測）</a><span>一般體驗不建立團隊測試紀錄。</span></div>{experience(null)}</>;
 if(mode==='legacy')return <ResearchMode experience={s=>experience(s)}/>;
 const notice=<>{error&&<p role="alert" className="error-message">{error}</p>}{sync&&<p role="status">{sync}</p>}</>;
 if(!current)return <main className="research-main study-flow"><p className="eyebrow">足跡防護 · 研究測試</p><h1>測試說明與資料使用告知</h1><p>本研究比較使用網站前後的線索辨識表現。你會隨機分配為 A前測／B後測，或 B前測／A後測。先完成五題前測，再完成原網站八題及回查、五題後測與簡短問卷。前測不顯示答案。全程約 15–25 分鐘，沒有時間限制。</p><p>同意後才建立匿名編號並記錄：題庫及網站版本、A/B順序、各階段開始與完成時間、作答、後端分數、完成情況，以及行動意願、協助程度、易用性、問題類型和選填回饋。中途退出可關閉頁面，已同意並建立的紀錄會用於完成率統計。</p><p>請勿填姓名、學號、真實帳號、精確路線或上傳文件。團隊不主動保存 IP、精確位置或裝置識別資料。匿名作答存於 Cloudflare Workers／D1，主資料保存 {config?.retentionDays??90} 天，備份回復歷史依服務方案保存。僅授權管理者可查看；可持匿名編號向團隊要求刪除。此瀏覽器暫存續填憑證與進度，清除瀏覽器資料或換裝置會失去續填能力。</p><p>若未成年，請先依學校規定完成需要的同意；參與自願。不同意不會建立測試紀錄，可返回一般體驗。</p><label className="research-choice"><input type="checkbox" checked={consent} disabled={busy} onChange={e=>setConsent(e.target.checked)}/>我已閱讀並同意參加匿名研究測試。</label>{config&&!config.enabled&&<p className="note">A/B題庫仍待團隊確認，正式研究入口尚未開放。</p>}<div className="button-row"><button className="study-button" disabled={!consent||busy||!config?.enabled} onClick={()=>void begin()}>{busy?'連線中…':'同意並開始前測'}</button>{credential&&<button className="study-button" disabled={busy} onClick={()=>void resume()}>重新連線／續填</button>}<a href="./">返回一般體驗</a></div>{notice}</main>;
 if(current.stage==='learning')return <><div className="research-entry"><strong>前測已完成。請完成原網站八題和「回到自己」，再按「完成學習，進入後測」。學習分數不列入前後測成效。</strong>{notice}</div>{experience({id:current.id,number:null,busy,error,paired:true,onComplete:answers=>void submit(answers,true),onNext:next})}</>;
 if(current.stage==='done')return <main className="research-main study-flow"><h1>研究測試已完成</h1><p>匿名紀錄已送入統計後台。你的匿名測試編號：<strong>{current.id}</strong></p><p>請保留此編號供續查或聯絡團隊刪除；不要將編號貼入公開簡報。</p><button className="study-button" onClick={next}>下一位受測者</button><p><a href="./">返回一般體驗</a></p></main>;
 const set=(k:string,v:unknown)=>setDraft(d=>({...d,[k]:v}));
 if(current.stage==='pre'||current.stage==='post')return <main className="research-main study-flow"><p className="eyebrow">{current.order==='AB'?'A前／B後':'B前／A後'} · {current.stage==='pre'?current.preVersion:current.postVersion}</p><h1>{current.stage==='pre'?'前測':'後測'}</h1><p>每題請依虛構情境選擇。線索題為單選；防護新情境請至少選兩項。作答後不立即顯示正確答案。</p><form onSubmit={e=>{e.preventDefault();void submit(draft);}}>{current.questions.map((q,i)=><fieldset className="study-question" key={q.id}><legend>{i+1}. {q.prompt}</legend>{q.options.map(o=>{const selected=(Array.isArray(draft[q.id])?draft[q.id]:[]) as string[];return <label className="research-choice" key={o.id}><input type={q.type==='single'?'radio':'checkbox'} name={q.id} value={o.id} checked={selected.includes(o.id)} disabled={busy} onChange={()=>set(q.id,q.type==='single'?[o.id]:toggle(selected,o.id,'__none'))}/>{o.text}</label>;})}</fieldset>)}{notice}<button className="study-button" disabled={busy||current.questions.some(q=>!Array.isArray(draft[q.id])||!(draft[q.id] as string[]).length||(q.type==='multiple'&&(draft[q.id] as string[]).length<2))}>{busy?'送出中…':current.stage==='pre'?'完成前測，進入學習':'完成後測，填寫問卷'}</button></form></main>;
 const survey={actions:[],assistance:'',usability:0,problems:[],feedback:'',...draft} as {actions:string[];assistance:string;usability:number;problems:string[];feedback:string};
 return <main className="research-main study-flow"><h1>結束問卷</h1><p>協助程度與行動意願由你自填，請依實際過程回答。「暫不採取行動」須單獨選擇。</p><form onSubmit={e=>{e.preventDefault();void submit(survey);}}><fieldset className="study-question"><legend>你打算採取哪些防護行動？</legend>{current.surveyCatalog.actions.map(o=><label className="research-choice" key={o.id}><input type="checkbox" checked={survey.actions.includes(o.id)} disabled={busy} onChange={()=>set('actions',toggle(survey.actions,o.id,'none'))}/>{o.text}</label>)}</fieldset><fieldset className="study-question"><legend>完成過程需要多少協助？</legend>{current.surveyCatalog.assistance.map(o=><label className="research-choice" key={o.id}><input type="radio" name="assistance" checked={survey.assistance===o.id} disabled={busy} onChange={()=>set('assistance',o.id)}/>{o.text}</label>)}</fieldset><label>網站是否容易理解？（1最難懂，5最易懂）<select value={survey.usability} disabled={busy} onChange={e=>set('usability',Number(e.target.value))}><option value="0">請選擇</option>{[1,2,3,4,5].map(n=><option value={n} key={n}>{n}</option>)}</select></label><fieldset className="study-question"><legend>你遇到哪些問題？</legend>{current.surveyCatalog.problems.map(o=><label className="research-choice" key={o.id}><input type="checkbox" disabled={busy} checked={survey.problems.includes(o.id)} onChange={()=>set('problems',toggle(survey.problems,o.id,'none'))}/>{o.text}</label>)}</fieldset><label>選填回饋（最多400字；請勿填姓名、學校、聯絡資料或真實帳號）<textarea maxLength={400} value={survey.feedback} disabled={busy} onChange={e=>set('feedback',e.target.value)}/></label>{notice}<button className="study-button" disabled={busy||!survey.actions.length||!survey.assistance||!survey.usability||!survey.problems.length}>{busy?'送出中…':'完成研究測試'}</button></form></main>;
}
