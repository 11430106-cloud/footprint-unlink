import { createRemoteJWKSet, jwtVerify } from 'jose';
import { QUIZ_VERSION, grade, summarize, validateAnswers, type Row } from './core.ts';
import { adminHtml } from './admin.ts';

type Env = { DB: D1Database; ALLOWED_ORIGIN: string; TEAM_DOMAIN: string; POLICY_AUD: string; ADMIN_EMAILS: string; RETENTION_DAYS: string };
const now = () => new Date().toISOString();
const json = (value: unknown, status = 200, headers: HeadersInit = {}) => { const responseHeaders=new Headers(headers);responseHeaders.set('Cache-Control','no-store');return Response.json(value,{status,headers:responseHeaders}); };
const fail = (message: string, status: number) => json({error:message},status);
const hash = async (token: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))).map(byte=>byte.toString(16).padStart(2,'0')).join('');
const rowsSql = 'SELECT s.id,s.started_at,s.quiz_version,c.number,c.completed_at,c.answers_json,c.item_results_json,c.total_score,c.recognition_score,c.protection_score,c.review_score FROM sessions s LEFT JOIN completions c ON c.session_id=s.id ORDER BY s.started_at';
const body = async (request:Request) => { if(Number(request.headers.get('content-length')??0)>12000)throw Error('資料過長。');const text=await request.text();if(text.length>12000)throw Error('資料過長。');return JSON.parse(text) as unknown; };

async function isAdmin(request:Request,env:Env) {
 if(!env.POLICY_AUD||!env.TEAM_DOMAIN||!env.ADMIN_EMAILS||env.POLICY_AUD.startsWith('REPLACE')||env.TEAM_DOMAIN.includes('REPLACE'))return false;
 const token=request.headers.get('Cf-Access-Jwt-Assertion');if(!token)return false;
 try {const issuer=new URL(env.TEAM_DOMAIN);if(issuer.protocol!=='https:'||!issuer.hostname.endsWith('.cloudflareaccess.com'))return false;
  const {payload}=await jwtVerify(token,createRemoteJWKSet(new URL('/cdn-cgi/access/certs',issuer)),{issuer:issuer.origin,audience:env.POLICY_AUD,algorithms:['RS256']});
  return typeof payload.email==='string'&&env.ADMIN_EMAILS.split(',').map(email=>email.trim().toLowerCase()).includes(payload.email.toLowerCase());
 } catch { return false; }
}

function csv(rows:Row[]) {
 const columns=['id','number','started_at','completed_at','quiz_version','answers_json','item_results_json','total_score','recognition_score','protection_score','review_score'] as const;
 const quote=(value:Row[keyof Row])=>'"'+String(value??'').replaceAll('"','""')+'"';
 return '\uFEFF'+columns.join(',')+'\r\n'+rows.map(row=>columns.map(column=>quote(row[column])).join(',')).join('\r\n')+'\r\n';
}

const worker = {
 async fetch(request:Request,env:Env):Promise<Response> {
  const url=new URL(request.url),path=url.pathname,method=request.method;
  if(path==='/admin'||path.startsWith('/api/admin/')) {
   if(!await isAdmin(request,env))return fail('管理者驗證失敗。',403);
   if(path==='/admin'&&method==='GET')return new Response(adminHtml,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; form-action 'none'; base-uri 'none'; frame-ancestors 'none'",'X-Content-Type-Options':'nosniff'}});
   if(path==='/api/admin/stats'&&method==='GET'){const {results}=await env.DB.prepare(rowsSql).all<Row>();return json(summarize(results));}
   if(path==='/api/admin/export'&&method==='GET'){const {results}=await env.DB.prepare(rowsSql).all<Row>();return new Response(csv(results),{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="footprint-quiz.csv"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
   if(path==='/api/admin/sessions'&&method==='DELETE') {
    if(request.headers.get('Origin')!==url.origin)return fail('來源不符。',403);
    let input:unknown;try{input=await body(request);}catch{return fail('格式錯誤。',400);}
    if(!input||typeof input!=='object'||Array.isArray(input))return fail('格式錯誤。',400);
    const params=input as Record<string,unknown>;
    if(params.all===true&&Object.keys(params).length===1)await env.DB.prepare('DELETE FROM sessions').run();
    else if(typeof params.before==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(params.before)&&!Number.isNaN(Date.parse(params.before))&&Object.keys(params).length===1)await env.DB.prepare('DELETE FROM sessions WHERE started_at < ?').bind(params.before+'T00:00:00.000Z').run();
    else return fail('刪除條件錯誤。',400);
    return json({ok:true});
   }
   return fail('找不到頁面。',404);
  }
  if(!path.startsWith('/api/'))return fail('找不到頁面。',404);
  const origin=request.headers.get('Origin');if(origin!==env.ALLOWED_ORIGIN)return fail('來源不符。',403);
  const cors={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization','Vary':'Origin','Cache-Control':'no-store'};
  if(method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  const result=(value:unknown,status=200)=>json(value,status,cors);
  try {
   if(path==='/api/start'&&method==='POST') {
    const input=await body(request) as {consent?:unknown};if(input?.consent!==true)return result({error:'請先同意。'},400);
    const id=crypto.randomUUID(),token=crypto.randomUUID()+crypto.randomUUID();
    await env.DB.prepare('INSERT INTO sessions(id,token_hash,consent,started_at,quiz_version) VALUES(?,?,1,?,?)').bind(id,await hash(token),now(),QUIZ_VERSION).run();
    return result({id,token,stage:'playing',quizVersion:QUIZ_VERSION});
   }
   const bearer=request.headers.get('Authorization');if(!bearer?.startsWith('Bearer '))return result({error:'測試紀錄驗證失敗。'},401);
   const token=bearer.slice(7);if(!/^[0-9a-f-]{72}$/.test(token))return result({error:'測試紀錄驗證失敗。'},401);
   const session=await env.DB.prepare('SELECT id,quiz_version FROM sessions WHERE token_hash=?').bind(await hash(token)).first<{id:string;quiz_version:string}>();
   if(!session)return result({error:'測試紀錄不存在或已刪除。'},401);
   const completed=await env.DB.prepare('SELECT number FROM completions WHERE session_id=?').bind(session.id).first<{number:number}>();
   if(path==='/api/session'&&method==='GET')return result({stage:completed?'done':'playing',number:completed?.number??null,quizVersion:session.quiz_version});
   if(path==='/api/complete'&&method==='POST') {
    if(completed)return result({stage:'done',number:completed.number});
    if(session.quiz_version!==QUIZ_VERSION)return result({error:'題庫版本已更新，請聯絡團隊。'},409);
    const input=await body(request) as {answers?:unknown};
    const answers=validateAnswers(input?.answers),{scores,items}=grade(answers);
    await env.DB.prepare('INSERT INTO completions(session_id,completed_at,answers_json,item_results_json,total_score,recognition_score,protection_score,review_score) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(session_id) DO NOTHING').bind(session.id,now(),JSON.stringify(answers),JSON.stringify(items),scores.total,...scores.parts).run();
    const saved=await env.DB.prepare('SELECT number FROM completions WHERE session_id=?').bind(session.id).first<{number:number}>();
    if(!saved)throw Error('儲存失敗。');return result({stage:'done',number:saved.number});
   }
   return result({error:'找不到頁面。'},404);
  } catch(error) {
   const message=error instanceof SyntaxError?'資料格式錯誤。':error instanceof Error?error.message:'';
   return ['資料格式錯誤。','資料過長。','答案格式錯誤。','請完成八題。','請選擇有效且不重複的答案。','本題為單選題，請選擇一個答案。','「以上皆無法確認」不能與其他選項同時選取。'].includes(message)?result({error:message},400):result({error:'服務暫時無法處理。'},500);
  }
 },
 async scheduled(_controller:ScheduledController,env:Env) {
  const days=Number(env.RETENTION_DAYS);if(!Number.isInteger(days)||days<1||days>3650)throw Error('RETENTION_DAYS 必須為 1–3650。');
  await env.DB.prepare('DELETE FROM sessions WHERE started_at < ?').bind(new Date(Date.now()-days*86400000).toISOString()).run();
 }
};

export default worker;
