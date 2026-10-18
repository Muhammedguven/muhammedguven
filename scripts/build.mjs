import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {card,svg,dateLabel,icons} from './lib/render.mjs';
import {validateCatalog} from './lib/catalog.mjs';
const configs=JSON.parse(await fs.readFile('data/apps.json','utf8'));
const catalog=validateCatalog(JSON.parse(await fs.readFile('data/catalog.json','utf8')),configs);
let html=await fs.readFile('src/template.html','utf8');
const values={APP_COUNT:catalog.apps.length,MOBILE_COUNT:catalog.apps.filter(a=>a.collection==='mobile').length,WATCH_COUNT:catalog.apps.filter(a=>a.collection==='watch').length,APP_CARDS:catalog.apps.map(card).join('\n'),UPDATED_DATE:dateLabel(catalog.generatedAt),YEAR:new Date().getUTCFullYear(),ARROW:svg('arrow'),SUN:svg('sun'),PHONE:svg('phone'),WATCH:svg('watch'),SEARCH:svg('search'),CLOSE:svg('close')};
html=html.replace(/\{\{(\w+)\}\}/g,(match,key)=>{if(!(key in values))throw new Error('Unknown template token '+key);return values[key];});
const themeScript=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const themeHash=createHash('sha256').update(themeScript).digest('base64');
const policy=`default-src 'self'; script-src 'self' 'sha256-${themeHash}'; style-src 'self' 'unsafe-inline'; img-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action https://formsubmit.co`;
html=html.replace('<meta charset="utf-8">',`<meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${policy}"><meta name="referrer" content="strict-origin-when-cross-origin">`);
await fs.writeFile('index.html',html);
await fs.writeFile('assets/catalog.js','window.APP_CATALOG='+JSON.stringify(catalog).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029')+';\nwindow.UI_ICONS='+JSON.stringify(icons)+';\n');
await fs.copyFile('src/site.css','assets/site.css');await fs.copyFile('src/site.js','assets/site.js');
await fs.rm('dist',{recursive:true,force:true});
await fs.mkdir('dist/assets',{recursive:true});await fs.copyFile('index.html','dist/index.html');
for(const file of ['site.css','site.js','catalog.js','kolapps-logo.png'])await fs.copyFile('assets/'+file,'dist/assets/'+file);
// Copy only referenced media, not research archives or stale CDN assets.
const paths=new Set(catalog.apps.flatMap(a=>Object.values(a.stores).flatMap(s=>s.media.map(m=>m.path))));
for(const p of paths){await fs.mkdir('dist/'+p.slice(0,p.lastIndexOf('/')),{recursive:true});await fs.copyFile(p,'dist/'+p);}
console.log(`Built ${catalog.apps.length} app cards and ${paths.size} optimized assets.`);
