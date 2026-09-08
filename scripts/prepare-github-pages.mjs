import { existsSync, renameSync, readFileSync } from 'node:fs';
import path from 'node:path';
const prefix=(process.env.NEXT_PUBLIC_BASE_PATH??'').replace(/\/$/,'');
if(prefix && !/^\/[A-Za-z0-9._-]+$/.test(prefix)) throw new Error('Invalid GitHub Pages repository path.');
if(prefix==='/.' || prefix==='/..') throw new Error('Invalid GitHub Pages repository path.');
const root=path.resolve('dist/client');
if(!existsSync(path.join(root,'index.html'))) throw new Error('Static export is missing index.html.');
// Vinext puts path-prefixed assets inside that path on disk. GitHub mounts the
// artifact itself at /repository/, so its _next directory belongs at the root.
if(prefix){
 const nested=path.join(root,prefix.slice(1),'_next');
 const target=path.join(root,'_next');
 if(existsSync(nested)){
  if(!path.resolve(nested).startsWith(root+path.sep)||!path.resolve(target).startsWith(root+path.sep)) throw new Error('Asset paths must remain inside the static output.');
  if(existsSync(target)) throw new Error('Unexpected duplicate static asset directories.');
  renameSync(nested,target);
 }
}
const html=readFileSync(path.join(root,'index.html'),'utf8');
const urls=[...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(match=>match[1]).filter(url=>url.includes('/_next/')||url.endsWith('/favicon.svg'));
if(!urls.length) throw new Error('No static assets referenced by the exported homepage.');
for(const url of urls){
 if(!url.startsWith(prefix+'/')) throw new Error('Asset does not use the GitHub Pages prefix: '+url);
 const relative=decodeURIComponent(url.slice(prefix.length+1).split('?')[0]);
 const filename=path.resolve(root,relative);
 if(!filename.startsWith(root+path.sep)||!existsSync(filename)) throw new Error('Missing exported asset: '+relative);
}
console.log('Static export verified: index.html and '+urls.length+' asset references.');
