// Сайт Stellard: все страницы собираются из data.js.
(() => {
const D = window.DATA || {sections: [], products: {}, pages: {}, stores: []};
const P = D.products, PG = D.pages;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, r = document) => r.querySelector(s);
const view = $('#view'), hero = $('#hero');
const fmt = n => new Intl.NumberFormat('ru-RU').format(Math.round(n));
const fmt2 = n => new Intl.NumberFormat('ru-RU', {maximumFractionDigits: 2}).format(n);
const pad = n => String(n).padStart(2, '0');
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const plural = (n, a, b, c) => { const m = n % 10, h = n % 100; return m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 12 || h > 14) ? b : c; };
const SALE_END = '2026-10-31T23:59:00';
const query = () => new URLSearchParams(location.hash.split('?')[1] || '');
let pickMode = false;
const SEC_PICK = {'trotuarnaya-plitka':'novyy-gorod-seryy-4-sm','bordyury':'trotuarnyy-bordyur-br-100-20-8','stupeni':'stupen-tsvet-seryy'};
const SEC_IMG = {};
D.sections.forEach(s => { const p = P[SEC_PICK[s.id]] || P[s.items[0]]; SEC_IMG[s.id] = p && p.img[0] ? p.img[0] : 'img/logo.png'; });
const secOf = id => D.sections.find(s => s.id === id);
const pageKey = k => PG[k] || PG[k.replace(/\/\//g, '/')] || null;

/* ---------- корзина ---------- */
const store = {get(k, d){ try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } }, set(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }};
let cart = store.get('stellard-cart', {});
const stepOf = p => p.pallet || 1;                     // плитка — кратно поддону, остальное — штуками
const unitOf = p => /м²|м2/.test(p.unit) ? 'м²' : /п\.?\s?м/.test(p.unit) ? 'п.м' : 'шт';
function setCart(id, q){ if (q <= 0) delete cart[id]; else cart[id] = q; store.set('stellard-cart', cart); badge(); }
function badge(){ const n = Object.keys(cart).length; document.querySelectorAll('[data-cart-n]').forEach(b => b.textContent = n); }
function addToCart(id, q){ const p = P[id]; if (!p) return; const st = stepOf(p); q = q || st; setCart(id, +(((cart[id] || 0) + q).toFixed(2))); toast(`В корзине: ${p.name}`); }
function toast(t){ const el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('on'), 2400); }

/* ---------- таймеры ---------- */
function parts(end){ let s = Math.max(0, Math.floor((new Date(end) - Date.now()) / 1000)); const d = Math.floor(s / 86400); s %= 86400; return [d, Math.floor(s / 3600), Math.floor(s % 3600 / 60), s % 60]; }
setInterval(() => {
  document.querySelectorAll('[data-end]').forEach(el => {
    const [d, h, m, x] = parts(el.dataset.end);
    if (el.classList.contains('clock')) el.innerHTML = [[d,'дней'],[pad(h),'часов'],[pad(m),'минут'],[pad(x),'секунд']].map(([v,l]) => `<div><b>${v}</b><span>${l}</span></div>`).join('');
    else el.textContent = `${d} д ${pad(h)}:${pad(m)}:${pad(x)}`;
  });
}, 1000);

/* ---------- карточка товара в списке (как на старом сайте) ---------- */
const disc = p => p.old && p.price ? Math.round((1 - p.price / p.old) * 100) : 0;
function card(id){
  const p = P[id]; if (!p) return '';
  const im = (p.img.length ? p.img : ['img/logo.png']).slice(0, 4), d = disc(p);
  return `<article class="card" data-id="${esc(id)}">
    ${d ? `<div class="c-timer"><span>до конца акции</span><b class="num" data-end="${SALE_END}">—</b></div>` : `<div class="c-timer"><span>&nbsp;</span></div>`}
    <a class="gal" href="#/p/${esc(id)}">${im.map((s, i) => `<img src="${esc(s)}" class="${/\.jpe?g$/i.test(s) ? 'jpg' : ''}${i ? '' : ' on'}" alt="${i ? '' : esc(p.name)}" loading="lazy">`).join('')}${d ? `<span class="badge">−${d}%</span>` : ''}<div class="dots">${im.map((_, i) => `<i class="${i ? '' : 'on'}"></i>`).join('')}</div></a>
    <a class="c-name" href="#/p/${esc(id)}">${esc(p.name)}</a>
    <div class="c-rev"><span>★★★★★</span> 0 отзывов</div>
    <p class="c-tag">${esc(p.tag)}</p>
    <div class="c-pr">${p.old ? `<s class="num">${fmt(p.old)} ₽</s>` : ''}<small>${esc(p.unit)}</small><b class="num">${p.price ? fmt(p.price) + ' ₽' : 'Цена по запросу'}</b></div>
    <div class="c-btn">${pickMode ? `<button class="btn b-acc" type="button" data-calc="${esc(id)}">Выбрать для расчёта</button>` : `<button class="btn b-ink" type="button" data-buy="${esc(id)}">Купить</button><button class="btn b-soft" type="button" data-one="${esc(id)}">Купить в 1 клик</button>`}</div>
  </article>`;
}
// галерея в карточке: кадр меняется по движению мыши
document.addEventListener('mousemove', e => {
  const g = e.target.closest && e.target.closest('.gal'); if (!g) return;
  const imgs = g.querySelectorAll('img'), dots = g.querySelectorAll('.dots i'), r = g.getBoundingClientRect();
  const i = Math.min(imgs.length - 1, Math.floor((e.clientX - r.left) / r.width * imgs.length));
  imgs.forEach((x, j) => x.classList.toggle('on', j === i)); dots.forEach((x, j) => x.classList.toggle('on', j === i));
});
document.addEventListener('mouseout', e => {
  const g = e.target.closest && e.target.closest('.gal'); if (!g || g.contains(e.relatedTarget)) return;
  g.querySelectorAll('img').forEach((x, j) => x.classList.toggle('on', !j)); g.querySelectorAll('.dots i').forEach((x, j) => x.classList.toggle('on', !j));
});
document.addEventListener('click', e => {
  const b = e.target.closest('[data-buy]'); if (b) { addToCart(b.dataset.buy); return; }
  const o = e.target.closest('[data-one]'); if (o) { oneClick(o.dataset.one); return; }
  const c = e.target.closest('[data-calc]'); if (c) { store.set('stellard-calc', c.dataset.calc); render.toCalc = true; location.hash = '#/'; return; }
});

/* ---------- купить в 1 клик ---------- */
function oneClick(id){
  const p = P[id], m = $('#modal');
  m.innerHTML = `<form class="modal" id="ocf"><h3>Купить в 1 клик</h3><p class="muted">${esc(p.name)}</p>
    <div><label class="fl" for="ocn">Имя</label><input class="inp" id="ocn" required autocomplete="name"></div>
    <div><label class="fl" for="ocp">Телефон</label><input class="inp" id="ocp" type="tel" required autocomplete="tel" placeholder="+7 (___) ___-__-__"></div>
    <button class="btn b-acc" type="submit">Отправить</button><button class="btn b-soft" type="button" data-close>Отмена</button>
    <p class="muted" style="font-size:12.5px">Нажимая «Отправить», вы соглашаетесь с политикой конфиденциальности.</p></form>`;
  m.classList.add('open'); $('#ocn').focus();
  $('#ocf').addEventListener('submit', ev => { ev.preventDefault(); m.innerHTML = `<div class="modal"><h3>Заявка принята</h3><p class="muted">Менеджер перезвонит вам в рабочее время.</p><button class="btn b-ink" type="button" data-close>Хорошо</button></div>`; });
}
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal' || e.target.closest('[data-close]')) $('#modal').classList.remove('open'); });

/* ---------- шапка: каталог, меню, поиск ---------- */
$('#drop').querySelector('.wrap').innerHTML = D.sections.map(s => `<a href="#/catalog/${s.id}"><img src="${SEC_IMG[s.id]}" alt="">${esc(s.name)}<span>${s.items.length} ${plural(s.items.length, 'товар', 'товара', 'товаров')}</span></a>`).join('');
$('#catBtn').addEventListener('click', e => { e.stopPropagation(); $('#drop').classList.toggle('open'); });
document.addEventListener('click', e => { if (!e.target.closest('#drop,#catBtn')) $('#drop').classList.remove('open'); });
const openMenu = o => { document.body.classList.toggle('menu-open', o); $('#menuBtn').setAttribute('aria-expanded', o); };
$('#menuBtn').addEventListener('click', () => openMenu(true));
$('#menuX').addEventListener('click', () => openMenu(false));
$('.menu-bg').addEventListener('click', () => openMenu(false));
$('.menu').addEventListener('click', e => { if (e.target.closest('a')) openMenu(false); });
addEventListener('keydown', e => { if (e.key === 'Escape') { openMenu(false); $('#modal').classList.remove('open'); $('#drop').classList.remove('open'); } });
$('#searchForm').addEventListener('submit', e => { e.preventDefault(); location.hash = '#/search/' + encodeURIComponent($('#q').value.trim()); });
$('#callBtn').addEventListener('click', () => { const m = $('#modal'); m.innerHTML = `<form class="modal" id="cbf"><h3>Заказать звонок</h3><div><label class="fl" for="cbn">Имя</label><input class="inp" id="cbn" required></div><div><label class="fl" for="cbp">Телефон</label><input class="inp" id="cbp" type="tel" required></div><button class="btn b-acc" type="submit">Перезвоните мне</button></form>`; m.classList.add('open'); $('#cbf').addEventListener('submit', ev => { ev.preventDefault(); m.innerHTML = `<div class="modal"><h3>Спасибо</h3><p class="muted">Менеджер перезвонит вам в рабочее время.</p><button class="btn b-ink" type="button" data-close>Закрыть</button></div>`; }); });

/* ---------- страницы ---------- */
const crumbs = list => `<nav class="crumbs" aria-label="Навигация"><a href="#/">Главная</a>${list.map(([t, h]) => h ? `<span><a href="${h}">${esc(t)}</a></span>` : `<span>${esc(t)}</span>`).join('')}</nav>`;
const SUBS = `<div class="subs"><div class="wrap"><h2>Подписаться на новости и акции</h2><form data-sub><label for="se" class="vh">E-mail</label><input id="se" type="email" placeholder="Ваш e-mail" required><button class="btn b-ink" type="submit">Подписаться</button></form></div></div>`;
document.addEventListener('submit', e => { if (e.target.matches('[data-sub]')) { e.preventDefault(); e.target.querySelector('button').textContent = 'Вы подписаны'; } });

const POPULAR = ['bruschatka-seryy-4-sm','novyy-gorod-seryy-6-sm','trilistnik','novyy-gorod-seryy-4-sm','novyy-gorod-grey-4-sm','klassiko-seryy-6-sm','staryy-gorod-seryy-4-sm','novyy-gorod-belyy-4-sm','bruschatka-seryy-6-sm','parket-seryy-8-sm'].filter(id => P[id]);
const salePages = () => Object.values(PG).filter(p => /^\/sales\/[^/]+\/$/.test(p.url));
const projPages = () => Object.values(PG).filter(p => /^\/projects\/[^/]+\/$/.test(p.url) && !/\/(city|sub)\/$/.test(p.url));
const blogPages = () => Object.values(PG).filter(p => /^\/blog\/+[^/]+\/[^/]+\/$/.test(p.url) && !(p.url.includes('//') && PG[p.url.replace(/\/\//g, '/')]));
const SALE_TIMERS = {'/sales/osen/': '2026-10-31T23:55:00', '/sales/skidki-v-avguste/': '2026-10-31T23:55:00'};

function home(){
  const calcList = ['novyy-gorod-seryy-4-sm','bruschatka-seryy-4-sm','novyy-gorod-seryy-6-sm','klassiko-seryy-6-sm','parket-seryy-8-sm'].filter(id => P[id] && P[id].pallet);
  const sales = salePages().sort((a, b) => (SALE_TIMERS[b.url] ? 1 : 0) - (SALE_TIMERS[a.url] ? 1 : 0)).slice(0, 2);
  const blog = blogPages().slice(0, 5);
  return `
  <section style="padding-top:28px"><div class="wrap">
    <div class="cats">${D.sections.map(s => `<a class="cat" href="#/catalog/${s.id}"><img src="${SEC_IMG[s.id]}" alt=""><span>${esc(s.name)}<small>${s.items.length} ${plural(s.items.length, 'товар', 'товара', 'товаров')}</small></span><span class="ar" aria-hidden="true">→</span></a>`).join('')}</div>
  </div></section>
  <section style="padding-top:0"><div class="wrap">
    <div class="sh"><h2>Акции</h2><a href="#/sales">Все акции →</a></div>
    <div class="sales">${sales.map(s => `<a class="sale" href="#/sales/${esc(s.url.split('/')[2])}"><div><h3>${esc(s.title)}</h3><p>${SALE_TIMERS[s.url] ? 'до 31 октября 2026' : esc(s.date || 'Подробнее')}</p></div>${SALE_TIMERS[s.url] ? `<div class="clock num" data-end="${SALE_TIMERS[s.url]}"></div>` : ''}</a>`).join('')}</div>
  </div></section>
  <section style="padding-top:0"><div class="wrap">
    <div class="sh"><h2>Вы смотрели</h2><a href="#/catalog/trotuarnaya-plitka">Вся тротуарная плитка →</a></div>
    <div class="grid rail">${POPULAR.map(card).join('')}</div>
  </div></section>
  <section id="calc" style="padding-top:0"><div class="wrap">
    <div class="sh"><h2>Калькулятор</h2><span class="muted">Плитка продаётся кратно поддону</span></div>
    <div class="calc">
      <div class="box" id="cPickBox"></div>
      <div class="box" id="cInBox"></div>
      <div class="box res" aria-live="polite"><div class="tot num" id="ct">—</div>
        <dl><dt id="cpalL">Поддонов</dt><dd id="cpal">—</dd><dt>К заказу</dt><dd id="cm">—</dd><dt>Вес</dt><dd id="ck">—</dd></dl>
        <button class="btn b-acc" type="button" id="cAdd" disabled>В корзину</button></div>
    </div>
  </div></section>
  <section class="factory"><div class="wrap">
    <div class="sh"><h2>Наша плитка уже лежит</h2><a href="#/projects">Все проекты →</a></div>
    <div class="f-grid">
      <a class="f-big" href="#/projects/tulskiy-kreml-g-tula"><img src="img/kreml2.jpg" alt="Тульский Кремль" loading="lazy"><div class="f-in"><b class="num">21 800 м²</b><span>Тульский Кремль · Новый город · 2014–2015</span></div></a>
      <div class="f-col">
        <a class="f-sm" href="#/projects/park-platonovskiy-les-g-tula"><img src="img/platon.jpg" alt="Парк Платоновский лес" loading="lazy"><div class="f-in"><b class="num">2 595 м²</b><span>Парк «Платоновский лес» · 2016</span></div></a>
        <a class="f-sm" href="#/projects/chastnyy-obekt-v-tule-trotuarnaya-plitka-novyy-gorod"><img src="img/private2.jpg" alt="Частный объект в Туле" loading="lazy"><div class="f-in"><b class="num">250 м²</b><span>Частный объект в Туле · 2018</span></div></a>
      </div>
    </div>
    <div class="f-nums num"><div><b>ГОСТ 17608</b><span>плитка по стандарту 2017</span></div><div><b>≤ 5%</b><span>водопоглощение</span></div><div><b>18</b><span>цветов в каталоге</span></div><div><b>${D.stores.length || 113}</b><span>точек продаж</span></div></div>
  </div></section>
  <section><div class="wrap">
    <div class="sh"><h2>Важно прочесть</h2><a href="#/blog">Все статьи →</a></div>
    <div class="blog">${blog.map(b => `<a class="post" href="#/blog/${esc(b.url.replace(/^\/blog\/+/, '').replace(/\/$/, ''))}"><span>${esc(b.date || (b.url.includes('obzory') ? 'Обзоры' : 'Новости'))}</span><b>${esc(b.title)}</b></a>`).join('')}</div>
  </div></section>
  ${SUBS}`;
}
function homeAfter(){
  let res = .05, shown = 0, id = store.get('stellard-calc', null);
  function draw(){
    const p = P[id];
    $('#cPickBox').innerHTML = p
      ? `<span class="fl">Плитка</span><div class="calc-pick"><img src="${esc(p.img[0])}" alt=""><div><b>${esc(p.name)}</b><small>${fmt(p.price)} ₽ · ${esc(p.unit.toLowerCase())}${p.pallet ? ` · поддон ${fmt2(p.pallet)} м²` : ''}</small></div></div><a class="btn b-line" href="#/catalog/trotuarnaya-plitka?pick=1" style="height:44px">Поменять плитку</a>`
      : `<span class="fl">Плитка</span><p class="muted">Выберите любую плитку, бордюр или ступени в каталоге — калькулятор посчитает поддоны и сумму.</p><a class="btn b-acc" href="#/catalog/trotuarnaya-plitka?pick=1">Выбрать плитку</a>`;
    const sq = p && p.pallet;
    $('#cInBox').innerHTML = `<div><label class="fl" for="ca">${sq ? 'Площадь, м²' : 'Количество, шт'}</label><input id="ca" type="number" inputmode="decimal" min="1" value="${sq ? 60 : 10}" ${p ? '' : 'disabled'}></div>`
      + (sq ? `<div><span class="fl" id="rl">Запас на подрезку</span><div class="seg-l" id="cr" role="group" aria-labelledby="rl">${[0, .05, .1].map(v => `<button type="button" data-v="${v}" aria-pressed="${v === res}">${v * 100}%</button>`).join('')}</div></div><div><span class="fl">Поддоны</span><div class="pals" id="pals" aria-hidden="true"></div></div>` : '');
    $('#cpalL').textContent = sq ? 'Поддонов' : 'Штук';
    $('#ca').addEventListener('input', calc);
    $('#cr')?.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; res = +b.dataset.v; b.parentNode.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b)); calc(); });
    shown = 0; calc();
  }
  function calc(){
    const p = P[id], add = $('#cAdd');
    if (!p) { ['#ct','#cpal','#cm','#ck'].forEach(s => $(s).textContent = '—'); add.disabled = true; return; }
    const v = Math.max(0, num($('#ca').value));
    let q, line;
    if (p.pallet) { const n = v ? Math.ceil(v * (1 + res) / p.pallet) : 0; q = +(n * p.pallet).toFixed(2); line = `${n} ${plural(n, 'поддон', 'поддона', 'поддонов')}`;
      const kg = num(p.chars.find(c => /Вес поддона/.test(c[0]))?.[1]); $('#ck').textContent = kg ? fmt2(n * kg / 1000) + ' т' : '—';
      const box = $('#pals'), want = Math.min(n, 30);
      while (box.children.length > want) box.lastElementChild.remove();
      while (box.children.length < want) { const i = document.createElement('i'); if (!reduce) { i.className = 'in'; i.style.animationDelay = (box.children.length - shown) * 40 + 'ms'; } box.appendChild(i); }
      shown = want; $('#cm').textContent = fmt2(q) + ' м²';
    } else { q = Math.ceil(v); line = `${q} шт`; $('#cm').textContent = `${q} шт`; $('#ck').textContent = '—'; }
    $('#ct').textContent = fmt(q * p.price) + ' ₽'; $('#cpal').textContent = line;
    add.disabled = !q; add.onclick = () => addToCart(id, q);
  }
  homeAfter.set = v => { id = v; draw(); };
  draw();
}
addEventListener('calc-pick', e => homeAfter.set && homeAfter.set(e.detail));
const num = s => { const m = String(s || '').replace(',', '.').match(/[\d.]+/); return m ? +m[0] : 0; };

function catalogRoot(){
  return `<div class="wrap">${crumbs([['Каталог']])}<h1 class="ptitle">Каталог</h1>
    <div class="cats" style="margin-bottom:64px">${D.sections.map(s => `<a class="cat" href="#/catalog/${s.id}"><img src="${SEC_IMG[s.id]}" alt=""><span>${esc(s.name)}<small>${s.items.length} ${plural(s.items.length, 'товар', 'товара', 'товаров')}</small></span><span class="ar" aria-hidden="true">→</span></a>`).join('')}</div></div>${SUBS}`;
}

// фильтры раздела строятся из характеристик товаров
const FILTER_KEYS = ['Толщина, мм', 'Цвет', 'Коллекция плитки', 'Размер, мм'];
let secState = {};
function section(id){
  const s = secOf(id); if (!s) return notFound();
  const items = s.items.map(i => P[i]).filter(Boolean);
  const facets = {};
  FILTER_KEYS.forEach(k => { const vals = new Map(); items.forEach(p => { const v = p.chars.find(c => c[0] === k)?.[1]; if (v && v !== '*') vals.set(v, (vals.get(v) || 0) + 1); }); if (vals.size > 1 && vals.size < 40) facets[k] = [...vals].sort((a, b) => k.startsWith('Толщина') ? num(a[0]) - num(b[0]) : b[1] - a[1]); });
  const st = secState[id] || (secState[id] = {f: {}, sort: 'pop', shown: 24});
  const qc = query().get('color'); if (qc) { st.f = {'Цвет': [qc]}; st.shown = 24; }
  return `<div class="wrap">${crumbs([['Каталог', '#/catalog'], [s.name]])}
    ${pickMode ? `<div class="pickbar"><b>Выберите плитку для расчёта</b><span>Нажмите «Выбрать для расчёта» на нужном товаре. Другие разделы: ${D.sections.filter(x => x.id !== id).map(x => `<a href="#/catalog/${x.id}?pick=1">${esc(x.name)}</a>`).join(', ')}</span><a class="btn b-line" href="#/" style="height:40px">Отмена</a></div>` : ''}
    <div class="toolbar" style="margin-top:14px"><h1 class="ptitle" style="margin:0">${esc(s.name)}</h1><span class="muted" id="cnt"></span></div>
    <div class="cat-layout">
      <aside class="filters" id="filters">${Object.entries(facets).map(([k, vals], fi) => `<div><h4>${esc(k.replace(', мм', ''))}</h4>${vals.map(([v, n], vi) => `<label class="${vi > 7 ? 'xtra' : ''}" ${vi > 7 ? 'hidden' : ''}><input type="checkbox" data-k="${esc(k)}" value="${esc(v)}" ${st.f[k]?.includes(v) ? 'checked' : ''}> ${esc(v)} <span class="muted">${n}</span></label>`).join('')}${vals.length > 8 ? `<button class="f-more" type="button" data-more>Показать все</button>` : ''}</div>`).join('')}
        <button class="btn b-line" type="button" id="fReset" style="height:42px">Сбросить</button></aside>
      <div>
        <div class="toolbar"><button class="btn b-line f-toggle" type="button" id="fOpen" style="height:40px">Фильтры</button><div class="chips" id="chips"></div>
          <label><span class="vh">Сортировка</span><select id="sort"><option value="pop">Популярные</option><option value="asc">Сначала дешевле</option><option value="desc">Сначала дороже</option></select></label></div>
        <div class="grid g4" id="items"></div>
        <div class="more-btn"><button class="btn b-soft" type="button" id="more">Показать ещё</button></div>
      </div>
    </div>
    ${s.text ? `<div class="seo rich">${s.text}</div>` : ''}
  </div>${SUBS}`;
}
function sectionAfter(id){
  const s = secOf(id), st = secState[id];
  $('#sort').value = st.sort;
  function apply(){
    let list = s.items.map(i => P[i]).filter(Boolean);
    Object.entries(st.f).forEach(([k, vals]) => { if (vals.length) list = list.filter(p => vals.includes(p.chars.find(c => c[0] === k)?.[1])); });
    if (st.sort !== 'pop') list.sort((a, b) => ((a.price || 1e9) - (b.price || 1e9)) * (st.sort === 'asc' ? 1 : -1));
    $('#cnt').textContent = `${list.length} ${plural(list.length, 'товар', 'товара', 'товаров')}`;
    $('#items').innerHTML = list.length ? list.slice(0, st.shown).map(p => card(p.id)).join('') : `<div class="empty" style="grid-column:1/-1"><b>Ничего не нашлось</b><span class="muted">Уберите часть фильтров.</span><button class="btn b-ink" type="button" id="fReset2">Сбросить фильтры</button></div>`;
    $('#more').hidden = list.length <= st.shown;
    $('#chips').innerHTML = Object.entries(st.f).flatMap(([k, vals]) => vals.map(v => `<button type="button" data-k="${esc(k)}" data-v="${esc(v)}">${esc(v)}</button>`)).join('');
    $('#fReset2')?.addEventListener('click', reset);
  }
  function reset(){ st.f = {}; document.querySelectorAll('#filters input').forEach(i => i.checked = false); apply(); }
  $('#filters').addEventListener('change', e => { const i = e.target; if (!i.dataset.k) return; const a = st.f[i.dataset.k] || (st.f[i.dataset.k] = []); if (i.checked) a.push(i.value); else a.splice(a.indexOf(i.value), 1); st.shown = 24; apply(); });
  $('#filters').addEventListener('click', e => { const b = e.target.closest('[data-more]'); if (b) { b.parentNode.querySelectorAll('.xtra').forEach(x => x.hidden = false); b.remove(); } });
  $('#chips').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; const a = st.f[b.dataset.k]; a.splice(a.indexOf(b.dataset.v), 1); const inp = [...document.querySelectorAll('#filters input')].find(i => i.dataset.k === b.dataset.k && i.value === b.dataset.v); if (inp) inp.checked = false; apply(); });
  $('#fReset').addEventListener('click', reset);
  $('#sort').addEventListener('change', e => { st.sort = e.target.value; apply(); });
  $('#more').addEventListener('click', () => { st.shown += 24; apply(); });
  $('#fOpen').addEventListener('click', () => $('#filters').classList.toggle('open'));
  apply();
}

function product(id){
  const p = P[id]; if (!p) return notFound();
  const s = secOf(p.sec), d = disc(p), im = p.img.length ? p.img : ['img/logo.png'];
  const rel = (key, title) => p.rel && p.rel[key] && p.rel[key].length ? `<div><h4>${title}</h4><div class="vchips">${key === 'colors' ? `<a class="on" href="#/p/${esc(id)}">${esc((p.chars.find(c => c[0] === 'Цвет') || [])[1] || 'Текущий')}</a>` : `<a class="txt on" href="#/p/${esc(id)}">${esc((p.chars.find(c => /Толщина/.test(c[0])) || [])[1] || 'Текущий')}</a>`}${p.rel[key].map(r => `<a class="${key === 'colors' && r.img ? '' : 'txt'}" href="#/p/${esc(r.slug)}">${key === 'colors' && r.img ? `<img src="${esc(r.img)}" alt="">` : ''}${esc(r.label || (P[r.slug] ? P[r.slug].name.replace(/.*«(.+)».*/, '$1') : r.slug))}</a>`).join('')}</div></div>` : '';
  const pay = pageKey('/info/oplata/'), del = pageKey('/info/dostavka/'), gar = pageKey('/info/garantiya/');
  const short = h => esc((h || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 220)) + '…';
  const same = (s ? s.items : []).filter(x => x !== id).slice(0, 5);
  return `<div class="wrap">${crumbs([['Каталог', '#/catalog'], ...(s ? [[s.name, '#/catalog/' + s.id]] : []), [p.name]])}
    <div class="pd" style="margin-top:20px">
      <div class="pd-gal"><div class="pd-thumbs">${im.map((u, i) => `<button type="button" class="${i ? '' : 'on'}" data-i="${i}" aria-label="Фото ${i + 1}"><img src="${esc(u)}" alt="" loading="lazy"></button>`).join('')}</div>
        <div class="pd-main">${d ? `<span class="badge">−${d}%</span>` : ''}<img id="pdImg" class="${/\.jpe?g$/i.test(im[0]) ? 'jpg' : ''}" src="${esc(im[0])}" alt="${esc(p.name)}"></div></div>
      <div>
        <h1>${esc(p.name)}</h1>
        <div class="sub"><span>★★★★★ 0 отзывов</span>${p.tag ? `<span>${esc(p.tag)}</span>` : ''}</div>
        <div class="buy">
          ${d ? `<div class="c-timer"><span>до конца акции</span><b class="num" data-end="${SALE_END}">—</b></div>` : ''}
          <div class="pr"><b class="num">${p.price ? fmt(p.price) + ' ₽' : 'Цена по запросу'}</b>${p.old ? `<s>${fmt(p.old)} ₽</s>` : ''}${d ? `<em>−${d}%</em>` : ''}</div>
          <span class="muted" style="margin-top:-8px;font-size:13px">${esc(p.unit)}${p.pallet ? ` · продаётся кратно поддонам по ${fmt2(p.pallet)} м²` : ''}</span>
          ${p.price ? `<div class="qty"><div class="stepper"><button type="button" id="qm" aria-label="Меньше">−</button><label class="vh" for="qv">Количество, ${unitOf(p)}</label><input id="qv" inputmode="decimal" value="${p.pallet ? fmt2(p.pallet) : 1}"><button type="button" id="qp" aria-label="Больше">+</button></div>
            <div class="tot"><b class="num" id="qt"></b><small id="qn"></small></div></div>` : ''}
          <div class="acts"><button class="btn b-ink" type="button" id="pdBuy" ${p.price ? '' : 'disabled'}>В корзину</button><button class="btn b-acc" type="button" data-one="${esc(id)}">Купить в 1 клик</button></div>
          <button class="btn b-line" type="button" data-calc="${esc(id)}" style="height:44px">Рассчитать площадку с этой плиткой</button>
        </div>
        <div class="vars">${rel('sizes', 'Другие размеры')}${rel('colors', 'Другие цвета')}</div>
        ${p.chars.length ? `<div class="chars">${p.chars.slice(0, 8).map(c => `<div><span>${esc(c[0])}</span><b>${esc(c[1])}</b></div>`).join('')}</div>${p.chars.length > 8 ? `<button type="button" class="muted" style="border:0;background:none;padding:0;margin-top:10px;text-decoration:underline;cursor:pointer" onclick="document.getElementById('chars').scrollIntoView({behavior:'smooth'})">Все характеристики</button>` : ''}` : ''}
      </div>
    </div>
    ${p.desc ? `<div class="pd-sec"><h2>Описание</h2><div class="rich">${p.desc}</div></div>` : ''}
    ${p.chars.length ? `<div class="pd-sec" id="chars"><h2>Характеристики</h2><div class="chars" style="max-width:860px">${p.chars.map(c => `<div><span>${esc(c[0])}</span><b>${esc(c[1])}</b></div>`).join('')}</div></div>` : ''}
    <div class="pd-sec"><h2>Оплата, доставка и гарантия</h2><div class="info3">
      <a href="#/page/info/oplata"><b>Оплата</b>${pay ? short(pay.html) : ''}</a>
      <a href="#/page/info/dostavka"><b>Доставка</b>${del ? short(del.html) : ''}</a>
      <a href="#/page/info/garantiya"><b>Гарантия</b>${gar ? short(gar.html) : ''}</a></div></div>
    ${same.length ? `<div class="pd-sec"><div class="sh"><h2>Ещё в разделе</h2>${s ? `<a href="#/catalog/${s.id}">Весь раздел →</a>` : ''}</div><div class="grid rail">${same.map(card).join('')}</div></div>` : ''}
  </div><div style="height:64px"></div>${SUBS}`;
}
function productAfter(id){
  const p = P[id], st = stepOf(p);
  document.querySelector('.pd-thumbs').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; const u = p.img[+b.dataset.i]; const im = $('#pdImg'); im.src = u; im.className = /\.jpe?g$/i.test(u) ? 'jpg' : ''; document.querySelectorAll('.pd-thumbs button').forEach(x => x.classList.toggle('on', x === b)); });
  const qv = $('#qv'); if (!qv) return;
  // количество округляется вверх до целых поддонов (для плитки) или штук
  const norm = v => Math.max(st, Math.ceil((num(v) || st) / st - 1e-9) * st);
  function upd(){ const q = norm(qv.value); $('#qt').textContent = fmt(q * p.price) + ' ₽'; $('#qn').textContent = p.pallet ? `${Math.round(q / st)} ${plural(Math.round(q / st), 'поддон', 'поддона', 'поддонов')} · ${fmt2(q)} м²` : `${fmt2(q)} ${unitOf(p)}`; return q; }
  qv.addEventListener('input', upd); qv.addEventListener('blur', () => { qv.value = fmt2(norm(qv.value)); upd(); });
  $('#qm').addEventListener('click', () => { qv.value = fmt2(Math.max(st, norm(qv.value) - st)); upd(); });
  $('#qp').addEventListener('click', () => { qv.value = fmt2(norm(qv.value) + st); upd(); });
  $('#pdBuy').addEventListener('click', () => addToCart(id, +upd().toFixed(2)));
  upd();
}

function cartView(done){
  const ids = Object.keys(cart).filter(id => P[id]);
  if (done) return `<div class="wrap">${crumbs([['Корзина']])}<div class="ok-box" style="margin:30px 0 80px"><span class="muted">Заказ № ${esc(done)}</span><b>Спасибо, заказ оформлен</b><p class="muted">Менеджер свяжется с вами, подтвердит наличие и рассчитает доставку.</p><a class="btn b-ink" href="#/catalog">Вернуться в каталог</a></div></div>`;
  if (!ids.length) return `<div class="wrap">${crumbs([['Корзина']])}<h1 class="ptitle">Корзина</h1><div class="empty" style="margin-bottom:80px"><b>Корзина пуста</b><span class="muted">Добавьте товары из каталога или рассчитайте площадку на главной.</span><a class="btn b-acc" href="#/catalog">Перейти в каталог</a></div></div>`;
  return `<div class="wrap">${crumbs([['Корзина']])}<h1 class="ptitle">Корзина</h1>
    <div class="cart" style="margin-bottom:80px">
      <div id="lines">${ids.map(id => { const p = P[id]; return `<div class="line" data-id="${esc(id)}"><img src="${esc(p.img[0] || 'img/logo.png')}" alt=""><div class="nm"><b><a href="#/p/${esc(id)}">${esc(p.name)}</a></b><small>${fmt(p.price)} ₽ · ${esc(p.unit)}${p.pallet ? ` · поддон ${fmt2(p.pallet)} м²` : ''}</small></div>
        <div class="stepper"><button type="button" data-d="-1" aria-label="Меньше">−</button><input aria-label="Количество" value="${fmt2(cart[id])}" readonly><button type="button" data-d="1" aria-label="Больше">+</button></div>
        <div class="sum num">${fmt(cart[id] * p.price)} ₽</div><button class="rm" type="button" aria-label="Удалить">✕</button></div>`; }).join('')}</div>
      <aside class="total-box">
        <div class="kv"><dt class="muted">Товары</dt><dd id="tSum"></dd><dt class="muted">Доставка</dt><dd>рассчитает менеджер</dd></div>
        <div><span class="muted" style="font-size:13px">Итого без доставки</span><div class="big num" id="tBig"></div></div>
        <form class="order-form" id="of" novalidate>
          <div><label class="fl" for="on">Имя</label><input class="inp" id="on" required autocomplete="name"></div>
          <div><label class="fl" for="op">Телефон</label><input class="inp" id="op" type="tel" required autocomplete="tel" placeholder="+7 (___) ___-__-__"></div>
          <div><label class="fl" for="oe">E-mail <span class="muted">(необязательно)</span></label><input class="inp" id="oe" type="email" autocomplete="email"></div>
          <div class="radio" role="radiogroup" aria-label="Получение"><label><input type="radio" name="dl" value="pickup" checked><span><b>Самовывоз</b><br><span class="muted">Тула, ул. Пржевальского, 12</span></span></label><label><input type="radio" name="dl" value="truck"><span><b>Доставка манипулятором</b><br><span class="muted">Стоимость назовёт менеджер</span></span></label></div>
          <p class="err" id="oerr"></p>
          <button class="btn b-acc" type="submit" id="oBtn">Оформить заказ</button>
          <p class="muted" style="font-size:12.5px">Без регистрации. Нажимая кнопку, вы соглашаетесь с политикой конфиденциальности.</p>
        </form>
      </aside>
    </div></div>`;
}
function cartAfter(){
  const lines = $('#lines'); if (!lines) return;
  function totals(){ const s = Object.keys(cart).filter(id => P[id]).reduce((a, id) => a + cart[id] * P[id].price, 0); $('#tSum').textContent = fmt(s) + ' ₽'; $('#tBig').textContent = fmt(s) + ' ₽'; }
  lines.addEventListener('click', e => {
    const row = e.target.closest('.line'); if (!row) return; const id = row.dataset.id, p = P[id], st = stepOf(p);
    if (e.target.closest('.rm')) { setCart(id, 0); render(); return; }
    const b = e.target.closest('[data-d]'); if (!b) return;
    const q = Math.max(st, +(cart[id] + st * +b.dataset.d).toFixed(2)); setCart(id, q);
    row.querySelector('input').value = fmt2(q); row.querySelector('.sum').textContent = fmt(q * p.price) + ' ₽'; totals();
  });
  $('#of').addEventListener('submit', e => {
    e.preventDefault(); const n = $('#on').value.trim(), ph = $('#op').value.replace(/\D/g, '');
    if (!n || ph.length < 10) { $('#oerr').textContent = !n ? 'Укажите имя.' : 'Укажите телефон: не меньше 10 цифр.'; return; }
    $('#oBtn').disabled = true; const no = 'D-' + Date.now().toString().slice(-6);
    cart = {}; store.set('stellard-cart', cart); badge(); location.hash = '#/cart/done/' + no;
  });
  totals();
}

function listPage(kind){
  const cfg = {sales: ['Акции', salePages(), 'sales'], projects: ['Проекты', projPages(), 'projects'], blog: ['Важно прочесть', blogPages(), 'blog']}[kind];
  let items = cfg[1];
  const tab = (location.hash.split('?f=')[1] || '');
  let tabs = '';
  if (kind === 'projects') { tabs = `<div class="tabs"><a href="#/projects" class="${!tab ? 'on' : ''}">Все</a><a href="#/projects?f=city" class="${tab === 'city' ? 'on' : ''}">Городские проекты</a><a href="#/projects?f=sub" class="${tab === 'sub' ? 'on' : ''}">Частные объекты</a></div>`; if (tab) items = items.filter(p => /^Частный/.test(p.title) === (tab === 'sub')); }
  if (kind === 'blog') { tabs = `<div class="tabs"><a href="#/blog" class="${!tab ? 'on' : ''}">Все</a><a href="#/blog?f=novosti" class="${tab === 'novosti' ? 'on' : ''}">Новости</a><a href="#/blog?f=obzory" class="${tab === 'obzory' ? 'on' : ''}">Обзоры</a></div>`; if (tab) items = items.filter(p => p.url.includes(tab)); }
  const href = p => kind === 'blog' ? '#/blog/' + p.url.replace(/^\/blog\/+/, '').replace(/\/$/, '') : `#/${kind}/${p.url.split('/')[2]}`;
  return `<div class="wrap">${crumbs([[cfg[0]]])}<h1 class="ptitle">${cfg[0]}</h1>${tabs}
    <div class="tiles" style="margin-bottom:80px">${items.map(p => `<a class="tile" href="${href(p)}"><div class="im">${p.img ? `<img src="${esc(p.img)}" alt="" loading="lazy">` : ''}</div><div class="tx"><b>${esc(p.title)}</b><span>${esc(SALE_TIMERS[p.url] ? 'до 31 октября 2026' : p.date || '')}</span></div></a>`).join('')}</div></div>${SUBS}`;
}
const GROUPS = [
  ['Компания', [['О компании', '/company/'], ['Отзывы', '/company/reviews/'], ['Документы', '/company/docs/']]],
  ['Информация', [['Реквизиты', '/info/requisites/'], ['Условия оплаты', '/info/oplata/'], ['Условия доставки', '/info/dostavka/'], ['Гарантия', '/info/garantiya/'], ['Для рекламаций', '/info/dlya-reklamatsiy/'], ['Стать дилером', '/info/dillers/'], ['ГОСТ и СТО', '/info/gost-i-sto/']]],
  ['Услуги', [['Услуги', '/services/'], ['Доставка', '/services/dostavka/']]],
  ['Документы', [['Политика конфиденциальности', '/include/licenses_detail.php'], ['Оферта', '/include/offer_detail.php']]],
];
function contentPage(path, back){
  const pg = pageKey(path); if (!pg) return notFound();
  const grp = GROUPS.find(g => g[1].some(x => x[1] === path));
  const side = grp ? `<nav class="side-nav" aria-label="${grp[0]}"><b>${grp[0]}</b>${grp[1].map(([t, u]) => `<a class="${u === path ? 'on' : ''}" href="#/page${u.replace(/\/$/, '')}">${esc(t)}</a>`).join('')}</nav>` : '';
  const trail = back ? [back, [pg.title]] : grp ? [[grp[0]], [pg.title]] : [[pg.title]];
  const timer = SALE_TIMERS[path] ? `<div class="sales" style="grid-template-columns:1fr;margin-bottom:24px"><div class="sale" style="min-height:0"><div><h3>До конца акции</h3><p>31 октября 2026, 23:55</p></div><div class="clock num" data-end="${SALE_TIMERS[path]}"></div></div></div>` : '';
  return `<div class="wrap">${crumbs(trail)}<h1 class="ptitle">${esc(pg.title)}</h1>
    <div class="${side ? 'page-grid' : ''}" style="margin-bottom:80px">${side}<div>${timer}${pg.date ? `<p class="muted" style="margin-bottom:14px">${esc(pg.date)}</p>` : ''}<div class="rich">${(pg.html || '<p class="muted">Текст страницы будет перенесён со старого сайта.</p>').replace(/\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}:\d{2}\s*\d*/g, '')}</div></div></div></div>${SUBS}`;
}
function storesView(){
  return `<div class="wrap">${crumbs([['Где купить']])}<h1 class="ptitle">Где купить</h1>
    <div class="toolbar"><label style="flex:1;max-width:420px"><span class="vh">Поиск по городу или адресу</span><input class="inp" id="stq" placeholder="Город, улица или название"></label><span class="muted" id="stn"></span></div>
    <div class="stores" id="stl" style="margin-bottom:80px"></div></div>${SUBS}`;
}
function storesAfter(){
  const draw = () => { const q = $('#stq').value.trim().toLowerCase(); const l = D.stores.filter(s => !q || (s.title + ' ' + s.text).toLowerCase().includes(q));
    $('#stn').textContent = `${l.length} ${plural(l.length, 'точка', 'точки', 'точек')} продаж`;
    $('#stl').innerHTML = l.map(s => `<div class="store"><b>${esc(s.title)}</b><span class="muted">${esc(s.text.replace(s.title, '').replace(/На карте/g, '').replace(/(\+7|8-9)[\d\s()-]+/g, '').replace(/\S+@\S+/g, '').replace(/\s+/g, ' ').trim().slice(0, 160))}</span>${s.phones.map(p => `<span class="ph">${esc(p)}</span>`).join('')}${s.emails.map(m => `<span class="muted">${esc(m)}</span>`).join('')}</div>`).join(''); };
  $('#stq').addEventListener('input', draw); draw();
}
function contacts(){
  return `<div class="wrap">${crumbs([['Контакты']])}<h1 class="ptitle">Контакты</h1>
    <div class="info3" style="margin-bottom:24px"><div><b>Телефоны</b><span style="user-select:all">+7 (800) 2222-755</span><br><span style="user-select:all">+7 (4872) 705-555</span></div><div><b>Адрес завода и склада</b>г. Тула, ул. Пржевальского, д. 12<br><span class="muted">info@stellard.ru</span></div><div><b>Режим работы</b>Пн – Пт: с 8:00 до 17:00<br>Сб: с 8:00 до 15:00<br>Вс: выходной</div></div>
    <a class="btn b-acc" href="#/stores" style="margin-bottom:80px">Все точки продаж: ${D.stores.length} →</a></div>${SUBS}`;
}
function search(q){
  const w = q.toLowerCase().split(/\s+/).filter(Boolean);
  const list = w.length ? Object.values(P).filter(p => w.every(x => (p.name + ' ' + p.id).toLowerCase().includes(x))) : [];
  return `<div class="wrap">${crumbs([['Поиск']])}<h1 class="ptitle">Поиск${q ? `: «${esc(q)}»` : ''}</h1>
    ${list.length ? `<p class="muted" style="margin-bottom:14px">${list.length} ${plural(list.length, 'товар', 'товара', 'товаров')}</p><div class="grid g4" style="margin-bottom:80px">${list.slice(0, 60).map(p => card(p.id)).join('')}</div>` : `<div class="empty" style="margin-bottom:80px"><b>${q ? 'Ничего не нашлось' : 'Введите запрос'}</b><span class="muted">Попробуйте «Новый город», «бордюр» или «ступень».</span><a class="btn b-acc" href="#/catalog">Открыть каталог</a></div>`}</div>${SUBS}`;
}
const notFound = () => `<div class="wrap">${crumbs([['Страница не найдена']])}<div class="empty" style="margin:30px 0 80px"><b style="font:600 48px var(--disp)">404</b><span class="muted">Такой страницы нет. Возможно, её перенесли.</span><a class="btn b-acc" href="#/">На главную</a></div></div>`;

/* ---------- маршрутизатор ---------- */
function render(){
  const h = decodeURIComponent(location.hash.replace(/^#/, '') || '/').split('?')[0];
  const seg = h.split('/').filter(Boolean);
  pickMode = query().has('pick');
  let html = '', after = null, isHome = false;
  if (!seg.length) { html = home(); after = homeAfter; isHome = true; }
  else if (seg[0] === 'catalog' && !seg[1]) html = catalogRoot();
  else if (seg[0] === 'catalog') { html = section(seg[1]); after = () => secOf(seg[1]) && sectionAfter(seg[1]); }
  else if (seg[0] === 'p') { html = product(seg[1]); after = () => P[seg[1]] && productAfter(seg[1]); }
  else if (seg[0] === 'cart') { html = cartView(seg[1] === 'done' ? seg[2] : null); after = cartAfter; }
  else if (['sales', 'projects'].includes(seg[0]) && !seg[1]) html = listPage(seg[0]);
  else if (seg[0] === 'sales') html = contentPage(`/sales/${seg[1]}/`, ['Акции', '#/sales']);
  else if (seg[0] === 'projects') html = contentPage(`/projects/${seg[1]}/`, ['Проекты', '#/projects']);
  else if (seg[0] === 'blog' && !seg[1]) html = listPage('blog');
  else if (seg[0] === 'blog') html = contentPage(`/blog/${seg.slice(1).join('/')}/`, ['Важно прочесть', '#/blog']);
  else if (seg[0] === 'page') { const p = '/' + seg.slice(1).join('/'); html = contentPage(/\.php$/.test(p) ? p : p + '/'); }
  else if (seg[0] === 'stores') { html = storesView(); after = storesAfter; }
  else if (seg[0] === 'contacts') html = contacts();
  else if (seg[0] === 'search') { html = search(seg.slice(1).join('/')); $('#q').value = seg.slice(1).join('/'); }
  else html = notFound();
  hero.hidden = !isHome;
  document.body.classList.toggle('is-home', isHome);
  view.innerHTML = html; view.style.animation = 'none'; void view.offsetWidth; view.style.animation = '';
  if (after) after();
  const t = view.querySelector('h1');
  document.title = isHome ? 'Stellard — завод тротуарной плитки' : `${t ? t.textContent : 'Stellard'} — Stellard`;
  if (render.toCalc && isHome) { render.toCalc = false; requestAnimationFrame(() => $('#calc')?.scrollIntoView({block: 'start'})); }
  else scrollTo(0, 0);
  window.dispatchEvent(new CustomEvent('route', {detail: {home: isHome}}));
}
addEventListener('hashchange', () => { $('#drop').classList.remove('open'); render(); });
badge(); render();
})();
