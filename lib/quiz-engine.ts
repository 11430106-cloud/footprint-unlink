export type Option = { id: string; text: string; correct: boolean; reason: string };
export type Question = { id: string; stage: number; title: string; type: string; prompt: string; hint: string; cards: string; options: Option[]; explanation: string; exclusive?: string };
import { toggleSelfChoice, validateSelfChoices } from './self-check-engine.ts';
export type QuizState = { view: 'home' | 'intro' | 'quiz' | 'self' | 'result'; index: number; selected: string[]; answers: Record<string, string[]>; submitted: boolean; selfChoices: string[] };
export type Action = {type:'intro'|'start'|'next'|'reset'|'review-self'} | {type:'select'|'select-self';id:string} | {type:'submit'|'submit-self';ids?:string[]};
export const initialState = (): QuizState => ({view:'home',index:0,selected:[],answers:{},submitted:false,selfChoices:[]});
export function isCorrect(question: Question, ids: string[]) {
 const expected = question.options.filter(o=>o.correct).map(o=>o.id);
 return ids.length === new Set(ids).size && ids.length === expected.length && expected.every(id=>ids.includes(id));
}
export function validateAnswer(q:Question,ids:string[]) {
 if (!Array.isArray(ids) || !ids.length || ids.some(id=>!q.options.some(o=>o.id===id)) || new Set(ids).size!==ids.length) throw new Error('請選擇有效且不重複的答案。');
 if (q.type==='single' && ids.length!==1) throw new Error('本題為單選題，請選擇一個答案。');
 if (q.exclusive && ids.includes(q.exclusive) && ids.length>1) throw new Error('「以上皆無法確認」不能與其他選項同時選取。');
}
export function transition(state:QuizState,action:Action,questions:Question[]):QuizState {
 if(action.type==='reset')return initialState();
 if(action.type==='intro'){if(state.view!=='home')throw new Error('測驗已開始。');return {...state,view:'intro'};}
 if(action.type==='start'){if(state.view!=='intro'&&state.view!=='home')throw new Error('測驗已開始。');return {...initialState(),view:'quiz'};}
 if(action.type==='review-self'){if(state.view!=='result')throw new Error('請先完成本次體驗。');return {...state,view:'self'};}
 if(action.type==='select-self'){
  if(state.view!=='self')throw new Error('請先完成八題情境測驗。');
  return {...state,selfChoices:toggleSelfChoice(state.selfChoices,action.id)};
 }
 if(action.type==='submit-self'){
  if(state.view!=='self')throw new Error('請先進入「回到自己」。');
  const ids=action.ids??state.selfChoices;validateSelfChoices(ids);
  return {...state,selfChoices:[...ids],view:'result'};
 }
 if(state.view!=='quiz')throw new Error('請先開始測驗。');
 const q=questions[state.index];
 if(action.type==='select'){
  if(state.submitted)throw new Error('此題已送出。');
  if(!q.options.some(o=>o.id===action.id))throw new Error('無效選項。');
  const selected=q.type==='single'?[action.id]:state.selected.includes(action.id)?state.selected.filter(id=>id!==action.id):action.id===q.exclusive?[action.id]:[...state.selected.filter(id=>id!==q.exclusive),action.id];
  return {...state,selected};
 }
 if(action.type==='submit'){
  if(state.submitted)throw new Error('此題已送出，請前往下一題。');
  const ids=action.ids??state.selected;validateAnswer(q,ids);
  return {...state,selected:[...ids],submitted:true,answers:{...state.answers,[q.id]:[...ids]}};
 }
 if(action.type==='next'){
  if(!state.submitted)throw new Error('請先送出答案。');
  return state.index===questions.length-1?{...state,view:'self'}:{...state,index:state.index+1,selected:[],submitted:false};
 }
 return state;
}
export function calculateScores(questions:Question[],answers:Record<string,string[]>) {
 const maxima=[40,40,20];
 const parts=maxima.map((max,stage)=>{const items=questions.filter(q=>q.stage===stage);return Math.round(items.filter(q=>isCorrect(q,answers[q.id]??[])).length/items.length*max);});
 const total=parts.reduce((a,b)=>a+b,0);
 return {parts,total,rank:total>=80?'防護高手':total>=60?'足跡觀察員':'線索待清理'};
}
