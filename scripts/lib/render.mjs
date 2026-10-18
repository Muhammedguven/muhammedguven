import {escapeHtml as h} from './catalog.mjs';
export const icons={
 arrow:'<path d="M7 17 17 7M7 7h10v10"/>',
 search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19M5 19l1.4-1.4M17.6 6.4 19 5"/>',
 moon:'<path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z"/>',
 close:'<path d="m6 6 12 12M18 6 6 18"/>',
 chevron:'<path d="m9 5 7 7-7 7"/>',
 star:'<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9Z"/>',
 phone:'<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M10 18h4"/>',
 watch:'<rect x="5" y="6" width="14" height="12" rx="4"/><path d="m8 6 1-4h6l1 4M8 18l1 4h6l1-4m3-9h2v4h-2"/>',
 apple:'<path fill="currentColor" stroke="none" d="M17.1 12.3c0-2 1.6-3 1.7-3.1-1-1.4-2.5-1.6-3-1.6-1.3-.1-2.5.8-3.1.8-.7 0-1.7-.8-2.8-.7-1.4 0-2.7.8-3.4 2-1.5 2.5-.4 6.2 1 8.3.7 1 1.5 2 2.6 2 1 0 1.4-.7 2.7-.7s1.7.7 2.8.6c1.1 0 1.8-1 2.5-2 .8-1.1 1.1-2.2 1.1-2.3-.1 0-2.1-.8-2.1-3.3ZM15 6.2c.6-.8 1.1-1.9 1-3-.9 0-2.1.6-2.8 1.4-.6.7-1.2 1.8-1 2.9 1 .1 2.1-.5 2.8-1.3Z"/>',
 play:'<path d="m5 3 15 9-15 9Z"/><path d="m5 3 10 12m-10 6 10-12"/>',
 download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
 globe:'<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
 check:'<path d="m5 12 4 4L19 6"/>'
};
export const svg=(name,cls='')=>`<svg class="icon ${cls}" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]||''}</svg>`;
export const imageOf=(app,kind)=>app.stores.google?.media.find(m=>m.kind===kind)||app.stores.apple?.media.find(m=>m.kind===kind);
export const dateLabel=value=>value?new Date(value).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}):'';
export function card(app,index){
  const icon=imageOf(app,'icon'),banner=imageOf(app,'banner');
  const rating=platform=>{const s=app.stores[platform];return s?`<div class="card-stat"><span>${platform==='apple'?'App Store':'Google Play'} <span class="market">${s.country.toUpperCase()}</span></span><strong>${s.rating!==null?`${svg('star','star')} ${s.rating.toFixed(1)}`:'<span class="unrated">No rating data</span>'}</strong></div>`:'';};
  const buttons=Object.entries(app.stores).map(([p,s])=>`<a class="store-link" href="${h(s.url)}" target="_blank" rel="noopener noreferrer" aria-label="${h(app.name)} on ${p==='apple'?'the App Store':'Google Play'}">${svg(p==='apple'?'apple':'play')}<span>${p==='apple'?'App Store':'Google Play'}</span>${svg('arrow','store-arrow')}</a>`).join('');
  return `<article class="app-card" data-app="${h(app.slug)}" data-collection="${h(app.collection)}">
    <button class="card-cover" data-open="${h(app.slug)}" aria-label="Explore ${h(app.name)}">
      ${banner?`<img src="${h(banner.path)}" alt="${h(app.name)} app preview" width="1024" height="500" ${index<3?'fetchpriority="high"':'loading="lazy"'} decoding="async">`:`<img src="${h(icon.path)}" alt="${h(app.name)}" loading="lazy">`}
      <span class="cover-action">Explore app ${svg('arrow')}</span>
    </button>
    <div class="card-body">
      <div class="app-heading"><img class="app-logo" src="${h(icon.path)}" alt="" width="52" height="52" loading="lazy"><div><span class="category">${h(app.category)}${app.availability?' · Türkiye only':''}</span><h3><button data-open="${h(app.slug)}">${h(app.name)}</button></h3></div><span class="device-icon" title="${app.collection==='watch'?'Watch app':'Mobile app'}">${svg(app.collection==='watch'?'watch':'phone')}</span></div>
      <p class="app-summary">${h(app.summary)}</p>
      <div class="card-stats">${rating('apple')}${rating('google')}<div class="card-stat"><span>Play installs</span><strong>${h(app.stores.google?.installs||'—')}</strong></div></div>
      <div class="store-links">${buttons}</div>
    </div>
  </article>`;
}
