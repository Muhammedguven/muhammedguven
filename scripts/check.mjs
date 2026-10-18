import fs from 'node:fs/promises';
import {validateCatalog} from './lib/catalog.mjs';
const configs=JSON.parse(await fs.readFile('data/apps.json','utf8'));
const data=validateCatalog(JSON.parse(await fs.readFile('data/catalog.json','utf8')),configs);
const html=await fs.readFile('dist/index.html','utf8');
if((html.match(/class="app-card"/g)||[]).length!==configs.length)throw new Error('Rendered app count mismatch');
if(html.includes('{{'))throw new Error('Unreplaced template token');
for(const app of data.apps)for(const [platform,store] of Object.entries(app.stores)){
  const url=new URL(store.url);if(url.protocol!=='https:'||url.hostname!==(platform==='apple'?'apps.apple.com':'play.google.com'))throw new Error('Invalid store URL');
  for(const media of store.media){
    if(!/^assets\/store\/[a-z0-9-]+\/(icon|banner|screenshot)-[a-f0-9]+\.webp$/.test(media.path))throw new Error('Invalid media path');
    const b=await fs.readFile('dist/'+media.path);
    if(b.toString('ascii',0,4)!=='RIFF'||b.toString('ascii',8,12)!=='WEBP')throw new Error('Invalid WebP image');
  }
}
console.log('Verified generated HTML, store links and all production images.');

const forbiddenKeys=new Set(['price','currency','password','accessToken','refreshToken','apiKey']);
function checkKeys(value){if(!value || typeof value!=='object')return;for(const [key,child] of Object.entries(value)){if(forbiddenKeys.has(key))throw new Error('Forbidden public data field: '+key);checkKeys(child);}}
checkKeys(data);
const outputs=await fs.readdir('dist');
if(outputs.sort().join(',')!=='assets,index.html')throw new Error('Unexpected deployment files');
if(!html.includes('Content-Security-Policy') || html.includes('mailto:'))throw new Error('Missing site security/contact requirements');
console.log('Verified public data fields and deployment allowlist.');
