'use client';
import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { ArrowRight, ArrowLeft, Fingerprint, MapPin, Clock3, Link2, ShieldCheck, ScanLine, Check, CircleHelp, RotateCcw, BookOpen, CircleCheck, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { Welcome } from '@/components/welcome';
import { Evidence, ConnectionDiagram } from '@/components/evidence';
import { Checklist } from '@/components/checklist';
import { Tutorial } from '@/components/tutorial';
import { SelfCheck, PersonalAdvice } from '@/components/self-check';
import { getAdvice, selfOptions } from '@/lib/self-check-engine';
import questionData from '@/data/questions.json';
import { calculateScores, initialState, isCorrect, transition, type Action, type Question } from '@/lib/quiz-engine';

const questions:Question[]=questionData;
const stages=[{name:'辨識',label:'發現公開線索',Icon:Fingerprint},{name:'斷鏈',label:'選擇防護方式',Icon:Link2},{name:'回查',label:'換個視角檢查',Icon:ScanLine}];
type Tool={name:string;title:string;description:string;inputSchema:object;annotations:{readOnlyHint:boolean;untrustedContentHint:boolean};execute:(input:unknown)=>unknown};
type ModelDocument=Document&{modelContext?:{registerTool:(tool:Tool,options:{signal:AbortSignal})=>void|Promise<void>}};

export default function Home() {
 const [state,setState]=useState(initialState);
 const [overlay,setOverlay]=useState<'checklist'|'tutorial'|null>(null);
 const stateRef=useRef(state);stateRef.current=state;
 const [error,setError]=useState('');
 const focusRef=useRef<HTMLDivElement>(null);
 const feedbackRef=useRef<HTMLDivElement>(null);
 const q=questions[state.index];
 const scores=calculateScores(questions,state.answers);
 function act(action:Action) {try{const next=transition(stateRef.current,action,questions);stateRef.current=next;setState(next);setError('');}catch(e){setError(e instanceof Error?e.message:'請再試一次。');}}
 useEffect(()=>{window.scrollTo({top:0,behavior:'instant'});focusRef.current?.focus({preventScroll:true});},[state.view,state.index,overlay]);
 useEffect(()=>{if(state.submitted&&state.view==='quiz'){feedbackRef.current?.focus({preventScroll:true});feedbackRef.current?.scrollIntoView({block:'nearest'});}},[state.submitted,state.view]);

 useEffect(()=>{
  const context=(document as ModelDocument).modelContext;
  if(!context?.registerTool)return;
  const lifecycle=new AbortController();
  const schema={type:'object',properties:{},additionalProperties:false};
  const snapshot=()=>{const s=stateRef.current;const current=questions[s.index];return {view:s.view,question:s.view==='quiz'?{number:s.index+1,id:current.id,prompt:current.prompt,type:current.type,options:current.options.map(({id,text})=>({id,text})),selected:s.selected,submitted:s.submitted}:null,completed:Object.keys(s.answers).length,selfCheck:s.view==='self'?{options:selfOptions,selected:s.selfChoices}:null,advice:s.view==='result'?getAdvice(s.selfChoices):null,scores:s.view==='result'?calculateScores(questions,s.answers):null};};
  const run=(action:Action)=>{const next=transition(stateRef.current,action,questions);flushSync(()=>{setState(next);setOverlay(null);});stateRef.current=next;return snapshot();};
  const definitions:Tool[]=[
   {name:'read_quiz_state',title:'查看測驗進度',description:'Read the current fictional quiz question, selected options and completion state. Does not change answers.',inputSchema:schema,annotations:{readOnlyHint:true,untrustedContentHint:false},execute:()=>snapshot()},
   {name:'start_quiz',title:'開始辨識測驗',description:'Start the eight-question quiz from the home or instruction screen. Does not reset an active attempt.',inputSchema:schema,annotations:{readOnlyHint:false,untrustedContentHint:false},execute:()=>run({type:'start'})},
   {name:'submit_quiz_answer',title:'送出本題答案',description:'Submit and lock the supplied option IDs for the current question, then display the same feedback as the Confirm answer button.',inputSchema:{type:'object',properties:{optionIds:{type:'array',items:{type:'string'},minItems:1,uniqueItems:true}},required:['optionIds'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:(input)=>{if(!input||typeof input!=='object'||!('optionIds'in input)||!Array.isArray(input.optionIds)||input.optionIds.some(x=>typeof x!=='string'))throw new Error('optionIds 必須是選項 ID 陣列。');return run({type:'submit',ids:input.optionIds});}},
   {name:'next_quiz_question',title:'前往下一題或自我檢核',description:'Advance only after the current answer has been submitted. The final question advances to the personal self-check.',inputSchema:schema,annotations:{readOnlyHint:false,untrustedContentHint:false},execute:()=>run({type:'next'})},
   {name:'submit_self_check',title:'完成自我檢核',description:'Submit information-type IDs from the self-check screen and show personal review advice with quiz results. Does not accept actual personal information.',inputSchema:{type:'object',properties:{optionIds:{type:'array',items:{type:'string',enum:selfOptions.map(option=>option.id)},minItems:1,uniqueItems:true}},required:['optionIds'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:(input)=>{if(!input||typeof input!=='object'||!('optionIds'in input)||!Array.isArray(input.optionIds)||input.optionIds.some(x=>typeof x!=='string'))throw new Error('請提供資訊類型 ID 陣列。');return run({type:'submit-self',ids:input.optionIds});}},
   {name:'reset_quiz',title:'清空本次測驗',description:'Clear all answers and scores and return to the start screen. Only use when the user wants to restart.',inputSchema:schema,annotations:{readOnlyHint:false,untrustedContentHint:false},execute:()=>run({type:'reset'})}
  ];
  for(const tool of definitions)try{void Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}
  return ()=>lifecycle.abort();
 },[]);

 return <div className="site-shell">
 <a className="skip-link" href="#main-content">跳至主要內容</a>
 <header className="site-header"><div className="brand"><span className="brand-mark"><ScanLine size={25}/></span><span>足跡斷鏈<small>FOOTPRINT / UNLINK</small></span></div><Button variant="ghost" className="help-button" onClick={()=>setOverlay(overlay==='tutorial'?null:'tutorial')}><CircleHelp size={18}/><span>使用教學</span></Button></header>
 <div id="main-content" ref={focusRef} tabIndex={-1} className="content-focus">
 {overlay==='checklist'?<Checklist onBack={()=>setOverlay(null)}/>:overlay==='tutorial'?<Tutorial onBack={()=>setOverlay(null)} onChecklist={()=>setOverlay('checklist')}/>:<>
 {state.view==='home'&&<Welcome onStart={()=>act({type:'intro'})}/>}
 {state.view==='intro'&&<main className="intro-main"><div className="case-label"><span className="signal"/> 任務簡報 <span>CASE 001</span></div><h1>看見線索之間的連結。</h1><p className="lead">你將觀察虛構角色「沈有稜」留下的公開資料，<br className="desktop-break"/>依序完成辨識、斷鏈與回查，再把方法帶回自己。</p><div className="clue-grid">{[{Icon:Fingerprint,title:'身分',copy:'姓名、學校、信箱、照片、學號'},{Icon:MapPin,title:'位置',copy:'運動路線、住家附近、固定起訖點'},{Icon:Clock3,title:'時間',copy:'上課、通勤、運動的固定時段'},{Icon:Link2,title:'關聯',copy:'相同帳號、頭像、簡介或朋友'}].map(({Icon,title,copy})=><div className="clue-item" key={title}><Icon/><h2>{title}</h2><p>{copy}</p></div>)}</div><div className="instruction-note"><Lightbulb size={23}/><div><strong>先看資料，再下判斷。</strong><p>每題標示單選或複選；確認答案後會顯示解說。複選需完整答對才得分，沒有時間限制。</p></div></div><div className="button-row"><Button variant="ghost" className="text-button" onClick={()=>act({type:'reset'})}><ArrowLeft/>返回首頁</Button><Button className="primary-button" onClick={()=>act({type:'start'})}>開始辨識 <ArrowRight/></Button></div></main>}
 {state.view==='quiz'&&<main className="quiz-main"><nav className="stage-nav" aria-label="測驗階段">{stages.map(({name,label,Icon},i)=><div className={q.stage===i?'current':q.stage>i?'completed':''} aria-current={q.stage===i?'step':undefined} key={name}><span className="stage-icon">{q.stage>i?<Check size={19}/>:<Icon size={19}/>}</span><div><strong>0{i+1} {name}</strong><small>{label}</small></div></div>)}</nav><div className="progress-caption"><span>作答進度</span><span>{Object.keys(state.answers).length} / 8 題已完成</span></div><Progress value={Object.keys(state.answers).length/8*100} aria-label="測驗完成進度" className="quiz-progress"/><section className="quiz-heading"><div className="eyebrow">問題 {String(state.index+1).padStart(2,'0')} / 08 <span className="question-topic">{q.title}</span></div><h1>{q.prompt}</h1><p>{q.hint}</p></section><div className="quiz-grid"><Evidence kind={q.cards}/><section className="question-panel" aria-label="答案與解說"><form onSubmit={e=>{e.preventDefault();if(!state.submitted)act({type:'submit'});}}><div className="choice-heading"><strong>{q.type==='single'?'單選題':'複選題'}</strong><span>{q.type==='single'?'請選 1 項':'請選出所有符合的項目'}</span></div>
 {q.type==='single'?<RadioGroup aria-label={q.prompt} disabled={state.submitted} value={state.selected[0]??null} onValueChange={value=>{if(typeof value==='string')act({type:'select',id:value});}} className="answer-list">{q.options.map((o,i)=><label key={o.id} className={'answer-option '+(state.selected.includes(o.id)?'selected ':'')+(state.submitted&&o.correct?'correct ':'')+(state.submitted&&state.selected.includes(o.id)&&!o.correct?'incorrect':'')}><RadioGroupItem value={o.id}/><span><small className="option-letter">{String.fromCharCode(65+i)}</small>{o.text}{state.submitted&&o.correct&&<strong className="answer-tag"><Check size={13}/>正確答案</strong>}</span></label>)}</RadioGroup>:<div className="answer-list" role="group" aria-label={q.prompt}>{q.options.map((o,i)=><label key={o.id} className={'answer-option '+(state.selected.includes(o.id)?'selected ':'')+(state.submitted&&o.correct?'correct ':'')+(state.submitted&&state.selected.includes(o.id)&&!o.correct?'incorrect':'')}><Checkbox disabled={state.submitted} checked={state.selected.includes(o.id)} onCheckedChange={()=>act({type:'select',id:o.id})}/><span><small className="option-letter">{String.fromCharCode(65+i)}</small>{o.text}{state.submitted&&o.correct&&<strong className="answer-tag"><Check size={13}/>正確答案</strong>}</span></label>)}</div>}
 {!state.submitted&&<><p className="selection-note">{q.exclusive?'「目前無法從這些資料確認」會取消其他選項。':q.type==='multiple'?'複選題需完整答對，漏選或多選均不計為答對。':'送出後將顯示解說，答案無法再更改。'}</p><Button type="submit" className="primary-button confirm-button" disabled={state.selected.length===0}>確認答案 <ArrowRight/></Button></>}
 </form>
 {state.submitted&&<div className="answer-feedback" ref={feedbackRef} tabIndex={-1} role="region" aria-label="答題解說" aria-live="polite"><div className={'feedback-title '+(isCorrect(q,state.selected)?'good':'learn')}><CircleCheck size={22}/><h2>{isCorrect(q,state.selected)?'答對了，線索連起來了。':'一起看清楚這條線索。'}</h2></div><p>{q.explanation}</p><ul className="feedback-details">{q.options.filter(o=>state.selected.includes(o.id)||o.correct).map(o=><li key={o.id}><strong>{o.correct?(state.selected.includes(o.id)?'答對':'漏選'):(q.type==='single'?'你的選擇':'多選')} · {o.text}</strong><p>{o.reason}</p></li>)}</ul>{state.index===3&&<ConnectionDiagram/>}{state.index===7&&<div className="review-questions"><strong>回查時，再問自己四件事</strong><ol><li>能否找出真實姓名？</li><li>能否判斷固定地點？</li><li>能否推測固定時間？</li><li>能否連結到另一個平台？</li></ol></div>}<Button className="primary-button confirm-button" onClick={()=>act({type:'next'})}>{state.index===7?'第四階段：回到自己':state.index===3?'進入第二階段：斷鏈':state.index===6?'進入第三階段：回查':'下一題'}<ArrowRight/></Button></div>}
 </section></div></main>}
 {state.view==='self'&&<SelfCheck selected={state.selfChoices} onToggle={id=>act({type:'select-self',id})} onSubmit={()=>act({type:'submit-self'})}/>}
 {state.view==='result'&&<main className="result-main"><div className="case-label"><span className="signal"/> CASE 001 <span>本次任務完成</span></div><div className="result-top"><div className="result-score" style={{'--score-angle':(scores.total*3.6)+'deg'} as React.CSSProperties}><div><span>足跡防護力</span><strong>{scores.total}<small>/ 100</small></strong></div></div><div className="result-title"><div className="eyebrow">你的本次作答表現</div><h1>{scores.rank}</h1><p>{scores.total>=80?'能辨認多數跨平台關聯，並選擇有效的防護方法。':scores.total>=60?'已有基本概念，再留意時間線索與帳號之間的關聯。':'先從重新檢查跨平台資料開始，練習找出容易忽略的連結。'}</p><div className="score-notice"><ShieldCheck size={20}/>測驗分數代表題目作答表現，不等於你真實帳號的安全程度。</div></div></div><div className="score-breakdown">{['辨識力','斷鏈能力','回查能力'].map((name,i)=><div key={name}><div><span>{name}</span><strong>{scores.parts[i]}<small> / {[40,40,20][i]}</small></strong></div><Progress value={scores.parts[i]/[40,40,20][i]*100} aria-label={name+'分數'}/><p>{questions.filter(x=>x.stage===i&&isCorrect(x,state.answers[x.id]??[])).length} / {questions.filter(x=>x.stage===i).length} 題答對</p></div>)}</div><PersonalAdvice selected={state.selfChoices} onEdit={()=>act({type:'review-self'})}/><section className="action-section"><div className="eyebrow">把防護帶回日常</div><h2>今天可以做的三件事</h2><ol className="action-list">{[['搜尋自己','登出帳號後，以一般搜尋者角度查看自己公開的資訊。'],['檢查路線與時間','查看運動紀錄、打卡及公開活動是否暴露固定規律。'],['檢查平台關聯','看看不同平台是否因相同帳號、頭像或簡介而容易被連結。']].map(([title,copy],i)=><li key={title}><span>0{i+1}</span><div><h3>{title}</h3><p>{copy}</p></div></li>)}</ol></section><div className="button-row result-buttons"><Button className="primary-button" onClick={()=>setOverlay('checklist')}><BookOpen/>查看完整檢核卡</Button><Button variant="outline" className="text-button" onClick={()=>act({type:'reset'})}><RotateCcw/>重新挑戰</Button></div><p className="score-method">各階段依答對題數等比例計分，四捨五入後相加。自我檢核不計分；重新挑戰將清空本次答案、分數與勾選。</p></main>}
 </>}
 {error&&<p role="alert" className="error-message">{error}</p>}
 </div>
 <footer className="site-footer"><span>足跡斷鏈 · 數位公民練習</span><span>作答只在本次頁面計算，重新整理即重設。</span></footer></div>;
}
