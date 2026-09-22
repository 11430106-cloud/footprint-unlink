import { getBank, type BankId } from './banks.ts';

export type Answers = Record<string,string[]>;
export type Survey = { actions: string[]; assistance: 'none'|'minor'|'moderate'|'major'; ease: 1|2|3|4|5; problems: string[] };
export const actionIds = ['hide-route','delay-post','review-privacy','remove-links','none'] as const;
export const problemIds = ['instructions','wording','navigation','display','connection','other','none'] as const;

export function validateAnswers(bankId: BankId, input: unknown,version?:string): Answers {
 const bank=getBank(bankId,version);
 if(!input || typeof input!=='object' || Array.isArray(input))throw new Error('答案格式錯誤。');
 const answers=input as Record<string,unknown>;
 if(Object.keys(answers).length!==bank.items.length)throw new Error('請完成所有題目。');
 for(const item of bank.items){
  const ids=answers[item.id];
  if(!Array.isArray(ids)||ids.length<1||ids.length>item.options.length||ids.some(id=>typeof id!=='string'||!item.options.some(o=>o.id===id))||new Set(ids).size!==ids.length||(!item.multiple&&ids.length!==1))throw new Error('答案含無效選項。');
 }
 return answers as Answers;
}

export function score(bankId: BankId, answers: Answers,version?:string) {
 const items=getBank(bankId,version).items;
 const results=items.map(item=>{
  const selected=answers[item.id];
  const correct=item.category==='protection'
   ? selected.filter(id=>item.options.some(o=>o.id===id&&o.correct)).length>=2 && selected.every(id=>item.options.some(o=>o.id===id&&o.correct))
   : selected.length===1 && item.options.some(o=>o.id===selected[0]&&o.correct);
  return {id:item.id,category:item.category,correct};
 });
 return { clue: results.filter(r=>r.category!=='protection').filter(r=>r.correct).length*25, protection:results[4].correct, items:results };
}

export function validateSurvey(input: unknown): Survey {
 if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('問卷格式錯誤。');
 const s=input as Record<string,unknown>;
 const validList=(x:unknown,options:readonly string[])=>Array.isArray(x)&&x.length>0&&x.length<=options.length&&x.every(v=>typeof v==='string'&&options.includes(v))&&new Set(x).size===x.length&&(!x.includes('none')||x.length===1);
 if(!validList(s.actions,actionIds)||!validList(s.problems,problemIds)||!['none','minor','moderate','major'].includes(String(s.assistance))||![1,2,3,4,5].includes(s.ease as number))throw new Error('請完成問卷，互斥選項不能同時勾選。');
 return s as Survey;
}

export type Row = { id:string; order_code:'AB'|'BA'; started_at:string; pre_started_at:string|null; pre_completed_at:string|null; experience_started_at:string|null; experience_completed_at:string|null; post_started_at:string|null; post_completed_at:string|null; completed_at:string|null; pre_bank_version:string; post_bank_version:string; pre_answers:string|null; post_answers:string|null; pre_item_results:string|null; post_item_results:string|null; survey:string|null; pre_score:number|null; post_score:number|null; post_protection:number|null };
export function summarize(rows: Row[]) {
 const started=rows.length, pre=rows.filter(r=>r.pre_completed_at).length, experience=rows.filter(r=>r.experience_completed_at).length, post=rows.filter(r=>r.post_completed_at).length, complete=rows.filter(r=>r.completed_at).length;
 const paired=rows.filter(r=>r.pre_completed_at&&r.post_completed_at&&r.pre_score!==null&&r.post_score!==null);
 const n=paired.length;
 const metric=(count:number,denominator:number)=>({count,denominator,percent:denominator?Math.round(count/denominator*1000)/10:null});
 const average=(nums:number[])=>nums.length?Math.round(nums.reduce((a,b)=>a+b,0)/nums.length*10)/10:null;
 const median=(nums:number[])=>{if(!nums.length)return null;const a=[...nums].sort((x,y)=>x-y),m=Math.floor(a.length/2);return Math.round((a.length%2?a[m]:(a[m-1]+a[m])/2)*10)/10;};
 const scores=(key:'pre_score'|'post_score')=>paired.map(r=>r[key] as number);
 const distribution=(key:'pre_score'|'post_score')=>[0,25,50,75,100].map(value=>({value,...metric(paired.filter(r=>r[key]===value).length,n)}));
 const itemStats=[] as {stage:'pre'|'post';bank:BankId;version:string;id:string;category:string;correct:ReturnType<typeof metric>;wrong:{id:string;count:number;denominator:number;percent:number|null}[]}[];
 const categories=[] as {category:string;pre:ReturnType<typeof metric>;post:ReturnType<typeof metric>}[];
 const parsed=paired.map(r=>({row:r,pre:JSON.parse(r.pre_answers!) as Answers,post:JSON.parse(r.post_answers!) as Answers,preItems:JSON.parse(r.pre_item_results!) as ReturnType<typeof score>['items'],postItems:JSON.parse(r.post_item_results!) as ReturnType<typeof score>['items']}));
 for(const stage of ['pre','post'] as const){
  const groups=new Map<string,typeof parsed>();
  for(const entry of parsed){const bankId:BankId=stage==='pre'?(entry.row.order_code==='AB'?'A':'B'):(entry.row.order_code==='AB'?'B':'A');const version=stage==='pre'?entry.row.pre_bank_version:entry.row.post_bank_version;
   const groupKey=bankId+'|'+version;groups.set(groupKey,[...(groups.get(groupKey)??[]),entry]);
  }
  for(const [groupKey,group] of groups){const [bankId,version]=groupKey.split('|') as [BankId,string];const entries=stage==='pre'?group[0].preItems:group[0].postItems;
   for(const item of entries){const counts=new Map<string,number>();let right=0;
    const distractors=new Set(getBank(bankId,version).items.find(x=>x.id===item.id)?.options.filter(o=>!o.correct).map(o=>o.id)??[]);
    for(const x of group){const answers=x[stage],itemResult=(stage==='pre'?x.preItems:x.postItems).find(z=>z.id===item.id);if(itemResult?.correct)right++;else for(const id of answers[item.id]??[])if(distractors.has(id))counts.set(id,(counts.get(id)??0)+1);}
    itemStats.push({stage,bank:bankId,version,id:item.id,category:item.category,correct:metric(right,group.length),wrong:[...counts].map(([id,count])=>({id,count,denominator:group.length,percent:metric(count,group.length).percent})).sort((a,b)=>b.count-a.count)});
   }
  }
 }
 for(const category of ['identity','location','time','link']){
  const preCount=parsed.filter(x=>x.preItems.some(i=>i.category===category&&i.correct)).length;
  const postCount=parsed.filter(x=>x.postItems.some(i=>i.category===category&&i.correct)).length;
  categories.push({category,pre:metric(preCount,n),post:metric(postCount,n)});
 }
 const action=paired.filter(r=>r.survey&&JSON.parse(r.survey).actions?.some((x:string)=>x!=='none')).length;
 const assistance=rows.filter(r=>r.completed_at&&r.survey&&['none','minor'].includes(JSON.parse(r.survey).assistance)).length;
 const minutes=rows.filter(r=>r.completed_at).map(r=>(Date.parse(r.completed_at!)-Date.parse(r.started_at))/60000).filter(v=>Number.isFinite(v)&&v>=0);
 const surveyRows=rows.filter(r=>r.completed_at&&r.survey).map(r=>JSON.parse(r.survey!) as Survey);
 return {
  participation:{started:metric(started,started),pre:metric(pre,started),experience:metric(experience,started),post:metric(post,started),complete:metric(complete,started),paired:metric(n,started),dropout:{beforePre:metric(started-pre,started),duringExperience:metric(pre-experience,pre),beforePost:metric(experience-post,experience),beforeSurvey:metric(post-complete,post)}},
  ability:{preAverage:average(scores('pre_score')),postAverage:average(scores('post_score')),gainPoints:average(paired.map(r=>r.post_score!-r.pre_score!)),preDistribution:distribution('pre_score'),postDistribution:distribution('post_score'),categories},
  protection:metric(paired.filter(r=>r.post_protection===1).length,n),actionIntention:metric(action,n),operationUnderstanding:metric(assistance,started),
  groups:{AB:metric(rows.filter(r=>r.order_code==='AB').length,started),BA:metric(rows.filter(r=>r.order_code==='BA').length,started)},
  durationMedianMinutes:median(minutes), ease:[1,2,3,4,5].map(value=>({value,...metric(surveyRows.filter(s=>s.ease===value).length,surveyRows.length)})),
  problems:problemIds.map(id=>({id,...metric(surveyRows.filter(s=>s.problems.includes(id)).length,surveyRows.length)})),
  items:itemStats, pairedCount:n, completedCount:complete
 };
}
