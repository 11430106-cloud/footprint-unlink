import questionData from '../data/questions.json' with { type: 'json' };
import { calculateScores, isCorrect, validateAnswer, type Question } from '../lib/quiz-engine.ts';

export const QUIZ_VERSION = 'quiz-v1';
export const questions: Question[] = questionData;
export type Answers = Record<string, string[]>;
export type ItemResult = { id: string; stage: number; correct: boolean; wrongSelected: string[] };

export function validateAnswers(input: unknown): Answers {
 if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('答案格式錯誤。');
 const answers = input as Record<string, unknown>;
 if (Object.keys(answers).length !== questions.length) throw new Error('請完成八題。');
 for (const question of questions) validateAnswer(question, answers[question.id] as string[]);
 return answers as Answers;
}

export function grade(answers: Answers) {
 const scores = calculateScores(questions, answers);
 const items: ItemResult[] = questions.map(question => ({
  id: question.id,
  stage: question.stage,
  correct: isCorrect(question, answers[question.id]),
  wrongSelected: answers[question.id].filter(id => question.options.some(option => option.id === id && !option.correct)),
 }));
 return { scores, items };
}

export type Row = {
 id: string;
 started_at: string;
 quiz_version: string;
 number: number | null;
 completed_at: string | null;
 answers_json: string | null;
 item_results_json: string | null;
 total_score: number | null;
 recognition_score: number | null;
 protection_score: number | null;
 review_score: number | null;
};

export function summarize(rows: Row[]) {
 const started = rows.length;
 const completed = rows.filter(row => row.number !== null);
 const count = completed.length;
 const metric = (n: number, denominator: number) => ({ count: n, denominator, percent: denominator ? Math.round(n / denominator * 1000) / 10 : null });
 const average = (values: number[]) => values.length ? Math.round(values.reduce((sum, x) => sum + x, 0) / values.length * 10) / 10 : null;
 const median = (values: number[]) => { if (!values.length) return null; const sorted = [...values].sort((a,b) => a-b), mid = Math.floor(sorted.length / 2); return Math.round((sorted.length % 2 ? sorted[mid] : (sorted[mid-1] + sorted[mid]) / 2) * 10) / 10; };
 const ranges = [[0,19],[20,39],[40,59],[60,79],[80,100]] as const;
 const items = new Map<string,{version:string;id:string;stage:number;right:number;denominator:number;wrong:Map<string,number>}>();
 for (const row of completed) {
  for (const item of JSON.parse(row.item_results_json!) as ItemResult[]) {
   const key = row.quiz_version + '|' + item.id;
   const entry = items.get(key) ?? {version:row.quiz_version,id:item.id,stage:item.stage,right:0,denominator:0,wrong:new Map<string,number>()};
   entry.denominator++;
   if (item.correct) entry.right++;
   else for (const option of item.wrongSelected) entry.wrong.set(option,(entry.wrong.get(option)??0)+1);
   items.set(key,entry);
  }
 }
 const minutes = completed.map(row => (Date.parse(row.completed_at!) - Date.parse(row.started_at)) / 60000).filter(x => Number.isFinite(x) && x >= 0);
 return {
  participation: { started: metric(started,started), completed: metric(count,started), dropout: metric(started-count,started) },
  score: { average: average(completed.map(row=>row.total_score!)), recognitionAverage: average(completed.map(row=>row.recognition_score!)), protectionAverage: average(completed.map(row=>row.protection_score!)), reviewAverage: average(completed.map(row=>row.review_score!)), denominator: count,
   distribution: ranges.map(([min,max])=>({label:`${min}–${max}`,...metric(completed.filter(row=>row.total_score!>=min&&row.total_score!<=max).length,count)})) },
  stages: [0,1,2].map(stage=>{const stageItems=[...items.values()].filter(item=>item.stage===stage);const right=stageItems.reduce((sum,item)=>sum+item.right,0),denominator=stageItems.reduce((sum,item)=>sum+item.denominator,0);return {stage,...metric(right,denominator)};}),
  items: [...items.values()].map(item=>({version:item.version,id:item.id,stage:item.stage,correct:metric(item.right,item.denominator),wrong:[...item.wrong].map(([id,n])=>({id,...metric(n,item.denominator)})).sort((a,b)=>b.count-a.count)})),
  durationMedianMinutes: median(minutes),
 };
}
