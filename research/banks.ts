// Draft banks are immutable. Add a new version instead of changing collected items.
export const STUDY_VERSION = 'paired-draft-v1';
export const WEBSITE_VERSION = 'footprint-2026-10-07';
export const categories = ['身分','位置','時間','跨平台關聯'] as const;
export type Form = 'A'|'B';
export type StudyQuestion = {id:string;category:number;purpose:string;prompt:string;type:'single'|'multiple';options:{id:string;text:string;correct:boolean}[]};
const single=(id:string,category:number,prompt:string,options:string[],right:number):StudyQuestion=>({id,category,purpose:'辨認'+categories[category]+'線索，區分合理推測與沒有根據的判斷。',prompt,type:'single',options:options.map((text,i)=>({id:String(i+1),text,correct:i===right}))});
const protection=(id:string,prompt:string,options:string[]):StudyQuestion=>({id,category:4,purpose:'新情境中選出至少兩種適當防護方法，而且不選錯誤方法。',prompt,type:'multiple',options:options.map((text,i)=>({id:String(i+1),text,correct:i<3}))});
export const banks:Record<Form,StudyQuestion[]>={
 A:[
  single('A1',0,'虛構角色在公開作品集保留「社團幹部名單」、臉部照片及私人信箱。哪一項判斷最合理？',['這些資料可能共同縮小真實身分範圍','只要沒有電話，身分就無法被辨認','照片可以直接推算身分證號碼','作品內容一定能證明家庭收入'],0),
  single('A2',1,'公開散步圖連續三次在同一巷口開始，圖上沒有標示住址。陌生人能合理推測什麼？',['這個巷口就是角色的確切住址','角色可能常在這一帶活動，但不能直接確認住家','可以知道角色現在的位置','可以知道所有家人的位置'],1),
  single('A3',2,'同一帳號連續四週分享「週一、三，傍晚六點到河堤」。哪種風險最直接？',['能知道角色未來每一天的行程','能知道角色的醫療紀錄','重複的時段可能讓人推測固定活動規律','一次刪除照片就會消除所有已知規律'],2),
  single('A4',3,'攝影平台與讀書平台使用相同的少見暱稱和同一張頭像。應如何解讀？',['兩個帳號一定屬於同一人','兩個帳號之間完全沒有可比對線索','只要平台不同就不能被連結','這些是關聯線索，但仍不足以確定是同一人'],3),
  protection('A5','虛構角色把郊遊紀錄和社團作品公開，兩處使用同一暱稱，紀錄還有完整起點及時間。請選至少兩種適當防護方法。',['隱藏活動起終點，限制路線的公開範圍','移除不必要的精確時間，避免累積固定規律','將不同用途的公開帳號識別資訊分開','只改作品標題，保留所有路線與帳號資訊','把信箱改成縮寫，但保留可連回原帳號的連結'])
 ],
 B:[
  single('B1',0,'虛構角色的公開活動簡報保留班級合照、競賽名冊及個人聯絡信箱。哪一項判斷最合理？',['只要沒有地址，身分就無法被辨認','名冊、照片與信箱可能一起指向具體身分','可以直接推算銀行帳號','活動主題一定能證明家庭收入'],1),
  single('B2',1,'公開單車圖連續三次在同一公園入口結束，沒有標示住址。陌生人能合理推測什麼？',['可以知道角色現在的位置','公園入口就是角色的確切住址','角色可能常在這一帶活動，但不能直接確認住家','可以知道所有家人的位置'],2),
  single('B3',2,'同一帳號連續四週分享「週二、四，早上七點半到操場」。哪種風險最直接？',['能知道角色未來每一天的行程','一次刪除照片就會消除所有已知規律','能知道角色的醫療紀錄','重複的時段可能讓人推測固定活動規律'],3),
  single('B4',3,'影音平台與遊戲平台使用相同的少見暱稱和同一張頭像。應如何解讀？',['這些是關聯線索，但仍不足以確定是同一人','只要平台不同就不能被連結','兩個帳號一定屬於同一人','兩個帳號之間完全沒有可比對線索'],0),
  protection('B5','虛構角色把單車紀錄和活動簡報公開，兩處使用同一暱稱，紀錄還有完整終點及時間。請選至少兩種適當防護方法。',['隱藏活動起終點，限制路線的公開範圍','移除不必要的精確時間，避免累積固定規律','將不同用途的公開帳號識別資訊分開','只改簡報標題，保留所有路線與帳號資訊','把暱稱改成縮寫，但保留可連回原帳號的連結'])
 ]
};
export const bankVersion=(form:Form)=>STUDY_VERSION+'-'+form;
export const publicBank=(form:Form)=>banks[form].map(({id,prompt,type,category,options})=>({id,prompt,type,category,options:options.map(({id,text})=>({id,text}))}));
export const actions=[{id:'route',text:'調整路線、起終點的公開範圍'},{id:'time',text:'移除不必要的精確時間或規律'},{id:'identity',text:'檢查公開文件的識別資訊'},{id:'accounts',text:'分開不同用途的帳號識別資訊'},{id:'review',text:'登出後回查自己的公開資料'},{id:'none',text:'暫不採取行動'}];
export const assistance=[{id:'none',text:'不需協助'},{id:'small',text:'僅需少量協助'},{id:'repeated',text:'需要多次協助'},{id:'much',text:'需要大量協助'}];
export const problems=[{id:'words',text:'文字或題意難懂'},{id:'navigation',text:'不清楚下一步怎麼操作'},{id:'mobile',text:'手機顯示或點選問題'},{id:'network',text:'載入或送出問題'},{id:'length',text:'流程太長'},{id:'other',text:'其他問題'},{id:'none',text:'沒有遇到問題'}];
