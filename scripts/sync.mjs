import fs from 'node:fs/promises';
import gplay from 'google-play-scraper';
import {withStoreFallback} from './lib/fallback.mjs';
import {normalizeStore,assembleApp,appleLookupMedia,appleWebMedia,googleMedia,uniqueMedia,normalizeAppleReviews,normalizeGoogleReviews,reviewSample,validateCatalog,mediaIdentity} from './lib/catalog.mjs';
import {fetchText,saveMedia,mapLimit} from './lib/media.mjs';
const configs=JSON.parse(await fs.readFile('data/apps.json','utf8'));
const previous=JSON.parse(await fs.readFile('data/catalog.json','utf8'));
const now=new Date().toISOString();
const warnings=[];let successes=0;
const warn=(slug,stage,error)=>{const msg=`${slug}: ${stage} — ${error.message}`;warnings.push(msg);console.warn(msg);};
const appleData=new Map();
for(const country of new Set(configs.filter(c=>c.appleId).map(c=>c.country))){
  const ids=configs.filter(c=>c.appleId&&c.country===country).map(c=>c.appleId).join(',');
  try{
    const data=JSON.parse(await fetchText(`https://itunes.apple.com/lookup?id=${ids}&country=${country}`));
    for(const app of data.results||[])appleData.set(`${country}:${app.trackId}`,app);
  }catch(e){warn(country,'Apple lookup',e);}
}
async function collectMedia(cfg,platform,raw,old){
  let requested=platform==='google'?googleMedia(raw):appleLookupMedia(raw);
  if(platform==='apple'){
    try{requested=uniqueMedia([...await appleWebMedia(await fetchText(cfg.appleUrl)),...requested]);}
    catch(e){warn(cfg.slug,'Apple screenshot page; keeping previous gallery',e);requested=uniqueMedia([...(old?.media||[]),...requested]);}
  }
  const media=await mapLimit(requested,3,async item=>{
    try{return await saveMedia(cfg.slug,item);}catch(e){
      warn(cfg.slug,`${platform} image`,e);
      return old?.media?.find(m=>m.kind===item.kind&&mediaIdentity(m.sourceUrl)===mediaIdentity(item.sourceUrl))||null;
    }
  });
  const usable=media.filter(Boolean);
  // Do not lose a whole media kind when a CDN is unavailable.
  for(const kind of ['icon','banner','screenshot'])if(!usable.some(m=>m.kind===kind))usable.push(...(old?.media||[]).filter(m=>m.kind===kind));
  return uniqueMedia(usable);
}
async function collectStore(cfg,platform,old){
  const result=await withStoreFallback(cfg,platform,old,async()=>{
    const raw=platform==='apple'?appleData.get(`${cfg.country}:${cfg.appleId}`):await gplay.app({appId:cfg.googlePlayId,country:cfg.country,lang:cfg.language,requestOptions:{timeout:{request:20000},retry:{limit:1}}});
    if(!raw)throw new Error('No matching store record');
    const store=normalizeStore(platform,raw,cfg,now);
    store.media=await collectMedia(cfg,platform,raw,old);
    store.reviews=old?.reviews||[];store.reviewsFetchedAt=old?.reviewsFetchedAt||null;
    try{
      if(platform==='apple'){
        const payload=JSON.parse(await fetchText(`https://itunes.apple.com/${cfg.country}/rss/customerreviews/page=1/id=${cfg.appleId}/sortby=mostrecent/json`));
        if(!payload.feed)throw new Error('Invalid Apple review response');
        store.reviews=reviewSample(normalizeAppleReviews(payload,cfg));
      }else{
        const payload=await gplay.reviews({appId:cfg.googlePlayId,country:cfg.country,lang:cfg.language,sort:gplay.sort.NEWEST,num:50,requestOptions:{timeout:{request:20000},retry:{limit:1}}});
        if(!Array.isArray(payload.data))throw new Error('Invalid Google review response');
        store.reviews=reviewSample(normalizeGoogleReviews(payload,cfg));
      }
      store.reviewsFetchedAt=now;
    }catch(e){warn(cfg.slug,`${platform} reviews; keeping previous sample`,e);}
    if(!store.media.some(m=>m.kind==='icon'))throw new Error('No usable icon');
    return store;
  },warn);
  if(result.refreshed)successes++;
  return result.store;
}
const apps=[];
for(const cfg of configs){
  const old=previous.apps.find(a=>a.slug===cfg.slug);const stores={};
  for(const platform of ['apple','google']){
    if(platform==='apple'&&!cfg.appleId)continue;
    stores[platform]=await collectStore(cfg,platform,old?.stores[platform]);
  }
  apps.push(assembleApp(cfg,stores));console.log(`Synced ${cfg.name} (${cfg.country.toUpperCase()})`);
}
if(!successes)throw new Error('All sources failed; not replacing the snapshot');
const catalog=validateCatalog({schemaVersion:1,generatedAt:now,apps},configs);
await fs.writeFile('data/catalog.json.tmp',JSON.stringify(catalog,null,2)+'\n');
await fs.rename('data/catalog.json.tmp','data/catalog.json');
if(process.env.GITHUB_STEP_SUMMARY)await fs.appendFile(process.env.GITHUB_STEP_SUMMARY,`## Store sync\n\n${successes} store records refreshed. ${warnings.length} warnings. Last good data retained for failed sources.\n\n${warnings.map(w=>'- '+w.replace(/[<>]/g,'')).join('\n')}\n`);
console.log(`Finished: ${successes} stores refreshed; ${warnings.length} warnings.`);
