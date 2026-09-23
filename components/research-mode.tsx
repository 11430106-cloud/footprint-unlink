'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { Answers } from '@/research/core';

type Session = { id: string; token: string };
export type StudyContext = { id: string; number: number | null; busy: boolean; error: string; onComplete: (answers: Answers) => void; onNext: () => void };
const api = process.env.NEXT_PUBLIC_RESEARCH_API_URL?.replace(/\/$/,'');
const retention = process.env.NEXT_PUBLIC_RESEARCH_RETENTION_DAYS || '90';
const key = 'footprint-single-session-v1';

export function ResearchMode({experience}:{experience:(study:StudyContext|null)=>React.ReactNode}) {
 const [choice,setChoice]=useState<'loading'|'ask'|'normal'|'study'>('loading');
 const [session,setSession]=useState<Session|null>(null);
 const [number,setNumber]=useState<number|null>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[consent,setConsent]=useState(false);
 async function request(path:string,token?:string,payload?:unknown){
  const response=await fetch(api+'/api/'+path,{method:payload===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:payload===undefined?undefined:JSON.stringify(payload),cache:'no-store'});
  const result=await response.json() as {error?:string;id?:string;token?:string;number?:number|null;stage?:string};
  if(!response.ok)throw Error(result.error||'連線失敗，請稍後重試。');return result;
 }
 useEffect(()=>{
  let active=true;queueMicrotask(()=>{if(!active)return;
   try{const saved=JSON.parse(localStorage.getItem(key)||'null') as Session|null;
    if(saved&&typeof saved.id==='string'&&typeof saved.token==='string'){setSession(saved);setChoice('study');return;}
   }catch{}setChoice('ask');
  });return()=>{active=false;};
 },[]);
 useEffect(()=>{if(!session)return;request('session',session.token).then(result=>{if(result.stage==='done'&&typeof result.number==='number')setNumber(result.number);setError('');}).catch(()=>setError('目前無法連線，進度保留在此裝置；完成後可重試送出。'));},[session]);
 async function accept(){if(!consent||busy)return;setBusy(true);setError('');try{const result=await request('start',undefined,{consent:true});if(!result.id||!result.token)throw Error('無法建立測試紀錄。');const next={id:result.id,token:result.token};localStorage.setItem(key,JSON.stringify(next));setSession(next);setChoice('study');}catch(e){setError(e instanceof Error?e.message:'連線失敗。');}finally{setBusy(false);}}
 async function complete(answers:Answers){if(!session||number!==null||busy)return;setBusy(true);setError('');try{const result=await request('complete',session.token,{answers});if(typeof result.number!=='number')throw Error('未取得完成編號。');setNumber(result.number);}catch(e){setError(e instanceof Error?e.message:'送出失敗，請重試。');}finally{setBusy(false);}}
 function next(){if(!session)return;localStorage.removeItem(key);localStorage.removeItem('footprint-research-experience-v1-'+session.id);setSession(null);setNumber(null);setConsent(false);setError('');setChoice('ask');}
 useEffect(()=>{const online=()=>{if(session&&number===null)request('session',session.token).then(result=>{if(result.stage==='done'&&typeof result.number==='number')setNumber(result.number);}).catch(()=>{});};window.addEventListener('online',online);return()=>window.removeEventListener('online',online);},[session,number]);
 if(choice==='loading')return <main className="research-main">載入中…</main>;
 if(choice==='normal')return <><div className="research-banner">一般體驗：本次作答不送到團隊後台。</div>{experience(null)}</>;
 if(choice==='study'&&session){
  if(number!==null&&!localStorage.getItem('footprint-research-experience-v1-'+session.id))return <main className="research-main"><h1>測試已完成</h1><p>你的匿名完成編號：<strong>{number}</strong></p><Button onClick={next}>下一位受測者</Button></main>;
  return <>{experience({id:session.id,number,busy,error,onComplete:answers=>{void complete(answers);},onNext:next})}</>;
 }
 return <div className="consent-backdrop"><dialog open className="research-main consent-dialog" aria-labelledby="consent-title"><div className="eyebrow">足跡防護 · 測試告知</div><h1 id="consent-title">是否同意將測試結果用於數據分析？</h1><p>同意後會開始原網站的八題與回查。所有同意者使用相同題目；完成後顯示匿名編號。團隊只統計作答、分數、開始與完成時間，不要求姓名、學號、真實帳號、路線或文件。不同意仍可使用一般體驗，作答不送後台。</p><p>匿名紀錄存於 Cloudflare Workers／D1，僅管理者可查看；主資料預計保存 {retention} 天後刪除，D1 回復歷史可能依方案再保留 7 或 30 天。團隊不主動儲存 IP、精確位置或裝置識別資料。中途重新整理時，此裝置會暫存進度與續傳憑證。若測試者未成年，請先依學校規定取得所需同意。</p><label className="research-choice"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>我已閱讀並同意將匿名作答用於本次數據分析。</label><div className="button-row"><Button className="primary-button" disabled={!consent||busy} onClick={accept}>同意並開始</Button><Button variant="outline" disabled={busy} onClick={()=>{setError('');setChoice('normal');}}>不同意，繼續一般體驗</Button></div>{error&&<p role="alert" className="error-message">{error}</p>}</dialog></div>;
}
