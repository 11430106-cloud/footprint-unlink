import { createRemoteJWKSet, jwtVerify } from 'jose';
import { banks, publicBank, type BankId } from './banks.ts';
import { score, summarize, validateAnswers, validateSurvey, type Row } from './core.ts';
import { adminHtml } from './admin.ts';

type Env = { DB:D1Database; ALLOWED_ORIGIN:string; TEAM_DOMAIN:string; POLICY_AUD:string; ADMIN_EMAILS:string; RETENTION_DAYS:string };
const json=(value:unknown,status=200,headers:HeadersInit={})=>Response.json(value,{status,headers:{'Cache-Control':'no-store',...headers}});
const fail=(message:string,status:number)=>json({error:message},status);
const now=()=>new Date().toISOString();
const hash=async (token:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))).map(b=>b.toString(16).padStart(2,'0')).join('');
const stage=(r:Row)=>r.completed_at?'done':r.post_completed_at?'survey':r.experience_completed_at?'post':r.pre_completed_at?'experience':'pre';
const firstBank=(r:Row):BankId=>r.order_code==='AB'?'A':'B';
const secondBank=(r:Row):BankId=>r.order_code==='AB'?'B':'A';
const safeBody=async (request:Request)=>{if(Number(request.headers.get('content-length')??0)>12000)throw Error('資料過長。');const raw=await request.text();if(raw.length>12000)throw Error('資料過長。');return JSON.parse(raw) as unknown;};

async function admin(request:Request,env:Env){
 if(!env.POLICY_AUD||!env.TEAM_DOMAIN||!env.ADMIN_EMAILS||env.POLICY_AUD.startsWith('REPLACE')||env.TEAM_DOMAIN.includes('REPLACE'))return false;
 const token=request.headers.get('Cf-Access-Jwt-Assertion');if(!token)return false;
 try{
  const issuer=new URL(env.TEAM_DOMAIN);if(issuer.protocol!=='https:'||!issuer.hostname.endsWith('.cloudflareaccess.com'))return false;
  const {payload}=await jwtVerify(token,createRemoteJWKSet(new URL('/cdn-cgi/access/certs',issuer)),{issuer:issuer.origin,audience:env.POLICY_AUD,algorithms:['RS256']});
  const allowed=env.ADMIN_EMAILS.split(',').map(s=>s.trim().toLowerCase());return typeof payload.email==='string'&&allowed.includes(payload.email.toLowerCase());
 }catch{return false;}
}

function csv(rows:Row[]) {
 const columns=['id','consent','order_code','started_at','pre_started_at','pre_completed_at','experience_started_at','experience_completed_at','post_started_at','post_completed_at','survey_started_at','completed_at','pre_bank_version','post_bank_version','pre_answers','post_answers','pre_item_results','post_item_results','pre_score','post_score','post_protection','survey'] as const;
 const quote=(x:unknown)=>'"'+String(x??'').replaceAll('"','""')+'"';
 // Formula prefix hardening for spreadsheet software. All user-supplied values are constrained IDs.
 return '\uFEFF'+columns.join(',')+'\r\n'+rows.map(row=>columns.map(c=>quote(c==='consent'?1:row[c])).join(',')).join('\r\n')+'\r\n';
}

export default {
 async fetch(request:Request,env:Env):Promise<Response>{
  const url=new URL(request.url),path=url.pathname,method=request.method;
  const adminRoute=path==='/admin'||path.startsWith('/api/admin/');
  if(adminRoute){
   if(!await admin(request,env))return fail('管理者驗證失敗。',403);
   if(path==='/admin'&&method==='GET')return new Response(adminHtml,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; form-action 'none'; base-uri 'none'; frame-ancestors 'none'",'X-Content-Type-Options':'nosniff'}});
   if(path==='/api/admin/stats'&&method==='GET'){const {results}=await env.DB.prepare('SELECT * FROM sessions ORDER BY started_at').all<Row>();return json(summarize(results));}
   if(path==='/api/admin/export'&&method==='GET'){const {results}=await env.DB.prepare('SELECT * FROM sessions ORDER BY started_at').all<Row>();return new Response(csv(results),{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="footprint-research.csv"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
   if(path==='/api/admin/sessions'&&method==='DELETE'){
    if(request.headers.get('Origin')!==url.origin)return fail('來源不符。',403);
    let input:unknown;try{input=await safeBody(request);}catch{return fail('格式錯誤。',400);}
    if(!input||typeof input!=='object')return fail('格式錯誤。',400);
    const body=input as Record<string,unknown>;
    if(body.all===true&&Object.keys(body).length===1)await env.DB.prepare('DELETE FROM sessions').run();
    else if(typeof body.before==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(body.before)&&!Number.isNaN(Date.parse(body.before))&&Object.keys(body).length===1)await env.DB.prepare('DELETE FROM sessions WHERE started_at < ?').bind(body.before+'T00:00:00.000Z').run();
    else return fail('刪除條件錯誤。',400);
    return json({ok:true});
   }
   return fail('找不到頁面。',404);
  }
  if(!path.startsWith('/api/'))return fail('找不到頁面。',404);
  const origin=request.headers.get('Origin');
  const allowed=origin===env.ALLOWED_ORIGIN||(origin==='http://localhost:3000'&&env.ALLOWED_ORIGIN==='http://localhost:3000');
  if(!allowed)return fail('來源不符。',403);
  const cors={'Access-Control-Allow-Origin':origin!,'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization','Vary':'Origin','Cache-Control':'no-store'};
  if(method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  const result=(value:unknown,status=200)=>json(value,status,cors);
  try{
   if(path==='/api/start'&&method==='POST'){
    const body=await safeBody(request) as {consent?:unknown};if(body?.consent!==true)return result({error:'請先同意。'},400);
    const id=crypto.randomUUID(),token=crypto.randomUUID()+crypto.randomUUID(),order: 'AB'|'BA'=crypto.getRandomValues(new Uint8Array(1))[0]<128?'AB':'BA';
    const pre=order==='AB'?'A':'B',post=order==='AB'?'B':'A',time=now();
    await env.DB.prepare('INSERT INTO sessions(id,token_hash,consent,order_code,started_at,pre_started_at,pre_bank_version,post_bank_version) VALUES(?,?,1,?,?,?,?,?)').bind(id,await hash(token),order,time,time,banks[pre].version,banks[post].version).run();
    return result({id,token,order,stage:'pre',bank:publicBank(pre)});
   }
   const bearer=request.headers.get('Authorization');if(!bearer?.startsWith('Bearer '))return result({error:'測試紀錄驗證失敗。'},401);
   const token=bearer.slice(7);if(!/^[0-9a-f-]{72}$/.test(token))return result({error:'測試紀錄驗證失敗。'},401);
   const row=await env.DB.prepare('SELECT * FROM sessions WHERE token_hash=?').bind(await hash(token)).first<Row>();
   if(!row)return result({error:'測試紀錄不存在或已刪除。'},401);
   const current=stage(row);
   if(path==='/api/session'&&method==='GET')return result({id:row.id,order:row.order_code,stage:current,bank:current==='pre'?publicBank(firstBank(row),row.pre_bank_version):current==='post'?publicBank(secondBank(row),row.post_bank_version):null});
   if(method!=='POST')return result({error:'找不到頁面。'},404);
   const body=await safeBody(request);
   if(path==='/api/pre'){
    if(current!=='pre')return result({error:'前測已送出或順序錯誤。',stage:current},409);
    const answers=validateAnswers(firstBank(row),(body as {answers?:unknown})?.answers,row.pre_bank_version),points=score(firstBank(row),answers,row.pre_bank_version);
    const time=now();const change=await env.DB.prepare('UPDATE sessions SET pre_answers=?, pre_item_results=?, pre_score=?, pre_completed_at=?, experience_started_at=? WHERE id=? AND pre_completed_at IS NULL').bind(JSON.stringify(answers),JSON.stringify(points.items),points.clue,time,time,row.id).run();
    if(!change.meta.changes)return result({error:'前測已送出。'},409);return result({stage:'experience'});
   }
   if(path==='/api/experience'){
    if(current!=='experience')return result({error:'原網站流程順序錯誤。',stage:current},409);
    if((body as {completed?:unknown})?.completed!==true)return result({error:'未完成流程。'},400);
    const time=now();await env.DB.prepare('UPDATE sessions SET experience_completed_at=?, post_started_at=? WHERE id=? AND experience_completed_at IS NULL').bind(time,time,row.id).run();
    return result({stage:'post',bank:publicBank(secondBank(row),row.post_bank_version)});
   }
   if(path==='/api/post'){
    if(current!=='post')return result({error:'後測已送出或順序錯誤。',stage:current},409);
    const answers=validateAnswers(secondBank(row),(body as {answers?:unknown})?.answers,row.post_bank_version),points=score(secondBank(row),answers,row.post_bank_version);
    const time=now();const change=await env.DB.prepare('UPDATE sessions SET post_answers=?, post_item_results=?, post_score=?, post_protection=?, post_completed_at=?, survey_started_at=? WHERE id=? AND post_completed_at IS NULL').bind(JSON.stringify(answers),JSON.stringify(points.items),points.clue,Number(points.protection),time,time,row.id).run();
    if(!change.meta.changes)return result({error:'後測已送出。'},409);return result({stage:'survey'});
   }
   if(path==='/api/finish'){
    if(current!=='survey')return result({error:'問卷已送出或順序錯誤。',stage:current},409);
    const survey=validateSurvey((body as {survey?:unknown})?.survey);
    const change=await env.DB.prepare('UPDATE sessions SET survey=?, completed_at=? WHERE id=? AND completed_at IS NULL').bind(JSON.stringify(survey),now(),row.id).run();
    if(!change.meta.changes)return result({error:'問卷已送出。'},409);return result({stage:'done',id:row.id});
   }
   return result({error:'找不到頁面。'},404);
  }catch(error){const message=error instanceof SyntaxError?'資料格式錯誤。':error instanceof Error?error.message:'';
   return ['資料格式錯誤。','資料過長。','答案格式錯誤。','請完成所有題目。','答案含無效選項。','問卷格式錯誤。','請完成問卷，互斥選項不能同時勾選。'].includes(message)?result({error:message},400):result({error:'服務暫時無法處理。'},500);
  }
 },
 async scheduled(_controller:ScheduledController,env:Env){
  const days=Number(env.RETENTION_DAYS);if(!Number.isInteger(days)||days<1||days>3650)throw Error('RETENTION_DAYS 必須為 1–3650。');
  const cutoff=new Date(Date.now()-days*86400000).toISOString();await env.DB.prepare('DELETE FROM sessions WHERE started_at < ?').bind(cutoff).run();
 }
};
