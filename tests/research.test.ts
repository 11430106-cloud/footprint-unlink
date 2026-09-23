import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { Script } from 'node:vm';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import worker from '../research/worker.ts';
import { questions, grade, summarize, validateAnswers, type Row } from '../research/core.ts';
import { adminHtml } from '../research/admin.ts';

const origin='https://11430106-cloud.github.io';
const correct=Object.fromEntries(questions.map(q=>[q.id,q.options.filter(o=>o.correct).map(o=>o.id)]));
const wrong=Object.fromEntries(questions.map(q=>[q.id,[q.options.find(o=>!o.correct)?.id??q.options[0].id]]));
function database(){
 const sqlite=new DatabaseSync(':memory:');
 sqlite.exec('PRAGMA foreign_keys=ON');
 sqlite.exec(readFileSync(new URL('../research/migrations/0001_single_quiz.sql',import.meta.url),'utf8'));
 return {sqlite,db:{prepare(sql:string){let args:unknown[]=[];return {bind(...values:unknown[]){args=values;return this;},first(){return sqlite.prepare(sql).get(...args as [])??null;},all(){return {results:sqlite.prepare(sql).all(...args as [])};},run(){const info=sqlite.prepare(sql).run(...args as []);return {meta:{changes:Number(info.changes)}};}};}}};
}
function env(db:ReturnType<typeof database>['db']){return {DB:db as never,ALLOWED_ORIGIN:origin,TEAM_DOMAIN:'https://study.cloudflareaccess.com',POLICY_AUD:'test-audience',ADMIN_EMAILS:'admin@example.org',RETENTION_DAYS:'90'};}
async function call(environment:ReturnType<typeof env>,path:string,method='GET',payload?:unknown,token?:string,headers:Record<string,string>={}){
 const init:RequestInit={method,headers:{Origin:origin,...headers,...(token?{Authorization:'Bearer '+token}:{})}};if(payload!==undefined)init.body=JSON.stringify(payload);
 return worker.fetch(new Request('https://research.example.workers.dev'+path,init),environment);
}
const count=(sqlite:DatabaseSync,table:'sessions'|'completions')=>(sqlite.prepare('SELECT COUNT(*) AS n FROM '+table).get() as {n:number}).n;

void test('same eight questions are graded on the server, with strict answer validation',()=>{
 new Script(adminHtml.match(/<script type="module">([\s\S]*?)<\/script>/)![1]);
 assert.equal(questions.length,8);
 assert.equal(grade(validateAnswers(correct)).scores.total,100);
 assert.equal(grade(validateAnswers(wrong)).scores.total,0);
 assert.throws(()=>validateAnswers({...correct,extra:['x']}));
 assert.throws(()=>validateAnswers({...correct,[questions[0].id]:['invalid']}));
 assert.equal(summarize([]).score.average,null);
});

void test('consent, completion number, retry, dropout, protected stats, CSV and deletion',async()=>{
 const {db,sqlite}=database(),e=env(db);
 try{
  assert.equal((await call(e,'/api/start','POST',{consent:false})).status,400);
  assert.equal((await call(e,'/api/complete','POST',{answers:correct})).status,401);
  assert.equal((await call(e,'/api/admin/stats')).status,403);
  assert.equal(count(sqlite,'sessions'),0);
  const first=await (await call(e,'/api/start','POST',{consent:true})).json() as {id:string;token:string;stage:string};
  assert.equal(first.stage,'playing');assert.equal(count(sqlite,'sessions'),1);assert.equal(count(sqlite,'completions'),0);
  assert.equal((await call(e,'/api/complete','POST',{answers:{...correct,extra:['x']}},first.token)).status,400);
  const completed=await (await call(e,'/api/complete','POST',{answers:correct},first.token)).json() as {number:number};
  assert.equal(completed.number,1);
  assert.equal((await (await call(e,'/api/complete','POST',{answers:correct},first.token)).json() as {number:number}).number,1);
  assert.equal((await (await call(e,'/api/session','GET',undefined,first.token)).json() as {number:number}).number,1);
  assert.equal(count(sqlite,'completions'),1);
  await call(e,'/api/start','POST',{consent:true});
  const third=await (await call(e,'/api/start','POST',{consent:true})).json() as {token:string};
  assert.equal((await (await call(e,'/api/complete','POST',{answers:wrong},third.token)).json() as {number:number}).number,2);
  const rows=sqlite.prepare('SELECT s.id,s.started_at,s.quiz_version,c.number,c.completed_at,c.answers_json,c.item_results_json,c.total_score,c.recognition_score,c.protection_score,c.review_score FROM sessions s LEFT JOIN completions c ON c.session_id=s.id').all() as unknown as Row[];
  const summary=summarize(rows);
  assert.deepEqual(summary.participation.completed,{count:2,denominator:3,percent:66.7});
  assert.deepEqual(summary.participation.dropout,{count:1,denominator:3,percent:33.3});
  assert.equal(summary.score.average,50);assert.equal(summary.items.length,8);
  const {privateKey,publicKey}=await generateKeyPair('RS256');const jwk=await exportJWK(publicKey);jwk.kid='test-key';jwk.use='sig';jwk.alg='RS256';
  const jwt=await new SignJWT({email:'admin@example.org'}).setProtectedHeader({alg:'RS256',kid:'test-key'}).setIssuer(e.TEAM_DOMAIN).setAudience(e.POLICY_AUD).setIssuedAt().setExpirationTime('5m').sign(privateKey);
  const originalFetch=globalThis.fetch;globalThis.fetch=(async ()=>Response.json({keys:[jwk]})) as typeof fetch;
  try{
   const headers={'Cf-Access-Jwt-Assertion':jwt};
   const stats=await call(e,'/api/admin/stats','GET',undefined,undefined,headers);assert.equal(stats.status,200);
   assert.deepEqual((await stats.json() as typeof summary).participation,summary.participation);
   const exported=await call(e,'/api/admin/export','GET',undefined,undefined,headers);assert.equal(exported.status,200);
   const csv=await exported.text();assert.equal(csv.split('\r\n').length-2,summary.participation.started.count);assert.ok(csv.includes(first.id));
   assert.equal((await call(e,'/api/admin/sessions','DELETE',{all:true},undefined,headers)).status,403);
   const deleteRequest=new Request('https://research.example.workers.dev/api/admin/sessions',{method:'DELETE',headers:{...headers,Origin:'https://research.example.workers.dev'},body:JSON.stringify({all:true})});
   assert.equal((await worker.fetch(deleteRequest,e)).status,200);
   assert.equal(count(sqlite,'sessions'),0);assert.equal(count(sqlite,'completions'),0);
  }finally{globalThis.fetch=originalFetch;}
 }finally{sqlite.close();}
});
