// Симулятор тягової системи протеза верхньої кінцівки — інтерактивна частина.
// Стан ↔ посилання (query), повзунки, перетягування ретейнерів і точки перехрещення, технічні SVG-креслення
// (позиційні позначки, розмірні лінії, штамп), телеметрія, діагностика.
// © 2026 Марина Гурак, Praxis. Код — усі права захищено (LICENSE-TOOLS.md).
import { META, getUi, sym } from '../lib/bodypowered/content';
import {
  BODY, MU_PTFE, MU_UNLINED, CROSS_OPT, FATIGUE_SHARE, TR, TR_DEFAULT,
  bodyExcursion, efficiency, harnessCapture, hookSpring, socketRadius, solveOpening, toDeg, toRad, trScheme, type Vec,
} from '../lib/bodypowered/physics';

type Mode = 'patient' | 'pro';
type Pair = 'ptfe' | 'unlined' | 'custom';
interface State {
  mode: Mode; harness: '8' | '9'; scap: number; gh: number; bands: number;
  approach: number; slack: number; sProx: number; sDist: number;
  pair: Pair; mu: number; fMax: number; lReq: number; cx: number; cy: number;
}
const DEF: State = {
  mode: 'patient', harness: '8', scap: 40, gh: 35, bands: 3,
  approach: TR_DEFAULT.approachDeg, slack: TR_DEFAULT.slack, sProx: TR_DEFAULT.sProx, sDist: TR_DEFAULT.sDist,
  pair: 'ptfe', mu: MU_PTFE, fMax: 250, lReq: 50, cx: CROSS_OPT[0], cy: CROSS_OPT[1],
};
const Q: Record<string, keyof State> = { m: 'mode', h: 'harness', s: 'scap', g: 'gh', b: 'bands', a: 'approach', l: 'slack', p: 'sProx', d: 'sDist', c: 'pair', u: 'mu', f: 'fMax', r: 'lReq', x: 'cx', y: 'cy' };
const LIMITS: Record<string, [number, number]> = {
  scap: [0, 100], gh: [0, 90], bands: [1, 4], approach: [TR.approach[0], TR.approach[1]], slack: [TR.slack[0], TR.slack[1]],
  sProx: [TR.sProx[0], TR.sProx[1]], sDist: [TR.sDist[0], TR.sDist[1]], mu: [0.05, 0.4], fMax: [87, 538], lReq: [30, 70], cx: [-80, 80], cy: [-20, 90],
};
const clampK = (k: string, v: number) => Math.max(LIMITS[k][0], Math.min(LIMITS[k][1], v));

function readUrl(): State {
  const st: State = { ...DEF };
  const q = new URLSearchParams(location.search);
  for (const [short, key] of Object.entries(Q)) {
    const v = q.get(short);
    if (v == null) continue;
    if (key === 'mode') st.mode = v === 'r' ? 'pro' : 'patient';
    else if (key === 'harness') st.harness = v === '9' ? '9' : '8';
    else if (key === 'pair') st.pair = v === 'u' ? 'unlined' : v === 'c' ? 'custom' : 'ptfe';
    else if (Number.isFinite(+v)) (st as any)[key] = clampK(key, +v);
  }
  return st;
}
function writeUrl(st: State) {
  const q = new URLSearchParams();
  for (const [short, key] of Object.entries(Q)) {
    const v = st[key];
    if (v === DEF[key]) continue;
    if (key === 'mode') q.set(short, v === 'pro' ? 'r' : 'p');
    else if (key === 'pair') q.set(short, v === 'unlined' ? 'u' : v === 'custom' ? 'c' : 't');
    else q.set(short, String(typeof v === 'number' ? +v.toFixed(3) : v));
  }
  const s = q.toString();
  history.replaceState(null, '', `${location.pathname}${s ? `?${s}` : ''}${location.hash}`);
}

const muOf = (st: State) => (st.pair === 'ptfe' ? MU_PTFE : st.pair === 'unlined' ? MU_UNLINED : st.mu);

function compute(st: State) {
  const mu = muOf(st);
  const geo = trScheme({ approachDeg: st.approach, sProx: st.sProx, sDist: st.sDist, slack: st.slack });
  const k = harnessCapture([st.cx, st.cy]);
  const raw = bodyExcursion(st.scap / 100, st.gh);
  const res = solveOpening({ raw, k, mu, theta: geo.theta, bands: st.bands, lReq: st.lReq, fMax: st.fMax });
  return { mu, geo, k, raw, res, rawMax: bodyExcursion(1, 90) };
}
type Calc = ReturnType<typeof compute>;

// ---------------------------------------------------------------- палітра й допоміжне SVG
const K = {
  gold: '#e9b44c', gold2: '#ffd27a', cy: '#8db0ff', w: '#e6eaf0', mu: '#8a93a3', ln: '#33404f', ln2: '#4a5668',
  ok: '#46c98b', bad: '#ff5d5d', void: '#06080b', brick: '#121820', mortar: '#222b37', strap: '#8f6d43', stitch: '#d9b77f',
};
const f1 = (n: number) => n.toFixed(1);
const P2 = (p: Vec) => `${f1(p[0])} ${f1(p[1])}`;
const pts = (a: Vec[]) => a.map((p) => `${f1(p[0])},${f1(p[1])}`).join(' ');
const add = (a: Vec, b: Vec): Vec => [a[0] + b[0], a[1] + b[1]];
const sub = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1]];
const mul = (a: Vec, k: number): Vec => [a[0] * k, a[1] * k];
const unit = (a: Vec): Vec => { const l = Math.hypot(a[0], a[1]) || 1; return [a[0] / l, a[1] / l]; };
const ang = (v: Vec) => Math.atan2(v[1], v[0]);
function mix(a: string, b: string, t: number) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(',')})`;
}
/** Колір натягу троса: блакитний → золотий → червоний. */
function tensionColor(t: number) {
  t = Math.max(0, Math.min(1, t));
  return t < 0.5 ? mix(K.cy, K.gold, t / 0.5) : mix(K.gold, K.bad, (t - 0.5) / 0.5);
}
function arc(c: Vec, r: number, a0: number, a1: number) {
  let d = a1 - a0;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  const p0: Vec = [c[0] + r * Math.cos(a0), c[1] + r * Math.sin(a0)];
  const p1: Vec = [c[0] + r * Math.cos(a0 + d), c[1] + r * Math.sin(a0 + d)];
  return `M${P2(p0)}A${r} ${r} 0 0 ${d > 0 ? 1 : 0} ${P2(p1)}`;
}
const hex = (c: Vec, r: number) => pts([0, 1, 2, 3, 4, 5].map((i): Vec => [c[0] + r * Math.cos(toRad(60 * i - 90)), c[1] + r * Math.sin(toRad(60 * i - 90))]));
/** HTML-індекси → SVG tspan (зсув у власних em компенсується в em батьківського шрифту). */
const svgSub = (html: string) => html
  .replace(/<sub>([^<]*)<\/sub>/g, '<tspan dy="0.4em" font-size="72%">$1</tspan><tspan dy="-0.288em">​</tspan>')
  .replace(/<sup>([^<]*)<\/sup>/g, '<tspan dy="-0.6em" font-size="72%">$1</tspan><tspan dy="0.432em">​</tspan>');
/** Позиційна позначка: виносна лінія від елемента + золотий ярлик. */
function tag(id: string, at: Vec, to: Vec, col = K.gold) {
  const w = id.length > 1 ? 24 : 17;
  return `<path d="M${P2(at)}L${P2(to)}" stroke="${col}" stroke-width="0.9" opacity="0.75"/><circle cx="${f1(at[0])}" cy="${f1(at[1])}" r="2.2" fill="${col}"/>`
    + `<g class="tg"><rect x="${f1(to[0] - w / 2)}" y="${f1(to[1] - 7.5)}" width="${w}" height="15" fill="${col}" stroke="${K.void}" stroke-width="1"/><text class="tag" x="${f1(to[0])}" y="${f1(to[1] + 3.8)}" text-anchor="middle">${id}</text></g>`;
}
/** Брусок кінцівки з «цеглинковими» швами. */
function seg(a: Vec, b: Vec, w: number, fill = '#18202a', step = 18) {
  const u = unit(sub(b, a));
  const n: Vec = [(-u[1] * w) / 2, (u[0] * w) / 2];
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  let h = `<path d="M${P2(add(a, n))}L${P2(add(b, n))}L${P2(sub(b, n))}L${P2(sub(a, n))}Z" fill="${fill}" stroke="#3a4555" stroke-width="1.2" stroke-linejoin="round"/>`;
  for (let t = step; t < L - 6; t += step) { const p = add(a, mul(u, t)); h += `<path d="M${P2(add(p, n))}L${P2(sub(p, n))}" stroke="#2a3441" stroke-width="1"/>`; }
  return h;
}
const brickPattern = (id: string, w: number, hh: number) => `<pattern id="${id}" width="${w}" height="${hh * 2}" patternUnits="userSpaceOnUse"><rect width="${w}" height="${hh * 2}" fill="${K.brick}"/><path d="M0 .5H${w}M0 ${hh + 0.5}H${w}M.5 0V${hh}M${w / 2 + 0.5} ${hh}V${hh * 2}" stroke="${K.mortar}" stroke-width="1"/></pattern>`;
const strap = (d: string, w = 8) => `<path d="${d}" fill="none" stroke="${K.strap}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${K.stitch}" stroke-width="0.9" stroke-dasharray="3 3" opacity="0.8"/>`;

export function initBodyPowered() {
  const host = document.querySelector<HTMLElement>('.bp');
  if (!host) return;
  const root: HTMLElement = host;
  const lang = (root.dataset.lang === 'en' ? 'en' : 'uk') as 'uk' | 'en';
  const ui = getUi(lang);
  const T = (html: string) => svgSub(sym(lang, html));
  const nf = (d: number) => new Intl.NumberFormat(lang === 'uk' ? 'uk-UA' : 'en-GB', { maximumFractionDigits: d, minimumFractionDigits: d });
  const fmt0 = nf(0), fmt1 = nf(1), fmt2 = nf(2), fmt3 = nf(3);
  const $ = <E extends Element = HTMLElement>(s: string) => root.querySelector<E>(s)!;
  const out = (k: string) => root.querySelector<HTMLElement>(`[data-o="${k}"]`);
  const svBack = $<SVGSVGElement>('.sv-back');
  const svSide = $<SVGSVGElement>('.sv-side');
  const svHook = $<SVGSVGElement>('.sv-hook');
  const svCross = $<SVGSVGElement>('.sv-cross');
  const svChart = $<SVGSVGElement>('.sv-chart');
  const mm = ui.mm, N = ui.N;

  let st = readUrl();
  let snap: null | { theta: number; eta: number; fInFull: number; x: number } = null;
  let raf = 0;

  // ------------------------------------------------ керування
  function syncControls() {
    root.classList.toggle('is-pro', st.mode === 'pro');
    root.dataset.h = st.harness;
    root.querySelectorAll<HTMLButtonElement>('.seg-b').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.mode === st.mode)));
    root.querySelectorAll<HTMLButtonElement>('.hb').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.h === st.harness)));
    root.querySelectorAll<HTMLInputElement>('input[data-k]').forEach((i) => { i.value = String((st as any)[i.dataset.k!]); });
    $<HTMLSelectElement>('select[data-k="pair"]').value = st.pair;
    $('.rng-mu').toggleAttribute('hidden', st.pair !== 'custom');
  }
  function setOutputs() {
    const v = (k: string, s: string) => { const o = root.querySelector(`output[data-v="${k}"]`); if (o) o.textContent = s; };
    v('scap', `${fmt0.format(st.scap)} %`);
    v('gh', `${fmt0.format(st.gh)}°`);
    v('bands', fmt0.format(st.bands));
    v('approach', `${fmt0.format(st.approach)}°`);
    v('slack', `${fmt0.format(st.slack)} ${mm}`);
    v('mu', fmt3.format(st.mu));
    v('fMax', `${fmt0.format(st.fMax)} ${N}`);
    v('lReq', `${fmt0.format(st.lReq)} ${mm}`);
  }

  root.querySelectorAll<HTMLInputElement>('input[data-k]').forEach((inp) => {
    inp.addEventListener('input', () => {
      const k = inp.dataset.k!;
      (st as any)[k] = clampK(k, +inp.value);
      schedule();
    });
  });
  $<HTMLSelectElement>('select[data-k="pair"]').addEventListener('change', (e) => {
    st.pair = (e.target as HTMLSelectElement).value as Pair;
    if (st.pair === 'ptfe') st.mu = MU_PTFE;
    if (st.pair === 'unlined') st.mu = MU_UNLINED;
    syncControls();
    schedule();
  });
  root.querySelectorAll<HTMLButtonElement>('.seg-b').forEach((b) => b.addEventListener('click', () => { st.mode = b.dataset.mode as Mode; syncControls(); schedule(); }));
  root.querySelectorAll<HTMLButtonElement>('.hb').forEach((b) => b.addEventListener('click', () => { st.harness = b.dataset.h as '8' | '9'; syncControls(); schedule(); }));
  $<HTMLButtonElement>('[data-act="reset"]').addEventListener('click', () => { st = { ...DEF, mode: st.mode }; syncControls(); schedule(); });
  const snapBtn = $<HTMLButtonElement>('[data-act="snap"]');
  snapBtn.addEventListener('click', () => {
    if (snap) snap = null;
    else { const c = compute(st); snap = { theta: c.geo.theta, eta: c.res.eta, fInFull: c.res.fInFull, x: c.res.x }; }
    snapBtn.textContent = snap ? ui.snapClear : ui.snap;
    snapBtn.setAttribute('aria-pressed', String(!!snap));
    schedule();
  });
  const copyBtn = $<HTMLButtonElement>('[data-act="copy"]');
  copyBtn.addEventListener('click', async () => {
    writeUrl(st);
    try { await navigator.clipboard.writeText(location.href); copyBtn.textContent = ui.copied; }
    catch { copyBtn.textContent = location.href; }
    setTimeout(() => { copyBtn.textContent = ui.copy; }, 1800);
  });

  // ------------------------------------------------ перетягування (вказівник і клавіатура)
  function svgPoint(svg: SVGSVGElement, e: PointerEvent): Vec {
    const p = svg.createSVGPoint();
    p.x = e.clientX; p.y = e.clientY;
    const m = svg.getScreenCTM();
    if (!m) return [0, 0];
    const q = p.matrixTransform(m.inverse());
    return [q.x, q.y];
  }
  function bindDrag(svg: SVGSVGElement, onMove: (target: string, pt: Vec) => void) {
    let target: string | null = null;
    svg.addEventListener('pointerdown', (e) => {
      const g = (e.target as Element).closest<SVGGElement>('[data-drag]');
      if (!g) return;
      target = g.dataset.drag!;
      svg.setPointerCapture(e.pointerId);
      svg.classList.add('dragging');
      e.preventDefault();
    });
    svg.addEventListener('pointermove', (e) => { if (target) { onMove(target, svgPoint(svg, e)); schedule(); } });
    const end = () => { target = null; svg.classList.remove('dragging'); };
    svg.addEventListener('pointerup', end);
    svg.addEventListener('pointercancel', end);
    svg.addEventListener('keydown', (e) => {
      const g = (e.target as Element).closest<SVGGElement>('[data-drag]');
      if (!g) return;
      const step = e.shiftKey ? 15 : 5;
      const d: Record<string, Vec> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
      if (!d[e.key]) return;
      e.preventDefault();
      const id = g.dataset.drag!;
      if (id === 'P') st.sProx = clampK('sProx', st.sProx + d[e.key][0]);
      if (id === 'D') st.sDist = clampK('sDist', st.sDist + d[e.key][0]);
      if (id === 'X') { st.cx = clampK('cx', st.cx + d[e.key][0]); st.cy = clampK('cy', st.cy + d[e.key][1]); }
      schedule();
      requestAnimationFrame(() => svg.querySelector<SVGGElement>(`[data-drag="${id}"]`)?.focus());
    });
  }
  bindDrag(svSide, (t, p) => {
    if (t === 'P') st.sProx = clampK('sProx', p[0]);
    if (t === 'D') st.sDist = clampK('sDist', p[0]);
  });
  const CROSS_S = 0.9; // px на мм у мініатюрі спини
  bindDrag(svCross, (t, p) => {
    if (t !== 'X') return;
    st.cx = clampK('cx', (p[0] - 120) / CROSS_S);
    st.cy = clampK('cy', (p[1] - 34) / CROSS_S);
  });

  // ------------------------------------------------ FIG. 1 (пацієнт): задня проєкція, «цеглинкова» фігура
  function drawBack(c: Calc) {
    const s = st.scap / 100;
    const ffx = 1 - 0.5 * Math.sin((st.gh / 90) * (Math.PI / 2)); // скорочення проєкції руки, що йде вперед
    const tcol = tensionColor(c.res.fIn / Math.max(1, st.fMax) / 0.4);
    const d = 56 + 22 * s;
    const Sh: Vec = [410, 172];
    const E: Vec = [424, 178 + 152 * ffx];
    const W: Vec = [430, E[1] + 132 * ffx];
    const hanger: Vec = [416, 178 + 100 * ffx];
    const ret: Vec = [E[0] - 6, E[1] + 26 * ffx];
    const hEnd: Vec = [W[0] - 10, W[1] - 8];
    const R: Vec = [300 + st.cx * CROSS_S, 128 + st.cy * CROSS_S];
    const fig8 = st.harness === '8';
    let h = `<defs>${brickPattern('bk-br', 28, 7)}`;
    h += `<linearGradient id="bk-vol" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".45"/><stop offset=".5" stop-color="${K.cy}" stop-opacity=".07"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></linearGradient>`;
    h += `<linearGradient id="bk-g1" x1="0" x2="1"><stop offset="0" stop-color="${K.gold2}"/><stop offset="1" stop-color="${K.gold}"/></linearGradient>`;
    h += `<linearGradient id="bk-g2" x1="0" x2="1"><stop offset="0" stop-color="#b8862e"/><stop offset="1" stop-color="#6e4f17"/></linearGradient></defs>`;
    h += '<g transform="translate(20 0)">';
    // руки (під тулубом): здоровий бік — цілісна; бік протеза — плече + гільза передпліччя
    h += seg([190, 168], [178, 322], 30) + `<circle cx="178" cy="326" r="13" fill="#18202a" stroke="${K.cy}" stroke-opacity=".45"/>` + seg([178, 330], [170, 462], 27);
    h += `<rect x="155" y="464" width="30" height="34" rx="3" fill="#18202a" stroke="#3a4555"/><path d="M155 476H185M155 488H185" stroke="#2a3441"/>`;
    h += seg(Sh, [E[0], E[1] - 4], 30);
    // тулуб
    const torso = 'M206 150 L394 150 L406 164 L404 240 L388 522 L212 522 L196 240 L194 164 Z';
    h += `<path d="${torso}" fill="url(#bk-br)"/><path d="${torso}" fill="url(#bk-vol)" stroke="#3a4555" stroke-width="1.5" stroke-linejoin="round"/>`;
    for (const x of [212, 230, 248, 340, 358, 376]) h += `<rect x="${x}" y="144" width="12" height="6" fill="#1a222d" stroke="#3a4555"/>`;
    // шия й голова (гранована, без обличчя)
    h += `<rect x="284" y="112" width="32" height="40" fill="#151b24" stroke="#3a4555"/><path d="M284 124H316M284 138H316" stroke="#2a3441"/>`;
    h += `<path d="M272 40 L284 24 L316 24 L328 40 L332 90 L320 108 L280 108 L268 90 Z" fill="#161d27" stroke="#3a4555" stroke-width="1.5" stroke-linejoin="round"/><path d="M300 24 V108 M268 62 H332" stroke="#26303d"/>`;
    h += `<rect x="290" y="16" width="20" height="8" fill="#1a222d" stroke="#3a4555"/>`;
    h += `<line x1="300" y1="124" x2="300" y2="514" stroke="#3a4555" stroke-dasharray="10 3 2 3"/>`;
    // лопатки (каркас) і розмір розведення
    const scapula = (side: number) => {
      const mx = 300 + side * (d - 20), lx = 300 + side * (d + 26);
      return `<path d="M${mx} 190 L${mx} 280 L${lx} 206 Z" fill="rgba(141,176,255,0.09)" stroke="${K.cy}" stroke-width="1.4" stroke-linejoin="round"/><circle cx="${lx}" cy="206" r="2.5" fill="${K.cy}"/>`;
    };
    h += scapula(-1) + scapula(1);
    const mL = 300 - (d - 20), mR = 300 + (d - 20);
    h += `<path d="M${mL} 284V306M${mR} 284V306" stroke="${K.cy}" stroke-width=".8" opacity=".7"/><path d="M${mL} 300H${mR}" stroke="${K.cy}" stroke-width="1"/>`;
    h += `<path d="M${mL - 4} 304l8 -8M${mR - 4} 304l8 -8" stroke="${K.cy}" stroke-width="1.4"/>`;
    h += `<text class="tc" x="300" y="320" text-anchor="middle">s = ${fmt0.format(st.scap)} %</text>`;
    // гільза передпліччя (гранована) і термінальний пристрій
    const u = unit(sub(W, E));
    const n = (w: number): Vec => [-u[1] * w, u[0] * w];
    const a1 = add(E, n(18)), a2 = add(W, n(13)), b2 = sub(W, n(13)), b1 = sub(E, n(18));
    h += `<path d="M${P2(a1)}L${P2(a2)}L${P2(W)}L${P2(E)}Z" fill="url(#bk-g1)"/><path d="M${P2(E)}L${P2(W)}L${P2(b2)}L${P2(b1)}Z" fill="url(#bk-g2)"/>`;
    h += `<path d="M${P2(a1)}L${P2(a2)}L${P2(b2)}L${P2(b1)}Z" fill="none" stroke="#5c4212" stroke-width="1.2" stroke-linejoin="round"/>`;
    const L = Math.hypot(W[0] - E[0], W[1] - E[1]);
    for (let t = 16; t < L - 6; t += 16) { const p = add(E, mul(u, t)); const w = 18 - (5 * t) / L; h += `<path d="M${P2(add(p, n(w)))}L${P2(sub(p, n(w)))}" stroke="#000" stroke-opacity=".22"/>`; }
    h += `<circle cx="${f1(E[0])}" cy="${f1(E[1] - 4)}" r="14" fill="#18202a" stroke="${K.cy}" stroke-opacity=".45"/>`;
    const wh = 10 * ffx + 5;
    h += `<rect x="${W[0] - 12}" y="${f1(W[1] - 1)}" width="24" height="${f1(wh)}" fill="#2a3442" stroke="${K.ln2}"/>`;
    const hy = W[1] - 1 + wh;
    h += `<path d="M${W[0] - 4} ${f1(hy)} C${W[0] - 6} ${f1(hy + 30 * ffx)} ${W[0] + 14} ${f1(hy + 44 * ffx)} ${W[0] + 16} ${f1(hy + 30 * ffx)}" fill="none" stroke="#9aa3b0" stroke-width="5" stroke-linecap="round"/>`;
    h += `<path d="M${W[0] + 4} ${f1(hy)} C${f1(W[0] + 4 + 10 * c.res.x)} ${f1(hy + 26 * ffx)} ${f1(W[0] + 22 + 12 * c.res.x)} ${f1(hy + 34 * ffx)} ${f1(W[0] + 22 + 14 * c.res.x)} ${f1(hy + 18 * ffx)}" fill="none" stroke="${K.w}" stroke-width="5" stroke-linecap="round"/>`;
    // плечовий бандаж
    h += `<ellipse cx="196" cy="196" rx="26" ry="36" transform="rotate(-18 196 196)" fill="none" stroke="${K.strap}" stroke-width="8"/><ellipse cx="196" cy="196" rx="26" ry="36" transform="rotate(-18 196 196)" fill="none" stroke="${K.stitch}" stroke-width=".9" stroke-dasharray="3 3" opacity=".8"/>`;
    h += strap(`M214 168 L${P2(R)} M218 222 L${P2(R)}`);
    if (fig8) h += strap(`M${P2(R)} L396 150`) + `<path d="M396 150 L414 138" stroke="${K.strap}" stroke-width="8" stroke-dasharray="4 5" stroke-linecap="round"/>`;
    h += strap(`M${P2(R)} L${P2(hanger)}`);
    // трос і оболонка Боудена
    h += `<path d="M${P2(hanger)}L${P2(ret)}" stroke="${tcol}" stroke-width="2.4"/>`;
    h += `<path d="M${P2(ret)}L${P2(hEnd)}" stroke="${K.void}" stroke-width="8" stroke-linecap="round"/><path d="M${P2(ret)}L${P2(hEnd)}" stroke="${tcol}" stroke-width="2.2"/>`;
    h += `<rect x="${f1(ret[0] - 6)}" y="${f1(ret[1] - 3)}" width="12" height="6" fill="${K.gold}" stroke="${K.void}"/>`;
    h += `<circle cx="${f1(hanger[0])}" cy="${f1(hanger[1])}" r="3.5" fill="${K.w}"/>`;
    // C7 і точка перехрещення
    h += `<circle cx="300" cy="128" r="3" fill="${K.w}"/><text class="t" x="322" y="132">${ui.c7}</text>`;
    h += `<polygon points="${hex(R, 9)}" fill="${K.void}" stroke="${K.gold}" stroke-width="2.2"/><circle cx="${f1(R[0])}" cy="${f1(R[1])}" r="2.4" fill="${K.w}"/>`;
    // позначки
    const mB: Vec = mul(add(R, hanger), 0.5);
    const mC: Vec = mul(add(ret, hEnd), 0.5);
    h += tag('A', R, [R[0] - 50, R[1] - 36]);
    h += tag('B', mB, [mB[0] + 4, mB[1] - 26]);
    h += tag('C', mC, [mC[0] + 44, mC[1] + 4]);
    h += tag('D', [W[0] + 10, hy + 20 * ffx], [W[0] + 50, hy + 26 * ffx]);
    h += tag('E', [172, 186], [136, 168]);
    if (fig8) h += tag('F', [410, 141], [446, 120]);
    // кути й підписи
    h += `<text class="ta" x="${f1(E[0] + 26)}" y="${f1(E[1] - 12)}">φ = ${fmt0.format(st.gh)}°</text>`;
    h += `<text class="t" x="170" y="548" text-anchor="middle">${ui.sound}</text><text class="t" x="432" y="548" text-anchor="middle">${ui.prosthetic}</text>`;
    const cS = (st.scap / 100) * BODY.scapMax, cG = (Math.min(90, st.gh) / BODY.ghMaxDeg) * BODY.ghMax;
    h += `<text class="tw" x="300" y="582" text-anchor="middle">${T('ΔL<sub>тіло</sub>')} = ${fmt1.format(cS)} + ${fmt1.format(cG)} = ${fmt1.format(c.raw)} ${mm} · k = ${fmt2.format(c.k)}</text>`;
    h += '</g>';
    svBack.innerHTML = h;
  }

  // ------------------------------------------------ FIG. 2: термінальний пристрій (VO), вигляд збоку
  function drawHook(c: Calc) {
    const a = c.res.x * 34; // кут на рисунку — ілюстративний; модель оперує часткою відкриття x
    const n = Math.round(st.bands);
    const { fFull } = hookSpring(n);
    const piv: Vec = [60, 78];
    const rot = (p: Vec): Vec => { const t = toRad(-a); const dx = p[0] - piv[0], dy = p[1] - piv[1]; return [piv[0] + dx * Math.cos(t) - dy * Math.sin(t), piv[1] + dx * Math.sin(t) + dy * Math.cos(t)]; };
    const tip = rot([70, 36]);
    let h = `<defs>${brickPattern('hk-br', 16, 6)}<marker id="hk-ag" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${K.gold}"/></marker></defs>`;
    h += `<line x1="4" y1="78" x2="296" y2="78" stroke="${K.ln}" stroke-dasharray="12 3 2 3"/><line x1="60" y1="-30" x2="60" y2="160" stroke="${K.ln}" stroke-dasharray="12 3 2 3"/>`;
    h += `<rect x="8" y="58" width="44" height="40" fill="url(#hk-br)" stroke="${K.ln2}"/>`;
    for (const x of [13, 26, 39]) h += `<rect x="${x}" y="54" width="8" height="4" fill="#1a222d" stroke="${K.ln2}" stroke-width=".8"/>`;
    h += `<path d="M10 ${f1(tip[1])} L${P2(tip)}" stroke="${tensionColor(c.res.fIn / Math.max(1, st.fMax) / 0.4)}" stroke-width="2.2" marker-start="url(#hk-ag)"/>`;
    h += `<path d="M52 84 C110 88 150 92 176 112 C186 120 182 134 170 132" fill="none" stroke="#9aa3b0" stroke-width="7" stroke-linecap="round"/>`;
    h += `<g transform="rotate(${f1(-a)} 60 78)"><path d="M52 72 C110 70 150 64 176 46 C186 38 182 24 170 26" fill="none" stroke="${K.w}" stroke-width="7" stroke-linecap="round"/><path d="M60 72 L70 36" stroke="${K.w}" stroke-width="5" stroke-linecap="round"/></g>`;
    h += `<circle cx="${f1(tip[0])}" cy="${f1(tip[1])}" r="3.2" fill="${K.gold}"/><circle cx="60" cy="78" r="5" fill="${K.void}" stroke="${K.w}" stroke-width="2"/>`;
    for (let i = 0; i < n; i++) {
      const x = 96 + i * 11;
      const top = 70 - (x - 60) * Math.tan(toRad(a)) * 0.9;
      h += `<ellipse cx="${x}" cy="${f1((top + 88) / 2)}" rx="4.5" ry="${f1((88 - top) / 2 + 4)}" fill="none" stroke="${K.gold}" stroke-width="2.2"/>`;
    }
    if (a > 1.5) {
      const a0 = Math.atan2(46 - 78, 176 - 60), a1 = a0 - toRad(a);
      const tick = (t: number) => `M${P2([piv[0] + 86 * Math.cos(t), piv[1] + 86 * Math.sin(t)])}L${P2([piv[0] + 98 * Math.cos(t), piv[1] + 98 * Math.sin(t)])}`;
      h += `<path d="${arc(piv, 92, a0, a1)}" fill="none" stroke="${K.cy}" stroke-width="1.2" stroke-dasharray="3 3"/><path d="${tick(a0)}${tick(a1)}" stroke="${K.cy}" stroke-width="1.2"/>`;
    }
    h += `<text class="ta" x="10" y="${f1(tip[1] - 15)}">${T('F<sub>вих</sub>')} = ${fmt0.format(c.res.fOut)} ${N}</text>`;
    h += `<text class="tw" x="292" y="-16" text-anchor="end">x = ${fmt0.format(c.res.x * 100)} %</text>`;
    h += `<text class="t" x="292" y="162" text-anchor="end">n = ${n} · ${T('F<sub>пов</sub>')} = ${fFull} ${N}</text>`;
    svHook.innerHTML = h;
  }

  // ------------------------------------------------ FIG. 1 (протезист): схема передачі Боудена, вигляд збоку
  function drawSide(c: Calc) {
    const g = c.geo;
    svSide.setAttribute('viewBox', '-150 -240 560 362');
    let h = `<defs>${brickPattern('sd-br', 24, 6)}`;
    h += `<linearGradient id="sd-vol" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${K.cy}" stop-opacity=".12"/><stop offset=".45" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></linearGradient>`;
    h += `<marker id="sd-ag" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${K.gold}"/></marker>`;
    h += `<marker id="sd-ad" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 1.5L10 5L0 8.5z" fill="${K.mu}"/></marker></defs>`;
    // гільза передпліччя: «цеглинкова» оболонка, проксимальна лінія обрізу, шипи на тильній поверхні
    const top: Vec[] = [], bot: Vec[] = [];
    for (let s = TR.socketFrom; s <= TR.socketTo; s += 5) { top.push([s, -socketRadius(s)]); bot.push([s, socketRadius(s)]); }
    const sock = `M${pts(top)} L${pts([...bot].reverse())} Z`;
    for (let s = 30; s <= 226; s += 14) {
      if (Math.abs(s - g.sP) < 16 || Math.abs(s - g.sD) < 16) continue;
      h += `<rect x="${s - 4}" y="${f1(-socketRadius(s) - 3.5)}" width="8" height="4" fill="#1a222d" stroke="${K.ln2}" stroke-width=".8"/>`;
    }
    h += `<path d="${sock}" fill="url(#sd-br)"/><path d="${sock}" fill="url(#sd-vol)" stroke="${K.ln2}" stroke-width="1.2"/>`;
    h += `<path d="M${pts(top)}" fill="none" stroke="${K.gold}" stroke-opacity=".5"/>`;
    h += `<path d="M${TR.socketFrom} ${-TR.rProx} C${TR.socketFrom - 22} ${-TR.rProx + 10} ${TR.socketFrom - 22} ${TR.rProx - 10} ${TR.socketFrom} ${TR.rProx}" fill="none" stroke="${K.ln2}" stroke-width="1.2" stroke-dasharray="4 4"/>`;
    h += `<rect x="${TR.socketTo}" y="-24" width="${TR.wrist - TR.socketTo + 10}" height="48" fill="url(#sd-br)" stroke="${K.ln2}"/>`;
    h += `<line x1="-6" y1="0" x2="372" y2="0" stroke="${K.ln2}" stroke-dasharray="14 4 3 4" opacity=".8"/>`;
    // гак
    h += `<path d="M262 8 C300 12 336 22 354 42 C360 50 354 60 344 56" fill="none" stroke="#9aa3b0" stroke-width="7" stroke-linecap="round"/>`;
    h += `<g transform="rotate(${f1(-c.res.x * 26)} 270 -2)"><path d="M262 -8 C300 -12 336 -22 354 -42 C360 -50 354 -60 344 -56" fill="none" stroke="${K.w}" stroke-width="7" stroke-linecap="round"/></g>`;
    h += `<path d="M270 -2 L${P2(g.T)}" stroke="${K.w}" stroke-width="4" stroke-linecap="round"/><circle cx="270" cy="-2" r="4.5" fill="${K.void}" stroke="${K.w}" stroke-width="2"/>`;
    // трос від бандажа (стрілка — напрямок F_вх)
    h += `<path d="M${P2(g.cableFrom)} L${P2(g.P)}" stroke="${K.w}" stroke-width="1.8" marker-start="url(#sd-ag)"/>`;
    // оболонка Боудена: колір за радіусом вигину
    h += `<path d="M${pts(g.housing)}" fill="none" stroke="${K.void}" stroke-width="10" stroke-linecap="round"/>`;
    for (let i = 1; i < g.housing.length; i++) {
      const r = g.radii[Math.min(g.radii.length - 1, Math.max(0, i - 1))];
      const col = r < 30 ? K.bad : r < 60 ? K.gold : K.ok;
      h += `<line x1="${f1(g.housing[i - 1][0])}" y1="${f1(g.housing[i - 1][1])}" x2="${f1(g.housing[i][0])}" y2="${f1(g.housing[i][1])}" stroke="${col}" stroke-width="3.4" stroke-linecap="round"/>`;
    }
    // трос до важеля гака і F_вих
    h += `<path d="M${P2(g.D)} L${P2(g.T)}" stroke="${K.w}" stroke-width="1.8"/>`;
    const toD = unit(sub(g.D, g.T));
    h += `<path d="M${P2(g.T)} L${P2(add(g.T, mul(toD, 24)))}" stroke="${K.gold}" stroke-width="2" marker-end="url(#sd-ag)"/>`;
    // кути на вході й виході оболонки
    const k = g.housing.length - 1;
    const sT: Vec = sub(g.housing[1], g.housing[0]);
    const eT: Vec = sub(g.housing[k], g.housing[k - 1]);
    const eCol = (a: number) => (a > toRad(30) ? K.bad : a > toRad(10) ? K.gold : K.ok);
    h += `<path d="${arc(g.P, 30, ang(g.inDir), ang(sT))}" fill="none" stroke="${eCol(g.entry)}" stroke-width="2"/>`;
    h += `<path d="${arc(g.D, 26, ang(eT), ang(sub(g.T, g.D)))}" fill="none" stroke="${eCol(g.exit)}" stroke-width="2"/>`;
    h += `<text class="tw" x="${f1(g.P[0] - 10)}" y="${f1(g.P[1] + 26)}" text-anchor="end">${T('θ<sub>вх</sub>')} = ${fmt0.format(toDeg(g.entry))}°</text>`;
    h += `<text class="tw" x="${f1(g.D[0] + 4)}" y="${f1(g.D[1] + 32)}" text-anchor="middle">${T('θ<sub>вих</sub>')} = ${fmt0.format(toDeg(g.exit))}°</text>`;
    // ретейнери [1], [2] — перетягуються вздовж гільзи
    const ret = (id: string, p: Vec, label: string, s: number) => `<g class="drag" data-drag="${id}" tabindex="0" role="slider" aria-label="${label}" aria-valuemin="${id === 'P' ? TR.sProx[0] : TR.sDist[0]}" aria-valuemax="${id === 'P' ? TR.sProx[1] : TR.sDist[1]}" aria-valuenow="${Math.round(s)}"><rect x="${f1(p[0] - 12)}" y="${f1(p[1] + 1)}" width="24" height="6" fill="${K.gold}" stroke="${K.void}"/><rect x="${f1(p[0] - 6)}" y="${f1(p[1] - 5)}" width="12" height="9" fill="#c7ced8" stroke="${K.void}"/><circle class="ring" cx="${f1(p[0])}" cy="${f1(p[1])}" r="14" fill="rgba(141,176,255,0.10)" stroke="${K.cy}" stroke-width="1.6"/></g>`;
    h += ret('P', g.P, ui.proxRet, g.sP) + ret('D', g.D, ui.distRet, g.sD);
    // розмірні лінії s₁, s₂ від проксимального краю гільзи
    const yb = (s: number) => socketRadius(s) + 3;
    h += `<path d="M${TR.socketFrom} ${yb(TR.socketFrom)}V84" stroke="${K.mu}" stroke-width=".8"/>`;
    for (const [p, s] of [[g.P, g.sP], [g.D, g.sD]] as [Vec, number][]) {
      h += `<path d="M${f1(s)} ${f1(p[1] + 9)}V${f1(yb(s) - 3)}" stroke="${K.mu}" stroke-width=".7" stroke-dasharray="2 3" opacity=".6"/><path d="M${f1(s)} ${f1(yb(s))}V84" stroke="${K.mu}" stroke-width=".8"/>`;
    }
    h += `<path d="M${TR.socketFrom} 60H${f1(g.sP)}" stroke="${K.mu}" stroke-width="1" marker-start="url(#sd-ad)" marker-end="url(#sd-ad)"/>`;
    h += `<path d="M${TR.socketFrom} 76H${f1(g.sD)}" stroke="${K.mu}" stroke-width="1" marker-start="url(#sd-ad)" marker-end="url(#sd-ad)"/>`;
    h += `<text class="t" x="${f1((TR.socketFrom + g.sP) / 2)}" y="56" text-anchor="middle">${T('s<sub>1</sub>')} = ${fmt0.format(g.sP - TR.socketFrom)} ${mm}</text>`;
    h += `<text class="t" x="${f1((TR.socketFrom + g.sD) / 2)}" y="72" text-anchor="middle">${T('s<sub>2</sub>')} = ${fmt0.format(g.sD - TR.socketFrom)} ${mm}</text>`;
    const close = g.sD - g.sP < 26;
    h += tag('1', [g.sP, 84], [g.sP - (close ? 11 : 0), 94]) + tag('2', [g.sD, 84], [g.sD + (close ? 11 : 0), 94]);
    // [3] оболонка + θ_об, [4] важіль + F_вих, [5] трос від бандажа + F_вх
    const mid = g.housing[Math.floor(g.housing.length / 2)];
    const t3: Vec = [mid[0] - 34, mid[1] - 30];
    h += tag('3', [mid[0], mid[1] - 5], t3) + `<text class="tw" x="${f1(t3[0] + 14)}" y="${f1(t3[1] + 4)}">${T('θ<sub>об</sub>')} = ${fmt0.format(toDeg(g.bend))}°</text>`;
    h += tag('4', g.T, [246, -104]) + `<text class="ta" x="258" y="-100">${T('F<sub>вих</sub>')} = ${fmt0.format(c.res.fOut)} ${N}</text>`;
    const cf = g.cableFrom;
    const t5: Vec = [cf[0], cf[1] - 20];
    h += tag('5', [cf[0], cf[1] - 4], t5);
    h += cf[0] > 0
      ? `<text class="ta" x="${f1(t5[0] - 13)}" y="${f1(t5[1] + 4)}" text-anchor="end">${T('F<sub>вх</sub>')} = ${fmt0.format(c.res.fIn)} ${N}</text>`
      : `<text class="ta" x="${f1(t5[0] + 13)}" y="${f1(t5[1] + 4)}">${T('F<sub>вх</sub>')} = ${fmt0.format(c.res.fIn)} ${N}</text>`;
    // масштаб
    h += `<path d="M-130 110H-80M-130 105V115M-80 105V115" stroke="${K.mu}" stroke-width="1.2"/><text class="t" x="-105" y="101" text-anchor="middle">50 ${mm}</text>`;
    // показники і штамп
    h += `<text class="tw" x="406" y="-222" text-anchor="end">μ = ${fmt3.format(c.mu)} · θ = ${fmt0.format(toDeg(g.theta))}° · η = ${fmt1.format(c.res.eta * 100)} %</text>`;
    const tb = ui.titleBlock;
    h += `<g class="tbk"><rect x="226" y="-210" width="180" height="66" fill="rgba(6,8,11,0.85)" stroke="${K.ln}"/>`;
    h += `<path d="M226 -198V-210H238M406 -156V-144H394" fill="none" stroke="${K.gold}" stroke-width="2"/><path d="M226 -192H406M226 -176H406M226 -160H406M350 -210V-192" stroke="${K.ln}"/>`;
    h += `<text class="tbg" x="232" y="-197">${tb[0]}</text><text class="tbg" x="378" y="-197" text-anchor="middle">FIG. 1</text>`;
    h += `<text class="tb" x="232" y="-180">${tb[1]}</text><text class="tb" x="232" y="-164">${tb[2]}</text><text class="tb" x="232" y="-149">${tb[3]}</text>`;
    h += `<text class="tbg" x="400" y="-180" text-anchor="end">v${META.version}</text></g>`;
    svSide.innerHTML = h;
  }

  // ------------------------------------------------ FIG. 3: точка перехрещення бандажа (задня проєкція)
  function drawCross(c: Calc) {
    const C7: Vec = [120, 34];
    const R: Vec = [C7[0] + st.cx * CROSS_S, C7[1] + st.cy * CROSS_S];
    const O: Vec = [C7[0] + CROSS_OPT[0] * CROSS_S, C7[1] + CROSS_OPT[1] * CROSS_S];
    let h = `<defs>${brickPattern('cr-br', 20, 5)}</defs>`;
    const back = 'M96 14 C92 26 60 28 34 40 C22 46 20 62 22 80 L30 190 L210 190 L218 80 C220 62 218 46 206 40 C180 28 148 26 144 14';
    h += `<path d="${back}" fill="url(#cr-br)" stroke="#3a4555"/>`;
    for (const x of [44, 60, 170, 186]) h += `<rect x="${x}" y="${x < 120 ? 31 : 31}" width="8" height="4" fill="#1a222d" stroke="#3a4555" stroke-width=".8"/>`;
    h += `<line x1="120" y1="18" x2="120" y2="190" stroke="#3a4555" stroke-dasharray="8 3 2 3"/>`;
    // ізолінії коефіцієнта k (умовна модель): k = 0,9 (15 мм від оптимуму) і межа попередження (35 мм)
    h += `<circle cx="${f1(O[0])}" cy="${f1(O[1])}" r="${f1(35 * CROSS_S)}" fill="none" stroke="${K.gold}" stroke-dasharray="3 3" opacity=".55"/>`;
    h += `<circle cx="${f1(O[0])}" cy="${f1(O[1])}" r="${f1(15 * CROSS_S)}" fill="rgba(70,201,139,0.10)" stroke="${K.ok}" stroke-dasharray="3 3"/>`;
    h += `<path d="M${f1(O[0] - 4)} ${f1(O[1])}H${f1(O[0] + 4)}M${f1(O[0])} ${f1(O[1] - 4)}V${f1(O[1] + 4)}" stroke="${K.ok}"/>`;
    h += `<ellipse cx="44" cy="60" rx="16" ry="22" transform="rotate(-18 44 60)" fill="none" stroke="${K.strap}" stroke-width="5"/>`;
    h += `<path d="M54 44 L${P2(R)} M58 74 L${P2(R)} M${P2(R)} L206 96" stroke="${K.strap}" stroke-width="5" stroke-linecap="round"/>`;
    h += `<circle cx="120" cy="34" r="3" fill="${K.w}"/><text class="t" x="126" y="28">${ui.c7}</text>`;
    h += `<g class="drag" data-drag="X" tabindex="0" role="slider" aria-label="${ui.cross} [A]" aria-valuetext="${fmt0.format(st.cx)} / ${fmt0.format(st.cy)} ${mm}"><circle cx="${f1(R[0])}" cy="${f1(R[1])}" r="15" fill="transparent"/><polygon class="ring" points="${hex(R, 10)}" fill="${K.void}" stroke="${K.gold}" stroke-width="2.2"/><circle cx="${f1(R[0])}" cy="${f1(R[1])}" r="2.4" fill="${K.w}"/></g>`;
    h += tag('A', [R[0] - 7, R[1] - 7], [R[0] - 26, R[1] - 22]);
    h += `<text class="tw" x="292" y="16" text-anchor="end">k = ${fmt2.format(c.k)}</text>`;
    h += `<text class="t" x="292" y="32" text-anchor="end">(${fmt0.format(st.cx)}; ${fmt0.format(st.cy)}) ${mm}</text>`;
    h += `<text class="t" x="8" y="198">${ui.sound}</text><text class="t" x="292" y="198" text-anchor="end">${ui.prosthetic}</text>`;
    svCross.innerHTML = h;
  }

  // ------------------------------------------------ FIG. 4: η(θ)
  function drawChart(c: Calc) {
    const X0 = 58, X1 = 700, Y0 = 20, Y1 = 172;
    const x = (deg: number) => X0 + ((X1 - X0) * deg) / 360;
    const y = (eta: number) => Y1 - (Y1 - Y0) * eta;
    let h = `<defs><linearGradient id="ch-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${K.gold}" stop-opacity=".22"/><stop offset="1" stop-color="${K.gold}" stop-opacity="0"/></linearGradient></defs>`;
    for (let d = 30; d < 360; d += 30) if (d % 90) h += `<line x1="${x(d)}" y1="${Y0}" x2="${x(d)}" y2="${Y1}" stroke="#161d26"/>`;
    const thX = x(Math.min(360, toDeg(c.geo.theta)));
    for (const d of [0, 90, 180, 270, 360]) h += `<line x1="${x(d)}" y1="${Y0}" x2="${x(d)}" y2="${Y1}" stroke="#26303d"/>${Math.abs(x(d) - thX) > 34 ? `<text class="t" x="${x(d)}" y="${Y1 + 16}" text-anchor="middle">${d}</text>` : ''}`;
    for (const e of [0, 0.25, 0.5, 0.75, 1]) h += `<line x1="${X0}" y1="${y(e)}" x2="${X1}" y2="${y(e)}" stroke="#26303d"/>${Math.abs(y(e) - y(c.res.eta)) > 14 ? `<text class="t" x="${X0 - 8}" y="${y(e) + 4}" text-anchor="end">${e * 100}</text>` : ''}`;
    h += `<path d="M${X0} ${Y0}V${Y1}H${X1}" fill="none" stroke="${K.ln2}"/>`;
    h += `<text class="t" x="${X1}" y="${Y1 + 34}" text-anchor="end">${ui.chartX}</text><text class="t" x="${X0 + 8}" y="${Y0 - 6}">${ui.chartY}</text>`;
    const curve = (mu: number) => { const p: Vec[] = []; for (let d = 0; d <= 360; d += 4) p.push([x(d), y(efficiency(mu, toRad(d)))]); return p; };
    const refMu = c.mu === MU_PTFE ? MU_UNLINED : MU_PTFE;
    const cur = curve(c.mu);
    h += `<path d="M${pts(cur)} L${X1} ${Y1} L${X0} ${Y1} Z" fill="url(#ch-fill)"/>`;
    h += `<polyline points="${pts(curve(refMu))}" fill="none" stroke="${K.cy}" stroke-width="1.6" stroke-dasharray="6 4" opacity=".85"/>`;
    h += `<polyline points="${pts(cur)}" fill="none" stroke="${K.gold}" stroke-width="2.4"/>`;
    h += `<text class="tc" x="${x(318)}" y="${y(efficiency(refMu, toRad(318))) - 8}" text-anchor="middle">μ = ${fmt3.format(refMu)}</text>`;
    h += `<text class="ta" x="${x(250)}" y="${y(efficiency(c.mu, toRad(250))) + 18}" text-anchor="middle">μ = ${fmt3.format(c.mu)}</text>`;
    const th = Math.min(360, toDeg(c.geo.theta));
    const px = x(th), py = y(c.res.eta);
    if (snap) {
      const sx = x(Math.min(360, toDeg(snap.theta))), sy = y(snap.eta);
      h += `<polygon points="${hex([sx, sy], 6)}" fill="none" stroke="${K.cy}" stroke-width="2"/><text class="tc" x="${f1(sx + 9)}" y="${f1(sy + 17)}">${ui.before}</text>`;
    }
    h += `<path d="M${f1(px)} ${Y1}V${f1(py)}H${X0}" fill="none" stroke="${K.w}" stroke-dasharray="3 3" opacity=".55"/>`;
    h += `<polygon points="${hex([px, py], 7)}" fill="${K.void}" stroke="${K.gold}" stroke-width="2"/><circle cx="${f1(px)}" cy="${f1(py)}" r="2.2" fill="${K.w}"/>`;
    h += `<g class="tg"><rect x="${f1(px - 20)}" y="${Y1 + 3}" width="40" height="15" fill="${K.gold}"/><text class="tag" x="${f1(px)}" y="${Y1 + 14}" text-anchor="middle">${fmt0.format(th)}°</text></g>`;
    h += `<g class="tg"><rect x="${X0 - 50}" y="${f1(py - 7.5)}" width="46" height="15" fill="${K.gold}"/><text class="tag" x="${X0 - 27}" y="${f1(py + 3.8)}" text-anchor="middle">${fmt1.format(c.res.eta * 100)}</text></g>`;
    h += `<text class="tw" x="${f1(Math.min(px + 12, X1 - 150))}" y="${f1(py - 12)}">${ui.chartNow}: η = ${fmt1.format(c.res.eta * 100)} %</text>`;
    svChart.innerHTML = h;
  }

  // ------------------------------------------------ телеметрія й діагностика
  function hud(c: Calc) {
    const r = c.res;
    const set = (k: string, html: string) => { const el = out(k); if (el) el.innerHTML = html; };
    const F = (v: number) => `${fmt0.format(v)} ${N} <small>${fmt1.format(v / 9.81)} ${ui.kgf}</small>`;
    const stEl = out('status')!;
    let cls = 's-full', txt = ui.stFull;
    if (r.x < 0.98) {
      cls = r.x >= 0.3 ? 's-part' : 's-none';
      const why = r.limit === 'force' ? ui.stPartialForce : ui.stPartialExc;
      txt = r.x >= 0.3 ? why : `${ui.stNone} ${why}`;
    }
    stEl.className = `status ${cls}`;
    stEl.textContent = txt;
    set('exc', `${fmt0.format(r.excAtHook)} <small>/ ${fmt0.format(st.lReq)} ${mm}</small>`);
    out('excbar')!.style.width = `${(r.x * 100).toFixed(1)}%`;
    set('open', `${fmt0.format(r.x * 100)} %`);
    set('fout', F(r.fOut));
    set('fin', F(r.fIn));
    set('theta', `${fmt0.format(toDeg(c.geo.theta))}°`);
    set('thparts', sym(lang, ui.thetaParts(fmt0.format(toDeg(c.geo.entry)), fmt0.format(toDeg(c.geo.bend)), fmt0.format(toDeg(c.geo.exit)))));
    set('eta', `${fmt1.format(r.eta * 100)} % <small>${ui.loss} ${fmt1.format((1 - r.eta) * 100)} %</small>`);
    set('finfull', F(r.fInFull));
    const lim = FATIGUE_SHARE * st.fMax;
    set('flim', F(lim));
    set('kcap', fmt2.format(c.k));
    set('bodyneed', `${fmt0.format(r.excNeededBody)} <small>${ui.of} ${fmt0.format(c.rawMax)} ${mm}</small>`);
    // навантаження: зусилля для повного відкриття відносно максимуму користувача
    const share = r.fInFull / st.fMax;
    const bar = out('loadbar')!;
    bar.style.width = `${Math.min(100, share * 100).toFixed(1)}%`;
    bar.className = share > 1 ? 'l-max' : share > FATIGUE_SHARE ? 'l-tired' : '';
    set('loadtxt', `${fmt0.format(share * 100)} % · ${share > 1 ? ui.loadMax : share > FATIGUE_SHARE ? ui.loadTired : ui.loadOk}`);
    set('loadnote', sym(lang, ui.loadNote(st.fMax)));
    // діагностика
    const flags: [string, string][] = [];
    const loss = 1 - r.eta;
    if (loss > 0.25) flags.push([loss > 0.4 ? 'f-bad' : '', ui.fLoss(fmt0.format(loss * 100))]);
    if (toDeg(c.geo.entry) > 30) flags.push(['', ui.fEntry(fmt0.format(toDeg(c.geo.entry)))]);
    if (c.geo.minRadius < 30) flags.push(['f-info', ui.fSharp(fmt0.format(c.geo.minRadius))]);
    if (r.fInFull > st.fMax) flags.push(['f-bad', ui.fOver(fmt0.format(r.fInFull), fmt0.format(st.fMax))]);
    else if (r.fInFull > lim) flags.push(['', ui.fFatigue(fmt0.format(r.fInFull), fmt0.format(lim))]);
    if (r.excNeededBody > c.rawMax) flags.push(['f-bad', ui.fExc(fmt0.format(r.excNeededBody), fmt0.format(c.rawMax))]);
    const dCross = Math.hypot(st.cx - CROSS_OPT[0], st.cy - CROSS_OPT[1]);
    if (st.cx < -50) flags.push(['f-info', ui.fCrossSound]);
    else if (dCross > 35) flags.push(['f-info', ui.fCrossOff]);
    set('flags', flags.length ? flags.map(([c2, t]) => `<li class="${c2}">${sym(lang, t)}</li>`).join('') : `<li class="f-ok">${ui.flagsNone}</li>`);
    // порівняння «до / зараз»
    const cmp = out('cmp')!;
    if (snap) {
      cmp.hidden = false;
      cmp.innerHTML = `${ui.before} → ${ui.after}<br>θ ${fmt0.format(toDeg(snap.theta))}° → ${fmt0.format(toDeg(c.geo.theta))}°<br>η ${fmt1.format(snap.eta * 100)} % → ${fmt1.format(r.eta * 100)} %<br>${sym(lang, ui.finFull)}: ${fmt0.format(snap.fInFull)} → ${fmt0.format(r.fInFull)} ${N}<br>${ui.opening}: ${fmt0.format(snap.x * 100)} → ${fmt0.format(r.x * 100)} %`;
    } else cmp.hidden = true;
  }

  function render() {
    raf = 0;
    const c = compute(st);
    setOutputs();
    hud(c);
    drawHook(c);
    if (st.mode === 'patient') drawBack(c);
    else { drawSide(c); drawCross(c); drawChart(c); }
    writeUrl(st);
  }
  function schedule() { if (!raf) raf = requestAnimationFrame(render); }

  syncControls();
  render();
}
