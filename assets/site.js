(() => {
  'use strict';
  const catalog = window.APP_CATALOG;
  const apps = catalog.apps;
  const bySlug = new Map(apps.map(app => [app.slug, app]));
  const $ = selector => document.querySelector(selector);
  const h = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const svg = (name, cls = '') => `<svg class="icon ${cls}" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${window.UI_ICONS[name] || ''}</svg>`;
  const number = value => new Intl.NumberFormat('en-US').format(value);
  const date = value => value && Number.isFinite(new Date(value).getTime()) ? new Date(value).toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric',timeZone:'UTC'}) : 'Not provided';
  const storeName = platform => platform === 'apple' ? 'App Store' : 'Google Play';
  const imageOf = (app, kind) => app.stores.google?.media.find(m => m.kind === kind) || app.stores.apple?.media.find(m => m.kind === kind);
  const dialog = $('#app-dialog');
  const imageDialog = $('#image-dialog');
  let currentApp = null;
  let currentStore = null;
  let collection = 'all';
  const search = $('#app-search');
  const platformFilter = $('#store-filter');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const systemTheme = matchMedia('(prefers-color-scheme: dark)');
  let explicitTheme = false;
  try { explicitTheme = ['light','dark'].includes(localStorage.getItem('kolapps-theme')); } catch {}

  function updateThemeButton() {
    const dark = document.documentElement.dataset.theme === 'dark';
    const button = $('#theme-toggle');
    button.innerHTML = svg(dark ? 'sun' : 'moon');
    button.setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} mode`);
    button.title = `Switch to ${dark ? 'light' : 'dark'} mode`;
    $('meta[name="theme-color"]').content = dark ? '#101410' : '#f7f8f5';
  }
  $('#theme-toggle').addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    explicitTheme = true;
    try { localStorage.setItem('kolapps-theme', next); } catch {}
    updateThemeButton();
  });
  systemTheme.addEventListener('change', event => {
    if (!explicitTheme) { document.documentElement.dataset.theme = event.matches ? 'dark' : 'light'; updateThemeButton(); }
  });
  updateThemeButton();

  function filterApps() {
    const term = search.value.trim().toLocaleLowerCase();
    let count = 0;
    document.querySelectorAll('.app-card').forEach(card => {
      const app = bySlug.get(card.dataset.app);
      const matchesCollection = collection === 'all' || collection === app.collection;
      const matchesStore = platformFilter.value === 'all' || !!app.stores[platformFilter.value];
      const text = `${app.name} ${app.summary} ${app.category}`.toLocaleLowerCase();
      const visible = matchesCollection && matchesStore && (!term || text.includes(term));
      card.hidden = !visible;
      if (visible) count++;
    });
    $('#empty-state').hidden = count !== 0;
    $('#results-status').textContent = `${count} ${count === 1 ? 'app' : 'apps'} found`;
  }
  document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
    collection = button.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach(b => {
      b.classList.toggle('active', b === button);
      b.setAttribute('aria-pressed', String(b === button));
    });
    filterApps();
  }));
  search.addEventListener('input', filterApps);
  platformFilter.addEventListener('change', filterApps);
  $('#reset-filters').addEventListener('click', () => {
    search.value = ''; platformFilter.value = 'all';
    $('[data-filter="all"]').click(); search.focus();
  });
  document.addEventListener('keydown', event => {
    if (event.key === '/' && !dialog.open && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && !event.metaKey && !event.ctrlKey) {
      event.preventDefault(); search.focus();
    }
  });

  function storeLinks(app) {
    return Object.entries(app.stores).map(([platform, store]) => `<a class="store-link" href="${h(store.url)}" target="_blank" rel="noopener noreferrer">${svg(platform === 'apple' ? 'apple' : 'play')}<span>${storeName(platform)}</span>${svg('arrow','store-arrow')}</a>`).join('');
  }
  function openApp(slug, push = true) {
    const app = bySlug.get(slug);
    if (!app) return;
    currentApp = app;
    currentStore = app.stores.apple ? 'apple' : 'google';
    const icon = imageOf(app, 'icon');
    $('#app-detail').innerHTML = `<div class="dialog-topbar"><span>The collection / ${h(app.name)}</span><button class="icon-button" data-close-app aria-label="Close app details">${svg('close')}</button></div>
      <div class="detail-main"><div class="detail-heading"><img class="detail-icon" src="${h(icon.path)}" alt="" width="88" height="88"><div><span class="category">${h(app.category)} · ${app.collection === 'watch' ? 'WATCH APP' : 'MOBILE APP'}${app.availability ? ' · TÜRKİYE ONLY' : ''}</span><h2 id="detail-title">${h(app.name)}</h2><p class="detail-tagline">${h(app.summary)}</p></div></div>
      <div class="detail-stores">${storeLinks(app)}</div>
      <div class="detail-store-tabs" role="tablist" aria-label="Store details">${Object.keys(app.stores).map(platform => `<button role="tab" id="tab-${platform}" data-store="${platform}" aria-controls="store-panel" aria-selected="${platform === currentStore}">${svg(platform === 'apple' ? 'apple' : 'play')}${storeName(platform)}</button>`).join('')}<span class="store-country">${svg('globe')} ${app.country === 'tr' ? 'Türkiye' : 'United States'} storefront</span></div>
      <div id="store-panel" role="tabpanel" tabindex="0"></div></div>`;
    renderStore();
    if (!dialog.open) dialog.showModal();
    document.body.classList.add('has-dialog');
    if (push) history.pushState(null, '', `#app=${encodeURIComponent(slug)}`);
  }
  function renderStore() {
    const app = currentApp;
    const store = app.stores[currentStore];
    document.querySelectorAll('[data-store]').forEach(tab => {
      tab.setAttribute('aria-selected', String(tab.dataset.store === currentStore));
      tab.tabIndex = tab.dataset.store === currentStore ? 0 : -1;
    });
    const panel = $('#store-panel');
    panel.setAttribute('aria-labelledby', `tab-${currentStore}`);
    const screenshots = store.media.filter(m => m.kind === 'screenshot');
    const metric = (label, value, caption) => `<div class="detail-metric"><span>${h(label)}</span><strong>${h(value)}</strong><small>${h(caption)}</small></div>`;
    const reviewsAge = store.reviewsFetchedAt ? Date.now() - new Date(store.reviewsFetchedAt).getTime() : Infinity;
    const reviews = reviewsAge < 30*86400000 ? store.reviews.filter(r => r.rating === 5 && r.text.length >= 15).slice(0,6) : [];
    panel.innerHTML = `<div class="detail-metrics">
      ${metric('Store rating', store.rating !== null ? `${store.rating.toFixed(1)} / 5` : 'Not available', store.ratingCount !== null ? `${number(store.ratingCount)} ratings` : 'Rating data not available')}
      ${metric(currentStore === 'google' ? 'Google Play installs' : 'Category', currentStore === 'google' ? store.installs || 'Not provided' : app.category, currentStore === 'google' ? 'Public install range' : 'On the App Store')}
      ${metric('Latest version',store.version || 'See store',date(store.updated))}
      </div>
      <div class="detail-section-header"><h3>A closer look</h3>${screenshots.length ? `<div class="gallery-arrows"><button class="icon-button previous" data-gallery="-1" aria-label="Previous screenshots">${svg('chevron')}</button><button class="icon-button" data-gallery="1" aria-label="Next screenshots">${svg('chevron')}</button></div>` : ''}</div>
      <div class="gallery" id="screenshot-gallery" aria-label="${h(storeName(currentStore))} screenshots">${screenshots.map((m,i) => `<button class="gallery-item" data-image="${h(m.path)}" data-caption="${h(app.name)} · ${storeName(currentStore)} · ${i+1} / ${screenshots.length}" aria-label="Enlarge ${h(app.name)} screenshot ${i+1}"><img src="${h(m.path)}" alt="${h(app.name)} ${m.device === 'watch' ? 'watch ' : ''}screenshot ${i+1}" loading="lazy" decoding="async"></button>`).join('')}</div>
      <p class="gallery-note">${screenshots.length ? `${screenshots.length} screenshots from ${storeName(currentStore)}. Select an image for a closer look.` : 'Screenshots are not available from this store right now.'}</p>
      <div class="detail-text-grid"><section class="description-section"><h3>About this app</h3><p id="description-text" class="description-text ${store.description.length > 650 ? 'collapsed' : ''}">${h(store.description)}</p>${store.description.length > 650 ? '<button class="read-more" id="read-more" aria-expanded="false" aria-controls="description-text">Read full description</button>' : ''}</section><section class="release-section"><h3>What’s new${store.version ? ` · ${h(store.version)}` : ''}</h3><time>${date(store.updated)}</time><p>${h(store.releaseNotes || 'Visit the store for the latest updates and release information.')}</p><a class="text-link" href="${h(store.url)}" target="_blank" rel="noopener noreferrer">View on ${storeName(currentStore)} ${svg('arrow')}</a></section></div>
      ${reviews.length ? `<section class="reviews-section"><div class="detail-section-header"><h3>Selected 5-star reviews</h3></div><p class="review-intro">A few words from ${storeName(currentStore)} users. Original review text; this is a selection, not the full review history.</p><div class="reviews-grid">${reviews.map(r => `<article class="review-card"><span class="review-stars" aria-label="5 out of 5 stars">★★★★★</span><blockquote>${r.title ? `<strong>${h(r.title)}</strong><br>` : ''}${h(r.text)}</blockquote><footer><span>${h(r.author)} · ${date(r.date)}</span><a href="${h(r.url)}" target="_blank" rel="noopener noreferrer" aria-label="View review source on ${storeName(currentStore)}">${storeName(currentStore)} ↗</a></footer></article>`).join('')}</div></section>` : ''}
      <p class="detail-updated">${storeName(currentStore)} · ${store.country.toUpperCase()} · Last checked ${date(store.fetchedAt)}${store.reviewsFetchedAt ? ` · Reviews checked ${date(store.reviewsFetchedAt)}` : ''}</p>`;
    const gallery = $('#screenshot-gallery');
    const updateGalleryArrows = () => {
      const previous = $('[data-gallery="-1"]'), next = $('[data-gallery="1"]');
      if (!previous || !next) return;
      previous.disabled = gallery.scrollLeft <= 2;
      next.disabled = gallery.scrollLeft + gallery.clientWidth >= gallery.scrollWidth - 3;
    };
    gallery.addEventListener('scroll', updateGalleryArrows, {passive:true});
    gallery.querySelectorAll('img').forEach(image => image.addEventListener('load', updateGalleryArrows, {once:true}));
    requestAnimationFrame(updateGalleryArrows);
  }

  document.addEventListener('click', event => {
    const open = event.target.closest('[data-open]');
    if (open) openApp(open.dataset.open);
    if (event.target.closest('[data-close-app]')) dialog.close();
    if (event.target.closest('[data-close-image]')) imageDialog.close();
    const tab = event.target.closest('[data-store]');
    if (tab) { currentStore = tab.dataset.store; renderStore(); }
    const arrow = event.target.closest('[data-gallery]');
    if (arrow) {
      const gallery = $('#screenshot-gallery');
      gallery.scrollBy({left: Number(arrow.dataset.gallery) * gallery.clientWidth * .75, behavior:reducedMotion.matches ? 'instant' : 'smooth'});
    }
    const image = event.target.closest('[data-image]');
    if (image) {
      $('#large-screenshot').src = image.dataset.image;
      $('#large-screenshot').alt = image.dataset.caption;
      $('#screenshot-caption').textContent = image.dataset.caption;
      imageDialog.showModal();
    }
    if (event.target.closest('#read-more')) {
      const expanded = $('#read-more').getAttribute('aria-expanded') === 'true';
      $('#read-more').setAttribute('aria-expanded', String(!expanded));
      $('#read-more').textContent = expanded ? 'Show less' : 'Read full description';
      $('#description-text').classList.toggle('collapsed', expanded);
    }
  });
  dialog.addEventListener('keydown', event => {
    if (!event.target.matches('[data-store]') || !['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
    event.preventDefault();
    const tabs = [...dialog.querySelectorAll('[data-store]')];
    const i = tabs.indexOf(event.target);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length-1 : (i + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    tabs[next].click(); tabs[next].focus();
  });
  for (const modal of [dialog, imageDialog]) {
    modal.addEventListener('click', event => {
      if (event.target !== modal) return;
      const rect = modal.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) modal.close();
    });
  }
  dialog.addEventListener('close', () => {
    if (imageDialog.open) imageDialog.close();
    document.body.classList.remove('has-dialog');
    if (location.hash.startsWith('#app=')) history.replaceState(null, '', '#apps');
  });
  function syncHash() {
    let slug = '';
    try { if (location.hash.startsWith('#app=')) slug = decodeURIComponent(location.hash.slice(5)); } catch {}
    if (bySlug.has(slug)) openApp(slug, false);
    else if (dialog.open) dialog.close();
  }
  window.addEventListener('popstate', syncHash);
  window.addEventListener('hashchange', syncHash);
  syncHash();
})();
