// Первый экран: «камень в воду». В центр мощения падает жёлтый камень, от удара расходится
// волна — камни приподнимаются и «загораются». Справа палитра из 18 цветов Stellard:
// выбор цвета перекрашивает плитку волной и ведёт в каталог с этим цветом.
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const hero = document.getElementById('hero'), stage = document.getElementById('stage'), cv = document.getElementById('scene'), tip = document.getElementById('tip');
const D = window.DATA || {products: {}};

// оттенки сняты с фото плитки «Новый город» 60 мм в каждом цвете; mix — колормикс, у камней разброс тона
const COLORS = [
  ['Серый','#7c7d7e','seryy'], ['Грей','#888a89','grey',1], ['Белый','#cac4b8','belyy'], ['Белый мрамор','#bbb8b2','belyy-mramor',1],
  ['Черный','#595a5a','chernyy'], ['Черный агат','#5d5d5e','cherniy-agat',1], ['Желтый','#c2996b','zheltyy'], ['Голден','#c49882','peschanik',1],
  ['Санрайз','#c79380','sanrayz',1], ['Закат','#856e63','zakat',1], ['Каньон','#938270','kanon',1], ['Красный','#bd6f66','krasnyy'],
  ['Бордовый','#855e57','bordovyy'], ['Коричневый','#685855','korichnevyy'], ['Браун','#77605a','braun'], ['Гавана','#92756b','gavana',1],
  ['Мокко','#987466','mokko',1], ['Капучино','#b57e66','kapuchino'],
].map(([n, c, slug, mix]) => ({n, c, mix: !!mix}));
// индекс товаров: форма → цвет → толщина → товар
const FORMS = {ng: 'Новый город', br: 'Брусчатка'}, IDX = {ng: {}, br: {}};
Object.values(D.products).forEach(p => {
  const f = Object.keys(FORMS).find(k => p.name.startsWith('Тротуарная плитка ' + FORMS[k] + ' ')); if (!f) return;
  const ch = Object.fromEntries(p.chars), c = ch['Цвет'], mm = parseInt(ch['Толщина, мм']);
  if (c && mm) (IDX[f][c] = IDX[f][c] || {})[mm] = p.id;
});
const THICK = f => [...new Set(Object.values(IDX[f]).flatMap(o => Object.keys(o).map(Number)))].sort((a, b) => a - b);
const state = {form: 'ng', color: 0, mm: 40};
let color = 0;

let renderer = null;
try { renderer = new THREE.WebGLRenderer({canvas: cv, antialias: true, powerPreference: 'high-performance'}); } catch (e) {}
const scene = new THREE.Scene(), BG = new THREE.Color('#0f1011');
scene.background = BG; scene.fog = new THREE.Fog(BG, 24, 54);
const camera = new THREE.PerspectiveCamera(34, 1, .1, 200);
if (renderer) {
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.35;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  hero.classList.add('gl');
}
scene.add(new THREE.HemisphereLight('#ffffff', '#3a342c', 1.1));
const sun = new THREE.DirectionalLight('#fff4e2', 3.2);
sun.position.set(-9, 16, 7); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, {left: -24, right: 24, top: 24, bottom: -24, near: 1, far: 60});
sun.shadow.bias = -.0004; scene.add(sun);
const rim = new THREE.DirectionalLight('#9fb4ff', .4); rim.position.set(10, 6, -12); scene.add(rim);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({color: '#1d1b19', roughness: 1}));
ground.rotation.x = -Math.PI / 2; ground.position.y = -.002; ground.receiveShadow = true; scene.add(ground);

function concreteTex(){
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'), d = x.createImageData(256, 256);
  for (let i = 0; i < d.data.length; i += 4) { const v = 205 + Math.random() * 50; d.data[i] = d.data[i+1] = d.data[i+2] = v; d.data[i+3] = 255; }
  x.putImageData(d, 0, 0);
  for (let i = 0; i < 260; i++) { x.fillStyle = `rgba(60,60,60,${.15 + Math.random() * .3})`; x.beginPath(); x.arc(Math.random() * 256, Math.random() * 256, Math.random() * 1.6 + .3, 0, 7); x.fill(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}
const tex = concreteTex();
const mat = new THREE.MeshStandardMaterial({color: '#ffffff', map: tex, roughness: .9, bumpMap: tex, bumpScale: .6});
const YEL = new THREE.Color('#FFB400');

// раскладка «Новый город»: 1 единица = 100 мм; камни 240×160, 160×160, 80×160, доли по комплектации поддона 168 / 252 / 168
let rs = 7; const rnd = () => (rs = rs * 16807 % 2147483647) / 2147483647;
const FIELD = {x: 26, z: 20}, GAP = .05;
function layout(form){
  rs = form === 'ng' ? 7 : 13; const out = [];
  if (form === 'ng') for (let z = -FIELD.z; z < FIELD.z; z += 1.6) { let x = -FIELD.x - rnd() * 2.4; while (x < FIELD.x) { const q = rnd() * 588, w = q < 168 ? 2.4 : q < 420 ? 1.6 : .8; out.push({x: x + w / 2, z: z + .8, w, d: 1.6}); x += w; } }
  else { let row = 0; for (let z = -FIELD.z; z < FIELD.z; z += 1, row++) for (let x = -FIELD.x - (row % 2); x < FIELD.x; x += 2) out.push({x: x + 1, z: z + .5, w: 2, d: 1}); } // Брусчатка 200×100, перевязка
  return out;
}
let stones = [], groups = [], slot = null, IMPACT = new THREE.Vector3();
function tint(i){ const c = COLORS[color]; const j = ((i * 7919) % 100 / 100 - .5); return new THREE.Color(c.c).offsetHSL(c.mix ? j * .03 : 0, c.mix ? j * .08 : 0, j * (c.mix ? .14 : .05)); }
const drop = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({color: YEL, map: tex, roughness: .7, emissive: YEL, emissiveIntensity: .25}));
drop.castShadow = true; scene.add(drop);
function build(form){
  groups.forEach(g => { scene.remove(g.mesh); g.mesh.geometry.dispose(); g.mesh.dispose(); });
  stones = []; groups = [];
  const list = layout(form);
  // точка удара — центр поля; «первый камень» — самый длинный камень у центра
  const maxW = Math.max(...list.map(s => s.w));
  slot = list.filter(s => s.w === maxW).sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z))[0];
  IMPACT.set(slot.x, 0, slot.z);
  const bySize = new Map();
  list.forEach(s => { const k = s.w + 'x' + s.d; if (!bySize.has(k)) bySize.set(k, []); bySize.get(k).push(s); });
  let idx = 0;
  bySize.forEach(arr => {
    const geo = new RoundedBoxGeometry(arr[0].w - GAP, 1, arr[0].d - GAP, 3, .07); geo.translate(0, .5, 0);
    const mesh = new THREE.InstancedMesh(geo, mat, arr.length);
    mesh.castShadow = mesh.receiveShadow = true; mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    arr.forEach((s, j) => { Object.assign(s, {mesh, j, i: idx++, r0: Math.hypot(s.x - IMPACT.x, s.z - IMPACT.z), lift: 0, h: hTarget(), hTo: hTarget(), hAt: 0}); s.c = tint(s.i); mesh.setColorAt(j, s.c); stones.push(s); });
    scene.add(mesh); groups.push({mesh, arr});
  });
  drop.geometry.dispose(); drop.geometry = new RoundedBoxGeometry(slot.w - GAP, 1, slot.d - GAP, 3, .07).translate(0, .5, 0);
}
const hTarget = () => state.mm / 100;

// ---------- волны ----------
let ripples = [];
function ripple(x, z, A, o = {}){ ripples.push({x, z, t0: performance.now() + (o.delay || 0), A, v: o.v || 13, w: o.w || 1.6, k: o.k || 1.25, decay: o.decay || .9}); if (ripples.length > 7) ripples.shift(); }

// ---------- камера: точка удара всегда в центре сцены ----------
const ease = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
const mouse = {x: 0, y: 0, sx: 0, sy: 0};
const tgt = new THREE.Vector3(), off = new THREE.Vector3(), pA = new THREE.Vector3(), pB = new THREE.Vector3();
let narrow = false;
function resize(){
  if (!renderer) return;
  const r = stage.getBoundingClientRect(); if (!r.width) return;
  renderer.setSize(r.width, r.height, false); camera.aspect = r.width / r.height;
  narrow = r.width < 700;
  // на узком экране поле видно шире, чтобы волна не обрезалась
  camera.fov = camera.aspect < .8 ? 52 : camera.aspect < 1.3 ? 42 : 34;
  // камень падает в свободное место между текстом и панелью: сдвигаем кадр так, чтобы точка удара была там
  const txt = document.querySelector('.h-txt').getBoundingClientRect(), cfg = document.querySelector('.cfg').getBoundingClientRect();
  let fx = .5, fy = .5;
  if (cfg.left > txt.right - 40) { fx = ((txt.right + cfg.left) / 2 - r.left) / r.width; fy = .52; }
  else { const top = txt.bottom - r.top, bot = cfg.top - r.top; if (bot > top) fy = (top + bot) / 2 / r.height; }
  fx = Math.min(.75, Math.max(.25, fx)); fy = Math.min(.7, Math.max(.3, fy));
  camera.setViewOffset(r.width, r.height, (.5 - fx) * r.width, (.5 - fy) * r.height, r.width, r.height);
  camera.updateProjectionMatrix();
  pA.set(IMPACT.x + 5, 4.2, IMPACT.z + 7);                       // низко, рядом с местом удара
  pB.set(IMPACT.x, camera.aspect < 1 ? 19 : 15, IMPACT.z + (camera.aspect < 1 ? 13 : 16));  // выше и дальше
}

let t0 = 0, impactAt = 0, revealR = -1, shake = 0, camK = 0, intro = true, slotHidden = true, swapAt = 0, swapDone = true;
const FALL = 620, FALL_H = 7;
function start(now){
  t0 = now; impactAt = 0; ripples = []; intro = !reduce; slotHidden = !reduce; revealR = reduce ? 1e9 : -1; camK = reduce ? 1 : 0;
  drop.visible = !reduce; drop.scale.y = hTarget(); hero.classList.toggle('ready', reduce);
}
// смена формы: плитка уходит вниз за 0,25 с, новая раскладка поднимается волной за 0,6 с
function swapForm(){
  if (reduce || !renderer) { build(state.form); return; }
  swapAt = performance.now(); swapDone = false;
}

let swapRev = 0, hover = null, visible = true, lastRip = {x: 1e9, z: 1e9, t: 0};
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hitP = new THREE.Vector3();
const dummy = new THREE.Object3D(), col = new THREE.Color(), DARK = .06;

function frame(now){
  requestAnimationFrame(frame);
  if (!visible || hero.hidden) return;
  const t = now - t0;
  if (intro) {
    const k = Math.min(1, t / FALL);
    drop.position.set(slot.x, FALL_H * (1 - k * k), slot.z);
    drop.rotation.set((1 - k) * .5, (1 - k) * .9, (1 - k) * .3);
    if (k >= 1 && !impactAt) {
      impactAt = now; drop.visible = false; slotHidden = false; shake = 1;
      ripple(slot.x, slot.z, 1.2, {v: 14, w: 1.9, decay: .6});
      ripple(slot.x, slot.z, .45, {v: 8, w: 1.2, decay: 1.2, delay: 280});
    }
    if (impactAt) {
      revealR = (now - impactAt) / 1000 * 14;
      camK = ease(Math.min(1, (now - impactAt - 100) / 2400));
      if (camK > .35 && !hero.classList.contains('ready')) { hero.classList.add('ready'); setTimeout(resize, 900); }
      if (revealR > 70 && camK >= 1) intro = false;
    }
  }
  let sink = 0;
  if (!swapDone) {
    const k = (now - swapAt) / 250;
    if (k < 1) sink = k; else { build(state.form); swapDone = true; revealR = 0; impactAt = now; ripple(IMPACT.x, IMPACT.z, .8, {v: 30, w: 1.8, decay: .9}); swapRev = now; }
  }
  if (swapRev) { revealR = (now - swapRev) / 1000 * 60; if (revealR > 80) swapRev = 0; }
  mouse.sx += (mouse.x - mouse.sx) * .05; mouse.sy += (mouse.y - mouse.sy) * .05; shake *= .88;
  camera.position.lerpVectors(pA, pB, camK).add(off.set(mouse.sx * 1.2 * camK + (Math.random() - .5) * shake * .4, -mouse.sy * .6 * camK + (Math.random() - .5) * shake * .3, 0));
  camera.lookAt(tgt.set(IMPACT.x, 0, IMPACT.z));

  ripples = ripples.filter(r => (now - r.t0) / 1000 * r.decay < 4.2);
  const R = ripples.filter(r => now >= r.t0).map(r => ({...r, tau: (now - r.t0) / 1000}));
  for (const s of stones) {
    let h = 0, sx = 0, sz = 0, glow = 0;
    for (const r of R) {
      const dx = s.x - r.x, dz = s.z - r.z, dist = Math.hypot(dx, dz) || 1, d = dist - r.v * r.tau;
      if (d > 3.5 * r.w || d < -14) continue;
      const Dm = Math.exp(-r.decay * r.tau), e = Math.exp(-(d * d) / (2 * r.w * r.w));
      h += r.A * Dm * e * Math.cos(r.k * d);
      const sl = r.A * Dm * e * (-(d / (r.w * r.w)) * Math.cos(r.k * d) - r.k * Math.sin(r.k * d));
      sx += sl * dx / dist; sz += sl * dz / dist; glow += Math.max(0, r.A * Dm * e) * .55;
    }
    s.lift += ((s === hover ? .14 : 0) - s.lift) * .2;
    if (s.h !== s.hTo) { const q = Math.min(1, Math.max(0, (now - s.hAt) / 380)); s.hNow = s.h + (s.hTo - s.h) * ease(q); if (q >= 1) s.h = s.hTo; } else s.hNow = s.h;
    dummy.position.set(s.x, Math.max(-.5, h * .55) + s.lift - sink * sink * 1.2, s.z); dummy.rotation.set(-sz * .35, 0, sx * .35);
    dummy.scale.set(1, s === slot && slotHidden ? 0 : s.hNow, 1); dummy.updateMatrix();
    s.mesh.setMatrixAt(s.j, dummy.matrix);
    let base = s.c;
    if (s.cFrom) { const q = Math.min(1, Math.max(0, (now - s.cAt) / 380)); base = col.copy(s.cFrom).lerp(s.cTo, q).clone(); if (q >= 1) { s.c = s.cTo; s.cFrom = null; } }
    if (s === slot) base = YEL;
    const rev = Math.min(1, Math.max(0, (revealR - s.r0) / 3));
    col.copy(base).multiplyScalar((DARK + (1 - DARK) * rev) * (1 + glow) * (1 - sink * .8)); s.mesh.setColorAt(s.j, col);
  }
  groups.forEach(g => { g.mesh.instanceMatrix.needsUpdate = true; g.mesh.instanceColor.needsUpdate = true; });
  renderer.render(scene, camera);
}

// ---------- курсор и касания: круги на плитке ----------
function groundAt(e){
  const r = stage.getBoundingClientRect();
  ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height * 2 - 1)); ray.setFromCamera(ndc, camera);
  return ray.ray.intersectPlane(plane, hitP) ? hitP : null;
}
hero.addEventListener('pointermove', e => {
  const r = stage.getBoundingClientRect();
  mouse.x = Math.max(-1, Math.min(1, (e.clientX - r.left) / r.width * 2 - 1)); mouse.y = Math.max(-1, Math.min(1, (e.clientY - r.top) / r.height * 2 - 1));
  if (!renderer || intro || e.target.closest('.cfg,.h-txt,.nums')) { hover = null; tip.classList.remove('on'); return; }
  const p = groundAt(e); if (!p) return;
  const now = performance.now();
  if (!reduce && Math.hypot(p.x - lastRip.x, p.z - lastRip.z) > 2.2 && now - lastRip.t > 90) { ripple(p.x, p.z, .22, {v: 8, w: 1.1, decay: 1.4}); lastRip = {x: p.x, z: p.z, t: now}; }
  if (e.pointerType !== 'mouse') return;
  const hit = ray.intersectObjects(groups.map(g => g.mesh), false)[0];
  hover = hit ? groups.find(g => g.mesh === hit.object).arr[hit.instanceId] : null;
  if (hover) { tip.textContent = `${Math.round(hover.w * 100)} × ${Math.round(hover.d * 100)} × ${state.mm} мм`; tip.style.left = (e.clientX - r.left) + 'px'; tip.style.top = (e.clientY - r.top) + 'px'; tip.classList.add('on'); }
  else tip.classList.remove('on');
});
hero.addEventListener('pointerdown', e => {
  if (!renderer || intro || e.target.closest('.cfg,.h-txt,.nums,a,button')) return;
  const p = groundAt(e); if (p && !reduce) ripple(p.x, p.z, .9, {v: 12, w: 1.6, decay: .8});
});
hero.addEventListener('pointerleave', () => { mouse.x = mouse.y = 0; hover = null; tip.classList.remove('on'); });

// ---------- панель: форма, цвет, толщина, цена из каталога ----------
const fmt = n => new Intl.NumberFormat('ru-RU').format(n);
const sw = document.getElementById('gColor'), nameEl = document.getElementById('gColorName'), go = document.getElementById('gGo'), thickBox = document.getElementById('gThick');
const cur = () => IDX[state.form][COLORS[color].n]?.[state.mm];
function drawSwatches(){
  sw.innerHTML = '';
  COLORS.forEach((c, i) => {
    const any = IDX[state.form][c.n], id = any && (any[state.mm] || Object.values(any)[0]), img = id && D.products[id].img[0];
    const b = document.createElement('button'); b.type = 'button'; b.title = c.n; b.setAttribute('aria-label', 'Цвет ' + c.n);
    b.style.background = img ? `${c.c} url("${img}") center/420% no-repeat` : c.c;
    b.disabled = !any || !any[state.mm];
    if (b.disabled) b.title = `${c.n}: нет в толщине ${state.mm} мм`;
    b.setAttribute('aria-pressed', i === color);
    b.addEventListener('click', () => pick(i));
    sw.appendChild(b);
  });
}
function drawThick(){
  thickBox.innerHTML = THICK(state.form).map(mm => `<button type="button" data-v="${mm}" aria-pressed="${mm === state.mm}">${mm} мм</button>`).join('');
}
function pick(i){
  color = i; drawSwatches(); nameEl.textContent = COLORS[i].n; price();
  const now = performance.now(), cx = hover ? hover.x : IMPACT.x, cz = hover ? hover.z : IMPACT.z;
  stones.forEach(s => { s.cFrom = s.c.clone(); s.cTo = tint(s.i); s.cAt = reduce ? now - 1e4 : now + Math.hypot(s.x - cx, s.z - cz) / 13 * 1000; });
  if (renderer && !reduce) ripple(cx, cz, .55, {v: 13, w: 1.4, decay: .75});
}
function price(){
  const id = cur(), p = id && D.products[id], el = document.getElementById('gPrice'), note = document.getElementById('gNote');
  if (p && p.price) {
    el.innerHTML = `<b>${fmt(p.price)} ₽</b>${p.old ? `<s>${fmt(p.old)} ₽</s><em>−${Math.round((1 - p.price / p.old) * 100)}%</em>` : ''}`;
    note.textContent = `${p.name.replace('Тротуарная плитка ', '')} · ${p.unit.toLowerCase()}` + (p.pallet ? ` · поддон ${String(p.pallet).replace('.', ',')} м²` : '');
    go.href = '#/p/' + id;
  } else { el.innerHTML = `<b style="font-size:20px">Нет в ассортименте</b>`; note.textContent = 'Выберите другой цвет или толщину'; go.href = '#/catalog/trotuarnaya-plitka'; }
}
document.getElementById('gForm').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || b.dataset.v === state.form) return;
  e.currentTarget.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b));
  state.form = b.dataset.v;
  if (!THICK(state.form).includes(state.mm)) state.mm = THICK(state.form)[0];
  if (!IDX[state.form][COLORS[color].n]?.[state.mm]) color = 0;
  drawThick(); drawSwatches(); nameEl.textContent = COLORS[color].n; price(); swapForm();
});
thickBox.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  state.mm = +b.dataset.v; drawThick();
  if (!IDX[state.form][COLORS[color].n]?.[state.mm]) color = 0;
  drawSwatches(); nameEl.textContent = COLORS[color].n; price();
  const now = performance.now();
  stones.forEach(s => { s.h = s.hNow ?? s.h; s.hTo = hTarget(); s.hAt = reduce ? now - 1e4 : now + s.r0 / 14 * 1000; });
  if (renderer && !reduce) ripple(IMPACT.x, IMPACT.z, .6, {v: 14, w: 1.4, decay: .75});
});
document.getElementById('gCalc').addEventListener('click', () => {
  const id = cur(); if (!id) return;
  try { localStorage.setItem('stellard-calc', JSON.stringify(id)); } catch (e) {}
  window.dispatchEvent(new CustomEvent('calc-pick', {detail: id}));
  document.getElementById('calc')?.scrollIntoView({behavior: 'smooth', block: 'start'});
});
build(state.form); drawThick(); drawSwatches(); price();

if (renderer) {
  resize(); new ResizeObserver(resize).observe(stage);
  new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(hero);
  start(performance.now());
  requestAnimationFrame(frame);
  addEventListener('route', e => { if (e.detail.home && !intro && !reduce) { resize(); start(performance.now()); } });
} else hero.classList.add('ready');
