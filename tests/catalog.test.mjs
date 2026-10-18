import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {normalizeStore,escapeHtml,appleWebMedia,normalizeGoogleReviews,reviewSample,validateCatalog} from '../scripts/lib/catalog.mjs';
import {saveMedia} from '../scripts/lib/media.mjs';
const cfg={slug:'testy',country:'tr',language:'tr',googleUrl:'https://play.google.com/store/apps/details?id=org.kolapps.testy'};
test('missing ratings remain unknown and prices never enter the public schema',()=>{
 const s=normalizeStore('google',{title:'Testy',description:'Hello',price:12,currency:'TRY'},cfg,'2026-10-18');
 assert.equal(s.rating,null);assert.equal(s.ratingCount,null);assert.equal(s.country,'tr');assert.equal('price' in s,false);assert.equal('currency' in s,false);
 assert.throws(()=>normalizeStore('google',{title:'Testy'},cfg,''),/incomplete/);
});
test('untrusted store text is escaped for HTML',()=>{
 assert.equal(escapeHtml('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
});
test('Apple watch media uses web payload and deduplicates size variants',()=>{
 const screenshot={template:'https://is1-ssl.mzstatic.com/image/a/{w}x{h}{c}.{f}',width:400,height:500};
 const result=appleWebMedia(`<script id="serialized-server-data">${JSON.stringify({watch:[{screenshot},{screenshot}]})}</script>`);
 assert.equal(result.length,1);assert.equal(result[0].device,'watch');assert.match(result[0].sourceUrl,/400x500bb.jpg$/);
 assert.throws(()=>appleWebMedia('<html>Error</html>'),/payload missing/);
});
test('review links cannot inject protocols or arbitrary hosts',()=>{
 const reviews=normalizeGoogleReviews({data:[{id:'1',text:'Great app!',score:5,url:'javascript:alert(1)'},{id:'2',text:'No',score:8}]},cfg);
 assert.equal(reviews.length,1);assert.equal(reviews[0].url,cfg.googleUrl);assert.equal(reviewSample([...reviews,...reviews]).length,1);
});
test('catalog rejects wrong market and missing app data',async()=>{
 const configs=JSON.parse(await fs.readFile('data/apps.json','utf8'));
 const data=JSON.parse(await fs.readFile('data/catalog.json','utf8'));
 assert.equal(validateCatalog(data,configs).apps.length,13);
 data.apps.find(a=>a.slug==='testy').stores.google.country='us';
 assert.throws(()=>validateCatalog(data,configs),/Invalid testy/);
});
test('media importer rejects non-store hosts before fetching',async()=>{
 await assert.rejects(saveMedia('test',{kind:'icon',sourceUrl:'https://example.com/a.png'}),/Unexpected media host/);
 await assert.rejects(saveMedia('test',{kind:'icon',sourceUrl:'http://is1.mzstatic.com/a.png'}),/Unexpected media host/);
});

test('store outages preserve last good data without advancing timestamps',async()=>{
 const {withStoreFallback}=await import('../scripts/lib/fallback.mjs');
 const old={country:'tr',fetchedAt:'2026-10-01',media:[{kind:'icon'}]};
 const result=await withStoreFallback(cfg,'google',old,async()=>{throw new Error('offline');},()=>{});
 assert.equal(result.refreshed,false);assert.equal(result.store,old);assert.equal(result.store.fetchedAt,'2026-10-01');
 await assert.rejects(withStoreFallback(cfg,'google',{country:'us'},async()=>{throw new Error('offline');},()=>{}),/No fallback/);
 await assert.rejects(withStoreFallback(cfg,'google',null,async()=>{throw new Error('offline');},()=>{}),/No fallback/);
 const fresh={country:'tr',fetchedAt:'2026-10-18'};
 assert.deepEqual(await withStoreFallback(cfg,'google',old,async()=>fresh,()=>{}),{store:fresh,refreshed:true});
});

test('first release uses original launch dates across English and Turkish stores',async()=>{
 const {releaseDate,firstRelease}=await import('../scripts/lib/catalog.mjs');
 assert.equal(releaseDate('17 Kas 2024'),'2024-11-17');
 assert.equal(releaseDate('Sep 27, 2026'),'2026-09-27');
 assert.equal(releaseDate('2025-02-30'),null);
 assert.equal(releaseDate(undefined),null);
 assert.equal(firstRelease({apple:{released:'2025-01-02',updated:'2026-10-18'},google:{released:'2024-11-17'}}),'2024-11-17');
 assert.equal(firstRelease({google:{updated:'2026-10-18'}}),null);
 const s=normalizeStore('google',{title:'Testy',description:'Hello',released:'17 Kas 2024',updated:1790976940000},cfg,'2026-10-18');
 assert.equal(s.released,'2024-11-17');assert.notEqual(s.released,s.updated);
});
