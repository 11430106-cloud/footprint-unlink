import { STUDY_VERSION, WEBSITE_VERSION, bankVersion, publicBank, actions, assistance, problems, type Form } from './banks.ts';
import { gradeTest, validateSurvey, summarizeStudy, studyCsv, rawFeedback, type StudyRow, type Step } from './paired-core.ts';
import { presentationText, emptyMetadata, validateMetadata } from './presentation.ts';
import { validateAnswers } from './core.ts';
export type StudyEnv={DB:D1Database;RETENTION_DAYS:string;STUDY_ENABLED?:string};
type Session={id:string;token_hash:string;study_version:string;website_version:string;form_order:'AB'|'BA';pre_version:string;post_version:string;stage:'pre'|'learning'|'post'|'survey'|'done';started_at:string;stage_started_at:string;completed_at:string|null;draft_json:string|null};
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const hash=async(token:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))).map(x=>x.toString(16).padStart(2,'0')).join('');
const clock=()=>new Date().toISOString();
const parse=async(request:Request)=>{const reader=request.body?.getReader();if(!reader)throw Error('資料格式錯誤。');const chunks:Uint8Array[]=[];let size=0;try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>48000){await reader.cancel();throw Error('資料過長。');}chunks.push(value);}}finally{reader.releaseLock();}const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return JSON.parse(new TextDecoder().decode(bytes)) as Record<string,unknown>;};
const plain=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const formFor=(s:Session,phase:'pre'|'post'):Form=>s.form_order[phase==='pre'?0:1] as Form;
async function steps(env:StudyEnv,id:string){return (await env.DB.prepare('SELECT stage,form,bank_version,started_at,completed_at,answers_json,results_json FROM study_steps WHERE session_id=?').bind(id).all<Step>()).results;}
async function state(env:StudyEnv,id:string){const s=await env.DB.prepare('SELECT * FROM study_sessions WHERE id=?').bind(id).first<Session>();if(!s)throw Error('測試紀錄不存在。');
 return {id:s.id,stage:s.stage,order:s.form_order,version:s.study_version,websiteVersion:s.website_version,preVersion:s.pre_version,postVersion:s.post_version,stageStartedAt:s.stage_started_at,draft:s.draft_json?JSON.parse(s.draft_json):null,questions:s.stage==='pre'||s.stage==='post'?publicBank(formFor(s,s.stage)):[],surveyCatalog:{actions,assistance,problems}};}
export async function publicStudy(request:Request,env:StudyEnv):Promise<Response>{
 const path=new URL(request.url).pathname,method=request.method;
 try{
  if(path==='/api/study/config'&&method==='GET')return json({enabled:env.STUDY_ENABLED==='true',version:STUDY_VERSION,websiteVersion:WEBSITE_VERSION,retentionDays:Number(env.RETENTION_DAYS)||90});
  if(path==='/api/study/start'&&method==='POST'){
   const input=await parse(request);if(!plain(input)||input.consent!==true||Object.keys(input).some(k=>!['consent','requestId','token'].includes(k)))return json({error:'請先同意。'},400);
   if(typeof input.requestId!=='string'||! /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(input.requestId)||typeof input.token!=='string'||!/^[a-f0-9]{64}$/.test(input.token))return json({error:'開始資料格式錯誤。'},400);
   const tokenHash=await hash(input.token),existing=await env.DB.prepare('SELECT id,token_hash FROM study_sessions WHERE request_id=?').bind(input.requestId).first<{id:string;token_hash:string}>();
   if(existing){if(existing.token_hash!==tokenHash)return json({error:'開始紀錄不符。'},409);return json(await state(env,existing.id));}
   if(env.STUDY_ENABLED!=='true')return json({error:'A/B 題庫仍待團隊確認，研究測試尚未開放。一般體驗不受影響。'},503);
   const id=crypto.randomUUID(),order=(crypto.getRandomValues(new Uint8Array(1))[0]&1)?'AB':'BA',at=clock();
   await env.DB.prepare('INSERT INTO study_sessions(id,request_id,token_hash,consent,consent_version,study_version,website_version,form_order,pre_version,post_version,started_at,stage,stage_started_at) VALUES(?,?,?,1,?,?,?,?,?,?,?,\'pre\',?) ON CONFLICT(request_id) DO NOTHING').bind(id,input.requestId,tokenHash,'consent-v2',STUDY_VERSION,WEBSITE_VERSION,order,bankVersion(order[0] as Form),bankVersion(order[1] as Form),at,at).run();
   const saved=await env.DB.prepare('SELECT id,token_hash FROM study_sessions WHERE request_id=?').bind(input.requestId).first<{id:string;token_hash:string}>();
   if(!saved||saved.token_hash!==tokenHash)return json({error:'開始紀錄不符。'},409);return json(await state(env,saved.id));
  }
  const bearer=request.headers.get('Authorization');if(!bearer?.startsWith('Bearer ')||!/^[a-f0-9]{64}$/.test(bearer.slice(7)))return json({error:'測試紀錄驗證失敗。'},401);
  const s=await env.DB.prepare('SELECT * FROM study_sessions WHERE token_hash=?').bind(await hash(bearer.slice(7))).first<Session>();if(!s)return json({error:'測試紀錄不存在或已刪除。'},401);
  if(s.study_version!==STUDY_VERSION)return json({error:'題庫版本已更新，請聯絡團隊保留此紀錄。'},409);
  if(path==='/api/study/session'&&method==='GET')return json(await state(env,s.id));
  if(path==='/api/study/draft'&&method==='POST'){
   const input=await parse(request);if(!plain(input)||input.stage!==s.stage||s.stage==='done'||!plain(input.answers)||Object.keys(input).some(k=>!['stage','answers'].includes(k)))return json({error:'草稿階段不符。'},409);
   if(s.stage==='pre'||s.stage==='post'){
    const catalog=publicBank(formFor(s,s.stage));for(const [id,value]of Object.entries(input.answers))if(!catalog.some(q=>q.id===id)||!Array.isArray(value)||value.some(x=>typeof x!=='string'||!catalog.find(q=>q.id===id)!.options.some(o=>o.id===x))||new Set(value).size!==value.length)throw Error('草稿格式錯誤。');
   }else if(s.stage==='survey'){
    const v=input.answers,validIds=(value:unknown,catalog:{id:string}[])=>Array.isArray(value)&&value.length<=catalog.length&&value.every(id=>typeof id==='string'&&catalog.some(o=>o.id===id))&&new Set(value).size===value.length&&(!value.includes('none')||value.length===1);
    if(Object.keys(v).some(k=>!['actions','assistance','usability','problems','feedback'].includes(k))||!validIds(v.actions,actions)||!validIds(v.problems,problems)||typeof v.assistance!=='string'||(v.assistance!==''&&!assistance.some(a=>a.id===v.assistance))||!Number.isInteger(v.usability)||Number(v.usability)<0||Number(v.usability)>5||typeof v.feedback!=='string'||v.feedback.length>400)throw Error('草稿格式錯誤。');
   }else return json({error:'學習進度由裝置暫存。'},400);
   await env.DB.prepare('UPDATE study_sessions SET draft_json=? WHERE id=? AND stage=?').bind(JSON.stringify(input.answers),s.id,s.stage).run();return json({ok:true});
  }
  if(path==='/api/study/submit'&&method==='POST'){
   const input=await parse(request);if(!plain(input)||!['pre','learning','post','survey'].includes(String(input.stage)))throw Error('階段格式錯誤。');
   const previous=await env.DB.prepare('SELECT stage FROM study_steps WHERE session_id=? AND stage=?').bind(s.id,input.stage).first();if(previous)return json(await state(env,s.id));
   if(input.stage!==s.stage)return json({error:'請依前測、學習、後測、問卷的順序完成。'},409);
   const at=clock();let answers:unknown,results:unknown,form:Form|null=null,version:string|null=null,next:string;
   if(s.stage==='pre'||s.stage==='post'){form=formFor(s,s.stage);version=bankVersion(form);results=gradeTest(form,input.answers);answers=input.answers;next=s.stage==='pre'?'learning':'survey';}
   else if(s.stage==='learning'){answers=validateAnswers(input.answers);if(input.reviewCompleted!==true)throw Error('請完成原網站八題與回到自己的回查流程。');results={completed:true,reviewCompleted:true};next='post';}
   else if(s.stage==='survey'){answers=validateSurvey(input.answers);results={completed:true};next='done';}
   else return json({error:'測試已完成。'},409);
   await env.DB.batch([
    env.DB.prepare('INSERT INTO study_steps(session_id,stage,form,bank_version,started_at,completed_at,answers_json,results_json) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(session_id,stage) DO NOTHING').bind(s.id,s.stage,form,version,s.stage_started_at,at,JSON.stringify(answers),JSON.stringify(results)),
    env.DB.prepare('UPDATE study_sessions SET stage=?,stage_started_at=?,draft_json=NULL,completed_at=? WHERE id=? AND stage=?').bind(next,at,next==='done'?at:null,s.id,s.stage)
   ]);return json(await state(env,s.id));
  }
  return json({error:'找不到頁面。'},404);
 }catch(error){if(error instanceof SyntaxError)return json({error:'資料格式錯誤。'},400);const message=error instanceof Error?error.message:'';return json({error:message.includes('。')?message:'服務暫時無法處理，進度仍保留。'},message.includes('。')?400:500);}
}
export async function loadStudy(env:StudyEnv):Promise<StudyRow[]>{const [sessions,allSteps]=await env.DB.batch([env.DB.prepare('SELECT id,study_version,website_version,form_order,pre_version,post_version,started_at,completed_at,stage FROM study_sessions ORDER BY started_at,id'),env.DB.prepare('SELECT session_id,stage,form,bank_version,started_at,completed_at,answers_json,results_json FROM study_steps')]);const rows=sessions.results as Omit<StudyRow,'steps'>[],records=allSteps.results as (Step&{session_id:string})[];return rows.map(s=>({...s,steps:records.filter(p=>p.session_id===s.id)}));}
export async function adminStudy(request:Request,env:StudyEnv):Promise<Response>{
 const url=new URL(request.url),path=url.pathname;
 if(path==='/api/admin/study/session'&&request.method==='DELETE'){
  if(request.headers.get('Origin')!==url.origin)return json({error:'來源不符。'},403);
  try{const input=await parse(request);if(Object.keys(input).length!==2||input.confirm!=='刪除此匿名紀錄'||typeof input.id!=='string'||! /^[a-f0-9-]{36}$/.test(input.id))throw Error('請提供匿名編號並確認刪除此匿名紀錄。');const result=await env.DB.prepare('DELETE FROM study_sessions WHERE id=?').bind(input.id).run();return json({ok:true,deleted:result.meta.changes});}catch(e){return json({error:e instanceof Error?e.message:'格式錯誤。'},400);}
 }
 if(path==='/api/admin/study/metadata'&&request.method==='PUT'){
  if(request.headers.get('Origin')!==url.origin)return json({error:'來源不符。'},403);
  try{const input=await parse(request);if(!plain(input)||!Number.isInteger(input.revision)||Number(input.revision)<0||Object.keys(input).some(k=>!['revision','content'].includes(k)))throw Error('補充欄位格式錯誤。');const content=validateMetadata(input.content);
   const existing=await env.DB.prepare('SELECT revision FROM study_metadata WHERE singleton=1').first<{revision:number}>();if(!existing&&input.revision!==0)return json({error:'補充欄位版本不符，請重新整理。'},409);
   const result=await env.DB.prepare('INSERT INTO study_metadata(singleton,revision,updated_at,content_json) VALUES(1,1,?,?) ON CONFLICT(singleton) DO UPDATE SET revision=study_metadata.revision+1,updated_at=excluded.updated_at,content_json=excluded.content_json WHERE study_metadata.revision=?').bind(clock(),JSON.stringify(content),input.revision).run();
   if(!result.meta.changes)return json({error:'另一位管理者已修改補充欄位，請重新整理再編輯。'},409);return json({ok:true});
  }catch(e){return json({error:e instanceof Error?e.message:'格式錯誤。'},400);}
 }
 if(request.method!=='GET')return json({error:'找不到頁面。'},404);
 const rows=await loadStudy(env),s=summarizeStudy(rows),record=await env.DB.prepare('SELECT revision,content_json FROM study_metadata WHERE singleton=1').first<{revision:number;content_json:string}>(),metadata=record?validateMetadata(JSON.parse(record.content_json)):emptyMetadata(),updatedAt=clock();
 if(path==='/api/admin/study/export')return new Response(studyCsv(rows),{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="footprint-paired.csv"','Cache-Control':'no-store'}});
 if(path==='/api/admin/study/report')return new Response(presentationText(s,metadata,updatedAt),{headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}});
 if(path==='/api/admin/study/stats')return json({...s,meta:{updatedAt,version:STUDY_VERSION,websiteVersion:WEBSITE_VERSION,enabled:env.STUDY_ENABLED==='true',retentionDays:Number(env.RETENTION_DAYS)||90},metadata:{revision:record?.revision??0,content:metadata},rawFeedback:rawFeedback(rows),presentationText:presentationText(s,metadata,updatedAt)});
 return json({error:'找不到頁面。'},404);
}
