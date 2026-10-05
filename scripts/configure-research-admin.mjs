import { readFile, writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { createInterface } from 'node:readline/promises';
import { pathToFileURL } from 'node:url';

export function configureAdmin(config, teamDomain, audience) {
 const domain = new URL(teamDomain.startsWith('https://') ? teamDomain : 'https://' + teamDomain);
 if (domain.protocol !== 'https:' || !/^[a-z0-9][a-z0-9-]*\.cloudflareaccess\.com$/i.test(domain.hostname)
  || domain.port || domain.username || domain.password || domain.pathname !== '/' || domain.search || domain.hash) {
  throw Error('請填 Cloudflare 的團隊網域，例如 https://你的團隊.cloudflareaccess.com。');
 }
 if (!/^[a-f0-9]{64}$/i.test(audience)) throw Error('AUD 應為應用程式詳細資訊中的 64 字元值，請確認沒有複製到 API token。');
 if (!config.account_id || !config.vars?.ADMIN_EMAILS || config.vars.ADMIN_EMAILS.includes('REPLACE')) throw Error('請先在本機部署設定填入帳號及指定管理者信箱。');
 return { ...config, vars: { ...config.vars, TEAM_DOMAIN: domain.origin, POLICY_AUD: audience } };
}

async function main() {
 const { values } = parseArgs({ options: { 'team-domain': { type: 'string' }, aud: { type: 'string' } } });
 const location = new URL('../research/wrangler.jsonc', import.meta.url);
 let config;
 try { config = JSON.parse(await readFile(location, 'utf8')); }
 catch { throw Error('請先依部署說明建立本機 research/wrangler.jsonc；此檔不可提交 GitHub。'); }
 const prompt = createInterface({ input: process.stdin, output: process.stdout });
 try {
  const domain = values['team-domain'] || (process.stdin.isTTY ? await prompt.question('Cloudflare 團隊網域：') : '');
  const audience = values.aud || (process.stdin.isTTY ? await prompt.question('Access 應用程式 AUD：') : '');
  if (!domain || !audience) throw Error('請提供 --team-domain 和 --aud，或在終端機依提示填入。不用提供密碼或 API token。');
  const updated = configureAdmin(config, domain.trim(), audience.trim());
  await writeFile(location, JSON.stringify(updated, null, 2) + '\n');
  console.log('已更新本機管理者驗證設定。此步驟尚未部署，也不會建立 Cloudflare Access 規則。');
  console.log('下一步：npx wrangler deploy --config research/wrangler.jsonc');
 } finally { prompt.close(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
 main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
