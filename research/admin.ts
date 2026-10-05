export const adminHtml = `<!doctype html>
<html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>足跡防護｜研究管理後台</title><style>
:root{color-scheme:dark}*{box-sizing:border-box}body{font:16px/1.6 system-ui,sans-serif;background:#101c2b;color:#e9f2f5;margin:0}main{max-width:1180px;margin:auto;padding:28px 20px}h1,h2,h3{line-height:1.35}h1{margin:5px 0;font-size:30px}h2{font-size:21px}h3{font-size:17px}p{color:#c2d0de}.kicker{color:#f4d15a;font-size:13px;letter-spacing:2px}.toolbar{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:16px;margin:22px 0}.actions{display:flex;flex-wrap:wrap;gap:8px}button,a.logout{font:inherit;background:#f4d15a;color:#142131;border:0;padding:9px 15px;border-radius:7px;cursor:pointer;text-decoration:none}button.secondary,a.logout{background:#2e445c;color:#e9f2f5}button:disabled{opacity:.5;cursor:wait}section{background:#1b2d41;margin:20px 0;padding:22px;border:1px solid #30465d;border-radius:12px}table{border-collapse:collapse;width:100%;margin:10px 0;font-size:14px}th,td{border-bottom:1px solid #3c536c;text-align:left;padding:12px 9px;vertical-align:top}th{color:#c2d0de;white-space:nowrap}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(215px,1fr));gap:12px}.card{border:1px solid #3b5670;border-radius:9px;padding:16px}.card strong{font-size:15px;font-weight:500;color:#c2d0de}.card .value{font-size:27px;display:block;margin:8px 0}.card small{color:#bacbda}.scroll{overflow:auto}label{display:block;margin:12px 0}input{font:inherit;padding:8px;background:#101c2b;color:#e9f2f5;border:1px solid #627991;border-radius:5px}#error{color:#ffb19d}#status{color:#c2d0de;font-size:14px}.danger{border-color:#70434a}.danger button{background:#af3f47;color:white}.note{background:#22394c;padding:14px 18px;border-left:3px solid #f4d15a}.muted{color:#a7bdcf;font-size:14px}.empty{text-align:center;padding:25px}button:focus-visible,a:focus-visible,input:focus-visible{outline:3px solid #8dd7eb;outline-offset:3px}@media(max-width:600px){main{padding:20px 12px}section{padding:16px}h1{font-size:26px}.grid{grid-template-columns:1fr 1fr}.card .value{font-size:23px}}
</style></head><body><main>
<header><div class="kicker">FOOTPRINT / RESEARCH</div><h1>足跡防護研究後台</h1><p>查看同意參加測驗者的匿名紀錄與統計。</p></header>
<div class="toolbar"><div id="status" role="status">正在驗證並讀取統計…</div><div class="actions"><button id="refresh">重新整理</button><button id="csv" class="secondary" disabled>匯出匿名 CSV</button><a class="logout" href="/cdn-cgi/access/logout">登出</a></div></div>
<p class="note">所有受測者使用相同八題。這裡呈現單次作答表現，無法衡量前後測進步；樣本數小時，只作描述。</p>
<p id="error" role="alert"></p><div id="content" aria-live="polite">讀取中…</div>
<section class="danger"><h2>刪除測試資料</h2><p>刪除後，主資料無法由此頁復原。Cloudflare D1 回復歷史依服務方案另外保存。</p><label for="before">刪除指定日期以前的紀錄（UTC，不含當日）</label><input type="date" id="before"><div class="actions" style="margin-top:16px"><button id="deleteOld" disabled>刪除指定日期以前</button><button id="deleteAll" disabled>刪除全部紀錄</button></div><p class="muted">必須先確認刪除範圍，再輸入「刪除」，才會執行。</p></section>
</main><script type="module">
const $=id=>document.getElementById(id);
const fmt=x=>x==null?'尚無資料':String(x);
const ratio=x=>x.denominator?x.count+' / '+x.denominator+'（'+x.percent+'%）':'尚無資料（0 / 0）';
const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const time=x=>x?new Date(x).toLocaleString('zh-TW',{timeZone:'Asia/Taipei',hour12:false}):'尚未完成';
const stages=['辨識','防護','回查'];let loading=false,removing=false;
function lock(ready){$('csv').disabled=!ready;$('deleteOld').disabled=!ready;$('deleteAll').disabled=!ready;}
const line=(name,value)=>'<div class="card"><strong>'+esc(name)+'</strong><span class="value">'+(value.denominator?value.count:'尚無資料')+'</span><small>'+ratio(value)+'</small></div>';
const scoreCard=(name,value,max)=>'<div class="card"><strong>'+esc(name)+'</strong><span class="value">'+fmt(value)+'</span><small>滿分 '+max+' 分</small></div>';
const table=(headers,rows)=>rows.length?'<div class="scroll"><table><thead><tr>'+headers.map(x=>'<th>'+esc(x)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map(x=>'<td>'+esc(x)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>':'<p class="empty">尚無資料</p>';
async function refresh(){if(loading||removing)return;loading=true;$('refresh').disabled=true;lock(false);try{
 const response=await fetch('/api/admin/stats',{cache:'no-store',redirect:'error'});
 if(!response.ok)throw Error('無法讀取統計（'+response.status+'）。請重新登入指定管理者帳號。');
 const s=await response.json();const catalog=new Map(s.catalog.map(q=>[q.id,q]));
 const question=(version,id)=>version===s.meta.quizVersion?catalog.get(id):null;
 $('error').textContent='';$('status').textContent='管理者：'+s.meta.email+' ｜ 更新：'+time(s.meta.updatedAt)+' ｜ 主資料保存 '+s.meta.retentionDays+' 天';
 $('content').innerHTML=
 '<section><h2>參與情況</h2><div class="grid">'+line('同意並開始',s.participation.started)+line('完成八題與回查',s.participation.completed)+line('尚未完成',s.participation.dropout)+'</div><p class="muted">分母為所有同意並開始的人數。尚未完成包含正在作答及中途退出者，不列入完成者分數統計。</p></section>'+
 '<section><h2>單次作答表現</h2><p>以下平均分數僅計算完成者，共 '+s.score.denominator+' 人。</p><div class="grid">'+scoreCard('平均總分',s.score.average,100)+scoreCard('平均辨識力',s.score.recognitionAverage,40)+scoreCard('平均防護能力',s.score.protectionAverage,40)+scoreCard('平均回查能力',s.score.reviewAverage,20)+'</div><h3>分數分布</h3>'+table(['分數範圍','人數 / 完成人數 / 百分比'],s.score.distribution.map(r=>[r.label,ratio(r)]))+'<h3>三階段答對率</h3>'+table(['階段','答對題數 / 作答題數 / 百分比'],s.stages.map(r=>[stages[r.stage],ratio(r)]))+'</section>'+
 '<section><h2>各題與完成時間</h2><p>完整流程時間中位數：'+fmt(s.durationMedianMinutes)+' 分鐘（僅完成者）。</p>'+table(['題庫版本','題目','階段','答對率','錯誤選項（人數 / 作答人數 / 百分比）'],s.items.map(r=>{const q=question(r.version,r.id);return [r.version,r.id+(q?' · '+q.title:''),stages[r.stage],ratio(r.correct),r.wrong.map(w=>{const text=q?.options.find(o=>o.id===w.id)?.text||w.id;return text+'：'+ratio(w);}).join('；')||(r.correct.count===r.correct.denominator?'無錯誤選項':'未選錯誤選項，可能漏選正確答案')];}))+'</section>'+
 '<section><h2>匿名測試紀錄</h2><p class="muted">每列一名同意者。時間使用臺北時區；完成編號只在成功送出後產生。匯出 CSV 保留 UTC 原始時間。</p>'+table(['完成編號','狀態','總分 / 100','辨識 / 40','防護 / 40','回查 / 20','開始時間','完成時間','題庫版本','匿名 ID'],s.records.map(r=>[r.number??'—',r.number===null?'尚未完成':'已完成',r.totalScore??'—',r.recognitionScore??'—',r.protectionScore??'—',r.reviewScore??'—',time(r.startedAt),time(r.completedAt),r.quizVersion,r.id]))+'</section>';
 lock(true);
}catch(error){$('error').textContent=error.message||'連線失敗，請稍後重試。';$('status').textContent='無法取得最新資料';$('content').textContent='目前無法顯示統計，請重新整理或重新登入。';}finally{loading=false;$('refresh').disabled=false;}}
$('refresh').onclick=refresh;$('csv').onclick=()=>{location.href='/api/admin/export';};
async function remove(all){if(removing||loading)return;const before=$('before').value;
 if(!all&&!/^\\d{4}-\\d{2}-\\d{2}$/.test(before)){alert('請選日期');return;}
 if(!confirm(all?'確定刪除所有測試紀錄？':'確定刪除 '+before+' 以前的測試紀錄？')||prompt('請輸入「刪除」確認')!=='刪除')return;
 removing=true;lock(false);$('refresh').disabled=true;try{
  const response=await fetch('/api/admin/sessions',{method:'DELETE',redirect:'error',headers:{'Content-Type':'application/json'},body:JSON.stringify(all?{all:true}:{before})});
  if(!response.ok)throw Error('刪除失敗（'+response.status+'）。');$('error').textContent='';
 }catch(error){$('error').textContent=error.message;removing=false;lock(true);$('refresh').disabled=false;return;}
 removing=false;await refresh();
}
$('deleteOld').onclick=()=>remove(false);$('deleteAll').onclick=()=>remove(true);refresh();
</script></body></html>`;
