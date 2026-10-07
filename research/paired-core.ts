import { banks, bankVersion, STUDY_VERSION, categories, actions, assistance, problems, type Form } from './banks.ts';
export type AnswerSet=Record<string,string[]>;
export type Survey={actions:string[];assistance:string;usability:number;problems:string[];feedback:string};
export type Step={stage:'pre'|'learning'|'post'|'survey';form:Form|null;bank_version:string|null;started_at:string;completed_at:string;answers_json:string;results_json:string};
export type StudyRow={id:string;study_version:string;website_version:string;form_order:'AB'|'BA';pre_version:string;post_version:string;started_at:string;completed_at:string|null;stage:string;steps:Step[]};
export const round=(x:number)=>Math.round(x*10)/10;
export const ratio=(count:number,denominator:number)=>({count,denominator,percent:denominator?round(count/denominator*100):null});
export const avg=(xs:number[])=>xs.length?round(xs.reduce((a,b)=>a+b,0)/xs.length):null;
export function median(xs:number[]){if(!xs.length)return null;const values=[...xs].sort((a,b)=>a-b),i=Math.floor(values.length/2);return round(values.length%2?values[i]:(values[i-1]+values[i])/2);}
export function gradeTest(form:Form,input:unknown){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('答案格式錯誤。');
 const answers=input as AnswerSet,questions=banks[form];
 if(Object.keys(answers).length!==questions.length||Object.keys(answers).some(id=>!questions.some(q=>q.id===id)))throw Error('請完成本套五題。');
 const items=questions.map(q=>{const ids=answers[q.id];if(!Array.isArray(ids)||!ids.length||ids.some(id=>typeof id!=='string'||!q.options.some(o=>o.id===id))||new Set(ids).size!==ids.length||(q.type==='single'&&ids.length!==1))throw Error('請選擇有效且不重複的答案。');
  const good=q.options.filter(o=>o.correct).map(o=>o.id),wrong=ids.filter(id=>!good.includes(id));
  return {id:q.id,category:q.category,correct:q.category===4?ids.length>=2&&wrong.length===0:ids.length===good.length&&good.every(id=>ids.includes(id)),selected:[...ids],wrong};});
 return {items,recognition:items.slice(0,4).filter(i=>i.correct).length/4*100,protection:items[4].correct};
}
function ids(input:unknown,catalog:{id:string}[],exclusive:string){if(!Array.isArray(input)||!input.length||input.length>catalog.length||input.some(id=>typeof id!=='string'||!catalog.some(o=>o.id===id))||new Set(input).size!==input.length||(input.includes(exclusive)&&input.length>1))throw Error('問卷選項無效，暫不採取行動及沒有問題須單獨選擇。');return input as string[];}
export function validateSurvey(input:unknown):Survey{
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('問卷格式錯誤。');const v=input as Record<string,unknown>;
 if(Object.keys(v).some(k=>!['actions','assistance','usability','problems','feedback'].includes(k)))throw Error('問卷格式錯誤。');
 if(typeof v.assistance!=='string'||!assistance.some(a=>a.id===v.assistance)||!Number.isInteger(v.usability)||Number(v.usability)<1||Number(v.usability)>5||typeof v.feedback!=='string'||v.feedback.length>400)throw Error('請完成問卷；回饋最多 400 字。');
 return {actions:ids(v.actions,actions,'none'),assistance:v.assistance,usability:Number(v.usability),problems:ids(v.problems,problems,'none'),feedback:v.feedback.trim()};
}
export function toggleExclusive(current:string[],id:string,exclusive:string){return current.includes(id)?current.filter(x=>x!==id):id===exclusive?[id]:[...current.filter(x=>x!==exclusive),id];}
const read=(row:StudyRow,stage:Step['stage'])=>row.steps.find(s=>s.stage===stage);
export function pairedResults(row:StudyRow){try{const pre=read(row,'pre'),post=read(row,'post');const forms=row.form_order==='AB'?['A','B'] as const:['B','A'] as const;
 if(row.study_version!==STUDY_VERSION||!pre||!post||pre.form!==forms[0]||post.form!==forms[1]||pre.bank_version!==bankVersion(forms[0])||post.bank_version!==bankVersion(forms[1])||row.pre_version!==pre.bank_version||row.post_version!==post.bank_version||!read(row,'learning'))return null;
 return {pre:gradeTest(forms[0],JSON.parse(pre.answers_json)),post:gradeTest(forms[1],JSON.parse(post.answers_json))};
 }catch{return null;}}
function surveyOf(row:StudyRow){try{const step=read(row,'survey');return step?validateSurvey(JSON.parse(step.answers_json)):null;}catch{return null;}}
export function summarizeStudy(rows:StudyRow[]){
 const started=rows.length,done=rows.filter(r=>r.stage==='done'&&r.completed_at&&surveyOf(r)&&pairedResults(r)),pairs=rows.flatMap(r=>{const result=pairedResults(r);return result?[{row:r,...result}]:[];}),n=pairs.length;
 const stageCounts={pre:rows.filter(r=>read(r,'pre')).length,learning:rows.filter(r=>read(r,'learning')).length,post:rows.filter(r=>read(r,'post')).length,survey:done.length};
 const surveys=rows.flatMap(row=>{const value=surveyOf(row);return value?[value]:[];});
 const preCorrect=pairs.reduce((a,p)=>a+p.pre.items.slice(0,4).filter(i=>i.correct).length,0),postCorrect=pairs.reduce((a,p)=>a+p.post.items.slice(0,4).filter(i=>i.correct).length,0);
 const changes=pairs.map(p=>p.post.recognition-p.pre.recognition),improved=changes.filter(x=>x>0).length,steady=changes.filter(x=>x===0).length,declined=changes.filter(x=>x<0).length;
 const protection=pairs.filter(p=>p.post.protection).length,actionIntent=pairs.filter(p=>surveyOf(p.row)?.actions.some(id=>id!=='none')).length;
 const operation=done.filter(row=>['none','small'].includes(surveyOf(row)!.assistance)).length;
 const itemStats=(['pre','post'] as const).flatMap(phase=>(['A','B'] as const).flatMap(form=>banks[form].map(q=>{
  const submissions=rows.flatMap(row=>{const step=read(row,phase);if(!step||step.form!==form||step.bank_version!==bankVersion(form))return [];try{return [gradeTest(form,JSON.parse(step.answers_json)).items.find(i=>i.id===q.id)!];}catch{return [];}});
  return {phase,form,version:bankVersion(form),id:q.id,prompt:q.prompt,category:q.category,correct:ratio(submissions.filter(i=>i.correct).length,submissions.length),options:q.options.map(o=>({id:o.id,text:o.text,appropriate:o.correct,...ratio(submissions.filter(i=>i.selected.includes(o.id)).length,submissions.length)}))};
 })));
 const distribution=(catalog:{id:string;text:string}[],key:'actions'|'assistance'|'problems')=>catalog.map(o=>({id:o.id,text:o.text,...ratio(surveys.filter(s=>Array.isArray(s[key])?(s[key] as string[]).includes(o.id):s[key]===o.id).length,surveys.length)}));
 const target=(count:number,denominator:number,threshold:number)=>({...ratio(count,denominator),threshold,met:denominator?count/denominator*100>=threshold:null});
 return {
  participation:{started:ratio(started,started),pre:ratio(stageCounts.pre,started),learning:ratio(stageCounts.learning,started),post:ratio(stageCounts.post,started),paired:ratio(n,started),completed:ratio(done.length,started),dropouts:[{stage:'前測',...ratio(started-stageCounts.pre,started)},{stage:'學習流程',...ratio(stageCounts.pre-stageCounts.learning,stageCounts.pre)},{stage:'後測',...ratio(stageCounts.learning-stageCounts.post,stageCounts.learning)},{stage:'問卷',...ratio(stageCounts.post-done.length,stageCounts.post)}],incomplete:ratio(started-done.length,started)},
  orders:(['AB','BA'] as const).map(order=>({order,started:ratio(rows.filter(r=>r.form_order===order).length,started),paired:ratio(pairs.filter(p=>p.row.form_order===order).length,n)})),
  recognition:{pre:{...ratio(preCorrect,n*4),participants:n},post:{...ratio(postCorrect,n*4),participants:n},meanChange:avg(changes),threshold:20,met:n?changes.reduce((a,b)=>a+b,0)/n>=20:null,improved:ratio(improved,n),steady:ratio(steady,n),declined:ratio(declined,n),categories:categories.map((label,category)=>{const before=pairs.filter(p=>p.pre.items[category].correct).length,after=pairs.filter(p=>p.post.items[category].correct).length;return {label,pre:ratio(before,n),post:ratio(after,n),change:n?round((after-before)/n*100):null};}),distribution:[0,25,50,75,100].map(score=>({score,pre:ratio(pairs.filter(p=>p.pre.recognition===score).length,n),post:ratio(pairs.filter(p=>p.post.recognition===score).length,n)}))},
  protection:target(protection,n,80),actionIntent:target(actionIntent,n,70),operation:target(operation,started,80),
  survey:{answered:surveys.length,actions:distribution(actions,'actions'),assistance:distribution(assistance,'assistance'),completedAssistance:assistance.map(a=>({id:a.id,text:a.text,...ratio(done.filter(row=>surveyOf(row)?.assistance===a.id).length,started)})),problems:distribution(problems,'problems'),usability:[1,2,3,4,5].map(score=>({score,...ratio(surveys.filter(s=>s.usability===score).length,surveys.length)})),usabilityAverage:avg(surveys.map(s=>s.usability))},
  duration:{medianMinutes:median(done.map(r=>(Date.parse(r.completed_at!)-Date.parse(r.started_at))/60000).filter(v=>Number.isFinite(v)&&v>=0)),denominator:done.length},
  items:itemStats,worst:itemStats.filter(i=>i.correct.denominator).sort((a,b)=>a.correct.percent!-b.correct.percent!||b.correct.denominator-a.correct.denominator).slice(0,3),
  changes:pairs.map((p,i)=>({label:'受測者 '+(i+1),pre:p.pre.recognition,post:p.post.recognition,change:p.post.recognition-p.pre.recognition})),
  invalidPairs:rows.filter(r=>read(r,'pre')&&read(r,'post')&&!pairedResults(r)).length,
  versions:[...new Set(rows.map(r=>r.study_version))],websiteVersions:[...new Set(rows.map(r=>r.website_version))]
 };
}
export type Summary=ReturnType<typeof summarizeStudy>;
export function studyCsv(rows:StudyRow[]){const columns=['order','study_version','website_version','pre_version','post_version','started_at','completed_at','pre_score','post_score','change_points','post_protection','actions','assistance','usability','problems','stage','pre_completed','learning_completed','post_completed','survey_completed','valid_pair','flow_completed'];
 const quote=(value:unknown)=>'"'+String(value??'').replaceAll('"','""')+'"';
 return '\uFEFF'+columns.join(',')+'\r\n'+rows.map(row=>{const p=pairedResults(row),s=surveyOf(row);return [row.form_order,row.study_version,row.website_version,row.pre_version,row.post_version,row.started_at,row.completed_at,p?.pre.recognition,p?.post.recognition,p?p.post.recognition-p.pre.recognition:null,p?.post.protection,s?.actions.join('|'),s?.assistance,s?.usability,s?.problems.join('|'),row.stage,!!read(row,'pre'),!!read(row,'learning'),!!read(row,'post'),!!s,!!p,!!(row.stage==='done'&&row.completed_at&&s&&p)].map(quote).join(',');}).join('\r\n')+'\r\n';}
export const rawFeedback=(rows:StudyRow[])=>rows.flatMap(row=>{const s=surveyOf(row);return s?.feedback?[{text:s.feedback}]:[];});
