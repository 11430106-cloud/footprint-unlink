import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
const runtimeRequire=createRequire(import.meta.url);
const {chromium}=runtimeRequire(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve('dist/client');
const server=createServer(async(req,res)=>{
 try{
  let pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/footprint-unlink/,'');
  if(pathname==='/'||pathname==='')pathname='/index.html';
  const file=path.resolve(root,'.'+pathname);
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  const content=await readFile(file);
  res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(content);
 }catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try{
 browser=await chromium.launch({...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{}),headless:true});
 const page=await browser.newPage();let starts=0,completes=0,failStart=true;
 await page.route('https://footprint-research.footprint-unlink-11430106.workers.dev/api/**',async route=>{
  const action=new URL(route.request().url()).pathname;
  if(action==='/api/start'){
   starts++;assert.deepEqual(route.request().postDataJSON(),{consent:true});
   await route.fulfill({status:failStart?503:200,json:failStart?{error:'測試連線失敗'}:{id:'browser-test',token:'mock-session'}});
  }else if(action==='/api/complete'){completes++;await route.fulfill({json:{number:1}});}
  else await route.fulfill({json:{stage:completes?'done':'playing',number:completes?1:null}});
 });
 const url='http://127.0.0.1:'+server.address().port+'/footprint-unlink/?legacy=1';
 await page.goto(url);
 const button=page.getByRole('button',{name:'同意並開始測驗',exact:true});
 await button.waitFor();assert.equal(await button.isDisabled(),true);assert.equal(starts,0);
 assert.equal(await page.getByRole('button',{name:'不同意，繼續一般體驗',exact:true}).count(),0);
 assert.equal(await page.getByRole('button',{name:'開始體驗',exact:true}).count(),0);
 const checkbox=page.getByRole('checkbox');await checkbox.check();assert.equal(await button.isEnabled(),true);
 await checkbox.uncheck();assert.equal(await button.isDisabled(),true);assert.equal(starts,0);
 await checkbox.check();await button.click();await page.getByRole('alert').waitFor();
 assert.equal(await page.getByRole('button',{name:'開始體驗',exact:true}).count(),0);
 failStart=false;await button.click();await page.getByRole('button',{name:'開始體驗',exact:true}).waitFor();
 assert.equal(starts,2);await page.reload();await page.getByRole('button',{name:'開始體驗',exact:true}).waitFor();assert.equal(starts,2);
 await page.getByRole('button',{name:'開始體驗',exact:true}).click();await page.getByRole('button',{name:'開始辨識',exact:true}).click();
 const questions=JSON.parse(await readFile('data/questions.json','utf8'));
 for(const q of questions){
  for(const o of q.options.filter(o=>o.correct))await page.getByRole(q.type==='single'?'radio':'checkbox').nth(q.options.indexOf(o)).click();
  await page.getByRole('button',{name:'確認答案',exact:true}).click();
  await page.getByRole('button',{name:/^(下一題|進入第二階段：防護|進入第三階段：回查|第四階段：回到自己)$/}).click();
 }
 await page.getByRole('checkbox',{name:'以上皆無',exact:true}).click();
 await page.getByRole('button',{name:'查看結果與我的回查建議',exact:true}).click();
 await page.getByText('已送入統計後台。',{exact:false}).waitFor();assert.equal(completes,1);
 await page.getByRole('button',{name:'下一位受測者',exact:true}).click();
 await button.waitFor();assert.equal(await button.isDisabled(),true);assert.equal(await checkbox.isChecked(),false);
 assert.equal(await page.getByRole('button',{name:'開始體驗',exact:true}).count(),0);
 console.log('PASS: 未同意無法作答、勾選可取消、未同意無送出、連線失敗不進入、同意後完整八題送出、續填不重複建立、下一位重新同意。測試只使用模擬 API。');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
