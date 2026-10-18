export const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const plainText = value => String(value ?? '').replace(/<br\s*\/?\s*>/gi, '\n').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&nbsp;/g,' ').trim();
const finite = value => typeof value === 'number' && Number.isFinite(value) ? value : null;
export function normalizeStore(platform, raw, config, fetchedAt) {
  const apple = platform === 'apple';
  const title = plainText(apple ? raw.trackName : raw.title);
  const description = plainText(raw.description);
  if (!title || !description) throw new Error(`${config.slug}/${platform}: incomplete store response`);
  const count = finite(apple ? raw.userRatingCount : raw.ratings);
  const value = finite(apple ? raw.averageUserRating : raw.score);
  return {
    platform, country:config.country, language:config.language,
    url: apple ? config.appleUrl : config.googleUrl,
    title, description, summary:plainText(raw.summary),
    rating: value && value > 0 && value <= 5 && count !== 0 ? value : null,
    ratingCount: count,
    installs:apple ? null : raw.installs || null,
    version:(raw.version && raw.version !== 'VARY' && raw.version !== 'Varies with device') ? raw.version : null,
    updated: apple ? raw.currentVersionReleaseDate || null : raw.updated ? new Date(raw.updated).toISOString() : null,
    releaseNotes:plainText(apple ? raw.releaseNotes : raw.recentChanges),
    fetchedAt, reviews:[], reviewsFetchedAt:null, media:[]
  };
}
export function assembleApp(config, stores) {
  return {...config, stores, summary: stores.google?.summary || stores.apple?.summary || plainText(stores.google?.description || stores.apple?.description).split(/\n/)[0].slice(0,180)};
}
export function mediaIdentity(url) {
  if (url.includes('mzstatic.com')) return url.replace(/\/[^/]+\.(jpg|png|jpeg|webp)(\?.*)?$/i,'');
  return url.split('=')[0];
}
export function uniqueMedia(media) {
  const seen = new Set();
  return media.filter(m => { const key=m.kind+':'+mediaIdentity(m.sourceUrl);if(seen.has(key))return false;seen.add(key);return true; });
}
export function appleWebMedia(html) {
  const match = html.match(/<script\b(?=[^>]*\bid=["']serialized-server-data["'])[^>]*>([\s\S]*?)<\/script>/i);
  if (!match) throw new Error('Apple web media payload missing');
  const result=[];
  function walk(value,path='') {
    if(!value || typeof value!=='object')return;
    const a=value.screenshot;
    if(a?.template && a.width && a.height) {
      const scale=Math.min(1,1600/Math.max(a.width,a.height));
      result.push({kind:'screenshot',device:path.includes('watch')?'watch':path.includes('ipad')?'ipad':path.includes('iphone')?'iphone':'unspecified',sourceUrl:a.template.replace('{w}',Math.round(a.width*scale)).replace('{h}',Math.round(a.height*scale)).replace('{c}','bb').replace('{f}','jpg')});
    }
    for(const [key,child] of Object.entries(value)) walk(child,`${path}/${key}`);
  }
  walk(JSON.parse(match[1]));
  return uniqueMedia(result);
}
export function appleLookupMedia(raw) {
  return [
    ...(raw.artworkUrl512?[{kind:'icon',sourceUrl:raw.artworkUrl512}]:[]),
    ...(raw.screenshotUrls||[]).map(sourceUrl=>({kind:'screenshot',device:'unspecified',sourceUrl})),
    ...(raw.ipadScreenshotUrls||[]).map(sourceUrl=>({kind:'screenshot',device:'ipad',sourceUrl}))
  ];
}
export function googleMedia(raw) {
  return uniqueMedia([
    ...(raw.icon?[{kind:'icon',sourceUrl:raw.icon.split('=')[0]+'=w512'}]:[]),
    ...(raw.headerImage?[{kind:'banner',sourceUrl:raw.headerImage.split('=')[0]+'=w1024'}]:[]),
    ...(raw.screenshots||[]).map(sourceUrl=>({kind:'screenshot',device:'unspecified',sourceUrl:sourceUrl.split('=')[0]+'=w1200'}))
  ]);
}
export function normalizeAppleReviews(payload, config) {
  let entries=payload.feed?.entry||[];
  if(!Array.isArray(entries))entries=[entries];
  return entries.filter(r=>r['im:rating']).map(r=>({id:r.id?.label,author:r.author?.name?.label||'App Store user',title:plainText(r.title?.label),text:plainText(r.content?.label),rating:Number(r['im:rating'].label),date:r.updated?.label||null,url:config.appleUrl,country:config.country,language:config.language})).filter(r=>r.id && r.text && r.rating>=1 && r.rating<=5);
}
export function normalizeGoogleReviews(payload,config) {
  return (payload.data||[]).map(r=>({id:r.id,author:r.userName||'Google Play user',title:'',text:plainText(r.text),rating:r.score,date:r.date?new Date(r.date).toISOString():null,url:/^https:\/\/play\.google\.com\//.test(r.url||'')?r.url:config.googleUrl,country:config.country,language:config.language})).filter(r=>r.id && r.text && r.rating>=1 && r.rating<=5);
}
// A bounded current sample. Never advertise this as all historical reviews.
export function reviewSample(reviews) {
  return Array.from(new Map(reviews.map(r=>[r.id,r])).values()).slice(0,100);
}
export function validateCatalog(catalog,configs) {
  if(catalog.apps.length!==configs.length)throw new Error('Catalog is missing configured apps');
  for(const cfg of configs){
    const app=catalog.apps.find(a=>a.slug===cfg.slug);
    if(!app)throw new Error(`Missing app ${cfg.slug}`);
    for(const platform of ['apple','google']) {
      if(platform==='apple'&&!cfg.appleId)continue;
      const store=app.stores[platform];
      if(!store?.title || !store.description || store.country!==cfg.country)throw new Error(`Invalid ${cfg.slug}/${platform} store`);
      if(!store.media.some(m=>m.kind==='icon' && m.path))throw new Error(`Missing icon for ${cfg.slug}/${platform}`);
      if(store.rating!==null && (store.rating<0 || store.rating>5))throw new Error('Invalid rating');
    }
  }
  return catalog;
}
