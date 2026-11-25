// Симулятор тягової системи протеза верхньої кінцівки — інтерактивна частина.
// Стан ↔ посилання (query), повзунки, перетягування ретейнерів і точки перехрещення, SVG-сцени, показники, попередження.
// © 2026 Марина Гурак, Praxis. Код — усі права захищено (LICENSE-TOOLS.md).
import { getUi } from '../lib/bodypowered/content';
import {
  MU_PTFE, MU_UNLINED, CROSS_OPT, FATIGUE_SHARE, TR, TR_DEFAULT,
  bodyExcursion, efficiency, harnessCapture, socketRadius, solveOpening, toDeg, trScheme, type Vec,
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
const NUM_KEYS = ['scap', 'gh', 'bands', 'approach', 'slack', 'sProx', 'sDist', 'mu', 'fMax', 'lReq', 'cx', 'cy'] as const;
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

// ---------------------------------------------------------------- допоміжне SVG
const f1 = (n: number) => n.toFixed(1);
const pts = (a: Vec[]) => a.map((p) => `${f1(p[0])},${f1(p[1])}`).join(' ');
function mix(a: string, b: string, t: number) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(',')})`;
}
function tensionColor(t: number) {
  t = Math.max(0, Math.min(1, t));
  return t < 0.5 ? mix('#8db0ff', '#e3b462', t / 0.5) : mix('#e3b462', '#e25d5d', (t - 0.5) / 0.5);
}
function arc(c: Vec, r: number, a0: number, a1: number) {
  let d = a1 - a0;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  const p0: Vec = [c[0] + r * Math.cos(a0), c[1] + r * Math.sin(a0)];
  const p1: Vec = [c[0] + r * Math.cos(a0 + d), c[1] + r * Math.sin(a0 + d)];
  return `M${f1(p0[0])} ${f1(p0[1])}A${r} ${r} 0 0 ${d > 0 ? 1 : 0} ${f1(p1[0])} ${f1(p1[1])}`;
}
const ang = (v: Vec) => Math.atan2(v[1], v[0]);

export function initBodyPowered() {
  const root = document.querySelector<HTMLElement>('.bp');
  if (!root) return;
  const lang = (root.dataset.lang === 'en' ? 'en' : 'uk') as 'uk' | 'en';
  const ui = getUi(lang);
  const nf = (d: number) => new Intl.NumberFormat(lang === 'uk' ? 'uk-UA' : 'en-GB', { maximumFractionDigits: d, minimumFractionDigits: d });
  const fmt0 = nf(0), fmt1 = nf(1), fmt2 = nf(2), fmt3 = nf(3);
  const $ = <T extends Element = HTMLElement>(s: string) => root.querySelector<T>(s)!;
  const out = (k: string) => root.querySelector<HTMLElement>(`[data-o="${k}"]`)!;
  const svBack = $<SVGSVGElement>('.sv-back');
  const svSide = $<SVGSVGElement>('.sv-side');
  const svHook = $<SVGSVGElement>('.sv-hook');
  const svCross = $<SVGSVGElement>('.sv-cross');
  const svChart = $<SVGSVGElement>('.sv-chart');

  let st = readUrl();
  let snap: null | { theta: number; eta: number; fInFull: number; x: number } = null;
  let raf = 0;

  // ------------------------------------------------ керування
  function syncControls() {
    root.classList.toggle('is-pro', st.mode === 'pro');
    root.querySelectorAll<HTMLButtonElement>('.seg-b').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.mode === st.mode)));
    root.querySelectorAll<HTMLButtonElement>('.hb').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.h === st.harness)));
    root.querySelectorAll<HTMLInputElement>('input[data-k]').forEach((i) => { i.value = String((st as any)[i.dataset.k!]); });
    const sel = $<HTMLSelectElement>('select[data-k="pair"]');
    sel.value = st.pair;
    $('.rng-mu').toggleAttribute('hidden', st.pair !== 'custom');
  }
  function setOutputs() {
    const v = (k: string, s: string) => { const o = root.querySelector(`output[data-v="${k}"]`); if (o) o.textContent = s; };
    v('scap', `${fmt0.format(st.scap)} %`);
    v('gh', `${fmt0.format(st.gh)}°`);
    v('bands', fmt0.format(st.bands));
    v('approach', `${fmt0.format(st.approach)}°`);
    v('slack', `${fmt0.format(st.slack)} ${ui.mm}`);
    v('mu', fmt3.format(st.mu));
    v('fMax', `${fmt0.format(st.fMax)} ${ui.N}`);
    v('lReq', `${fmt0.format(st.lReq)} ${ui.mm}`);
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
  root.querySelector<HTMLButtonElement>('[data-act="reset"]')!.addEventListener('click', () => { st = { ...DEF, mode: st.mode }; syncControls(); schedule(); });
  const snapBtn = root.querySelector<HTMLButtonElement>('[data-act="snap"]')!;
  snapBtn.addEventListener('click', () => {
    if (snap) snap = null;
    else { const c = compute(st); snap = { theta: c.geo.theta, eta: c.res.eta, fInFull: c.res.fInFull, x: c.res.x }; }
    snapBtn.textContent = snap ? ui.snapClear : ui.snap;
    snapBtn.setAttribute('aria-pressed', String(!!snap));
    schedule();
  });
  const copyBtn = root.querySelector<HTMLButtonElement>('[data-act="copy"]')!;
  copyBtn.addEventListener('click', async () => {
    writeUrl(st);
    try { await navigator.clipboard.writeText(location.href); copyBtn.textContent = ui.copied; }
    catch { copyBtn.textContent = location.href; }
    setTimeout(() => { copyBtn.textContent = ui.copy; }, 1800);
  });

  // ------------------------------------------------ перетягування
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

  // ------------------------------------------------ сцени
  function drawBack(c: Calc) {
    const s = st.scap / 100;
    const ffx = 1 - 0.5 * Math.sin((st.gh / 90) * (Math.PI / 2)); // скорочення проєкції руки, що йде вперед
    const tcol = tensionColor(c.res.fIn / Math.max(1, st.fMax) / 0.4);
    const d = 56 + 22 * s;
    const scap = (side: number) => {
      const mx = 300 + side * (d - 20);
      const lx = 300 + side * (d + 26);
      return `<path d="M${mx} 190 L${mx} 280 L${lx} 206 Z" fill="rgba(141,176,255,0.10)" stroke="#8db0ff" stroke-width="1.5" stroke-linejoin="round"/>`;
    };
    const arrow = (side: number) => (s > 0.04 ? `<path d="M${300 + side * (d - 2)} 300 l${side * (8 + 20 * s)} 0 m${-side * 7} -5 l${side * 7} 5 l${-side * 7} 5" fill="none" stroke="#8db0ff" stroke-width="1.6"/>` : '');
    const S: Vec = [410, 178];
    const E: Vec = [424, 178 + 152 * ffx];
    const W: Vec = [430, E[1] + 132 * ffx];
    const hanger: Vec = [416, 178 + 100 * ffx];
    const ret: Vec = [E[0] - 10, E[1] + 24 * ffx];
    const R: Vec = [300 + st.cx * CROSS_S, 128 + st.cy * CROSS_S];
    const fig8 = st.harness === '8';
    const leather = '#b99464';
    const body = '#1b222c', edge = '#3a4555', limb = '#232b36';
    let h = '';
    h += `<defs><linearGradient id="bk-sock" x1="0" x2="1"><stop offset="0" stop-color="#3a4555"/><stop offset="1" stop-color="#232b36"/></linearGradient></defs>`;
    // руки (під тулубом у плечовій зоні)
    h += `<path d="M190 178 L176 330 L170 468" fill="none" stroke="${limb}" stroke-width="30" stroke-linecap="round" stroke-linejoin="round"/><ellipse cx="168" cy="492" rx="15" ry="20" fill="${limb}" stroke="${edge}"/>`;
    h += `<path d="M${S[0]} ${S[1]} L${E[0]} ${E[1]}" stroke="${limb}" stroke-width="30" stroke-linecap="round"/>`;
    // тулуб і голова
    h += `<path d="M262 118 C248 136 222 144 202 152 C186 158 180 172 182 190 C184 206 194 220 204 236 L214 522 L386 522 L396 236 C406 220 416 206 418 190 C420 172 414 158 398 152 C378 144 352 136 338 118 Z" fill="${body}" stroke="${edge}" stroke-width="1.5"/>`;
    h += `<rect x="281" y="96" width="38" height="30" rx="10" fill="${body}" stroke="${edge}" stroke-width="1.5"/><circle cx="300" cy="66" r="38" fill="${body}" stroke="${edge}" stroke-width="1.5"/>`;
    h += `<line x1="300" y1="124" x2="300" y2="512" stroke="${edge}" stroke-dasharray="3 6"/>`;
    h += scap(-1) + scap(1) + arrow(-1) + arrow(1);
    // гільза передпліччя й гак
    h += `<path d="M${E[0] - 1} ${E[1] - 6} L${W[0]} ${W[1]}" stroke="url(#bk-sock)" stroke-width="30" stroke-linecap="round"/><path d="M${E[0] - 1} ${E[1] - 6} L${W[0]} ${W[1]}" stroke="#8db0ff" stroke-opacity="0.35" stroke-width="1" fill="none"/>`;
    h += `<rect x="${W[0] - 11}" y="${W[1]}" width="22" height="${(10 * ffx + 4).toFixed(1)}" rx="3" fill="#4a5566"/>`;
    const hy = W[1] + 10 * ffx + 4;
    h += `<path d="M${W[0] - 4} ${hy} C${W[0] - 6} ${hy + 30 * ffx} ${W[0] + 14} ${hy + 44 * ffx} ${W[0] + 16} ${hy + 30 * ffx}" fill="none" stroke="#c7ced8" stroke-width="5" stroke-linecap="round"/>`;
    h += `<path d="M${W[0] + 4} ${hy} C${W[0] + 4 + 10 * c.res.x} ${hy + 26 * ffx} ${W[0] + 22 + 12 * c.res.x} ${hy + 34 * ffx} ${W[0] + 22 + 14 * c.res.x} ${hy + 18 * ffx}" fill="none" stroke="#c7ced8" stroke-width="5" stroke-linecap="round"/>`;
    // збруя
    h += `<ellipse cx="196" cy="196" rx="26" ry="36" transform="rotate(-18 196 196)" fill="none" stroke="${leather}" stroke-width="7"/>`;
    h += `<path d="M214 168 L${R[0]} ${R[1]} M218 222 L${R[0]} ${R[1]}" stroke="${leather}" stroke-width="7" stroke-linecap="round"/>`;
    if (fig8) h += `<path d="M${R[0]} ${R[1]} L396 150" stroke="${leather}" stroke-width="7" stroke-linecap="round"/><path d="M396 150 L414 138" stroke="${leather}" stroke-width="7" stroke-dasharray="4 5" stroke-linecap="round"/>`;
    h += `<path d="M${R[0]} ${R[1]} L${hanger[0]} ${hanger[1]}" stroke="${leather}" stroke-width="7" stroke-linecap="round"/>`;
    // трос і оболонка
    h += `<path d="M${hanger[0]} ${hanger[1]} L${ret[0]} ${ret[1]}" stroke="${tcol}" stroke-width="2.6"/>`;
    h += `<path d="M${ret[0]} ${ret[1]} L${W[0] - 12} ${W[1] - 8}" stroke="#0e1218" stroke-width="7" stroke-linecap="round"/><path d="M${ret[0]} ${ret[1]} L${W[0] - 12} ${W[1] - 8}" stroke="${tcol}" stroke-width="2.2"/>`;
    h += `<circle cx="${hanger[0]}" cy="${hanger[1]}" r="3.5" fill="#e6eaf0"/>`;
    h += `<circle cx="300" cy="128" r="3" fill="#e6eaf0"/><text class="lbl" x="308" y="125">${ui.c7}</text>`;
    h += `<circle cx="${R[0]}" cy="${R[1]}" r="8" fill="#0e1218" stroke="#e6eaf0" stroke-width="2.5"/>`;
    // підписи
    h += `<text class="lbl" x="170" y="545" text-anchor="middle">${ui.sound}</text><text class="lbl" x="432" y="545" text-anchor="middle">${ui.prosthetic}</text>`;
    if (st.gh > 3) h += `<text class="lbl-a" x="${E[0] + 26}" y="${E[1] - 18}">${ui.gh.toLowerCase()} ${fmt0.format(st.gh)}°</text>`;
    if (s > 0.04) h += `<text class="lbl-a" x="300" y="326" text-anchor="middle">${ui.scap.toLowerCase()} ${fmt0.format(st.scap)} %</text>`;
    svBack.innerHTML = h;
  }

  function drawHook(c: Calc) {
    const a = c.res.x * 34;
    const n = Math.round(st.bands);
    let h = '';
    h += `<rect x="8" y="60" width="44" height="34" rx="5" fill="#3a4555" stroke="#4a5566"/>`;
    h += `<path d="M10 34 L64 34" stroke="${tensionColor(c.res.fIn / Math.max(1, st.fMax) / 0.4)}" stroke-width="2.2"/>`;
    h += `<path d="M52 84 C110 88 150 92 176 112 C186 120 182 134 170 132" fill="none" stroke="#c7ced8" stroke-width="7" stroke-linecap="round"/>`;
    h += `<g transform="rotate(${-a} 60 78)"><path d="M52 72 C110 70 150 64 176 46 C186 38 182 24 170 26" fill="none" stroke="#e6eaf0" stroke-width="7" stroke-linecap="round"/><path d="M60 72 L70 36" stroke="#e6eaf0" stroke-width="5" stroke-linecap="round"/><circle cx="70" cy="36" r="3.5" fill="#8db0ff"/></g>`;
    h += `<circle cx="60" cy="78" r="5" fill="#0e1218" stroke="#e6eaf0" stroke-width="2"/>`;
    for (let i = 0; i < n; i++) {
      const x = 96 + i * 11;
      const top = 70 - (x - 60) * Math.tan((a * Math.PI) / 180) * 0.9;
      h += `<ellipse cx="${x}" cy="${(top + 88) / 2}" rx="4.5" ry="${(88 - top) / 2 + 4}" fill="none" stroke="#e3b462" stroke-width="2.2"/>`;
    }
    h += `<text class="lbl-w" x="232" y="20" text-anchor="end">${fmt0.format(c.res.x * 100)} %</text>`;
    h += `<text class="lbl" x="232" y="142" text-anchor="end">${n} ${lang === 'uk' ? (n === 1 ? 'гумка' : 'гумки') : n === 1 ? 'band' : 'bands'}</text>`;
    svHook.innerHTML = h;
  }

  function drawSide(c: Calc) {
    const g = c.geo;
    const vb = [-150, -225, 550, 318];
    svSide.setAttribute('viewBox', vb.join(' '));
    let h = '';
    h += `<defs><linearGradient id="sd-sock" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a4555"/><stop offset="1" stop-color="#1e252e"/></linearGradient>`;
    h += `<marker id="sd-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#d9dee6"/></marker></defs>`;
    // гільза
    const top: Vec[] = [], bot: Vec[] = [];
    for (let s = TR.socketFrom; s <= TR.socketTo; s += 5) { top.push([s, -socketRadius(s)]); bot.push([s, socketRadius(s)]); }
    h += `<path d="M${pts(top)} L${pts(bot.reverse())} Z" fill="url(#sd-sock)" stroke="#5b6676" stroke-width="1.2"/>`;
    h += `<path d="M${TR.socketFrom} ${-TR.rProx} C${TR.socketFrom - 22} ${-TR.rProx + 10} ${TR.socketFrom - 22} ${TR.rProx - 10} ${TR.socketFrom} ${TR.rProx}" fill="none" stroke="#5b6676" stroke-width="1.2" stroke-dasharray="4 4"/>`;
    h += `<rect x="${TR.socketTo}" y="-24" width="${TR.wrist - TR.socketTo + 10}" height="48" rx="4" fill="#4a5566"/>`;
    // гак
    h += `<path d="M262 8 C300 12 336 22 354 42 C360 50 354 60 344 56" fill="none" stroke="#c7ced8" stroke-width="7" stroke-linecap="round"/>`;
    h += `<g transform="rotate(${-c.res.x * 26} 270 -2)"><path d="M262 -8 C300 -12 336 -22 354 -42 C360 -50 354 -60 344 -56" fill="none" stroke="#e6eaf0" stroke-width="7" stroke-linecap="round"/></g>`;
    h += `<path d="M270 -2 L${g.T[0]} ${g.T[1]}" stroke="#e6eaf0" stroke-width="4" stroke-linecap="round"/><circle cx="270" cy="-2" r="4.5" fill="#0e1218" stroke="#e6eaf0" stroke-width="2"/>`;
    // трос від збруї
    h += `<path d="M${f1(g.cableFrom[0])} ${f1(g.cableFrom[1])} L${f1(g.P[0])} ${f1(g.P[1])}" stroke="#d9dee6" stroke-width="1.8" marker-start="url(#sd-arr)"/>`;
    h += `<text class="lbl" x="${f1(g.cableFrom[0] + 6)}" y="${f1(g.cableFrom[1] - 8)}">${ui.fromHarness}</text>`;
    // оболонка: колір за радіусом кривини
    h += `<path d="M${pts(g.housing)}" fill="none" stroke="#0b0f14" stroke-width="9" stroke-linecap="round"/>`;
    for (let i = 1; i < g.housing.length; i++) {
      const r = g.radii[Math.min(g.radii.length - 1, Math.max(0, i - 1))];
      const col = r < 30 ? '#e25d5d' : r < 60 ? '#e3b462' : '#3fb37a';
      h += `<line x1="${f1(g.housing[i - 1][0])}" y1="${f1(g.housing[i - 1][1])}" x2="${f1(g.housing[i][0])}" y2="${f1(g.housing[i][1])}" stroke="${col}" stroke-width="3.4" stroke-linecap="round"/>`;
    }
    // трос до важеля гака
    h += `<path d="M${f1(g.D[0])} ${f1(g.D[1])} L${f1(g.T[0])} ${f1(g.T[1])}" stroke="#d9dee6" stroke-width="1.8"/>`;
    // кути на вході й виході
    const k = g.housing.length - 1;
    const sT: Vec = [g.housing[1][0] - g.housing[0][0], g.housing[1][1] - g.housing[0][1]];
    const eT: Vec = [g.housing[k][0] - g.housing[k - 1][0], g.housing[k][1] - g.housing[k - 1][1]];
    const eCol = (a: number) => (a > toRadDeg(30) ? '#e25d5d' : a > toRadDeg(10) ? '#e3b462' : '#3fb37a');
    h += `<path d="${arc(g.P, 30, ang(g.inDir), ang(sT))}" fill="none" stroke="${eCol(g.entry)}" stroke-width="2"/>`;
    h += `<text class="lbl-w" x="${f1(g.P[0] - 18)}" y="${f1(g.P[1] - 22)}" text-anchor="end">${lang === 'uk' ? 'вхід' : 'entry'} ${fmt0.format(toDeg(g.entry))}°</text>`;
    const out: Vec = [g.T[0] - g.D[0], g.T[1] - g.D[1]];
    h += `<path d="${arc(g.D, 26, ang(eT), ang(out))}" fill="none" stroke="${eCol(g.exit)}" stroke-width="2"/>`;
    h += `<text class="lbl-w" x="${f1(g.D[0] + 14)}" y="${f1(g.D[1] + 18)}">${lang === 'uk' ? 'вихід' : 'exit'} ${fmt0.format(toDeg(g.exit))}°</text>`;
    // ретейнери (перетягувані)
    const ret = (id: string, p: Vec, label: string) => `<g class="drag" data-drag="${id}" tabindex="0" role="slider" aria-label="${label}" aria-valuenow="${Math.round(id === 'P' ? g.sP : g.sD)}"><rect x="${f1(p[0] - 12)}" y="${f1(p[1] + 1)}" width="24" height="6" rx="2" fill="#7d8796"/><rect x="${f1(p[0] - 6)}" y="${f1(p[1] - 5)}" width="12" height="9" rx="2" fill="#c7ced8"/><circle class="ring" cx="${f1(p[0])}" cy="${f1(p[1])}" r="13" fill="rgba(141,176,255,0.12)" stroke="#8db0ff" stroke-width="1.6"/></g>`;
    h += ret('P', g.P, ui.proxRet) + ret('D', g.D, ui.distRet);
    h += `<text class="lbl" x="${f1(g.P[0] + 8)}" y="6" text-anchor="end">↑ ${ui.proxRet}</text>`;
    h += `<text class="lbl" x="${f1(g.D[0] + 8)}" y="24" text-anchor="end">↑ ${ui.distRet}</text>`;
    const mid = g.housing[Math.floor(g.housing.length / 2)];
    h += `<text class="lbl-a" x="${f1(mid[0])}" y="${f1(mid[1] - 16)}" text-anchor="middle">${ui.housing}</text>`;
    // θ і η
    h += `<text class="lbl-w" x="390" y="-200" text-anchor="end">θ = ${fmt0.format(toDeg(g.theta))}°   η = ${fmt1.format(c.res.eta * 100)} %</text>`;
    h += `<text class="lbl" x="390" y="-182" text-anchor="end">μ = ${fmt3.format(c.mu)}</text>`;
    // масштаб і легенда
    h += `<path d="M-130 80 L-80 80 M-130 75 L-130 85 M-80 75 L-80 85" stroke="#8a93a3" stroke-width="1.2"/><text class="lbl" x="-105" y="72" text-anchor="middle">50 ${ui.mm}</text>`;
    const lg = lang === 'uk' ? ['R вигину:', '> 60 мм', '30–60 мм', '< 30 мм'] : ['bend R:', '> 60 mm', '30–60 mm', '< 30 mm'];
    h += `<text class="lbl" x="30" y="86">${lg[0]}</text>`;
    [['#3fb37a', lg[1]], ['#e3b462', lg[2]], ['#e25d5d', lg[3]]].forEach(([col, t], i) => { h += `<line x1="${104 + i * 96}" y1="82" x2="${122 + i * 96}" y2="82" stroke="${col}" stroke-width="3.4"/><text class="lbl" x="${127 + i * 96}" y="86">${t}</text>`; });
    svSide.innerHTML = h;
  }
  const toRadDeg = (d: number) => (d * Math.PI) / 180;

  function drawCross(c: Calc) {
    const C7: Vec = [120, 34];
    const R: Vec = [C7[0] + st.cx * CROSS_S, C7[1] + st.cy * CROSS_S];
    const O: Vec = [C7[0] + CROSS_OPT[0] * CROSS_S, C7[1] + CROSS_OPT[1] * CROSS_S];
    let h = '';
    h += `<path d="M96 14 C92 26 60 28 34 40 C22 46 20 62 22 80 L30 150 L210 150 L218 80 C220 62 218 46 206 40 C180 28 148 26 144 14" fill="#1b222c" stroke="#3a4555"/>`;
    h += `<line x1="120" y1="18" x2="120" y2="150" stroke="#3a4555" stroke-dasharray="2 5"/>`;
    h += `<circle cx="${O[0]}" cy="${O[1]}" r="${(22 * CROSS_S).toFixed(1)}" fill="rgba(63,179,122,0.10)" stroke="#3fb37a" stroke-dasharray="3 3"/>`;
    h += `<ellipse cx="44" cy="60" rx="16" ry="22" transform="rotate(-18 44 60)" fill="none" stroke="#b99464" stroke-width="4"/>`;
    h += `<path d="M54 44 L${R[0]} ${R[1]} M58 74 L${R[0]} ${R[1]} M${R[0]} ${R[1]} L206 96" stroke="#b99464" stroke-width="4" stroke-linecap="round"/>`;
    h += `<circle cx="120" cy="34" r="3" fill="#e6eaf0"/><text class="lbl" x="126" y="30">${ui.c7}</text>`;
    h += `<g class="drag" data-drag="X" tabindex="0" role="slider" aria-label="${lang === 'uk' ? 'Точка перехрещення збруї' : 'Harness cross point'}" aria-valuetext="${fmt0.format(st.cx)} / ${fmt0.format(st.cy)} ${ui.mm}"><circle class="ring" cx="${f1(R[0])}" cy="${f1(R[1])}" r="9" fill="#0e1218" stroke="#e6eaf0" stroke-width="2.5"/></g>`;
    h += `<text class="lbl" x="8" y="146">${ui.sound}</text><text class="lbl" x="232" y="146" text-anchor="end">${ui.prosthetic}</text>`;
    svCross.innerHTML = h;
    out('kcap').textContent = `${ui.capture.toLowerCase()} k = ${fmt2.format(c.k)}`;
  }

  function drawChart(c: Calc) {
    const X0 = 52, X1 = 700, Y0 = 18, Y1 = 168;
    const x = (deg: number) => X0 + ((X1 - X0) * deg) / 360;
    const y = (eta: number) => Y1 - (Y1 - Y0) * eta;
    let h = '';
    for (const d of [0, 90, 180, 270, 360]) h += `<line x1="${x(d)}" y1="${Y0}" x2="${x(d)}" y2="${Y1}" stroke="#2e3743"/><text class="lbl" x="${x(d)}" y="${Y1 + 14}" text-anchor="middle">${d}</text>`;
    for (const e of [0, 0.25, 0.5, 0.75, 1]) h += `<line x1="${X0}" y1="${y(e)}" x2="${X1}" y2="${y(e)}" stroke="#2e3743"/><text class="lbl" x="${X0 - 6}" y="${y(e) + 4}" text-anchor="end">${e * 100}</text>`;
    h += `<text class="lbl" x="${X1}" y="${Y1 + 30}" text-anchor="end">${ui.chartX}</text><text class="lbl" x="${X0 + 8}" y="${Y0 - 6}">${ui.chartY}</text>`;
    const curve = (mu: number) => { const p: Vec[] = []; for (let d = 0; d <= 360; d += 6) p.push([x(d), y(efficiency(mu, toRadDeg(d)))]); return pts(p); };
    const refMu = c.mu === MU_PTFE ? MU_UNLINED : MU_PTFE;
    h += `<polyline points="${curve(refMu)}" fill="none" stroke="${refMu === MU_UNLINED ? '#e3b462' : '#8db0ff'}" stroke-width="1.6" stroke-dasharray="5 4" opacity="0.8"/>`;
    h += `<polyline points="${curve(c.mu)}" fill="none" stroke="#8db0ff" stroke-width="2.4"/>`;
    h += `<text class="lbl" x="${x(300)}" y="${y(efficiency(refMu, toRadDeg(300))) - 6}" text-anchor="middle">μ ${fmt3.format(refMu)}</text>`;
    h += `<text class="lbl-a" x="${x(250)}" y="${y(efficiency(c.mu, toRadDeg(250))) + 16}" text-anchor="middle">μ ${fmt3.format(c.mu)}</text>`;
    const th = Math.min(360, toDeg(c.geo.theta));
    if (snap) { const sth = Math.min(360, toDeg(snap.theta)); h += `<circle cx="${x(sth)}" cy="${y(snap.eta)}" r="5" fill="none" stroke="#e3b462" stroke-width="2"/><text class="lbl" x="${x(sth) + 8}" y="${y(snap.eta) + 16}" fill="#e3b462">${ui.before}</text>`; }
    h += `<line x1="${x(th)}" y1="${Y0}" x2="${x(th)}" y2="${Y1}" stroke="#e6eaf0" stroke-dasharray="3 3" opacity="0.6"/>`;
    h += `<circle cx="${x(th)}" cy="${y(c.res.eta)}" r="5.5" fill="#fff" stroke="#2756b8" stroke-width="2"/>`;
    h += `<text class="lbl-w" x="${x(th) + 9}" y="${y(c.res.eta) - 8}">${ui.chartNow} ${fmt1.format(c.res.eta * 100)} %</text>`;
    svChart.innerHTML = h;
  }

  // ------------------------------------------------ показники
  function hud(c: Calc) {
    const r = c.res;
    const N = (v: number) => `${fmt0.format(v)} ${ui.N} <small>${fmt1.format(v / 9.81)} ${ui.kgf}</small>`;
    const stEl = out('status');
    let cls = 's-full', txt = ui.stFull;
    if (r.x < 0.98) {
      cls = r.x >= 0.3 ? 's-part' : 's-none';
      txt = r.x >= 0.3 ? (r.limit === 'force' ? ui.stPartialForce : ui.stPartialExc) : `${ui.stNone} ${r.limit === 'force' ? ui.stPartialForce : ui.stPartialExc}`;
    }
    stEl.className = `status ${cls}`;
    stEl.textContent = txt;
    out('exc').textContent = `${fmt0.format(r.excAtHook)} / ${fmt0.format(st.lReq)} ${ui.mm}`;
    out('excbar').style.width = `${(r.x * 100).toFixed(1)}%`;
    out('open').textContent = `${fmt0.format(r.x * 100)} %`;
    out('fout').innerHTML = N(r.fOut);
    out('fin').innerHTML = N(r.fIn);
    out('theta').textContent = `${fmt0.format(toDeg(c.geo.theta))}°`;
    out('thparts').textContent = ui.thetaParts(fmt0.format(toDeg(c.geo.entry)), fmt0.format(toDeg(c.geo.bend)), fmt0.format(toDeg(c.geo.exit)));
    out('eta').innerHTML = `${fmt1.format(r.eta * 100)} % <small>${ui.loss} ${fmt1.format((1 - r.eta) * 100)} %</small>`;
    out('finfull').innerHTML = N(r.fInFull);
    const lim = FATIGUE_SHARE * st.fMax;
    out('flim').innerHTML = N(lim);
    out('bodyneed').textContent = `${fmt0.format(r.excNeededBody)} ${ui.mm} (${ui.of} ${fmt0.format(c.rawMax)} ${ui.mm})`;
    // навантаження: зусилля для повного відкриття відносно максимуму користувача
    const share = r.fInFull / st.fMax;
    const bar = out('loadbar');
    bar.style.width = `${Math.min(100, share * 100).toFixed(1)}%`;
    bar.className = share > 1 ? 'l-max' : share > FATIGUE_SHARE ? 'l-tired' : '';
    out('loadtxt').textContent = `${fmt0.format(share * 100)} % · ${share > 1 ? ui.loadMax : share > FATIGUE_SHARE ? ui.loadTired : ui.loadOk}`;
    out('loadnote').textContent = ui.loadNote(st.fMax);
    // попередження
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
    const ul = out('flags');
    ul.innerHTML = flags.length ? flags.map(([c2, t]) => `<li class="${c2}">${t}</li>`).join('') : `<li class="f-ok">${ui.flagsNone}</li>`;
    // порівняння «до / зараз»
    const cmp = out('cmp');
    if (snap) {
      cmp.hidden = false;
      cmp.innerHTML = `${ui.before} → ${ui.after}<br>θ ${fmt0.format(toDeg(snap.theta))}° → ${fmt0.format(toDeg(c.geo.theta))}°<br>η ${fmt1.format(snap.eta * 100)} % → ${fmt1.format(r.eta * 100)} %<br>${ui.finFull}: ${fmt0.format(snap.fInFull)} → ${fmt0.format(r.fInFull)} ${ui.N}<br>${ui.opening}: ${fmt0.format(snap.x * 100)} → ${fmt0.format(r.x * 100)} %`;
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
