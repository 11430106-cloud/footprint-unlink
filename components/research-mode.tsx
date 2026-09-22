'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { Survey } from '@/research/core';

type PublicBank = { version:string; items:{id:string;category:string;prompt:string;multiple:boolean;options:{id:string;text:string}[]}[] };
type Stage = 'pre'|'experience'|'post'|'survey'|'done';
type Session = {id:string;token:string;order:'AB'|'BA';stage:Stage;bank:PublicBank|null};
type Draft = {answers:Record<string,string[]>;survey:Partial<Survey>&{actions:string[];problems:string[]}};
const api=process.env.NEXT_PUBLIC_RESEARCH_API_URL?.replace(/\/$/,'');
const retention=process.env.NEXT_PUBLIC_RESEARCH_RETENTION_DAYS || '90';
const key='footprint-research-draft-v1';
const emptySurvey={actions:[],problems:[]};
const emptyDraft=():Draft=>({answers:{},survey:emptySurvey});
const labels:Record<string,string>={identity:'身分',location:'位置',time:'時間',link:'跨平台關聯',protection:'防護'};

export function ResearchMode({experience}:{experience:(onComplete:()=>void,id:string)=>React.ReactNode}) {
 const [session,setSession]=useState<Session|null>(null);
 const [draft,setDraft]=useState<Draft>(emptyDraft);
 const [ready,setReady]=useState(false),[busy,setBusy]=useState(false),[consent,setConsent]=useState(false),[error,setError]=useState('');
 useEffect(()=>{
  try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(saved?.session?.token){setSession(saved.session);setDraft(saved.draft||emptyDraft());} }catch{}setReady(true);
 },[]);
 useEffect(()=>{if(ready&&session)localStorage.setItem(key,JSON.stringify({session,draft}));},[ready,session,draft]);
 async function request(path:string,token?:string,body?:unknown){
  if(!api)throw Error('研究測試尚未開放，請團隊先設定後端。');
  const response=await fetch(api+'/api/'+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});
  const result=await response.json() as Session & {error?:string};if(!response.ok)throw Error(result.error||'網路連線失敗。');return result;
 }
 async function sync(existing:Session){
  const remote=await request('session',existing.token);
  const next={...existing,stage:remote.stage as Stage,bank:remote.bank as PublicBank|null};
  setSession(next);return next;
 }
 useEffect(()=>{if(!ready||!session||!api)return;sync(session).catch(()=>setError('目前無法連線，進度仍保留於此裝置；連線後請按「繼續」。'));},[ready]);
 useEffect(()=>{const retry=()=>{if(session&&api)sync(session).then(()=>setError('')).catch(()=>{});};window.addEventListener('online',retry);return()=>window.removeEventListener('online',retry);},[session]);
 async function run(action:()=>Promise<void>){setBusy(true);setError('');try{await action();}catch(e){
   if(session)try{await sync(session);}catch{}
   setError(e instanceof Error?e.message:'送出失敗，請稍後重試。');
  }finally{setBusy(false);}}
 async function start(){if(!consent)return;await run(async()=>{const result=await request('start',undefined,{consent:true});setSession(result as Session);setDraft(emptyDraft());});}
 function select(id:string,multiple:boolean,option:string){setDraft(old=>{const current=old.answers[id]||[];return {...old,answers:{...old.answers,[id]:multiple?(current.includes(option)?current.filter(x=>x!==option):[...current,option]):[option]}};});}
 async function submitTest(){if(!session?.bank)return;const answers=Object.fromEntries(session.bank.items.map(item=>[item.id,draft.answers[item.id]||[]]));
  if(Object.values(answers).some(ids=>ids.length===0)){setError('請完成每一題。');return;}
  await run(async()=>{const result=await request(session.stage,session.token,{answers});setSession({...session,stage:result.stage,bank:null});setDraft(emptyDraft());window.scrollTo(0,0);});
 }
 async function completeExperience(){if(!session)return;await run(async()=>{const result=await request('experience',session.token,{completed:true});setSession({...session,stage:result.stage,bank:result.bank});setDraft(emptyDraft());window.scrollTo(0,0);});}
 function surveySelection(field:'actions'|'problems',id:string){setDraft(old=>{const current=old.survey[field];return {...old,survey:{...old.survey,[field]:id==='none'?current.includes('none')?[]:['none']:current.includes(id)?current.filter(x=>x!==id):[...current.filter(x=>x!=='none'),id]}};});}
 async function submitSurvey(){if(!session)return;if(!draft.survey.actions.length||!draft.survey.problems.length||!draft.survey.assistance||!draft.survey.ease){setError('請完成問卷的每個欄位。');return;}
  await run(async()=>{const result=await request('finish',session.token,{survey:draft.survey});setSession({...session,stage:result.stage,bank:null});setDraft(emptyDraft());});}
 if(!ready)return <main className="research-main">載入中…</main>;
 if(!api)return <main className="research-main"><h1>研究測試尚未開放</h1><p>前後測題庫目前是草稿，需團隊確認並設定資料服務後才開放收案。一般體驗可由首頁進入。</p><a href="./">返回一般體驗</a></main>;
 if(!session)return <main className="research-main"><div className="eyebrow">研究測試模式</div><h1>參加足跡防護測試</h1><p>流程：同意 → 前測 → 既有八題體驗與回查 → 後測 → 結束問卷。前測結束不顯示答案；原網站練習分數不當作前後測成效。</p><section className="research-card"><h2>資料使用告知</h2><p>同意後建立匿名測試編號，記錄 A/B 順序、各階段時間、前後測逐題選項與分數、原網站流程是否完成，以及結束問卷的選項。資料送到 Cloudflare Workers 與 D1 資料庫，僅團隊管理者可讀取統計和匯出匿名資料。主資料預計保存 {retention} 天，到期自動刪除，也可由管理者提前刪除；Cloudflare 的 D1 回復歷史仍可能依方案保留最多 7 或 30 天。</p><p>不需姓名、學號、真實帳號、真實路線或文件；團隊不主動儲存 IP、精確位置或裝置識別資料。此裝置會暫存研究進度與續傳憑證，完成後仍可刪除瀏覽器網站資料。網路傳輸由 Cloudflare 處理；請依學校規定辦理未成年人告知與同意。</p><label className="research-choice"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>我已閱讀並同意上述匿名資料用於本次研究測試。</label><Button className="primary-button" disabled={!consent||busy} onClick={start}>同意並開始</Button><p>不同意可直接<a href="./">返回一般體驗</a>，不會送出研究作答。</p></section>{error&&<p role="alert">{error}</p>}</main>;
 if(session.stage==='experience')return <><div className="research-banner">研究測試 · 編號 {session.id} · 前測已送出，接著完成原網站體驗與「回到自己」。{error&&<span role="alert">{error}</span>}</div>{experience(completeExperience,session.id)}</>;
 return <main className="research-main"><div className="eyebrow">研究測試 · 匿名編號 {session.id}</div><p>題庫順序 {session.order==='AB'?'A 前測 / B 後測':'B 前測 / A 後測'}。中斷後可在本裝置使用相同連結繼續。</p>
 {session.stage==='done'?<section className="research-card"><h1>已完成，謝謝參與</h1><p>紀錄已送到後台。請不要重複參加；此編號的重送不會增加人數。</p><Button onClick={()=>{localStorage.removeItem(key);localStorage.removeItem('footprint-research-experience-v1-'+session.id);setSession(null);location.href='./';}}>返回一般體驗並清除此裝置的研究進度</Button></section>:null}
 {(session.stage==='pre'||session.stage==='post')&&session.bank&&<><h1>{session.stage==='pre'?'前測':'後測'}</h1><p>共五題，請依題意作答。{session.stage==='pre'?'送出後不顯示答案。':''} 題庫版本 {session.bank.version}</p><form onSubmit={e=>{e.preventDefault();void submitTest();}}>{session.bank.items.map((item,index)=><fieldset className="research-card" key={item.id}><legend>{index+1}. {labels[item.category]} · {item.multiple?'複選':'單選'}</legend><p>{item.prompt}</p>{item.options.map(option=><label key={option.id} className="research-choice"><input type={item.multiple?'checkbox':'radio'} name={item.id} checked={(draft.answers[item.id]||[]).includes(option.id)} onChange={()=>select(item.id,item.multiple,option.id)}/>{option.text}</label>)}</fieldset>)}<Button type="submit" className="primary-button" disabled={busy}>送出{session.stage==='pre'?'前測':'後測'}</Button></form></>}
 {session.stage==='survey'&&<><h1>結束問卷</h1><p>只選選項，不需提供個人資料。「暫不採取」和其他行動互斥。</p><section className="research-card"><h2>打算採取哪些防護行動？</h2>{[['hide-route','隱藏公開路線或起訖點'],['delay-post','延後發布固定活動時間'],['review-privacy','檢查公開範圍'],['remove-links','減少跨平台可連結線索'],['none','暫不採取行動']].map(([id,label])=><label className="research-choice" key={id}><input type="checkbox" checked={draft.survey.actions.includes(id)} onChange={()=>surveySelection('actions',id)}/>{label}</label>)}</section>
 <section className="research-card"><h2>完成時需要多少協助？（自填）</h2>{[['none','不需協助'],['minor','僅少量協助'],['moderate','需要一些協助'],['major','需要大量協助']].map(([id,label])=><label className="research-choice" key={id}><input type="radio" name="assistance" checked={draft.survey.assistance===id} onChange={()=>setDraft(o=>({...o,survey:{...o.survey,assistance:id as Survey['assistance']}}))}/>{label}</label>)}</section>
 <section className="research-card"><h2>網站是否容易理解？</h2><p>1 代表很難理解，5 代表很容易理解。</p>{[1,2,3,4,5].map(value=><label className="research-choice" key={value}><input type="radio" name="ease" checked={draft.survey.ease===value} onChange={()=>setDraft(o=>({...o,survey:{...o.survey,ease:value as Survey['ease']}}))}/>{value}</label>)}</section>
 <section className="research-card"><h2>遇到哪些問題？</h2>{[['instructions','說明不清楚'],['wording','題目用詞不清楚'],['navigation','操作或前進方式'],['display','畫面顯示'],['connection','網路連線'],['other','其他問題'],['none','沒有問題']].map(([id,label])=><label className="research-choice" key={id}><input type="checkbox" checked={draft.survey.problems.includes(id)} onChange={()=>surveySelection('problems',id)}/>{label}</label>)}</section><Button className="primary-button" disabled={busy} onClick={submitSurvey}>完成並送出</Button></>}
 {error&&<p role="alert" className="error-message">{error}</p>}{session.stage!=='done'&&<Button variant="outline" disabled={busy} onClick={()=>run(async()=>{await sync(session);setError('');})}>連線恢復後繼續</Button>}</main>;
}
