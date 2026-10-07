import test from 'node:test';import assert from 'node:assert/strict';import { Script } from 'node:vm';
import { generateKeyPair,exportJWK,SignJWT } from 'jose';
import worker from '../research/worker.ts';import { studyAdminHtml } from '../research/study-admin.ts';
import { banks,bankVersion,type Form } from '../research/banks.ts';
import { summarizeStudy,validateSurvey,gradeTest,toggleExclusive,studyCsv } from '../research/paired-core.ts';
import { emptyMetadata,presentationText,redact } from '../research/presentation.ts';import { answers,fixture,database,seed } from './paired-fixtures.ts';
import { questions } from '../research/core.ts';
const rows=Array.from({length:12},(_,i)=>fixture(i,i<6?'AB':'BA'));
void test('A/B bank structure, scoring, matched capabilities and no exam-answer script leaks',()=>{
 new Script(studyAdminHtml.match(/<script type="module">([\s\S]*?)<\/script>/)![1]);
 for(const form of ['A','B'] as const){assert.equal(banks[form].length,5);assert.deepEqual(banks[form].map(q=>q.category),[0,1,2,3,4]);assert.equal(gradeTest(form,answers(form)).recognition,100);assert.equal(gradeTest(form,answers(form,0)).recognition,0);const partial=answers(form);partial[form+'5']=['1','2'];assert.equal(gradeTest(form,partial).protection,true);partial[form+'5']=['1','2','4'];assert.equal(gradeTest(form,partial).protection,false);assert.throws(()=>gradeTest(form,{...answers(form),extra:['1']}));}
 assert.notDeepEqual(banks.A.map(q=>q.prompt),banks.B.map(q=>q.prompt));
});
void test('12 paired completions, all denominators, 20 percentage-point and 80/70 percent thresholds',()=>{
 const s=summarizeStudy(rows);assert.equal(s.participation.completed.count,12);assert.equal(s.participation.paired.count,12);assert.equal(s.recognition.pre.percent,50);assert.equal(s.recognition.post.percent,75);assert.equal(s.recognition.meanChange,25);assert.equal(s.recognition.met,true);
 assert.deepEqual(s.protection,{count:10,denominator:12,percent:83.3,threshold:80,met:true});assert.deepEqual(s.actionIntent,{count:9,denominator:12,percent:75,threshold:70,met:true});assert.equal(s.operation.count,10);assert.equal(s.operation.denominator,12);assert.equal(s.operation.met,true);assert.deepEqual(s.orders.map(o=>o.started.count),[6,6]);assert.equal(s.duration.medianMinutes,6.5);
 assert.deepEqual(s.recognition.categories.map(c=>[c.pre.count,c.post.count,c.change]),[[12,12,0],[12,12,0],[0,12,100],[0,0,0]]);assert.equal(s.recognition.improved.count,12);assert.equal(s.items.filter(i=>i.category===0).reduce((n,i)=>n+i.options.reduce((m,o)=>m+o.count,0),0),24);
 const fail=rows.map(r=>structuredClone(r));for(const i of [8,9]){const q=fail[i].steps.find(s=>s.stage==='post')!;q.answers_json=JSON.stringify(answers(q.form!,3,false));}fail[8].steps.find(s=>s.stage==='survey')!.answers_json=JSON.stringify({actions:['none'],assistance:'repeated',usability:3,problems:['none'],feedback:''});assert.equal(summarizeStudy(fail).protection.met,false);assert.equal(summarizeStudy(fail).actionIntent.met,false);
});
void test('dropouts retained in start denominator; no incomplete or mismatched exams enter paired effects',()=>{
 const drops=[0,1,2].map((count,i)=>{const r=fixture(20+i);r.completed_at=null;r.stage=['pre','learning','post'][i];r.steps=r.steps.slice(0,count);return r;});
 const s=summarizeStudy([...rows,...drops]);assert.equal(s.participation.started.count,15);assert.equal(s.participation.paired.count,12);assert.equal(s.operation.denominator,15);assert.equal(s.operation.met,false);assert.deepEqual(s.participation.dropouts.map(d=>d.count),[1,1,1,0]);
 const mismatch=fixture(30);mismatch.steps.find(s=>s.stage==='post')!.bank_version=bankVersion('A');mismatch.form_order='AB';assert.equal(summarizeStudy([mismatch]).participation.paired.count,0);
 assert.equal(summarizeStudy([mismatch]).participation.completed.count,1);
 const noSurvey=fixture(31);noSurvey.completed_at=null;noSurvey.stage='survey';noSurvey.steps.pop();const p=summarizeStudy([noSurvey]);assert.equal(p.participation.paired.count,0);assert.equal(p.operation.count,0);assert.equal(p.actionIntent.count,0);assert.equal(p.participation.completed.count,0);assert.equal(p.participation.dropouts[3].count,1);assert.equal(p.recognition.meanChange,null);assert.match(studyCsv([noSurvey]),/,"survey","true","true","true","false","false","false"/);
});
void test('none option is exclusive; gains/steady/decline and empty states are not fake scores',()=>{
 assert.deepEqual(toggleExclusive(['route'],'none','none'),['none']);assert.deepEqual(toggleExclusive(['none'],'route','none'),['route']);assert.throws(()=>validateSurvey({actions:['none','route'],assistance:'none',usability:4,problems:['none'],feedback:''}));
 const rs=[fixture(0),fixture(1),fixture(2)];rs[1].steps.find(s=>s.stage==='post')!.answers_json=JSON.stringify(answers('B',2));rs[2].steps.find(s=>s.stage==='post')!.answers_json=JSON.stringify(answers('B',1));const s=summarizeStudy(rs);assert.deepEqual([s.recognition.improved.count,s.recognition.steady.count,s.recognition.declined.count],[1,1,1]);assert.equal(s.recognition.meanChange,0);
 const empty=summarizeStudy([]);assert.equal(empty.recognition.pre.percent,null);assert.equal(empty.recognition.meanChange,null);assert.equal(empty.protection.met,null);assert.doesNotMatch(presentationText(empty,emptyMetadata(),new Date().toISOString()),/NaN|undefined|<[^>]+>/);assert.match(presentationText(empty,emptyMetadata(),new Date().toISOString()),/尚無資料/);
});
void test('presentation whitelist, moderator-reviewed feedback, redaction and CSV without participant identifiers',()=>{
 const s=summarizeStudy(rows),m=emptyMetadata(),text=presentationText(s,m,new Date().toISOString());assert.match(text,/25 百分點/);assert.match(text,/83.3%（10\/12人）/);assert.match(text,/75%（9\/12人）/);assert.match(text,/【匿名回饋】\n未提供/);
 for(const r of rows)assert.ok(!text.includes(r.id));assert.doesNotMatch(text,/王小明|示例高中|a\.person|0912345678|private_name|token_hash|ADMIN_EMAILS|api.key|<[^>]+>/i);
 m.feedback=[{approved:true,text:'姓名：王小明，示例高中，a.person@example.org，0912345678，@private_name。操作步驟需要更清楚。'}];assert.ok(!presentationText(s,m,new Date().toISOString()).includes('操作步驟需要更清楚'));m.privacyReviewed=true;const approved=presentationText(s,m,new Date().toISOString());assert.match(approved,/操作步驟需要更清楚/);assert.doesNotMatch(approved,/王小明|示例高中|a\.person|0912345678|private_name/);
 assert.ok(redact('<script>x</script>')==='x');const csv=studyCsv(rows);assert.equal(csv.split('\r\n').length-2,12);for(const row of rows)assert.ok(!csv.includes(row.id));assert.doesNotMatch(csv,/王小明|a\.person|0912345678/);
 assert.equal(redact('2026-10-07'),'2026-10-07');assert.doesNotMatch(redact('192.168.10.15'),/192\.168/);
});
void test('real API state machine, start and stage retries, consent, learning validation, migration keeps legacy data',async()=>{
 const {DB,sqlite}=database(),env={DB,ALLOWED_ORIGIN:'https://test.example',TEAM_DOMAIN:'https://test.cloudflareaccess.com',POLICY_AUD:'test',ADMIN_EMAILS:'admin@example.org',RETENTION_DAYS:'90',STUDY_ENABLED:'true'};
 const call=(path:string,input?:unknown,token?:string)=>worker.fetch(new Request('https://backend.example/api/study/'+path,{method:input===undefined?'GET':'POST',headers:{Origin:env.ALLOWED_ORIGIN,...(token?{Authorization:'Bearer '+token}:{})},...(input===undefined?{}:{body:JSON.stringify(input)})}),env);
 try{sqlite.prepare('INSERT INTO sessions VALUES(?,?,1,?,?)').run('legacy','legacy-hash',new Date().toISOString(),'quiz-v1');
  assert.equal((await call('start',{consent:false})).status,400);assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM study_sessions').get()!.n,0);assert.equal((await call('session')).status,401);
  const token='a'.repeat(64),requestId=crypto.randomUUID(),start={consent:true,requestId,token};const first=await (await call('start',start)).json() as {id:string;order:'AB'|'BA'};const retried=await (await call('start',start)).json() as {id:string};assert.equal(first.id,retried.id);assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM study_sessions').get()!.n,1);
  assert.equal((await call('submit',{stage:'post',answers:answers('B')},token)).status,409);
  const before=await (await call('session',undefined,token)).json();assert.ok(!JSON.stringify(before).includes('"correct"'));assert.ok(!JSON.stringify(before).includes('recognition'));
  for(const stage of ['pre','learning','post','survey']){const input=stage==='learning'?{stage,reviewCompleted:true,answers:Object.fromEntries(questions.map(q=>[q.id,q.options.filter(o=>o.correct).map(o=>o.id)]))}:stage==='survey'?{stage,answers:{actions:['route'],assistance:'none',usability:4,problems:['none'],feedback:''}}:{stage,answers:answers(first.order[stage==='pre'?0:1] as Form)};
   if(stage==='learning')assert.equal((await call('submit',{...input,reviewCompleted:false},token)).status,400);
   if(stage==='survey'){assert.equal((await call('draft',{stage,answers:{actions:['none','route'],assistance:'',usability:0,problems:[],feedback:''}},token)).status,400);assert.equal((await call('draft',{stage,answers:{actions:[],assistance:'',usability:0,problems:[],feedback:''}},token)).status,200);assert.equal((await call('draft',{stage,answers:{actions:['unexpected'],assistance:'',usability:0,problems:[],feedback:''}},token)).status,400);}
   assert.equal((await call('submit',input,token)).status,200);assert.equal((await call('submit',input,token)).status,200);
  }
  assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM study_steps').get()!.n,4);assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM sessions').get()!.n,1);
  const all=await (await call('session',undefined,token)).json() as {stage:string};assert.equal(all.stage,'done');
  assert.equal((await worker.fetch(new Request('https://backend.example/api/study/start',{method:'POST',headers:{Origin:env.ALLOWED_ORIGIN},body:JSON.stringify({...start,requestId:crypto.randomUUID(),token:'b'.repeat(64)})}),{...env,STUDY_ENABLED:'false'})).status,503);
  assert.equal((await call('start',{consent:true,requestId:crypto.randomUUID(),token:'b'.repeat(64),oversized:'x'.repeat(50000)})).status,400);
 }finally{sqlite.close();}
});
void test('backend-protected new stats/report/export/metadata and newest snapshot equals presentation numbers',async()=>{
 const {DB,sqlite}=database(),env={DB,ALLOWED_ORIGIN:'https://test.example',TEAM_DOMAIN:'https://admin-test.cloudflareaccess.com',POLICY_AUD:'test',ADMIN_EMAILS:'admin@example.org',RETENTION_DAYS:'90',STUDY_ENABLED:'false'};
 const {privateKey,publicKey}=await generateKeyPair('RS256'),jwk=await exportJWK(publicKey);Object.assign(jwk,{kid:'test',use:'sig',alg:'RS256'});const jwt=await new SignJWT({email:env.ADMIN_EMAILS}).setProtectedHeader({alg:'RS256',kid:'test'}).setIssuer(env.TEAM_DOMAIN).setAudience(env.POLICY_AUD).setExpirationTime('5m').sign(privateKey);
 const originalFetch=globalThis.fetch;globalThis.fetch=async()=>Response.json({keys:[jwk]});
 const call=(path:string,token?:string,input?:unknown)=>worker.fetch(new Request('https://backend.example'+path,{method:input===undefined?'GET':'PUT',headers:{Origin:'https://backend.example',...(token?{'Cf-Access-Jwt-Assertion':token}:{})},...(input===undefined?{}:{body:JSON.stringify(input)})}),env);
 try{for(const path of ['/admin','/api/admin/study/stats','/api/admin/study/export','/api/admin/study/report'])assert.equal((await call(path)).status,403);assert.equal((await call('/api/admin/study/metadata',undefined,{revision:0,content:emptyMetadata()})).status,403);
  for(const row of rows)seed(sqlite,row);const response=await call('/api/admin/study/stats',jwt);assert.equal(response.status,200);const s=await response.json() as ReturnType<typeof summarizeStudy>&{presentationText:string};assert.equal(s.participation.paired.count,12);assert.match(s.presentationText,/83.3%（10\/12人）/);
  const saved=await call('/api/admin/study/metadata',jwt,{revision:0,content:{...emptyMetadata(),source:'同齡自願參與者',privacyReviewed:true}});assert.equal(saved.status,200);assert.equal((await call('/api/admin/study/metadata',jwt,{revision:0,content:emptyMetadata()})).status,409);
  const text=await (await call('/api/admin/study/report',jwt)).text();assert.match(text,/同齡自願參與者/);assert.doesNotMatch(text,/admin@example\.org/);const exported=await (await call('/api/admin/study/export',jwt)).text();assert.equal(exported.split('\r\n').length-2,12);
  seed(sqlite,fixture(13));const newest=await (await call('/api/admin/study/stats',jwt)).json() as {participation:{started:{count:number}};presentationText:string};assert.equal(newest.participation.started.count,13);assert.match(newest.presentationText,/開始測試：100%（13\/13人）/);
  const deleteRequest=(token?:string,origin='https://backend.example')=>worker.fetch(new Request('https://backend.example/api/admin/study/session',{method:'DELETE',headers:{Origin:origin,...(token?{'Cf-Access-Jwt-Assertion':token}:{})},body:JSON.stringify({id:rows[0].id,confirm:'刪除此匿名紀錄'})}),env);
  assert.equal((await deleteRequest()).status,403);assert.equal((await deleteRequest(jwt,'https://evil.example')).status,403);assert.equal((await deleteRequest(jwt)).status,200);assert.equal((await deleteRequest(jwt)).status,200);assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM study_sessions').get()!.n,12);assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM study_steps WHERE session_id=?').get(rows[0].id)!.n,0);
 }finally{globalThis.fetch=originalFetch;sqlite.close();}
});
