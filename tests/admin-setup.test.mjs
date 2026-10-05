import test from 'node:test';
import assert from 'node:assert/strict';
import { configureAdmin } from '../scripts/configure-research-admin.mjs';
const config={account_id:'test-account',name:'test-worker',vars:{ADMIN_EMAILS:'admin@example.org',RETENTION_DAYS:'90',TEAM_DOMAIN:'https://REPLACE.cloudflareaccess.com',POLICY_AUD:'REPLACE'}};
const aud='a'.repeat(64);
test('admin configuration preserves database and only accepts Cloudflare issuer and real AUD format',()=>{
 const updated=configureAdmin(config,'study.cloudflareaccess.com',aud);
 assert.equal(updated.vars.TEAM_DOMAIN,'https://study.cloudflareaccess.com');
 assert.equal(updated.vars.POLICY_AUD,aud);assert.equal(updated.vars.ADMIN_EMAILS,config.vars.ADMIN_EMAILS);
 assert.equal(config.vars.POLICY_AUD,'REPLACE');assert.equal(updated.account_id,config.account_id);
 for(const domain of ['http://study.cloudflareaccess.com','https://study.cloudflareaccess.com.evil.test','https://study.cloudflareaccess.com/path','https://study.cloudflareaccess.com?x=1','https://user:password@study.cloudflareaccess.com'])assert.throws(()=>configureAdmin(config,domain,aud));
 assert.throws(()=>configureAdmin(config,'study.cloudflareaccess.com','REPLACE'));
 assert.throws(()=>configureAdmin({...config,vars:{ADMIN_EMAILS:'REPLACE'}},'study.cloudflareaccess.com',aud));
});
