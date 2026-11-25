// Симулятор тягової системи протеза верхньої кінцівки — інтерактивна частина.
// Стан ↔ посилання (query), повзунки, перетягування ретейнерів і точки перехрещення, лінійні наукові SVG-рисунки
// (передпліччя: задня проєкція і схема Боудена; плече: вигляд збоку з трьома тягами), телеметрія, діагностика.
// © 2026 Марина Гурак, Praxis. Код — усі права захищено (LICENSE-TOOLS.md).
import { META, getUi, sym } from '../lib/bodypowered/content';
import {
  BODY, MU_PTFE, MU_UNLINED, CROSS_OPT, FATIGUE_SHARE, TR, TR_DEFAULT, TH, TD_DATA,
  bodyExcursion, efficiency, elbowMoment, harnessCapture, lockExcursion, socketRadius, solveElbow, solveOpening,
  tdCurve, tdPreload, thTdTheta, toDeg, toRad, trScheme, type TDKind, type Vec,
} from '../lib/bodypowered/physics';

type Mode = 'patient' | 'pro';
type Level = 'tr' | 'th';
type Pair = 'ptfe' | 'unlined' | 'custom';
interface State {
  level: Level; mode: Mode; harness: '8' | '9'; td: TDKind; tdSet: number;
  scap: number; gh: number; approach: number; slack: number; sProx: number; sDist: number;
  pair: Pair; mu: number; fMax: number; cx: number; cy: number;
  rLift: number; thetaBack: number; mForearm: number; comp: number;
  lockMove: number; locked: boolean; lockAlpha: number;
}
const TD_DEF_SET: Record<TDKind, number> = { spring: 1, split: 2, hand: 1 };
const DEF: State = {
  level: 'tr', mode: 'patient', harness: '8', td: 'spring', tdSet: 1,
  scap: 40, gh: 35, approach: TR_DEFAULT.approachDeg, slack: TR_DEFAULT.slack, sProx: TR_DEFAULT.sProx, sDist: TR_DEFAULT.sDist,
  pair: 'ptfe', mu: MU_PTFE, fMax: 250, cx: CROSS_OPT[0], cy: CROSS_OPT[1],
  rLift: TH.rLiftDefault, thetaBack: TH.thetaBackDefault, mForearm: TH.mForearmDefault, comp: 0,
  lockMove: 0, locked: false, lockAlpha: 0,
};
const Q: Record<string, keyof State> = {
  v: 'level', m: 'mode', h: 'harness', t: 'td', n: 'tdSet', s: 'scap', g: 'gh', a: 'approach', l: 'slack', p: 'sProx', d: 'sDist',
  c: 'pair', u: 'mu', f: 'fMax', x: 'cx', y: 'cy', r: 'rLift', w: 'thetaBack', q: 'mForearm', z: 'comp', k: 'locked', j: 'lockAlpha',
};
const LIMITS: Record<string, [number, number]> = {
  tdSet: [1, 3], scap: [0, 100], gh: [0, 90], approach: [TR.approach[0], TR.approach[1]], slack: [TR.slack[0], TR.slack[1]],
  sProx: [TR.sProx[0], TR.sProx[1]], sDist: [TR.sDist[0], TR.sDist[1]], mu: [0.05, 0.4], fMax: [87, 538], cx: [-80, 80], cy: [-20, 90],
  rLift: [TH.rLift[0], TH.rLift[1]], thetaBack: [TH.thetaBack[0], TH.thetaBack[1]], mForearm: [TH.mForearm[0], TH.mForearm[1]], comp: [0, 100],
  lockMove: [0, 100], lockAlpha: [0, TH.alphaMax],
};
const clampK = (k: string, v: number) => Math.max(LIMITS[k][0], Math.min(LIMITS[k][1], v));
const setMax = (td: TDKind) => TD_DATA[td].length;

function readUrl(): State {
  const st: State = { ...DEF };
  const q = new URLSearchParams(location.search);
  for (const [short, key] of Object.entries(Q)) {
    const v = q.get(short);
    if (v == null) continue;
    if (key === 'level') st.level = v === 'th' ? 'th' : 'tr';
    else if (key === 'mode') st.mode = v === 'r' ? 'pro' : 'patient';
    else if (key === 'harness') st.harness = v === '9' ? '9' : '8';
    else if (key === 'td') st.td = v === 'split' || v === 'hand' ? v : 'spring';
    else if (key === 'pair') st.pair = v === 'u' ? 'unlined' : v === 'c' ? 'custom' : 'ptfe';
    else if (key === 'locked') st.locked = v === '1';
    else if (Number.isFinite(+v)) (st as any)[key] = clampK(key, +v);
  }
  st.tdSet = Math.min(st.tdSet, setMax(st.td));
  return st;
}
function writeUrl(st: State) {
  const q = new URLSearchParams();
  for (const [short, key] of Object.entries(Q)) {
    const v = st[key];
    if (v === DEF[key]) continue;
    if (key === 'mode') q.set(short, v === 'pro' ? 'r' : 'p');
    else if (key === 'pair') q.set(short, v === 'unlined' ? 'u' : v === 'custom' ? 'c' : 't');
    else if (key === 'locked') q.set(short, v ? '1' : '0');
    else q.set(short, String(typeof v === 'number' ? +v.toFixed(3) : v));
  }
  const s = q.toString();
  history.replaceState(null, '', `${location.pathname}${s ? `?${s}` : ''}${location.hash}`);
}

const muOf = (st: State) => (st.pair === 'ptfe' ? MU_PTFE : st.pair === 'unlined' ? MU_UNLINED : st.mu);

function compute(st: State) {
  const mu = muOf(st);
  const td = tdCurve(st.td, st.tdSet);
  const k = harnessCapture([st.cx, st.cy]);
  const phi = toRad(st.gh);
  if (st.level === 'tr') {
    const geo = trScheme({ approachDeg: st.approach, sProx: st.sProx, sDist: st.sDist, slack: st.slack });
    const raw = bodyExcursion(st.scap / 100, st.gh);
    const res = solveOpening({ raw, k, mu, theta: geo.theta, td, fMax: st.fMax });
    return { level: 'tr' as Level, mu, td, k, phi, raw, res, theta: geo.theta, geo, rawMax: bodyExcursion(1, 90), th: null };
  }
  const mTD = td.mass / 1000;
  const lift = solveElbow({ raw: (Math.min(90, st.gh) / 90) * BODY.ghMax, k, mu, rLift: st.rLift, fMax: st.fMax, phi, mForearm: st.mForearm, mTD, comp: st.comp / 100 });
  const alpha = st.locked ? toRad(st.lockAlpha) : lift.alpha;
  const theta = thTdTheta(st.thetaBack, alpha);
  const raw = (st.scap / 100) * BODY.scapMax;
  const res = solveOpening({ raw, k, mu, theta, td, fMax: st.fMax });
  const eLift = Math.exp(mu * toRad(TH.thetaLift));
  const moment = elbowMoment({ phi, alpha, mForearm: st.mForearm, mTD, comp: st.comp / 100 });
  const fHoriz = (eLift * elbowMoment({ phi: 0, alpha: Math.PI / 2, mForearm: st.mForearm, mTD, comp: st.comp / 100 })) / st.rLift;
  return {
    level: 'th' as Level, mu, td, k, phi, raw, res, theta, geo: null, rawMax: BODY.scapMax,
    th: { lift, alpha, moment, fHoriz, eLift, mTD, eta0: efficiency(mu, thTdTheta(st.thetaBack, 0)), lockExc: lockExcursion(st.lockMove / 100, k) },
  };
}
type Calc = ReturnType<typeof compute>;

// ---------------------------------------------------------------- палітра й допоміжне SVG
const K = {
  ink: '#070b14', sky: '#8db0ff', azure: '#5b8cff', blue: '#2756b8', ice: '#dfe7ff', w: '#e6eaf0', mu: '#7a869c', ln: '#25324d', ln2: '#3a4b70',
  ok: '#45c08a', warn: '#e0b25a', bad: '#ff6b6b', strap: '#2f3c58', stitch: '#7f93bb', lift: '#8db0ff', lock: '#c79bff', tdc: '#5fd4c4', metal: '#c9d3e6', metal2: '#8f9bb3',
};
const f1 = (n: number) => n.toFixed(1);
const P2 = (p: Vec) => `${f1(p[0])} ${f1(p[1])}`;
const pts = (a: Vec[]) => a.map((p) => `${f1(p[0])},${f1(p[1])}`).join(' ');
const add = (a: Vec, b: Vec): Vec => [a[0] + b[0], a[1] + b[1]];
const sub = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1]];
const mul = (a: Vec, k: number): Vec => [a[0] * k, a[1] * k];
const lerp = (a: Vec, b: Vec, t: number): Vec => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const unit = (a: Vec): Vec => { const l = Math.hypot(a[0], a[1]) || 1; return [a[0] / l, a[1] / l]; };
const ang = (v: Vec) => Math.atan2(v[1], v[0]);
function mix(a: string, b: string, t: number) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(',')})`;
}
/** Колір натягу троса: блакитний → бурштиновий → червоний. */
function tensionColor(t: number) {
  t = Math.max(0, Math.min(1, t));
  return t < 0.5 ? mix(K.sky, K.warn, t / 0.5) : mix(K.warn, K.bad, (t - 0.5) / 0.5);
}
function arc(c: Vec, r: number, a0: number, a1: number) {
  let d = a1 - a0;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  const p0: Vec = [c[0] + r * Math.cos(a0), c[1] + r * Math.sin(a0)];
  const p1: Vec = [c[0] + r * Math.cos(a0 + d), c[1] + r * Math.sin(a0 + d)];
  return `M${P2(p0)}A${r} ${r} 0 0 ${d > 0 ? 1 : 0} ${P2(p1)}`;
}
/** HTML-індекси → SVG tspan (зсув у власних em компенсується в em батьківського шрифту). */
const svgSub = (html: string) => html
  .replace(/<sub>([^<]*)<\/sub>/g, '<tspan dy="0.4em" font-size="72%">$1</tspan><tspan dy="-0.288em">​</tspan>')
  .replace(/<sup>([^<]*)<\/sup>/g, '<tspan dy="-0.6em" font-size="72%">$1</tspan><tspan dy="0.432em">​</tspan>');
/** Позиційна позначка: виносна лінія + кружок із номером. */
function tag(id: string, at: Vec, to: Vec, col = K.sky) {
  return `<path d="M${P2(at)}L${P2(to)}" stroke="${col}" stroke-width="0.9" stroke-dasharray="2 3" opacity="0.8"/><circle cx="${f1(at[0])}" cy="${f1(at[1])}" r="2.4" fill="${col}"/>`
    + `<g class="tg"><circle cx="${f1(to[0])}" cy="${f1(to[1])}" r="9" fill="${K.ink}" stroke="${col}" stroke-width="1.3"/><text class="tag" x="${f1(to[0])}" y="${f1(to[1] + 3.5)}" text-anchor="middle">${id}</text></g>`;
}
/** Конусний «капсульний» сегмент кінцівки. */
function capsule(a: Vec, b: Vec, w0: number, w1: number, fill: string, stroke: string, sw = 1.2) {
  const u = unit(sub(b, a));
  const n: Vec = [-u[1], u[0]];
  const a1 = add(a, mul(n, w0 / 2)), a2 = sub(a, mul(n, w0 / 2)), b1 = add(b, mul(n, w1 / 2)), b2 = sub(b, mul(n, w1 / 2));
  return `<path d="M${P2(a1)}L${P2(b1)}A${f1(w1 / 2)} ${f1(w1 / 2)} 0 0 0 ${P2(b2)}L${P2(a2)}A${f1(w0 / 2)} ${f1(w0 / 2)} 0 0 0 ${P2(a1)}Z" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>`;
}
const strap = (d: string, w = 7) => `<path d="${d}" fill="none" stroke="${K.strap}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${K.stitch}" stroke-width="0.8" stroke-dasharray="3 3" opacity="0.7"/>`;
const GRAD = (id: string) => `<linearGradient id="${id}-body" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8db0ff" stop-opacity=".16"/><stop offset="1" stop-color="#2756b8" stop-opacity=".04"/></linearGradient>`
  + `<linearGradient id="${id}-pros" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5b8cff" stop-opacity=".55"/><stop offset="1" stop-color="#2756b8" stop-opacity=".25"/></linearGradient>`
  + `<linearGradient id="${id}-metal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#dfe7ff" stop-opacity=".5"/><stop offset="1" stop-color="#8db0ff" stop-opacity=".12"/></linearGradient>`;

// ---------------------------------------------------------------- термінальні пристрої (узагальнені лінійні рисунки)
// Локальні координати: x — дистально від з'єднання із зап'ястям, y < 0 — тильний бік (важіль, трос).
type Cmd = string | Vec;
const LEVER_LOCAL: Vec = [34, -18];
function rotL(p: Vec, piv: Vec, deg: number): Vec {
  const t = toRad(deg), dx = p[0] - piv[0], dy = p[1] - piv[1];
  return [piv[0] + dx * Math.cos(t) + dy * Math.sin(t), piv[1] - dx * Math.sin(t) + dy * Math.cos(t)];
}
interface TDDraw { svg: string; lever: Vec; tipA: Vec; tipB: Vec }
function tdDraw(kind: TDKind, setting: number, x: number, o: Vec, u: Vec, n: Vec, s: number, gid: string): TDDraw {
  const W = (p: Vec): Vec => [o[0] + (u[0] * p[0] + n[0] * p[1]) * s, o[1] + (u[1] * p[0] + n[1] * p[1]) * s];
  const path = (c: Cmd[], rot?: { piv: Vec; deg: number }) => c.map((e) => (typeof e === 'string' ? e : P2(W(rot ? rotL(e, rot.piv, rot.deg) : e)))).join(' ');
  const sw = (v: number) => f1(Math.max(1.2, v * s));
  let h = '';
  let lever: Vec, tipA: Vec, tipB: Vec;
  if (kind === 'spring') {
    const piv: Vec = [30, -4], deg = x * 32, R = { piv, deg };
    h += `<path d="${path(['M', [0, -11], 'L', [30, -11], 'L', [34, -2], 'L', [30, 11], 'L', [0, 11], 'Z'])}" fill="url(#${gid}-metal)" stroke="${K.metal2}" stroke-width="1"/>`;
    h += `<path d="${path(['M', [28, 8], 'C', [52, 10], [74, 14], [86, 26], 'C', [92, 32], [90, 40], [82, 38]])}" fill="none" stroke="${K.metal2}" stroke-width="${sw(6)}" stroke-linecap="round"/>`;
    h += `<path d="${path(['M', [28, -8], 'C', [52, -10], [74, -14], [86, -26], 'C', [92, -32], [90, -40], [82, -38]], R)}" fill="none" stroke="${K.metal}" stroke-width="${sw(6)}" stroke-linecap="round"/>`;
    h += `<path d="${path(['M', piv, 'L', LEVER_LOCAL], R)}" stroke="${K.metal}" stroke-width="${sw(3.5)}" stroke-linecap="round"/>`;
    const coil: Cmd[] = ['M', [6, -12]];
    for (let i = 0; i < 8; i++) coil.push('L', [8 + i * 2.6, i % 2 ? -12 : -19]);
    h += `<path d="${path(coil)}" fill="none" stroke="${K.sky}" stroke-width="1.2"/>`;
    const knob = W([10, 4]);
    h += `<circle cx="${f1(knob[0])}" cy="${f1(knob[1])}" r="${f1(3.4 * s)}" fill="${K.ink}" stroke="${K.sky}"/>`;
    const tk = W([10 + (setting === 2 ? 2.6 : -2.6), 2]);
    h += `<path d="M${P2(knob)}L${P2(tk)}" stroke="${K.sky}" stroke-width="1.2"/>`;
    lever = W(rotL(LEVER_LOCAL, piv, deg)); tipA = W(rotL([84, -36], piv, deg)); tipB = W([84, 36]);
  } else if (kind === 'split') {
    const piv: Vec = [18, -3], deg = x * 34, R = { piv, deg };
    h += `<path d="${path(['M', [0, -7], 'L', [16, -7], 'L', [18, 7], 'L', [0, 7], 'Z'])}" fill="url(#${gid}-metal)" stroke="${K.metal2}" stroke-width="1"/>`;
    h += `<path d="${path(['M', [14, 4], 'C', [44, 6], [72, 12], [92, 30], 'C', [98, 36], [94, 44], [86, 42]])}" fill="none" stroke="${K.metal2}" stroke-width="${sw(6)}" stroke-linecap="round"/>`;
    h += `<path d="${path(['M', [14, -4], 'C', [44, -6], [74, -8], [94, 6], 'C', [98, 10], [96, 16], [90, 16]], R)}" fill="none" stroke="${K.metal}" stroke-width="${sw(6)}" stroke-linecap="round"/>`;
    h += `<path d="${path(['M', piv, 'L', LEVER_LOCAL], R)}" stroke="${K.metal}" stroke-width="${sw(3.5)}" stroke-linecap="round"/>`;
    for (let i = 0; i < Math.round(setting); i++) {
      const bx = 30 + i * 7;
      const top = rotL([bx, -5 - (bx - 14) * 0.03], piv, deg)[1] - 2, bot = 6 + (bx - 14) * 0.08 + 2;
      const ring: Vec[] = [];
      for (let j = 0; j <= 16; j++) { const t = (j / 16) * 2 * Math.PI; ring.push(W([bx + 2.4 * Math.cos(t), (top + bot) / 2 + ((bot - top) / 2) * Math.sin(t)])); }
      h += `<polyline points="${pts(ring)}" fill="none" stroke="${K.azure}" stroke-width="${sw(1.8)}"/>`;
    }
    lever = W(rotL(LEVER_LOCAL, piv, deg)); tipA = W(rotL([92, 14], piv, deg)); tipB = W([90, 38]);
  } else {
    const piv: Vec = [52, -8], deg = x * 26, R = { piv, deg };
    h += `<path d="${path(['M', [24, 16], 'C', [42, 24], [62, 22], [74, 13], 'C', [79, 9], [78, 4], [73, 3]])}" fill="none" stroke="${K.metal2}" stroke-width="${sw(9)}" stroke-linecap="round"/>`;
    h += `<path d="${path(['M', [0, -16], 'C', [16, -21], [44, -22], [56, -14], 'C', [63, -8], [62, 10], [54, 18], 'C', [40, 26], [12, 24], [0, 16], 'Z'])}" fill="url(#${gid}-pros)" stroke="${K.sky}" stroke-width="1.1"/>`;
    h += `<path d="${path(['M', [50, -6], 'C', [64, -6], [76, -1], [82, 7]], R)}" fill="none" stroke="${K.metal2}" stroke-width="${sw(8)}" stroke-linecap="round"/>`;
    h += `<path d="${path(['M', [50, -13], 'C', [66, -15], [80, -10], [88, 0], 'C', [92, 6], [90, 12], [84, 12]], R)}" fill="none" stroke="${K.metal}" stroke-width="${sw(9)}" stroke-linecap="round"/>`;
    h += `<path d="${path(['M', [24, -19], 'L', LEVER_LOCAL])}" stroke="${K.metal}" stroke-width="${sw(3)}" stroke-linecap="round"/>`;
    lever = W(LEVER_LOCAL); tipA = W(rotL([86, 12], piv, deg)); tipB = W([74, 6]);
  }
  h += `<circle cx="${f1(lever[0])}" cy="${f1(lever[1])}" r="${f1(Math.max(2.2, 2.6 * s))}" fill="${K.ink}" stroke="${K.ice}" stroke-width="1.2"/>`;
  return { svg: h, lever, tipA, tipB };
}

export function initBodyPowered() {
  const host = document.querySelector<HTMLElement>('.bp');
  if (!host) return;
  const root: HTMLElement = host;
  const lang = (root.dataset.lang === 'en' ? 'en' : 'uk') as 'uk' | 'en';
  const ui = getUi(lang);
  const T = (html: string) => svgSub(sym(lang, html));
  const nf = (d: number) => new Intl.NumberFormat(lang === 'uk' ? 'uk-UA' : 'en-GB', { maximumFractionDigits: d, minimumFractionDigits: d });
  const fmt0 = nf(0), fmt1 = nf(1), fmt2 = nf(2), fmt3 = nf(3);
  const trim0 = (v: number) => (Math.abs(v - Math.round(v)) < 0.05 ? fmt0.format(v) : fmt1.format(v));
  const $ = <E extends Element = HTMLElement>(s: string) => root.querySelector<E>(s)!;
  const out = (k: string) => root.querySelector<HTMLElement>(`[data-o="${k}"]`);
  const svBack = $<SVGSVGElement>('.sv-back');
  const svSide = $<SVGSVGElement>('.sv-side');
  const svTh = $<SVGSVGElement>('.sv-th');
  const svHook = $<SVGSVGElement>('.sv-hook');
  const svCross = $<SVGSVGElement>('.sv-cross');
  const svChart = $<SVGSVGElement>('.sv-chart');
  const mm = ui.mm, N = ui.N;

  let st = readUrl();
  let snap: null | { theta: number; eta: number; fInFull: number; x: number } = null;
  let raf = 0;
  let lockArmed = false;
  let lastAlpha = 0;

  // ------------------------------------------------ іконки ТП у кнопках вибору
  root.querySelectorAll<SVGSVGElement>('.tdb .ico').forEach((svg) => {
    const kind = (svg.closest<HTMLElement>('.tdb')!.dataset.td || 'spring') as TDKind;
    const d = tdDraw(kind, 2, 0.25, [7, 18], [1, 0], [0, 1], 0.46, `ic-${kind}`);
    svg.innerHTML = `<defs>${GRAD(`ic-${kind}`)}</defs><rect x="1" y="12" width="6" height="12" rx="1.5" fill="${K.ln2}"/>${d.svg}`;
  });

  // ------------------------------------------------ керування
  function syncControls() {
    root.classList.toggle('is-pro', st.mode === 'pro');
    root.classList.toggle('is-th', st.level === 'th');
    root.dataset.h = st.harness;
    root.querySelectorAll<HTMLButtonElement>('.seg-b').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.mode === st.mode)));
    root.querySelectorAll<HTMLButtonElement>('.lv-b').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.level === st.level)));
    root.querySelectorAll<HTMLButtonElement>('.hb').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.h === st.harness)));
    root.querySelectorAll<HTMLButtonElement>('.tdb').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.td === st.td)));
    $<HTMLInputElement>('input[data-k="tdSet"]').max = String(setMax(st.td));
    $('.rng-set').toggleAttribute('hidden', st.td === 'hand');
    out('setlabel')!.textContent = st.td === 'spring' ? ui.setSpring : ui.setSplit;
    root.querySelectorAll<HTMLInputElement>('input[data-k]').forEach((i) => { i.value = String((st as any)[i.dataset.k!]); });
    $<HTMLSelectElement>('select[data-k="pair"]').value = st.pair;
    $('.rng-mu').toggleAttribute('hidden', st.pair !== 'custom');
  }
  function setOutputs() {
    const v = (k: string, s: string) => { const o = root.querySelector(`output[data-v="${k}"]`); if (o) o.textContent = s; };
    v('tdSet', fmt0.format(st.tdSet));
    v('scap', `${fmt0.format(st.scap)} %`);
    v('gh', `${fmt0.format(st.gh)}°`);
    v('lockMove', `${fmt0.format(st.lockMove)} %`);
    v('approach', `${fmt0.format(st.approach)}°`);
    v('slack', `${fmt0.format(st.slack)} ${mm}`);
    v('mu', fmt3.format(st.mu));
    v('fMax', `${fmt0.format(st.fMax)} ${N}`);
    v('rLift', `${fmt0.format(st.rLift)} ${mm}`);
    v('thetaBack', `${fmt0.format(st.thetaBack)}°`);
    v('mForearm', `${fmt2.format(st.mForearm)} ${lang === 'uk' ? 'кг' : 'kg'}`);
    v('comp', `${fmt0.format(st.comp)} %`);
  }
  /** Цикл «потягнути — відпустити» тяги блокування перемикає замок. */
  function lockLogic() {
    if (st.level !== 'th') return;
    const exc = lockExcursion(st.lockMove / 100, harnessCapture([st.cx, st.cy]));
    if (exc >= TH.lockExc) lockArmed = true;
    else if (lockArmed && exc < TH.lockExc / 2) {
      lockArmed = false;
      st.locked = !st.locked;
      if (st.locked) st.lockAlpha = +toDeg(lastAlpha).toFixed(1);
    }
  }

  root.querySelectorAll<HTMLInputElement>('input[data-k]').forEach((inp) => {
    inp.addEventListener('input', () => {
      const k = inp.dataset.k!;
      (st as any)[k] = clampK(k, +inp.value);
      if (k === 'lockMove') lockLogic();
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
  const snapBtn = $<HTMLButtonElement>('[data-act="snap"]');
  function syncSnap() { snapBtn.textContent = snap ? ui.snapClear : ui.snap; snapBtn.setAttribute('aria-pressed', String(!!snap)); }
  root.querySelectorAll<HTMLButtonElement>('.seg-b').forEach((b) => b.addEventListener('click', () => { st.mode = b.dataset.mode as Mode; syncControls(); schedule(); }));
  root.querySelectorAll<HTMLButtonElement>('.lv-b').forEach((b) => b.addEventListener('click', () => { st.level = b.dataset.level as Level; snap = null; syncSnap(); syncControls(); schedule(); }));
  root.querySelectorAll<HTMLButtonElement>('.hb').forEach((b) => b.addEventListener('click', () => { st.harness = b.dataset.h as '8' | '9'; syncControls(); schedule(); }));
  root.querySelectorAll<HTMLButtonElement>('.tdb').forEach((b) => b.addEventListener('click', () => {
    const td = b.dataset.td as TDKind;
    if (td !== st.td) { st.td = td; st.tdSet = TD_DEF_SET[td]; }
    syncControls(); schedule();
  }));
  $<HTMLButtonElement>('[data-act="reset"]').addEventListener('click', () => { st = { ...DEF, mode: st.mode, level: st.level }; lockArmed = false; syncControls(); schedule(); });
  snapBtn.addEventListener('click', () => {
    if (snap) snap = null;
    else { const c = compute(st); snap = { theta: c.theta, eta: c.res.eta, fInFull: c.res.fInFull, x: c.res.x }; }
    syncSnap();
    schedule();
  });
  const copyBtn = $<HTMLButtonElement>('[data-act="copy"]');
  copyBtn.addEventListener('click', async () => {
    writeUrl(st);
    try { await navigator.clipboard.writeText(location.href); copyBtn.textContent = ui.copied; }
    catch { copyBtn.textContent = location.href; }
    setTimeout(() => { copyBtn.textContent = ui.copy; }, 1800);
  });
  // «Потягнути й відпустити»: плавний рух тяги блокування 0 → 100 % → 0
  const lockBtn = $<HTMLButtonElement>('[data-act="lock"]');
  lockBtn.addEventListener('click', () => {
    if (lockBtn.disabled) return;
    lockBtn.disabled = true;
    const t0 = performance.now(), dur = 900;
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      st.lockMove = Math.round(100 * Math.sin(Math.PI * p));
      lockLogic();
      $<HTMLInputElement>('input[data-k="lockMove"]').value = String(st.lockMove);
      schedule();
      if (p < 1) requestAnimationFrame(step);
      else { st.lockMove = 0; lockLogic(); lockBtn.disabled = false; schedule(); }
    };
    requestAnimationFrame(step);
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
    st.cy = clampK('cy', (p[1] - 40) / CROSS_S);
  });

  const tension = (c: Calc) => tensionColor(c.res.fIn / Math.max(1, st.fMax) / 0.4);

  // ------------------------------------------------ FIG. 1 · передпліччя · пацієнт: задня проєкція
  function drawBack(c: Calc) {
    const s = st.scap / 100;
    const ffx = 1 - 0.5 * Math.sin((st.gh / 90) * (Math.PI / 2)); // скорочення проєкції руки, що йде вперед
    const tcol = tension(c);
    const d = 56 + 22 * s;
    const Sh: Vec = [428, 172];
    const E: Vec = [442, 178 + 152 * ffx];
    const Wr: Vec = [448, E[1] + 132 * ffx];
    const hanger: Vec = [434, 178 + 100 * ffx];
    const ret: Vec = [E[0] - 6, E[1] + 26 * ffx];
    const hEnd: Vec = [Wr[0] - 10, Wr[1] - 8];
    const R: Vec = [320 + st.cx * CROSS_S, 128 + st.cy * CROSS_S];
    const fig8 = st.harness === '8';
    let h = `<defs>${GRAD('bk')}</defs>`;
    h += capsule([212, 168], [200, 326], 30, 26, '#0c1424', K.ln2) + capsule([200, 330], [192, 462], 26, 20, '#0c1424', K.ln2);
    h += `<path d="M180 466 C178 482 184 500 194 504 C204 506 208 490 206 472 Z" fill="#0c1424" stroke="${K.ln2}"/>`;
    h += capsule(Sh, [E[0], E[1] - 2], 30, 26, '#0c1424', K.ln2);
    const torso = 'M306 104 C304 124 290 134 262 140 C236 145 214 152 208 176 C204 200 214 232 222 262 C230 310 236 360 236 410 C236 450 232 490 230 522 L410 522 C408 490 404 450 404 410 C404 360 410 310 418 262 C426 232 436 200 432 176 C426 152 404 145 378 140 C350 134 336 124 334 104 Z';
    h += `<path d="${torso}" fill="#0c1424"/><path d="${torso}" fill="url(#bk-body)" stroke="${K.ln2}" stroke-width="1.3" stroke-linejoin="round"/>`;
    h += `<path d="M262 300 C290 312 350 312 378 300 M268 420 C296 430 344 430 372 420" fill="none" stroke="${K.ln}"/>`;
    h += `<ellipse cx="320" cy="64" rx="34" ry="42" fill="#0c1424" stroke="${K.ln2}" stroke-width="1.3"/><ellipse cx="320" cy="64" rx="34" ry="42" fill="url(#bk-body)"/>`;
    h += `<line x1="320" y1="124" x2="320" y2="512" stroke="${K.ln2}" stroke-dasharray="10 4 2 4"/>`;
    const scapula = (side: number) => {
      const mx = 320 + side * (d - 20), lx = 320 + side * (d + 26);
      return `<path d="M${mx} 190 L${mx} 280 L${lx} 206 Z" fill="rgba(141,176,255,0.08)" stroke="${K.sky}" stroke-width="1.3" stroke-linejoin="round"/><circle cx="${lx}" cy="206" r="2.5" fill="${K.sky}"/>`;
    };
    h += scapula(-1) + scapula(1);
    const mL = 320 - (d - 20), mR = 320 + (d - 20);
    h += `<path d="M${mL} 284V306M${mR} 284V306" stroke="${K.sky}" stroke-width=".8" opacity=".7"/><path d="M${mL} 300H${mR}" stroke="${K.sky}" stroke-width="1"/>`;
    h += `<path d="M${mL - 4} 304l8 -8M${mR - 4} 304l8 -8" stroke="${K.sky}" stroke-width="1.4"/>`;
    h += `<text class="tc" x="320" y="322" text-anchor="middle">s = ${fmt0.format(st.scap)} %</text>`;
    const u = unit(sub(Wr, E));
    const nrm: Vec = [-u[1], u[0]];
    const a1 = add(E, mul(nrm, 18)), a2 = add(Wr, mul(nrm, 13)), b2 = sub(Wr, mul(nrm, 13)), b1 = sub(E, mul(nrm, 18));
    h += `<path d="M${P2(a1)}L${P2(a2)}Q${P2(add(Wr, mul(u, 6)))} ${P2(b2)}L${P2(b1)}Q${P2(sub(E, mul(u, 10)))} ${P2(a1)}Z" fill="url(#bk-pros)" stroke="${K.sky}" stroke-width="1.2"/>`;
    h += `<path d="M${P2(lerp(a1, a2, 0.08))}L${P2(lerp(a1, a2, 0.92))}" stroke="${K.ice}" stroke-opacity=".35"/>`;
    h += `<circle cx="${f1(E[0])}" cy="${f1(E[1] - 4)}" r="12" fill="#0c1424" stroke="${K.ln2}"/>`;
    const td = tdDraw(st.td, st.tdSet, c.res.x, add(Wr, mul(u, 6)), u, [-u[1], u[0]], 0.55 + 0.25 * ffx, 'bk');
    h += `<rect x="${f1(Wr[0] - 10)}" y="${f1(Wr[1] - 2)}" width="20" height="${f1(8 * ffx + 4)}" rx="3" fill="${K.ln2}"/>` + td.svg;
    h += `<ellipse cx="216" cy="196" rx="26" ry="36" transform="rotate(-18 216 196)" fill="none" stroke="${K.strap}" stroke-width="8"/><ellipse cx="216" cy="196" rx="26" ry="36" transform="rotate(-18 216 196)" fill="none" stroke="${K.stitch}" stroke-width=".8" stroke-dasharray="3 3" opacity=".7"/>`;
    h += strap(`M234 168 L${P2(R)} M238 222 L${P2(R)}`);
    if (fig8) h += strap(`M${P2(R)} L414 150`) + `<path d="M414 150 L432 138" stroke="${K.strap}" stroke-width="7" stroke-dasharray="4 5" stroke-linecap="round"/>`;
    h += strap(`M${P2(R)} L${P2(hanger)}`);
    h += `<path d="M${P2(hanger)}L${P2(ret)}" stroke="${tcol}" stroke-width="2.4"/>`;
    h += `<path d="M${P2(ret)}L${P2(hEnd)}" stroke="#03050a" stroke-width="7" stroke-linecap="round"/><path d="M${P2(ret)}L${P2(hEnd)}" stroke="${tcol}" stroke-width="2"/>`;
    h += `<rect x="${f1(ret[0] - 6)}" y="${f1(ret[1] - 3)}" width="12" height="6" rx="2" fill="${K.ice}"/>`;
    h += `<circle cx="${f1(hanger[0])}" cy="${f1(hanger[1])}" r="3.5" fill="${K.w}"/>`;
    h += `<circle cx="320" cy="128" r="3" fill="${K.w}"/><text class="t" x="340" y="132">${ui.c7}</text>`;
    h += `<circle cx="${f1(R[0])}" cy="${f1(R[1])}" r="8" fill="${K.ink}" stroke="${K.ice}" stroke-width="2.4"/>`;
    const mB: Vec = mul(add(R, hanger), 0.5);
    const mC: Vec = mul(add(ret, hEnd), 0.5);
    h += tag('A', R, [R[0] - 50, R[1] - 36]);
    h += tag('B', mB, [mB[0] + 4, mB[1] - 26]);
    h += tag('C', mC, [mC[0] + 44, mC[1] + 4]);
    h += tag('D', lerp(td.tipA, td.tipB, 0.5), [Wr[0] + 64, Wr[1] + 54 * ffx]);
    h += tag('E', [192, 186], [156, 168]);
    if (fig8) h += tag('F', [428, 141], [466, 120]);
    h += `<text class="tc" x="${f1(E[0] + 26)}" y="${f1(E[1] - 12)}">φ = ${fmt0.format(st.gh)}°</text>`;
    h += `<text class="tm" x="190" y="548" text-anchor="middle">${ui.sound}</text><text class="tm" x="452" y="548" text-anchor="middle">${ui.prosthetic}</text>`;
    const cS = (st.scap / 100) * BODY.scapMax, cG = (Math.min(90, st.gh) / BODY.ghMaxDeg) * BODY.ghMax;
    h += `<text class="tw" x="320" y="582" text-anchor="middle">${T('ΔL<sub>тіло</sub>')} = ${fmt1.format(cS)} + ${fmt1.format(cG)} = ${fmt1.format(c.raw)} ${mm} · k = ${fmt2.format(c.k)}</text>`;
    svBack.innerHTML = h;
  }

  // ------------------------------------------------ FIG. 2 · термінальний пристрій
  function drawHook(c: Calc) {
    const o: Vec = [46, 72];
    const td = tdDraw(st.td, st.tdSet, c.res.x, o, [1, 0], [0, 1], 1.55, 'hk');
    let h = `<defs>${GRAD('hk')}<marker id="hk-ar" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${K.ice}"/></marker></defs>`;
    h += `<line x1="4" y1="${o[1]}" x2="296" y2="${o[1]}" stroke="${K.ln}" stroke-dasharray="12 3 2 3"/>`;
    h += `<rect x="6" y="${o[1] - 22}" width="${o[0] - 6}" height="44" rx="6" fill="url(#hk-metal)" stroke="${K.ln2}"/>`;
    h += `<path d="M8 ${f1(td.lever[1])} L${P2(td.lever)}" stroke="${tension(c)}" stroke-width="2.2" marker-start="url(#hk-ar)"/>`;
    h += td.svg;
    if (c.res.width > 2) {
      const mid = lerp(td.tipA, td.tipB, 0.5);
      h += `<path d="M${P2(td.tipA)}L${P2(td.tipB)}" stroke="${K.sky}" stroke-width="1" stroke-dasharray="3 3"/><circle cx="${f1(td.tipA[0])}" cy="${f1(td.tipA[1])}" r="2.4" fill="${K.sky}"/><circle cx="${f1(td.tipB[0])}" cy="${f1(td.tipB[1])}" r="2.4" fill="${K.sky}"/>`;
      h += `<text class="tc" x="${f1(mid[0] + 12)}" y="${f1(mid[1] + 4)}">w = ${fmt0.format(c.res.width)} ${mm}</text>`;
    }
    h += `<text class="tc" x="10" y="${f1(td.lever[1] - 10)}">${T('F<sub>вих</sub>')} = ${fmt0.format(c.res.fOut)} ${N}</text>`;
    h += `<text class="tw" x="292" y="-16" text-anchor="end">x = ${fmt0.format(c.res.x * 100)} %</text>`;
    h += `<text class="tm" x="292" y="162" text-anchor="end">${T('F<sub>пов</sub>')} ${fmt0.format(c.td.fFull)} ${N} · ${T('F<sub>0</sub>')} ${fmt0.format(tdPreload(c.td))} ${N} · ${fmt0.format(c.td.mass)} ${ui.g}</text>`;
    svHook.innerHTML = h;
  }

  // ------------------------------------------------ FIG. 1 · передпліччя · протезист: схема передачі Боудена
  function titleBlock(x: number, y: number, tb: string[]) {
    let h = `<g class="tbk"><rect x="${f1(x)}" y="${f1(y)}" width="180" height="66" rx="8" fill="rgba(7,11,20,0.85)" stroke="${K.ln2}"/>`;
    h += `<path d="M${f1(x)} ${f1(y + 18)}h180M${f1(x)} ${f1(y + 34)}h180M${f1(x)} ${f1(y + 50)}h180M${f1(x + 124)} ${f1(y)}v18" stroke="${K.ln}"/>`;
    h += `<text class="tbh" x="${f1(x + 8)}" y="${f1(y + 13)}">${tb[0]}</text><text class="tbh" x="${f1(x + 152)}" y="${f1(y + 13)}" text-anchor="middle">FIG. 1</text>`;
    h += `<text class="tb" x="${f1(x + 8)}" y="${f1(y + 30)}">${tb[1]}</text><text class="tb" x="${f1(x + 8)}" y="${f1(y + 46)}">${tb[2]}</text><text class="tb" x="${f1(x + 8)}" y="${f1(y + 61)}">${tb[3]}</text>`;
    h += `<text class="tbh" x="${f1(x + 172)}" y="${f1(y + 30)}" text-anchor="end">v${META.version}</text></g>`;
    return h;
  }
  function drawSide(c: Calc) {
    const g = c.geo!;
    svSide.setAttribute('viewBox', '-150 -240 560 362');
    let h = `<defs>${GRAD('sd')}`;
    h += `<marker id="sd-ag" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${K.ice}"/></marker>`;
    h += `<marker id="sd-ad" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 1.5L10 5L0 8.5z" fill="${K.mu}"/></marker></defs>`;
    const top: Vec[] = [], bot: Vec[] = [];
    for (let s = TR.socketFrom; s <= TR.socketTo; s += 5) { top.push([s, -socketRadius(s)]); bot.push([s, socketRadius(s)]); }
    const sock = `M${pts(top)} L${pts([...bot].reverse())} Z`;
    h += `<path d="${sock}" fill="url(#sd-pros)" stroke="${K.sky}" stroke-width="1.2"/>`;
    h += `<path d="M${pts(top.slice(2, -2))}" fill="none" stroke="${K.ice}" stroke-opacity=".35" transform="translate(0 4)"/>`;
    h += `<path d="M${TR.socketFrom} ${-TR.rProx} C${TR.socketFrom - 22} ${-TR.rProx + 10} ${TR.socketFrom - 22} ${TR.rProx - 10} ${TR.socketFrom} ${TR.rProx}" fill="none" stroke="${K.sky}" stroke-width="1.1" stroke-dasharray="4 4"/>`;
    h += `<rect x="${TR.socketTo}" y="-24" width="${TR.wrist - TR.socketTo + 8}" height="48" rx="4" fill="url(#sd-metal)" stroke="${K.ln2}"/>`;
    h += `<line x1="-6" y1="0" x2="372" y2="0" stroke="${K.ln2}" stroke-dasharray="14 4 3 4" opacity=".9"/>`;
    const td = tdDraw(st.td, st.tdSet, c.res.x, [TR.wrist + 8, 0], [1, 0], [0, 1], 1, 'sd');
    h += td.svg;
    h += `<path d="M${P2(g.cableFrom)} L${P2(g.P)}" stroke="${K.w}" stroke-width="1.8" marker-start="url(#sd-ag)"/>`;
    h += `<path d="M${pts(g.housing)}" fill="none" stroke="#03050a" stroke-width="10" stroke-linecap="round"/>`;
    for (let i = 1; i < g.housing.length; i++) {
      const r = g.radii[Math.min(g.radii.length - 1, Math.max(0, i - 1))];
      const col = r < 30 ? K.bad : r < 60 ? K.warn : K.ok;
      h += `<line x1="${f1(g.housing[i - 1][0])}" y1="${f1(g.housing[i - 1][1])}" x2="${f1(g.housing[i][0])}" y2="${f1(g.housing[i][1])}" stroke="${col}" stroke-width="3.2" stroke-linecap="round"/>`;
    }
    h += `<path d="M${P2(g.D)} L${P2(td.lever)}" stroke="${K.w}" stroke-width="1.8"/>`;
    const toD = unit(sub(g.D, td.lever));
    h += `<path d="M${P2(td.lever)} L${P2(add(td.lever, mul(toD, 24)))}" stroke="${K.ice}" stroke-width="2" marker-end="url(#sd-ag)"/>`;
    const k = g.housing.length - 1;
    const sT: Vec = sub(g.housing[1], g.housing[0]);
    const eT: Vec = sub(g.housing[k], g.housing[k - 1]);
    const eCol = (a: number) => (a > toRad(30) ? K.bad : a > toRad(10) ? K.warn : K.ok);
    h += `<path d="${arc(g.P, 30, ang(g.inDir), ang(sT))}" fill="none" stroke="${eCol(g.entry)}" stroke-width="2"/>`;
    h += `<path d="${arc(g.D, 26, ang(eT), ang(sub(g.T, g.D)))}" fill="none" stroke="${eCol(g.exit)}" stroke-width="2"/>`;
    h += `<text class="tw" x="${f1(g.P[0] - 10)}" y="${f1(g.P[1] + 26)}" text-anchor="end">${T('θ<sub>вх</sub>')} = ${fmt0.format(toDeg(g.entry))}°</text>`;
    h += `<text class="tw" x="${f1(g.D[0] + 4)}" y="${f1(g.D[1] + 32)}" text-anchor="middle">${T('θ<sub>вих</sub>')} = ${fmt0.format(toDeg(g.exit))}°</text>`;
    const ret = (id: string, p: Vec, label: string, s: number) => `<g class="drag" data-drag="${id}" tabindex="0" role="slider" aria-label="${label}" aria-valuemin="${id === 'P' ? TR.sProx[0] : TR.sDist[0]}" aria-valuemax="${id === 'P' ? TR.sProx[1] : TR.sDist[1]}" aria-valuenow="${Math.round(s)}"><rect x="${f1(p[0] - 12)}" y="${f1(p[1] + 1)}" width="24" height="6" rx="2" fill="${K.ice}"/><rect x="${f1(p[0] - 6)}" y="${f1(p[1] - 5)}" width="12" height="9" rx="2" fill="${K.metal2}"/><circle class="ring" cx="${f1(p[0])}" cy="${f1(p[1])}" r="14" fill="rgba(141,176,255,0.10)" stroke="${K.sky}" stroke-width="1.6"/></g>`;
    h += ret('P', g.P, ui.proxRet, g.sP) + ret('D', g.D, ui.distRet, g.sD);
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
    h += tag('1', [g.sP, 84], [g.sP - (close ? 11 : 0), 96]) + tag('2', [g.sD, 84], [g.sD + (close ? 11 : 0), 96]);
    const mid = g.housing[Math.floor(g.housing.length / 2)];
    const t3: Vec = [mid[0] - 34, mid[1] - 30];
    h += tag('3', [mid[0], mid[1] - 5], t3) + `<text class="tw" x="${f1(t3[0] + 14)}" y="${f1(t3[1] + 4)}">${T('θ<sub>об</sub>')} = ${fmt0.format(toDeg(g.bend))}°</text>`;
    h += tag('4', td.lever, [246, -104]) + `<text class="tc" x="260" y="-100">${T('F<sub>вих</sub>')} = ${fmt0.format(c.res.fOut)} ${N}</text>`;
    const cf = g.cableFrom;
    const t5: Vec = [cf[0], cf[1] - 20];
    h += tag('5', [cf[0], cf[1] - 4], t5);
    h += cf[0] > 0
      ? `<text class="tc" x="${f1(t5[0] - 14)}" y="${f1(t5[1] + 4)}" text-anchor="end">${T('F<sub>вх</sub>')} = ${fmt0.format(c.res.fIn)} ${N}</text>`
      : `<text class="tc" x="${f1(t5[0] + 14)}" y="${f1(t5[1] + 4)}">${T('F<sub>вх</sub>')} = ${fmt0.format(c.res.fIn)} ${N}</text>`;
    h += `<path d="M-130 110H-80M-130 105V115M-80 105V115" stroke="${K.mu}" stroke-width="1.2"/><text class="tm" x="-105" y="101" text-anchor="middle">50 ${mm}</text>`;
    h += `<text class="tw" x="406" y="-222" text-anchor="end">μ = ${fmt3.format(c.mu)} · θ = ${fmt0.format(toDeg(g.theta))}° · η = ${fmt1.format(c.res.eta * 100)} %</text>`;
    h += titleBlock(226, -210, ui.titleBlock);
    svSide.innerHTML = h;
  }

  // ------------------------------------------------ FIG. 1 · плече: вигляд збоку, механічний лікоть і три тяги
  function drawTH(c: Calc) {
    const t = c.th!;
    const pro = st.mode === 'pro';
    const phi = c.phi, al = t.alpha, ap = phi + al;
    const S: Vec = [330, 205];
    const uh: Vec = [Math.sin(phi), Math.cos(phi)], na: Vec = [Math.cos(phi), -Math.sin(phi)];
    const uf: Vec = [Math.sin(ap), Math.cos(ap)], nf: Vec = [Math.cos(ap), -Math.sin(ap)];
    const at = (b: Vec, du: number, dn: number, u = uh, n = na): Vec => [b[0] + u[0] * du + n[0] * dn, b[1] + u[1] * du + n[1] * dn];
    const E = at(S, 172, 0);
    const Wr = at(E, 168, 0, uf, nf);
    const td = tdDraw(st.td, st.tdSet, c.res.x, at(Wr, 6, 0, uf, nf), uf, nf, 0.95, 'th');
    // межі рисунка: базове поле + ТП (поле розширюється, коли рука виходить за межі)
    const far = at(Wr, 110, 0, uf, nf);
    let x0 = Math.min(140, td.tipA[0] - 20, td.tipB[0] - 20, far[0] - 20), x1 = Math.max(760, td.tipA[0] + 20, td.tipB[0] + 20, far[0] + 20);
    let y0 = Math.min(0, td.tipA[1] - 20, td.tipB[1] - 20, far[1] - 20), y1 = Math.max(626, td.tipA[1] + 20, td.tipB[1] + 20, far[1] + 20);
    const asp = 620 / 626, ww = x1 - x0, hh = y1 - y0;
    if (ww / hh > asp) { const nh = ww / asp; y0 -= (nh - hh) / 2; y1 = y0 + nh; } else { const nw = hh * asp; x0 -= (nw - ww) / 2; x1 = x0 + nw; }
    svTh.setAttribute('viewBox', `${f1(x0)} ${f1(y0)} ${f1(x1 - x0)} ${f1(y1 - y0)}`);
    let h = `<defs>${GRAD('th')}</defs>`;
    const torso = 'M282 98 C270 120 262 150 250 178 C240 204 236 250 240 300 C244 340 254 370 252 410 C250 460 248 520 250 600 L378 600 C380 540 378 480 372 440 C366 400 384 360 388 300 C392 250 386 214 370 190 C356 168 336 148 322 104 Z';
    h += `<path d="${torso}" fill="#0c1424"/><path d="${torso}" fill="url(#th-body)" stroke="${K.ln2}" stroke-width="1.3" stroke-linejoin="round"/>`;
    h += `<ellipse cx="302" cy="52" rx="36" ry="44" fill="#0c1424" stroke="${K.ln2}" stroke-width="1.3"/><ellipse cx="302" cy="52" rx="36" ry="44" fill="url(#th-body)"/>`;
    h += `<path d="M336 46 L346 60 L336 64" fill="none" stroke="${K.ln2}" stroke-width="1.2" stroke-linejoin="round"/>`;
    h += `<text class="tm tx" x="390" y="614">${ui.front} →</text><text class="tm tx" x="240" y="614" text-anchor="end">← ${ui.back}</text>`;
    // кільце бандажа на спині та лямки
    const Rb: Vec = [256, 214];
    const lockLs = at(S, -40, 46), lockTa = at(S, -10, 36);
    const liftB = at(S, 40, -8), liftH = at(S, 138, 18);
    const tdH0: Vec = [268, 262];
    h += strap(`M${P2(Rb)} C 280 150 ${P2(at(S, -58, 0))} ${P2(at(S, -54, 20))} S ${P2(at(lockLs, -8, 0))} ${P2(lockLs)}`);
    h += strap(`M${P2(Rb)} L${P2(tdH0)}`);
    h += strap(`M${P2(Rb)} C 270 200 ${P2(at(S, 10, -46))} ${P2(at(liftB, -24, -6))}`, 5);
    h += `<circle cx="${Rb[0]}" cy="${Rb[1]}" r="8" fill="${K.ink}" stroke="${K.ice}" stroke-width="2.2"/>`;
    // плечова гільза з переднім вушком; ліктьовий модуль
    const sock = [at(S, -26, 30), at(S, 150, 24), at(S, 150, -24), at(S, -22, -32)];
    h += `<path d="M${P2(sock[0])} L${P2(sock[1])} L${P2(sock[2])} L${P2(sock[3])} Q${P2(at(S, -44, 0))} ${P2(sock[0])} Z" fill="url(#th-pros)" stroke="${K.sky}" stroke-width="1.3" stroke-linejoin="round"/>`;
    h += `<path d="M${P2(at(S, -8, 22))} L${P2(at(S, 140, 18))}" stroke="${K.ice}" stroke-opacity=".35"/>`;
    h += `<circle cx="${f1(lockTa[0])}" cy="${f1(lockTa[1])}" r="7" fill="url(#th-pros)" stroke="${K.sky}" stroke-width="1.2"/><circle cx="${f1(lockTa[0])}" cy="${f1(lockTa[1])}" r="2.4" fill="${K.ink}" stroke="${K.sky}"/>`;
    h += `<path d="M${P2(at(S, 150, 22))} L${P2(at(S, 164, 20))} L${P2(at(S, 164, -20))} L${P2(at(S, 150, -22))} Z" fill="url(#th-metal)" stroke="${K.ln2}"/>`;
    // передпліччя й ТП
    const fa = [at(E, -6, 22, uf, nf), at(E, 160, 16, uf, nf), at(E, 160, -16, uf, nf), at(E, -6, -22, uf, nf)];
    h += `<path d="M${P2(fa[0])} L${P2(fa[1])} L${P2(fa[2])} L${P2(fa[3])} Z" fill="url(#th-pros)" stroke="${K.sky}" stroke-width="1.3" stroke-linejoin="round"/>`;
    h += `<path d="M${P2(at(E, 10, 14, uf, nf))} L${P2(at(E, 150, 10, uf, nf))}" stroke="${K.ice}" stroke-opacity=".35"/>`;
    h += `<path d="M${P2(at(Wr, -8, 15, uf, nf))} L${P2(at(Wr, 6, 13, uf, nf))} L${P2(at(Wr, 6, -13, uf, nf))} L${P2(at(Wr, -8, -15, uf, nf))} Z" fill="url(#th-metal)" stroke="${K.ln2}"/>`;
    h += td.svg;
    h += `<circle cx="${f1(E[0])}" cy="${f1(E[1])}" r="17" fill="#0e1830" stroke="${K.sky}" stroke-width="1.4"/><circle cx="${f1(E[0])}" cy="${f1(E[1])}" r="4" fill="${K.ice}"/>`;
    // [3] тяга згинання: оболонка на плечовій гільзі → важіль передпліччя (плече r)
    const Lp = at(E, 0, st.rLift * 0.9, uf, nf);
    const liftW = 1.6 + 2.4 * Math.min(1, (st.locked ? 0 : t.lift.fIn) / Math.max(1, st.fMax) / 0.4);
    const liftHousing = `M${P2(liftB)} C${P2(at(S, 80, -10))} ${P2(at(S, 120, 14))} ${P2(liftH)}`;
    h += `<path d="${liftHousing}" fill="none" stroke="#03050a" stroke-width="7" stroke-linecap="round"/><path d="${liftHousing}" fill="none" stroke="${K.lift}" stroke-width="2"/>`;
    h += `<path d="M${P2(liftH)} L${P2(Lp)}" stroke="${K.lift}" stroke-width="${f1(liftW)}"/>`;
    h += `<path d="M${P2(E)} L${P2(Lp)}" stroke="${K.lift}" stroke-width="3" stroke-linecap="round" opacity=".8"/><circle cx="${f1(Lp[0])}" cy="${f1(Lp[1])}" r="3.2" fill="${K.ink}" stroke="${K.lift}" stroke-width="1.4"/>`;
    h += `<path d="M${P2(at(liftB, -24, -6))} L${P2(liftB)}" stroke="${K.lift}" stroke-width="1.6"/>`;
    // [4] тяга блокування (передня): лямка → переднє вушко гільзи → оболонка → замок ліктя
    const lockL = at(E, -12, 16);
    const lockW = 1.6 + (st.lockMove / 100) * 2.4;
    const lockHousing = `M${P2(lockTa)} C${P2(at(S, 40, 34))} ${P2(at(S, 110, 30))} ${P2(lockL)}`;
    h += `<path d="M${P2(lockLs)} L${P2(lockTa)}" stroke="${K.lock}" stroke-width="${f1(lockW)}"/>`;
    h += `<path d="${lockHousing}" fill="none" stroke="#03050a" stroke-width="7" stroke-linecap="round"/><path d="${lockHousing}" fill="none" stroke="${K.lock}" stroke-width="2"/>`;
    // [5] тяга ТП (задня): оболонка від бандажа на спині, повз лікоть, уздовж передпліччя
    const q1 = at(S, 90, -30), q2 = at(E, 0, -26), q3 = at(E, 44, -22, uf, nf), rf = at(E, 126, -20, uf, nf);
    const tdPath = `M${P2(tdH0)} C${P2([tdH0[0] + 20, tdH0[1] + 30])} ${P2(at(q1, -40, 0))} ${P2(q1)} L${P2(q2)} C${P2(at(q2, 22, 0))} ${P2(at(q3, -22, 0, uf, nf))} ${P2(q3)} L${P2(rf)}`;
    const tdW = 1.6 + 2.4 * Math.min(1, c.res.fIn / Math.max(1, st.fMax) / 0.4);
    h += `<path d="${tdPath}" fill="none" stroke="#03050a" stroke-width="8" stroke-linecap="round"/><path d="${tdPath}" fill="none" stroke="${K.tdc}" stroke-width="2.2"/>`;
    h += `<path d="M${P2(rf)} L${P2(td.lever)}" stroke="${K.tdc}" stroke-width="${f1(tdW)}"/>`;
    h += `<rect x="${f1(rf[0] - 5)}" y="${f1(rf[1] - 5)}" width="10" height="10" rx="2" fill="${K.ice}" transform="rotate(${f1(toDeg(-ap))} ${f1(rf[0])} ${f1(rf[1])})"/>`;
    // кути α і φ
    h += `<path d="${arc(E, 34, ang(uh), ang(uf))}" fill="none" stroke="${K.ice}" stroke-width="1.4"/>`;
    const bis = unit(add(uh, uf));
    h += `<text class="tw" x="${f1(E[0] + bis[0] * 54 + 4)}" y="${f1(E[1] + bis[1] * 54 + 4)}">α = ${fmt0.format(toDeg(al))}°</text>`;
    h += `<path d="M${P2(S)} L${P2([S[0], S[1] + 70])}" stroke="${K.mu}" stroke-dasharray="3 4"/>`;
    if (st.gh > 2) h += `<path d="${arc(S, 58, Math.PI / 2, ang(uh))}" fill="none" stroke="${K.sky}" stroke-width="1.2"/><text class="tc" x="${f1(S[0] + 18)}" y="${f1(S[1] + 84)}">φ = ${fmt0.format(st.gh)}°</text>`;
    // бейдж замка
    const lk = st.locked;
    const bw = lang === 'uk' ? 120 : 92, bx = x1 - 16 - bw, by = y0 + (pro ? 38 : 12);
    h += `<g><rect x="${f1(bx)}" y="${f1(by)}" width="${bw}" height="22" rx="11" fill="${lk ? 'rgba(199,155,255,0.16)' : 'rgba(95,212,196,0.14)'}" stroke="${lk ? K.lock : K.tdc}"/>`;
    h += `<path d="M${f1(bx + 12)} ${f1(by + 10)} v-3 a4 4 0 0 1 8 0 ${lk ? 'v3' : 'v-1'}" fill="none" stroke="${lk ? K.lock : K.tdc}" stroke-width="1.4"/><rect x="${f1(bx + 10)}" y="${f1(by + 10)}" width="12" height="7" rx="1.5" fill="${lk ? K.lock : K.tdc}"/>`;
    h += `<text class="badge" x="${f1(bx + 28)}" y="${f1(by + 15)}" fill="${lk ? '#e4d4ff' : '#c9f1ea'}">${(lk ? ui.lockOn : ui.lockOff).toUpperCase()}</text></g>`;
    // позначки
    h += tag('1', lockTa, at(lockTa, -30, 34));
    h += tag('2', at(E, 0, -12), at(E, 22, -58));
    const t3 = at(lerp(liftH, Lp, 0.5), -6, 44);
    h += tag('3', lerp(liftH, Lp, 0.5), t3, K.lift);
    h += tag('4', at(S, 70, 32), at(S, 70, 68), K.lock);
    const t5 = at(q1, 0, -40);
    h += tag('5', q1, t5, K.tdc);
    const tdMid = lerp(td.tipA, td.tipB, 0.5);
    h += tag('6', tdMid, at(tdMid, 26, 34, uf, nf));
    if (pro) {
      h += `<text class="tc tx" x="${f1(t3[0] + 14)}" y="${f1(t3[1] + 4)}">${T('F<sub>зг</sub>')} = ${st.locked ? '—' : fmt0.format(t.lift.fIn)} ${N}</text>`;
      h += `<text class="tc tx" x="${f1(t5[0] - 12)}" y="${f1(t5[1] + 28)}">${T('F<sub>вх</sub>')} = ${fmt0.format(c.res.fIn)} ${N}</text>`;
      h += `<text class="tc tx" x="${f1(q2[0] - 18)}" y="${f1(q2[1] + 4)}" text-anchor="end">${T('θ<sub>ТП</sub>')} = ${fmt0.format(st.thetaBack)}° + ${fmt0.format(toDeg(al))}°</text>`;
      const t4 = at(S, 70, 68);
      h += `<text class="tc tx" x="${f1(t4[0] + 14)}" y="${f1(t4[1] + 4)}">${T('ΔL<sub>бл</sub>')} = ${fmt0.format(t.lockExc)} / ${TH.lockExc} ${mm}</text>`;
      h += `<text class="tw" x="${f1(x1 - 14)}" y="${f1(y0 + 24)}" text-anchor="end">μ = ${fmt3.format(c.mu)} · ${T('θ<sub>ТП</sub>')} = ${fmt0.format(toDeg(c.theta))}° · η = ${fmt1.format(c.res.eta * 100)} %</text>`;
      h += titleBlock(x1 - 194, y1 - 80, ui.titleBlockTH);
    }
    svTh.innerHTML = h;
  }

  // ------------------------------------------------ FIG. 3 · точка перехрещення бандажа
  function drawCross(c: Calc) {
    const C7: Vec = [120, 40];
    const R: Vec = [C7[0] + st.cx * CROSS_S, C7[1] + st.cy * CROSS_S];
    const O: Vec = [C7[0] + CROSS_OPT[0] * CROSS_S, C7[1] + CROSS_OPT[1] * CROSS_S];
    let h = `<defs>${GRAD('cr')}</defs>`;
    const back = 'M100 18 C96 30 64 34 38 46 C26 52 24 68 26 86 L32 196 L208 196 L214 86 C216 68 214 52 202 46 C176 34 144 30 140 18';
    h += `<path d="${back}" fill="#0c1424"/><path d="${back}" fill="url(#cr-body)" stroke="${K.ln2}"/>`;
    h += `<line x1="120" y1="22" x2="120" y2="196" stroke="${K.ln2}" stroke-dasharray="8 3 2 3"/>`;
    h += `<circle cx="${f1(O[0])}" cy="${f1(O[1])}" r="${f1(35 * CROSS_S)}" fill="none" stroke="${K.warn}" stroke-dasharray="3 3" opacity=".6"/>`;
    h += `<circle cx="${f1(O[0])}" cy="${f1(O[1])}" r="${f1(15 * CROSS_S)}" fill="rgba(69,192,138,0.10)" stroke="${K.ok}" stroke-dasharray="3 3"/>`;
    h += `<path d="M${f1(O[0] - 4)} ${f1(O[1])}H${f1(O[0] + 4)}M${f1(O[0])} ${f1(O[1] - 4)}V${f1(O[1] + 4)}" stroke="${K.ok}"/>`;
    h += `<ellipse cx="46" cy="66" rx="16" ry="22" transform="rotate(-18 46 66)" fill="none" stroke="${K.strap}" stroke-width="6"/>`;
    h += `<path d="M56 50 L${P2(R)} M60 80 L${P2(R)} M${P2(R)} L206 102" stroke="${K.strap}" stroke-width="6" stroke-linecap="round"/>`;
    h += `<circle cx="${C7[0]}" cy="${C7[1]}" r="3" fill="${K.w}"/><text class="t" x="126" y="34">${ui.c7}</text>`;
    h += `<g class="drag" data-drag="X" tabindex="0" role="slider" aria-label="${ui.cross} [A]" aria-valuetext="${fmt0.format(st.cx)} / ${fmt0.format(st.cy)} ${mm}"><circle cx="${f1(R[0])}" cy="${f1(R[1])}" r="15" fill="transparent"/><circle class="ring" cx="${f1(R[0])}" cy="${f1(R[1])}" r="9" fill="${K.ink}" stroke="${K.ice}" stroke-width="2.4"/><circle cx="${f1(R[0])}" cy="${f1(R[1])}" r="2.4" fill="${K.sky}"/></g>`;
    h += tag('A', [R[0] - 7, R[1] - 7], [R[0] - 26, R[1] - 24]);
    h += `<text class="tw" x="292" y="18" text-anchor="end">k = ${fmt2.format(c.k)}</text>`;
    h += `<text class="t" x="292" y="34" text-anchor="end">(${fmt0.format(st.cx)}; ${fmt0.format(st.cy)}) ${mm}</text>`;
    h += `<text class="tm" x="8" y="198">${ui.sound}</text><text class="tm" x="292" y="198" text-anchor="end">${ui.prosthetic}</text>`;
    svCross.innerHTML = h;
  }

  // ------------------------------------------------ FIG. 4 · графік
  function axes(X0: number, X1: number, Y0: number, Y1: number, xt: [number, string][], yt: [number, string][], xl: string, yl: string, skipX: number, skipY: number) {
    let h = '';
    for (const [x, l] of xt) h += `<line x1="${f1(x)}" y1="${Y0}" x2="${f1(x)}" y2="${Y1}" stroke="#1a2440"/>${Math.abs(x - skipX) < 34 ? '' : `<text class="t" x="${f1(x)}" y="${Y1 + 16}" text-anchor="middle">${l}</text>`}`;
    for (const [y, l] of yt) h += `<line x1="${X0}" y1="${f1(y)}" x2="${X1}" y2="${f1(y)}" stroke="#1a2440"/>${Math.abs(y - skipY) < 14 ? '' : `<text class="t" x="${X0 - 8}" y="${f1(y + 4)}" text-anchor="end">${l}</text>`}`;
    h += `<path d="M${X0} ${Y0}V${Y1}H${X1}" fill="none" stroke="${K.ln2}"/>`;
    h += `<text class="tm" x="${X1}" y="${Y1 + 34}" text-anchor="end">${xl}</text><text class="tm" x="${X0 + 8}" y="${Y0 - 6}">${yl}</text>`;
    return h;
  }
  function marker(px: number, py: number, X0: number, Y1: number, xl: string, yl: string) {
    let h = `<path d="M${f1(px)} ${Y1}V${f1(py)}H${X0}" fill="none" stroke="${K.w}" stroke-dasharray="3 3" opacity=".5"/>`;
    h += `<circle cx="${f1(px)}" cy="${f1(py)}" r="7" fill="${K.ink}" stroke="${K.ice}" stroke-width="2"/><circle cx="${f1(px)}" cy="${f1(py)}" r="2.4" fill="${K.sky}"/>`;
    h += `<g class="tg"><rect x="${f1(px - 22)}" y="${Y1 + 3}" width="44" height="16" rx="8" fill="${K.blue}"/><text class="tag" x="${f1(px)}" y="${Y1 + 14.5}" text-anchor="middle">${xl}</text></g>`;
    h += `<g class="tg"><rect x="${X0 - 52}" y="${f1(py - 8)}" width="48" height="16" rx="8" fill="${K.blue}"/><text class="tag" x="${X0 - 28}" y="${f1(py + 3.5)}" text-anchor="middle">${yl}</text></g>`;
    return h;
  }
  function drawChart(c: Calc) {
    const X0 = 60, X1 = 700, Y0 = 20, Y1 = 172;
    let h = `<defs><linearGradient id="ch-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${K.azure}" stop-opacity=".28"/><stop offset="1" stop-color="${K.azure}" stop-opacity="0"/></linearGradient></defs>`;
    if (c.level === 'tr') {
      const x = (deg: number) => X0 + ((X1 - X0) * deg) / 360;
      const y = (eta: number) => Y1 - (Y1 - Y0) * eta;
      const th = Math.min(360, toDeg(c.theta));
      h += axes(X0, X1, Y0, Y1, [0, 90, 180, 270, 360].map((d) => [x(d), String(d)] as [number, string]), [0, 0.25, 0.5, 0.75, 1].map((e) => [y(e), String(e * 100)] as [number, string]), ui.chartX, ui.chartY, x(th), y(c.res.eta));
      const curve = (mu: number) => { const p: Vec[] = []; for (let d = 0; d <= 360; d += 4) p.push([x(d), y(efficiency(mu, toRad(d)))]); return p; };
      const refMu = c.mu === MU_PTFE ? MU_UNLINED : MU_PTFE;
      const cur = curve(c.mu);
      h += `<path d="M${pts(cur)} L${X1} ${Y1} L${X0} ${Y1} Z" fill="url(#ch-fill)"/>`;
      h += `<polyline points="${pts(curve(refMu))}" fill="none" stroke="${K.mu}" stroke-width="1.5" stroke-dasharray="6 4"/>`;
      h += `<polyline points="${pts(cur)}" fill="none" stroke="${K.sky}" stroke-width="2.4"/>`;
      h += `<text class="tm" x="${x(318)}" y="${y(efficiency(refMu, toRad(318))) - 8}" text-anchor="middle">μ = ${fmt3.format(refMu)}</text>`;
      h += `<text class="tc" x="${x(250)}" y="${y(efficiency(c.mu, toRad(250))) + 18}" text-anchor="middle">μ = ${fmt3.format(c.mu)}</text>`;
      if (snap) { const sx = x(Math.min(360, toDeg(snap.theta))), sy = y(snap.eta); h += `<circle cx="${f1(sx)}" cy="${f1(sy)}" r="6" fill="none" stroke="${K.warn}" stroke-width="2"/><text class="t" x="${f1(sx + 9)}" y="${f1(sy + 17)}">${ui.before}</text>`; }
      const px = x(th), py = y(c.res.eta);
      h += marker(px, py, X0, Y1, `${fmt0.format(th)}°`, fmt1.format(c.res.eta * 100));
      h += `<text class="tw" x="${f1(Math.min(px + 12, X1 - 150))}" y="${f1(py - 12)}">${ui.chartNow}: η = ${fmt1.format(c.res.eta * 100)} %</text>`;
    } else {
      const t = c.th!;
      const aMax = TH.alphaMax;
      const f = (aDeg: number) => (t.eLift * elbowMoment({ phi: c.phi, alpha: toRad(aDeg), mForearm: st.mForearm, mTD: t.mTD, comp: st.comp / 100 })) / st.rLift;
      const vals: number[] = []; for (let a = 0; a <= aMax; a += 3) vals.push(f(a));
      const fTop = Math.max(...vals, FATIGUE_SHARE * st.fMax) * 1.25;
      const x = (a: number) => X0 + ((X1 - X0) * a) / aMax;
      const y = (v: number) => Y1 - (Y1 - Y0) * Math.min(1.05, v / fTop);
      const aNow = toDeg(t.alpha);
      const step = fTop > 200 ? 50 : fTop > 80 ? 20 : 10;
      const yt: [number, string][] = []; for (let v = 0; v <= fTop; v += step) yt.push([y(v), String(v)]);
      h += axes(X0, X1, Y0, Y1, [0, 45, 90, 135].map((a) => [x(a), String(a)] as [number, string]), yt, ui.chartXTH, ui.chartYTH, x(aNow), y(f(aNow)));
      const cur: Vec[] = []; for (let a = 0; a <= aMax; a += 3) cur.push([x(a), y(f(a))]);
      h += `<path d="M${pts(cur)} L${X1} ${Y1} L${X0} ${Y1} Z" fill="url(#ch-fill)"/><polyline points="${pts(cur)}" fill="none" stroke="${K.lift}" stroke-width="2.4"/>`;
      const lim = FATIGUE_SHARE * st.fMax;
      h += `<line x1="${X0}" y1="${f1(y(lim))}" x2="${X1}" y2="${f1(y(lim))}" stroke="${K.warn}" stroke-dasharray="6 4"/><text class="t" x="${X1 - 4}" y="${f1(y(lim) - 6)}" text-anchor="end">${lang === 'uk' ? '0,2' : '0.2'} · ${T('F<sub>max</sub>')}</text>`;
      if (st.fMax <= fTop) h += `<line x1="${X0}" y1="${f1(y(st.fMax))}" x2="${X1}" y2="${f1(y(st.fMax))}" stroke="${K.bad}" stroke-dasharray="6 4"/><text class="t" x="${X1 - 4}" y="${f1(y(st.fMax) - 6)}" text-anchor="end">${T('F<sub>max</sub>')}</text>`;
      h += marker(x(aNow), y(f(aNow)), X0, Y1, `${fmt0.format(aNow)}°`, fmt0.format(f(aNow)));
      h += `<text class="tw" x="${f1(Math.min(x(aNow) + 12, X1 - 220))}" y="${f1(y(f(aNow)) - 12)}">${st.locked ? `${ui.lockOn} · ` : ''}${T('F<sub>зг</sub>')} = ${fmt0.format(f(aNow))} ${N}</text>`;
    }
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
    const td = c.td;
    set('tdmass', `${fmt0.format(td.mass)} ${ui.g}`);
    set('tdpinch', `${trim0(td.pinch20)} ${N}`);
    set('tdopen', `${trim0(td.open)} ${mm}`);
    set('tdffull', `${fmt0.format(td.fFull)} ${N}`);
    set('open', `${fmt0.format(r.width)} ${mm} <small>${fmt0.format(r.x * 100)} %</small>`);
    set('exc', `${fmt0.format(r.e)} <small>/ ${trim0(td.eFull)} ${mm}</small>`);
    out('excbar')!.style.width = `${(r.x * 100).toFixed(1)}%`;
    set('fout', F(r.fOut));
    set('fin', F(r.fIn));
    set('theta', `${fmt0.format(toDeg(c.theta))}°`);
    set('eta', `${fmt1.format(r.eta * 100)} % <small>${ui.loss} ${fmt1.format((1 - r.eta) * 100)} %</small>`);
    set('finfull', F(r.fInFull));
    const lim = FATIGUE_SHARE * st.fMax;
    set('flim', F(lim));
    set('kcap', fmt2.format(c.k));
    if (c.level === 'tr') {
      const g = c.geo!;
      set('thparts', sym(lang, ui.thetaParts(fmt0.format(toDeg(g.entry)), fmt0.format(toDeg(g.bend)), fmt0.format(toDeg(g.exit)))));
      set('bodyneed', `${fmt0.format(r.excNeededBody)} <small>${ui.of} ${fmt0.format(c.rawMax)} ${mm}</small>`);
    } else {
      const t = c.th!;
      set('thparts', sym(lang, ui.thetaPartsTH(fmt0.format(st.thetaBack), fmt0.format(toDeg(t.alpha)))));
      set('alpha', `${fmt0.format(toDeg(t.alpha))}°`);
      set('flift', st.locked ? `— <small>${ui.lockOn}</small>` : F(t.lift.fIn));
      set('mel', `${fmt2.format(t.moment / 1000)} ${ui.Nm}`);
      set('lockexc', `${fmt0.format(t.lockExc)} <small>/ ${TH.lockExc} ${mm}</small>`);
      const ls = out('lockstate')!;
      ls.textContent = st.locked ? ui.lockOn : ui.lockOff;
      ls.className = `lockstate ${st.locked ? 'is-locked' : 'is-free'}`;
      const el = out('elstatus')!;
      if (st.locked) { el.className = 'status status-el s-info'; el.textContent = `${ui.stElbowLocked} ${fmt0.format(st.lockAlpha)}°.`; }
      else if (t.lift.limit === 'force') { el.className = 'status status-el s-part'; el.textContent = ui.stElbowForce; }
      else { el.className = 'status status-el s-info'; el.textContent = `${ui.alpha}: ${fmt0.format(toDeg(t.alpha))}° · ${ui.lockOff}`; }
    }
    const share = r.fInFull / st.fMax;
    const bar = out('loadbar')!;
    bar.style.width = `${Math.min(100, share * 100).toFixed(1)}%`;
    bar.className = share > 1 ? 'l-max' : share > FATIGUE_SHARE ? 'l-tired' : '';
    set('loadtxt', `${fmt0.format(share * 100)} % · ${share > 1 ? ui.loadMax : share > FATIGUE_SHARE ? ui.loadTired : ui.loadOk}`);
    set('loadnote', sym(lang, ui.loadNote(st.fMax)));
    const flags: [string, string][] = [];
    const loss = 1 - r.eta;
    if (loss > 0.25) flags.push([loss > 0.4 ? 'f-bad' : '', ui.fLoss(fmt0.format(loss * 100))]);
    if (c.level === 'tr') {
      const g = c.geo!;
      if (toDeg(g.entry) > 30) flags.push(['', ui.fEntry(fmt0.format(toDeg(g.entry)))]);
      if (g.minRadius < 30) flags.push(['f-info', ui.fSharp(fmt0.format(g.minRadius))]);
    }
    if (r.fInFull > st.fMax) flags.push(['f-bad', ui.fOver(fmt0.format(r.fInFull), fmt0.format(st.fMax))]);
    else if (r.fInFull > lim) flags.push(['', ui.fFatigue(fmt0.format(r.fInFull), fmt0.format(lim))]);
    if (r.excNeededBody > c.rawMax) flags.push(['f-bad', c.level === 'tr' ? ui.fExc(fmt0.format(r.excNeededBody), fmt0.format(c.rawMax)) : ui.fExcTH(fmt0.format(r.excNeededBody), fmt0.format(c.rawMax))]);
    if (c.level === 'th') {
      const t = c.th!;
      if (toDeg(t.alpha) > 20) flags.push(['f-info', ui.fWrap(fmt0.format(toDeg(t.alpha)), fmt1.format(r.eta * 100), fmt1.format(t.eta0 * 100))]);
      if (t.fHoriz > st.fMax) flags.push(['f-bad', ui.fLiftForce(fmt0.format(t.fHoriz), fmt0.format(st.fMax))]);
      else if (t.fHoriz > lim) flags.push(['', ui.fLiftFatigue(fmt0.format(t.fHoriz), fmt0.format(lim))]);
    }
    if (st.td === 'hand') flags.push(['f-info', ui.fHand]);
    const dCross = Math.hypot(st.cx - CROSS_OPT[0], st.cy - CROSS_OPT[1]);
    if (st.cx < -50) flags.push(['f-info', ui.fCrossSound]);
    else if (dCross > 35) flags.push(['f-info', ui.fCrossOff]);
    set('flags', flags.length ? flags.map(([c2, t]) => `<li class="${c2}">${sym(lang, t)}</li>`).join('') : `<li class="f-ok">${ui.flagsNone}</li>`);
    const cmp = out('cmp')!;
    if (snap) {
      cmp.hidden = false;
      cmp.innerHTML = `${ui.before} → ${ui.after}<br>θ ${fmt0.format(toDeg(snap.theta))}° → ${fmt0.format(toDeg(c.theta))}°<br>η ${fmt1.format(snap.eta * 100)} % → ${fmt1.format(r.eta * 100)} %<br>${sym(lang, ui.finFull)}: ${fmt0.format(snap.fInFull)} → ${fmt0.format(r.fInFull)} ${N}<br>${ui.opening}: ${fmt0.format(snap.x * 100)} → ${fmt0.format(r.x * 100)} %`;
    } else cmp.hidden = true;
  }

  function render() {
    raf = 0;
    const c = compute(st);
    if (c.th) lastAlpha = c.th.alpha;
    setOutputs();
    hud(c);
    drawHook(c);
    if (c.level === 'tr') {
      if (st.mode === 'patient') drawBack(c);
      else drawSide(c);
    } else drawTH(c);
    if (st.mode === 'pro') { drawCross(c); drawChart(c); }
    writeUrl(st);
  }
  function schedule() { if (!raf) raf = requestAnimationFrame(render); }

  syncControls();
  syncSnap();
  render();
}
