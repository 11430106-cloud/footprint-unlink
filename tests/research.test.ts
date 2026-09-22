import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import worker from '../research/worker.ts';
import { banks, publicBank, type BankId } from '../research/banks.ts';
import { score, summarize, validateAnswers, validateSurvey, type Row } from '../research/core.ts';
import { adminHtml } from '../research/admin.ts';
import { Script } from 'node:vm';

const origin='https://11430106-cloud.github.io';
function database(){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec(readFileSync(new URL('../research/migrations/0001_sessions.sql',import.meta.url),'utf8'));
 return {
  sqlite,
  db:{prepare(sql:string){let args:unknown[]=[];return {bind(...values:unknown[]){args=values;return this;},first(){return sqlite.prepare(sql).get(...args as [])??null;},all(){return {results:sqlite.prepare(sql).all(...args as [])};},run(){const info=sqlite.prepare(sql).run(...args as []);return {meta:{changes:Number(info.changes)}};}};}}
 };
}
function env(db:ReturnType<typeof database>['db']){return {DB:db as never,ALLOWED_ORIGIN:origin,TEAM_DOMAIN:'https://study.cloudflareaccess.com',POLICY_AUD:'test-audience',ADMIN_EMAILS:'admin@example.org',RETENTION_DAYS:'90'};}
async function call(environment:ReturnType<typeof env>,path:string,method='GET',body?:unknown,token?:string,headers:Record<string,string>={}){
 const request=new Request('https://research.example.workers.dev'+path,{method,headers:{Origin:origin,...headers,...(token?{Authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body)});
 return worker.fetch(request,environment);
}
const correct=(bank:BankId)=>Object.fromEntries(banks[bank].items.map(item=>[item.id,item.category==='protection'?item.options.filter(o=>o.correct).slice(0,2).map(o=>o.id):[item.options.find(o=>o.correct)!.id]]));
const wrong=(bank:BankId)=>Object.fromEntries(banks[bank].items.map(item=>[item.id,[item.options.find(o=>!o.correct)!.id]]));
const survey={actions:['hide-route'],assistance:'minor',ease:4,problems:['none']};

test('banks have matched categories, private answers, and strict scoring',()=>{
 new Script(adminHtml.match(/<script type="module">([\s\S]*?)<\/script>/)![1]);
 assert.ok(banks.A.items.every((item,index)=>item.prompt!==banks.B.items[index].prompt));
 assert.notDeepEqual(banks.A.items[4].options.map(o=>o.id),banks.B.items[4].options.map(o=>o.id));
 for(const bank of ['A','B'] as const){assert.deepEqual(banks[bank].items.map(x=>x.category),['identity','location','time','link','protection']);assert.equal(score(bank,correct(bank)).clue,100);assert.equal(score(bank,correct(bank)).protection,true);assert.equal(JSON.stringify(publicBank(bank)).includes('correct'),false);assert.equal(score(bank,wrong(bank)).clue,0);assert.equal(score(bank,wrong(bank)).protection,false);assert.throws(()=>validateAnswers(bank,{...correct(bank),extra:['same']}));}
 assert.throws(()=>validateSurvey({...survey,actions:['none','hide-route']}));
});

test('consent, matched stages, retry, dropout, admin privacy, CSV and deletion',async()=>{
 const {db,sqlite}=database(),e=env(db);
 assert.equal((await call(e,'/api/start','POST',{consent:false})).status,400);
 assert.equal((await call(e,'/api/admin/stats')).status,403);
 assert.equal(summarize([]).ability.gainPoints,null);
 assert.equal((sqlite.prepare('SELECT COUNT(*) as n FROM sessions').get() as {n:number}).n,0);
 const first=await (await call(e,'/api/start','POST',{consent:true})).json() as {id:string;token:string;order:'AB'|'BA';bank:{version:string}};
 const pre:BankId=first.order==='AB'?'A':'B',post:BankId=first.order==='AB'?'B':'A';
 assert.equal(first.bank.version,banks[pre].version);
 assert.equal((await call(e,'/api/post','POST',{answers:correct(post)},first.token)).status,409);
 assert.equal((await call(e,'/api/pre','POST',{answers:wrong(pre)},first.token)).status,200);
 assert.equal((await call(e,'/api/pre','POST',{answers:wrong(pre)},first.token)).status,409);
 assert.equal((await call(e,'/api/experience','POST',{completed:true},first.token)).status,200);
 assert.equal((await call(e,'/api/post','POST',{answers:correct(post)},first.token)).status,200);
 assert.equal((await call(e,'/api/finish','POST',{survey},first.token)).status,200);
 assert.equal((await call(e,'/api/finish','POST',{survey},first.token)).status,409);
 const second=await (await call(e,'/api/start','POST',{consent:true})).json() as {token:string;order:'AB'|'BA'};
 await call(e,'/api/pre','POST',{answers:correct(second.order==='AB'?'A':'B')},second.token); // 中途退出
 const rows=sqlite.prepare('SELECT * FROM sessions ORDER BY started_at').all() as unknown as Row[];
 const summary=summarize(rows);
 assert.equal(summary.participation.started.count,2);assert.equal(summary.participation.pre.count,2);assert.equal(summary.participation.complete.count,1);assert.equal(summary.participation.paired.count,1);
 assert.equal(summary.participation.dropout.duringExperience.count,1);assert.equal(summary.ability.gainPoints,100);assert.equal(summary.protection.percent,100);assert.equal(summary.actionIntention.count,1);assert.equal(summary.operationUnderstanding.denominator,2);assert.equal(summary.operationUnderstanding.percent,50);
 assert.equal(summary.groups.AB.count+summary.groups.BA.count,2);
 // Mock the JWKS endpoint, but verify a real RS256 signature, audience, issuer and email allowlist.
 const {privateKey,publicKey}=await generateKeyPair('RS256');const jwk=await exportJWK(publicKey);jwk.kid='test-key';jwk.use='sig';jwk.alg='RS256';
 const jwt=await new SignJWT({email:'admin@example.org'}).setProtectedHeader({alg:'RS256',kid:'test-key'}).setIssuer(e.TEAM_DOMAIN).setAudience(e.POLICY_AUD).setIssuedAt().setExpirationTime('5m').sign(privateKey);
 const originalFetch=globalThis.fetch;globalThis.fetch=(async ()=>Response.json({keys:[jwk]})) as typeof fetch;
 try{
  const head={'Cf-Access-Jwt-Assertion':jwt};
  const stats=await call(e,'/api/admin/stats','GET',undefined,undefined,head);assert.equal(stats.status,200);assert.equal((await stats.json() as typeof summary).participation.started.count,2);
  const exportResponse=await call(e,'/api/admin/export','GET',undefined,undefined,head);assert.equal(exportResponse.status,200);const csv=await exportResponse.text();assert.equal(csv.split('\r\n').length-2,summary.participation.started.count);assert.ok(csv.includes(first.id));
  assert.equal((await call(e,'/api/admin/sessions','DELETE',{all:true},undefined,head)).status,403); // wrong Origin on destructive request
  const deleteRequest=new Request('https://research.example.workers.dev/api/admin/sessions',{method:'DELETE',headers:{...head,Origin:'https://research.example.workers.dev'},body:JSON.stringify({all:true})});
  assert.equal((await worker.fetch(deleteRequest,e)).status,200);
  assert.equal((sqlite.prepare('SELECT COUNT(*) as n FROM sessions').get() as {n:number}).n,0);
 }finally{globalThis.fetch=originalFetch;sqlite.close();}
});
