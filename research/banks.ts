export type BankId = 'A' | 'B';
export type Category = 'identity' | 'location' | 'time' | 'link' | 'protection';
export type Item = { id: string; category: Category; purpose: string; prompt: string; options: { id: string; text: string; correct: boolean }[]; multiple?: boolean };
export type Bank = { version: string; items: Item[] };

// 草稿：正式收案前請團隊確認題意及難度；改題時必須更新版本，舊版本另行保留。
export const banks: Record<BankId, Bank> = {
  A: { version: 'A-draft-1', items: [
    { id: 'a-identity', category: 'identity', purpose: '辨認文件與公開頁面可組合成身分', prompt: '公開社團海報列出「小禾」的全名與學校；另一篇作品只寫「小禾」。目前最合理的判斷是？', options: [{id:'same',text:'若作品也連到該社團頁面，可能連到同一人',correct:true},{id:'certain',text:'只要暱稱相同，就能確定同一人',correct:false},{id:'none',text:'公開全名和學校不會形成線索',correct:false}] },
    { id: 'a-location', category: 'location', purpose: '辨認重複路線的固定地點', prompt: '某公開跑步紀錄連續四週都從同一個街口出發、回到相同街口。可能透露什麼？', options: [{id:'anchor',text:'經常停留的區域或固定起點',correct:true},{id:'address',text:'可以直接確定住家門牌',correct:false},{id:'nothing',text:'沒有任何位置線索',correct:false}] },
    { id: 'a-time', category: 'time', purpose: '辨認週期性活動時間', prompt: '公開打卡連續三週出現在週三 17:30 左右的同一活動。最能推測什麼？', options: [{id:'routine',text:'這段時間可能有固定活動',correct:true},{id:'always',text:'每天 17:30 都一定在場',correct:false},{id:'never',text:'時間資訊不可能形成規律',correct:false}] },
    { id: 'a-link', category: 'link', purpose: '辨認不同平台的可連結線索', prompt: '兩個平台使用相同少見暱稱與相同頭像。哪種判斷較合理？', options: [{id:'possible',text:'可能被旁人連結，仍需其他資料核對',correct:true},{id:'proof',text:'已經證明兩個帳號一定同一人',correct:false},{id:'impossible',text:'不同平台的資訊無法互相連結',correct:false}] },
    { id: 'a-protection', category: 'protection', purpose: '在新情境選出至少兩項可行防護且不誤選', prompt: '小禾的公開運動頁面顯示固定起點與發文時間，個人簡介又連到常用帳號。請選出適當做法（可複選）。', multiple:true, options: [{id:'hide-route',text:'將詳細路線改為不公開或隱藏起訖點',correct:true},{id:'delay',text:'避免即時公開固定活動時間',correct:true},{id:'review-link',text:'檢查並減少公開頁面的跨平台連結',correct:true},{id:'more-detail',text:'公開住家附近地標方便朋友辨認',correct:false}] }
  ] },
  B: { version: 'B-draft-1', items: [
    { id: 'b-identity', category: 'identity', purpose: '辨認名單與外部作品連結可組合成身分', prompt: '公開攝影社名單列出成員的全名與班級；一個匿名作品頁連到該名單中的個人介紹。最合理的判斷是？', options: [{id:'linked',text:'作品頁可能連到名單中的人，仍需核對連結內容',correct:true},{id:'certain',text:'只要同屬攝影社，就能確定作品由名單中的這個人創作',correct:false},{id:'none',text:'匿名作品頁一定不會形成身分線索',correct:false}] },
    { id: 'b-location', category: 'location', purpose: '辨認重複照片地圖標記的固定區域', prompt: '一個公開相簿連續四週的活動照片都有地圖標記，集合地點總在同一個公園入口。可能透露什麼？', options: [{id:'anchor',text:'常出現的區域或集合地點',correct:true},{id:'address',text:'可以直接確定住家門牌',correct:false},{id:'nothing',text:'照片的地圖標記沒有位置線索',correct:false}] },
    { id: 'b-time', category: 'time', purpose: '辨認週期性公開行程的時間', prompt: '社團公開活動行事曆連續三週都排在週五 18:00，且同一帳號每次都回覆參加。最能推測什麼？', options: [{id:'routine',text:'這段時間可能有固定活動',correct:true},{id:'always',text:'每天 18:00 都一定在場',correct:false},{id:'never',text:'公開行事曆不能提供任何時間線索',correct:false}] },
    { id: 'b-link', category: 'link', purpose: '辨認不同平台的可連結線索', prompt: '一個影片頻道與一個論壇帳號都使用同一段少見的自我介紹，還連到相同作品網站。哪種判斷較合理？', options: [{id:'possible',text:'可能被旁人連結，仍需其他資料核對',correct:true},{id:'proof',text:'已經證明兩個帳號一定同一人',correct:false},{id:'impossible',text:'不同平台的資訊無法互相連結',correct:false}] },
    { id: 'b-protection', category: 'protection', purpose: '在新情境選出至少兩項可行防護且不誤選', prompt: '阿青把固定值班時間與集合地點放在公開活動頁，又從影片頻道連到這個頁面。請選出適當做法（可複選）。', multiple:true, options: [{id:'limit-schedule',text:'將含固定時間的值班表限制為成員可見',correct:true},{id:'hide-meeting',text:'移除公開頁面上的精確集合地點',correct:true},{id:'unlink',text:'檢查並減少不同平台的公開連結',correct:true},{id:'live-checkin',text:'每次值班時即時公開集合位置與時間',correct:false}] }
  ] }
};

// 修題時將舊版 Bank 留在此表，再更新 banks 的現行版本。
export const bankVersions:Record<BankId,Record<string,Bank>>={A:{[banks.A.version]:banks.A},B:{[banks.B.version]:banks.B}};
export function getBank(id:BankId,version=banks[id].version){const bank=bankVersions[id][version];if(!bank)throw new Error('題庫版本不存在，請由團隊處理。');return bank;}
export function publicBank(id: BankId,version?:string) {
 const bank = getBank(id,version);
 return { version: bank.version, items: bank.items.map(({id,category,prompt,multiple,options})=>({id,category,prompt,multiple:!!multiple,options:options.map(({id,text})=>({id,text}))})) };
}
