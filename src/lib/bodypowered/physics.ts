// Симулятор тягової системи протеза верхньої кінцівки — фізичне ядро.
// Чисті функції без залежностей від інтерфейсу: їх перевіряють тести scripts/tests/bodypowered.test.mjs
// (node --experimental-strip-types --test). Одиниці: мм, Н, радіани (якщо не сказано інше).
//
// Що виміряно, а що умовно, — див. PARAMS у content.ts і розділ «Модель» на сторінці інструмента.

export type Vec = [number, number];

/** Коефіцієнти тертя пари «трос + оболонка». */
export const MU_PTFE = 0.092; // 1/16" сталевий трос у посиленій оболонці з PTFE-лайнером — значення, наведене в Hichert et al. 2017
export const MU_UNLINED = 0.25; // ДЕМОНСТРАЦІЙНЕ значення: опублікованого вимірювання для оболонки без лайнера не знайдено

/** ККД передачі за рівнянням Ейлера — Ейтельвейна: η = e^(−μθ). */
export function efficiency(mu: number, theta: number): number {
  return Math.exp(-mu * theta);
}

/** Зусилля на виході оболонки: F_вих = max(0, F_вх·e^(−μθ) − F₀). */
export function outputForce(fin: number, mu: number, theta: number, f0 = 0): number {
  return Math.max(0, fin * Math.exp(-mu * theta) - f0);
}

/** Зусилля, яке треба прикласти на вході, щоб отримати F_вих на виході. */
export function inputForceFor(fout: number, mu: number, theta: number, f0 = 0): number {
  return (fout + f0) * Math.exp(mu * theta);
}

export const toRad = (d: number) => (d * Math.PI) / 180;
export const toDeg = (r: number) => (r * 180) / Math.PI;

/** Беззнаковий кут між двома векторами, 0…π. */
export function angleBetween(a: Vec, b: Vec): number {
  const la = Math.hypot(a[0], a[1]);
  const lb = Math.hypot(b[0], b[1]);
  if (la === 0 || lb === 0) return 0;
  const c = (a[0] * b[0] + a[1] * b[1]) / (la * lb);
  return Math.acos(Math.max(-1, Math.min(1, c)));
}

/** Сумарний кут повороту дотичної ламаної: θ = Σ|Δα| (накопичена зміна напрямку). */
export function turningAngle(pts: Vec[]): number {
  let sum = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const a: Vec = [pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]];
    const b: Vec = [pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]];
    sum += angleBetween(a, b);
  }
  return sum;
}

/** Точки кубічної кривої Безьє. */
export function bezier(p0: Vec, p1: Vec, p2: Vec, p3: Vec, n = 48): Vec[] {
  const out: Vec[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
    out.push([a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]]);
  }
  return out;
}

// ---------------------------------------------------------------- хід троса

/** Орієнтовні можливості тіла (здорові дорослі; у користувачів протезів може бути менше).
 *  Згинання плеча: 5,3 ± 1,0 см (Taylor 1954, цит. за Hichert et al. 2014) — виміряно.
 *  Двобічне відведення лопаток: 35 мм — УМОВНО. Надійного виміру не знайдено; у Spaulding (Upper Limb
 *  Prosthetics: Techniques) для протракції вказано «1.6”», але в тій самій таблиці згинання плеча — «5.3”»,
 *  що збігається з 5,3 см у Taylor, тож одиниці, ймовірно, переплутано. */
export const BODY = { ghMax: 53, ghMaxDeg: 90, scapMax: 35 };

/** Хід, який створює тіло, мм: лінійна умовна залежність від частки руху. */
export function bodyExcursion(scapFrac: number, ghDeg: number): number {
  const s = Math.max(0, Math.min(1, scapFrac));
  const g = Math.max(0, Math.min(BODY.ghMaxDeg, ghDeg)) / BODY.ghMaxDeg;
  return s * BODY.scapMax + g * BODY.ghMax;
}

/** Оптимальна точка перехрещення плечового бандажа відносно остистого відростка C7, мм:
 *  трохи нижче C7 і трохи в бік здорової кінцівки (x < 0 — здоровий бік, y > 0 — нижче). */
export const CROSS_OPT: Vec = [-15, 20];

/** Коефіцієнт «уловлювання» ходу бандажем, 0,6–1,0 — УМОВНА модель:
 *  спадає лінійно з відстанню від оптимальної точки перехрещення (60 мм → мінімум). */
export function harnessCapture(cross: Vec): number {
  const d = Math.hypot(cross[0] - CROSS_OPT[0], cross[1] - CROSS_OPT[1]);
  return 1 - 0.4 * Math.min(1, d / 60);
}

// ---------------------------------------------------------------- термінальні пристрої з довільним відкриттям (VO)

/** Характеристика VO-пристрою за стендовими вимірюваннями Smit et al. 2012 (JRRD 49(4):523–534, табл. 1–2):
 *  хід троса й зусилля активації для повного відкриття (тест 1) і для відкриття пальців на 50 мм (тест 2),
 *  максимальне розкриття, сила захвату при ширині предмета 20 мм, маса. Назви виробів на сторінці не наводяться. */
export interface TDCurve {
  eFull: number; // хід троса для повного відкриття, мм
  fFull: number; // зусилля активації для повного відкриття, Н
  e50: number; // хід троса для відкриття на 50 мм, мм
  f50: number; // зусилля активації для відкриття на 50 мм, Н
  open: number; // максимальне розкриття, мм
  pinch20: number; // сила захвату предмета шириною 20 мм, Н
  mass: number; // маса, г
}
export type TDKind = 'spring' | 'split' | 'hand';
/** spring — гак із пружиною, 2 рівні зусилля; split — розщеплений гак з 1–3 гумками;
 *  hand — узагальнена кисть VO в косметичній рукавичці: медіана чотирьох кистей у рукавичці з Smit et al. 2012. */
export const TD_DATA: Record<TDKind, TDCurve[]> = {
  spring: [
    { eFull: 35, fFull: 36, e50: 27, f50: 32, open: 67, pinch20: 11, mass: 223 },
    { eFull: 35, fFull: 101, e50: 27, f50: 94, open: 67, pinch20: 31, mass: 223 },
  ],
  split: [
    { eFull: 45, fFull: 48, e50: 24, f50: 25, open: 88, pinch20: 9, mass: 87 },
    { eFull: 46, fFull: 72, e50: 25, f50: 50, open: 88, pinch20: 19, mass: 90 },
    { eFull: 46, fFull: 95, e50: 25, f50: 71, open: 88, pinch20: 29, mass: 92 },
  ],
  hand: [{ eFull: 41.5, fFull: 142, e50: 34.5, f50: 80, open: 72.5, pinch20: 10.5, mass: 422 }],
};
export function tdCurve(kind: TDKind, setting: number): TDCurve {
  const list = TD_DATA[kind];
  return list[Math.max(0, Math.min(list.length - 1, Math.round(setting) - 1))];
}

/** Зусилля на початку відкриття (попереднє натягнення), Н: продовження прямої через дві виміряні точки до ходу 0,
 *  обмежене [0; f50]. Двоточкова лінійна апроксимація — допущення моделі. */
export function tdPreload(d: TDCurve): number {
  const slope = (d.fFull - d.f50) / (d.eFull - d.e50);
  return Math.max(0, Math.min(d.f50, d.f50 - slope * d.e50));
}
/** Зусилля активації на важелі ТП за ходу e (кусково-лінійно: 0 → e50 → eFull). */
export function tdForce(d: TDCurve, e: number): number {
  const f0 = tdPreload(d);
  if (e <= 0) return f0;
  if (e <= d.e50) return f0 + ((d.f50 - f0) * e) / d.e50;
  if (e <= d.eFull) return d.f50 + ((d.fFull - d.f50) * (e - d.e50)) / (d.eFull - d.e50);
  return d.fFull;
}
/** Розкриття пальців, мм, за ходу e (кусково-лінійно: 0 → 50 мм → максимум). */
export function tdWidth(d: TDCurve, e: number): number {
  if (e <= 0) return 0;
  if (e <= d.e50) return (50 * e) / d.e50;
  if (e <= d.eFull) return 50 + ((d.open - 50) * (e - d.e50)) / (d.eFull - d.e50);
  return d.open;
}

/** Податливість бандажа та м'яких тканин, мм/Н — УМОВНЕ значення: частина ходу «з'їдається» розтягом строп. */
export const COMPLIANCE = 0.08;

/** Межа роботи без утоми: 20 % від максимального зусилля користувача (Hichert et al. 2018). */
export const FATIGUE_SHARE = 0.2;

export interface OpeningInput {
  raw: number; // хід, створений тілом, мм
  k: number; // коефіцієнт передачі ходу бандажем
  mu: number;
  theta: number; // рад
  td: TDCurve;
  fMax: number; // максимальне зусилля користувача на тросі, Н
  compliance?: number;
}

export interface OpeningResult {
  x: number; // частка повного ходу ТП 0…1
  e: number; // хід троса на ТП, мм
  width: number; // розкриття пальців, мм
  limit: 'full' | 'excursion' | 'force';
  fOut: number; // зусилля на важелі ТП, Н
  fIn: number; // зусилля, яке створює тіло, Н
  eta: number;
  fInFull: number; // зусилля тіла для повного відкриття, Н
  excAtHook: number; // = e
  excNeededBody: number; // хід тіла, потрібний для повного відкриття, мм
  fatigueRatio: number; // fInFull / (20 % fMax)
}

function bisect(f: (v: number) => number, lo: number, hi: number, n = 60) {
  for (let i = 0; i < n; i++) { const m = (lo + hi) / 2; if (f(m) > 0) hi = m; else lo = m; }
  return (lo + hi) / 2;
}

/** Розв'язок рівноваги: тіло тягне на k·raw мм, частина ходу йде на розтяг бандажа (c·F_вх),
 *  решта відкриває ТП; зусилля обмежене максимумом користувача. */
export function solveOpening(p: OpeningInput): OpeningResult {
  const c = p.compliance ?? COMPLIANCE;
  const E = Math.exp(p.mu * p.theta);
  const d = p.td;
  const captured = p.k * Math.max(0, p.raw);
  // обмеження ходом: e + c·E·F(e) = k·raw
  const gExc = (e: number) => e + c * E * tdForce(d, e) - captured;
  const eExc = gExc(d.eFull) <= 0 ? d.eFull : gExc(0) >= 0 ? 0 : bisect(gExc, 0, d.eFull);
  // обмеження силою: E·F(e) ≤ F_max
  const gF = (e: number) => E * tdForce(d, e) - p.fMax;
  const eF = gF(d.eFull) <= 0 ? d.eFull : gF(0) >= 0 ? 0 : bisect(gF, 0, d.eFull);
  const e = Math.min(eExc, eF);
  const limit: OpeningResult['limit'] = e >= d.eFull - 1e-9 ? 'full' : eExc <= eF ? 'excursion' : 'force';
  const f0 = tdPreload(d);
  const fOut = e > 1e-9 ? tdForce(d, e) : Math.min(f0, captured / (c * E), p.fMax / E); // ще не відкрився: трос лише натягнутий
  const fInFull = E * d.fFull;
  return {
    x: e / d.eFull, e, width: tdWidth(d, e), limit, fOut, fIn: E * fOut, eta: 1 / E, fInFull,
    excAtHook: e,
    excNeededBody: (d.eFull + c * fInFull) / p.k,
    fatigueRatio: fInFull / (FATIGUE_SHARE * p.fMax),
  };
}

// ---------------------------------------------------------------- рівень плеча: механічний лікоть, потрійне керування
// Три окремі тяги (Spaulding, UW Pressbooks, «Transhumeral Suspension and Control», варіант triple control):
//  • тяга згинання ліктя — згинання плеча (кукси) тягне трос, закріплений на важелі передпліччя;
//  • тяга блокування (передня) — депресія + розгинання + відведення плеча; замок змінює стан за циклом «потягнути — відпустити»;
//  • тяга ТП (задня) — двобічне відведення лопаток; оболонка проходить повз лікоть, тож кут оболонки зростає на кут згинання.

export const G = 9.81;
export const TH = {
  forearm: 300, // мм, вісь ліктя → зап'ястя (УМОВНО, типовий порядок величини)
  comShare: 0.45, // центр мас передпліччя, частка довжини (УМОВНО)
  tdArm: 60, // мм від зап'ястя до центру мас ТП (УМОВНО)
  alphaMax: 135, // °, діапазон згинання ліктя (УМОВНО)
  rLift: [15, 40] as Vec, // мм, плече сили тяги згинання (за замовчуванням 25)
  rLiftDefault: 25,
  thetaLift: 30, // °, кут оболонки тяги згинання на плечовій гільзі (УМОВНО)
  thetaLock: 20, // °, кут оболонки тяги блокування (УМОВНО)
  lockExc: 15, // мм, хід для спрацювання замка (0,6 дюйма, UW)
  lockForce: 13.5, // Н, середина діапазону 2–4 фунти (9–18 Н, UW)
  lockBody: 28, // мм, хід від депресії плеча (1,1 дюйма, UW; одиниці таблиці неоднозначні — УМОВНО)
  thetaBack: [0, 120] as Vec, // °, кут оболонки ТП на спині й плечі (за замовчуванням 45)
  thetaBackDefault: 45,
  mForearm: [0.2, 0.7] as Vec, // кг, передпліччя з ліктьовим модулем (за замовчуванням 0,35)
  mForearmDefault: 0.35,
};

/** Момент сили тяжіння передпліччя й ТП відносно осі ліктя, Н·мм.
 *  phi — згинання плеча, alpha — згинання ліктя (рад), comp — частка пружинної компенсації 0…1. */
export function elbowMoment(p: { phi: number; alpha: number; mForearm: number; mTD: number; comp: number; forearm?: number }): number {
  const L = p.forearm ?? TH.forearm;
  const wd = G * (p.mForearm * TH.comShare * L + p.mTD * (L + TH.tdArm));
  return Math.max(0, wd * Math.sin(p.phi + p.alpha) * (1 - Math.max(0, Math.min(1, p.comp))));
}

export interface ElbowInput {
  raw: number; // хід від згинання плеча, мм
  k: number;
  mu: number;
  rLift: number; // мм
  fMax: number;
  phi: number; // рад
  mForearm: number; // кг
  mTD: number; // кг
  comp: number; // 0…1
  compliance?: number;
}
export interface ElbowResult {
  alpha: number; // рад
  limit: 'full' | 'excursion' | 'force';
  fIn: number; // зусилля на тросі згинання біля бандажа, Н
  moment: number; // Н·мм
  exc: number; // хід троса на важелі, мм
}
/** Згинання ліктя тягою (лікоть розблоковано): r·α + c·F_вх(α) = k·raw, F_вх(α) = e^(μθ)·M(α)/r ≤ F_max. */
export function solveElbow(p: ElbowInput): ElbowResult {
  const c = p.compliance ?? COMPLIANCE;
  const E = Math.exp(p.mu * toRad(TH.thetaLift));
  const aMax = toRad(TH.alphaMax);
  const fIn = (a: number) => (E * elbowMoment({ phi: p.phi, alpha: a, mForearm: p.mForearm, mTD: p.mTD, comp: p.comp })) / p.rLift;
  const captured = p.k * Math.max(0, p.raw);
  const g = (a: number) => p.rLift * a + c * fIn(a) - captured;
  const aExc = g(aMax) <= 0 ? aMax : g(0) >= 0 ? 0 : bisect(g, 0, aMax);
  // перше α, за якого потрібне зусилля перевищує F_max
  let aF = aMax;
  for (let a = 0; a <= aMax + 1e-9; a += toRad(0.25)) if (fIn(a) > p.fMax) { aF = Math.max(0, a - toRad(0.25)); break; }
  const alpha = Math.min(aExc, aF);
  const limit: ElbowResult['limit'] = alpha >= aMax - 1e-9 ? 'full' : aExc <= aF ? 'excursion' : 'force';
  return { alpha, limit, fIn: fIn(alpha), moment: elbowMoment({ phi: p.phi, alpha, mForearm: p.mForearm, mTD: p.mTD, comp: p.comp }), exc: p.rLift * alpha };
}

/** Хід тяги блокування від руху «депресія + розгинання + відведення», мм. */
export const lockExcursion = (share: number, k = 1) => k * Math.max(0, Math.min(1, share)) * TH.lockBody;
/** Зусилля на тросі блокування біля бандажа, Н. */
export const lockInputForce = (mu: number) => Math.exp(mu * toRad(TH.thetaLock)) * TH.lockForce;
/** Сумарний кут оболонки тяги ТП на рівні плеча: спина/плече + обхват ліктя (рад). */
export const thTdTheta = (thetaBackDeg: number, alpha: number) => toRad(Math.max(TH.thetaBack[0], Math.min(TH.thetaBack[1], thetaBackDeg))) + alpha;

// ---------------------------------------------------------------- схема протеза передпліччя (інженерний вигляд збоку)
// Схема, а не анатомічна модель: передпліччя горизонтально, тильна поверхня вгорі, гак праворуч.
// Кут підходу троса від бандажа задається явно: у реальності він залежить від бандажа, положення ліктя й ретейнера,
// і ця взаємозалежність у схемі НЕ моделюється (див. «Обмеження» на сторінці інструмента).

export interface TRSchemeInput {
  approachDeg: number; // кут підходу троса до проксимального ретейнера відносно осі гільзи, °
  sProx: number; // проксимальний ретейнер: відстань від проксимального краю схеми, мм
  sDist: number; // дистальний ретейнер, мм
  slack: number; // надлишок довжини оболонки — «горб» між ретейнерами, мм
}

export const TR = {
  socketFrom: 20,
  socketTo: 235,
  wrist: 250,
  hookLen: 118,
  sProx: [40, 140] as Vec,
  sDist: [150, 232] as Vec,
  approach: [0, 80] as Vec,
  slack: [0, 45] as Vec,
  rProx: 40,
  rDist: 29,
  lever: [292, 18] as Vec, // важіль («великий палець») гака: [уздовж осі, над віссю]
};

export const TR_DEFAULT: TRSchemeInput = { approachDeg: 28, sProx: 70, sDist: 210, slack: 6 };

export function socketRadius(s: number): number {
  const t = Math.max(0, Math.min(1, (s - TR.socketFrom) / (TR.socketTo - TR.socketFrom)));
  return TR.rProx + (TR.rDist - TR.rProx) * t;
}

const clamp = (v: number, r: Vec) => Math.max(r[0], Math.min(r[1], v));

export function trScheme(g: TRSchemeInput) {
  // y донизу (як у SVG); тильна поверхня — від'ємні y
  const at = (s: number, h: number): Vec => [s, -h];
  const sP = clamp(g.sProx, TR.sProx);
  const sD = clamp(g.sDist, TR.sDist);
  const P = at(sP, socketRadius(sP) + 4);
  const D = at(sD, socketRadius(sD) + 4);
  const a = toRad(clamp(g.approachDeg, TR.approach));
  const inDir: Vec = [Math.cos(a), Math.sin(a)]; // трос іде згори-зліва донизу-праворуч
  const cableFrom: Vec = [P[0] - inDir[0] * 150, P[1] - inDir[1] * 150];
  const slack = clamp(g.slack, TR.slack);
  const L = Math.hypot(D[0] - P[0], D[1] - P[1]) / 3;
  const C1: Vec = [P[0] + L, P[1] - slack]; // оболонка виходить з ретейнера вздовж гільзи
  const C2: Vec = [D[0] - L, D[1] - slack];
  const housing = bezier(P, C1, C2, D, 64);
  const T = at(TR.lever[0], TR.lever[1]);
  const startTan: Vec = [housing[1][0] - housing[0][0], housing[1][1] - housing[0][1]];
  const k = housing.length - 1;
  const endTan: Vec = [housing[k][0] - housing[k - 1][0], housing[k][1] - housing[k - 1][1]];
  const outDir: Vec = [T[0] - D[0], T[1] - D[1]];
  const entry = angleBetween(inDir, startTan);
  const bend = turningAngle(housing);
  const exit = angleBetween(endTan, outDir);
  const radii: number[] = [];
  for (let i = 1; i < housing.length - 1; i++) {
    const u: Vec = [housing[i][0] - housing[i - 1][0], housing[i][1] - housing[i - 1][1]];
    const v: Vec = [housing[i + 1][0] - housing[i][0], housing[i + 1][1] - housing[i][1]];
    const ang = angleBetween(u, v);
    const len = (Math.hypot(u[0], u[1]) + Math.hypot(v[0], v[1])) / 2;
    radii.push(ang > 1e-9 ? len / ang : Infinity);
  }
  const minRadius = Math.min(...radii);
  const length = housing.slice(1).reduce((acc, p, i) => acc + Math.hypot(p[0] - housing[i][0], p[1] - housing[i][1]), 0);
  return { P, D, C1, C2, T, cableFrom, inDir, housing, radii, minRadius, length, entry, bend, exit, theta: entry + bend + exit, sP, sD };
}
