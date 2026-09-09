import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initialState,transition,calculateScores,isCorrect,validateAnswer,type Question,type QuizState} from '../lib/quiz-engine.ts';
import {getAdvice,selfOptions,toggleSelfChoice,validateSelfChoices} from '../lib/self-check-engine.ts';
const questions:Question[]=JSON.parse(readFileSync(new URL('../data/questions.json',import.meta.url),'utf8'));
test('all eight questions have valid single/multiple answer contracts',()=>{
 assert.equal(questions.length,8);assert.deepEqual([0,1,2].map(stage=>questions.filter(q=>q.stage===stage).length),[4,3,1]);
 for(const q of questions){assert.ok(q.explanation);assert.equal(new Set(q.options.map(o=>o.id)).size,q.options.length);const right=q.options.filter(o=>o.correct).map(o=>o.id);validateAnswer(q,right);if(q.type==='single')assert.equal(right.length,1);for(const o of q.options)assert.ok(o.reason);}
});
test('each answer subset scores only when the exact correct set is selected',()=>{
 for(const q of questions){const expected=q.options.filter(o=>o.correct).map(o=>o.id).sort().join(',');
 for(let mask=0;mask<(1<<q.options.length);mask++){const ids=q.options.filter((_,i)=>mask&(1<<i)).map(o=>o.id);assert.equal(isCorrect(q,ids),[...ids].sort().join(',')===expected);}
 assert.equal(isCorrect(q,[...q.options.filter(o=>o.correct).map(o=>o.id),'unknown']),false);
 }
});
test('complete correct attempt returns 40+40+20=100, locks answers, and resets every field',()=>{
 let s=transition(initialState(),{type:'intro'},questions);s=transition(s,{type:'start'},questions);
 for(const q of questions){const ids=q.options.filter(o=>o.correct).map(o=>o.id);s=transition(s,{type:'submit',ids},questions);assert.throws(()=>transition(s,{type:'submit',ids},questions));assert.throws(()=>transition(s,{type:'select',id:ids[0]},questions));s=transition(s,{type:'next'},questions);}
 assert.equal(s.view,'self');assert.deepEqual(calculateScores(questions,s.answers),{parts:[40,40,20],total:100,rank:'防護高手'});
 s=transition(s,{type:'submit-self',ids:['route','routine']},questions);assert.equal(s.view,'result');assert.deepEqual(s.selfChoices,['route','routine']);assert.deepEqual(transition(s,{type:'reset'},questions),initialState());
});
test('incomplete and malformed answers cannot advance or corrupt state',()=>{
 const s=transition(initialState(),{type:'start'},questions);assert.throws(()=>transition(s,{type:'next'},questions));for(const ids of [[],['unknown'],['time','time']])assert.throws(()=>transition(s,{type:'submit',ids},questions));assert.deepEqual(s.answers,{});
 assert.throws(()=>validateAnswer(questions[2],['safe','same']));
 assert.throws(()=>validateAnswer(questions[7],['none','name']));
});
test('none selection is exclusive in both directions and can be unchecked',()=>{
 let s:QuizState={...initialState(),view:'quiz',index:7};
 s=transition(s,{type:'select',id:'name'},questions);s=transition(s,{type:'select',id:'none'},questions);assert.deepEqual(s.selected,['none']);s=transition(s,{type:'select',id:'location'},questions);assert.deepEqual(s.selected,['location']);s=transition(s,{type:'select',id:'location'},questions);assert.deepEqual(s.selected,[]);
});
test('all 256 correctness combinations sum displayed components exactly and respect tier boundaries',()=>{
 for(let mask=0;mask<256;mask++){const answers:Record<string,string[]>={};questions.forEach((q,i)=>{answers[q.id]=mask&(1<<i)?q.options.filter(o=>o.correct).map(o=>o.id):[];});const scores=calculateScores(questions,answers);assert.equal(scores.total,scores.parts.reduce((a,b)=>a+b,0));assert.ok(scores.total>=0&&scores.total<=100);assert.equal(scores.rank,scores.total>=80?'防護高手':scores.total>=60?'足跡觀察員':'線索待清理');}
 assert.equal(calculateScores(questions,{}).total,0);
});
test('self-check rejects invalid IDs, duplicates, empty selections and contradictory none',()=>{
 for(const ids of [[],['unknown'],['route','route'],['none','route']])assert.throws(()=>validateSelfChoices(ids));
 assert.throws(()=>transition(initialState(),{type:'submit-self',ids:['none']},questions));
 assert.throws(()=>transition(initialState(),{type:'select-self',id:'route'},questions));
 assert.throws(()=>transition(initialState(),{type:'review-self'},questions));
 assert.deepEqual(toggleSelfChoice(['route'],'none'),['none']);
 assert.deepEqual(toggleSelfChoice(['none'],'route'),['route']);
 assert.deepEqual(toggleSelfChoice(['none'],'none'),[]);
});
test('PRD combination rules A, B and C require both inputs and precede generic advice',()=>{
 for(const [ids,expected] of [[['route','routine'],'route-time'],[['school','username'],'school-account'],[['document','email'],'document-email']] as const){
  assert.equal(getAdvice([...ids])[0].id,expected);
  for(const id of ids)assert.ok(!getAdvice([id]).some(rule=>rule.id===expected));
 }
 assert.deepEqual(getAdvice(['route','routine','school','username','document','email']).slice(0,3).map(rule=>rule.id),['route-time','school-account','document-email']);
});
test('every valid self-check subset produces supported, deterministic advice with no risk score',()=>{
 assert.equal(selfOptions.length,12);
 for(let mask=1;mask<(1<<selfOptions.length);mask++){
  const ids=selfOptions.filter((_,i)=>mask&(1<<i)).map(option=>option.id);
  if(ids.includes('none')&&ids.length>1)continue;
  const advice=getAdvice(ids);assert.equal(new Set(advice.map(rule=>rule.category)).size,advice.length);
  assert.deepEqual(advice,getAdvice([...ids].reverse()));
  if(ids.includes('none'))assert.equal(advice.length,0);else assert.ok(advice.length>0);
  for(const rule of advice){assert.ok(rule.matchedLabels.length);assert.ok(rule.actions.length);assert.ok(!('score' in rule));}
 }
});
test('editing personal choices preserves quiz scores and reset clears personal choices too',()=>{
 const answers=Object.fromEntries(questions.map(q=>[q.id,q.options.filter(option=>option.correct).map(option=>option.id)]));
 let state:QuizState={...initialState(),view:'self',answers};
 const before=calculateScores(questions,state.answers);
 state=transition(state,{type:'submit-self',ids:['route','routine']},questions);
 state=transition(state,{type:'review-self'},questions);
 state=transition(state,{type:'select-self',id:'none'},questions);
 state=transition(state,{type:'submit-self'},questions);
 assert.deepEqual(state.selfChoices,['none']);assert.deepEqual(calculateScores(questions,state.answers),before);
 assert.deepEqual(transition(state,{type:'reset'},questions),initialState());
 assert.deepEqual(initialState().selfChoices,[]);
});
