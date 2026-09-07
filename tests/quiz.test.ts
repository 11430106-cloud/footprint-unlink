import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initialState,transition,calculateScores,isCorrect,validateAnswer,type Question,type QuizState} from '../lib/quiz-engine.ts';
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
 assert.equal(s.view,'result');assert.deepEqual(calculateScores(questions,s.answers),{parts:[40,40,20],total:100,rank:'斷鏈高手'});assert.deepEqual(transition(s,{type:'reset'},questions),initialState());
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
 for(let mask=0;mask<256;mask++){const answers:Record<string,string[]>={};questions.forEach((q,i)=>{answers[q.id]=mask&(1<<i)?q.options.filter(o=>o.correct).map(o=>o.id):[q.options.find(o=>!o.correct)!.id];});const scores=calculateScores(questions,answers);assert.equal(scores.total,scores.parts.reduce((a,b)=>a+b,0));assert.ok(scores.total>=0&&scores.total<=100);assert.equal(scores.rank,scores.total>=80?'斷鏈高手':scores.total>=60?'足跡觀察員':'線索待清理');}
 assert.equal(calculateScores(questions,{}).total,0);
});
