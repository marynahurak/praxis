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

/** Оптимальна точка перехрещення збруї відносно остистого відростка C7, мм:
 *  трохи нижче C7 і трохи в бік здорової кінцівки (x < 0 — здоровий бік, y > 0 — нижче). */
export const CROSS_OPT: Vec = [-15, 20];

/** Коефіцієнт «уловлювання» ходу збруєю, 0,6–1,0 — УМОВНА модель:
 *  спадає лінійно з відстанню від оптимальної точки перехрещення (60 мм → мінімум). */
export function harnessCapture(cross: Vec): number {
  const d = Math.hypot(cross[0] - CROSS_OPT[0], cross[1] - CROSS_OPT[1]);
  return 1 - 0.4 * Math.min(1, d / 60);
}

// ---------------------------------------------------------------- гак із довільним відкриттям (VO)

/** Пружина VO-гака залежно від кількості гумок — УМОВНЕ калібрування:
 *  зусилля на тросі для повного відкриття 35/55/75/95 Н для 1–4 гумок
 *  (відповідає опублікованому діапазону 50–94 Н для VO-пристроїв, Hichert et al. 2018);
 *  попереднє натягнення = 60 % від повного. */
export function hookSpring(bands: number): { fPre: number; fFull: number } {
  const n = Math.max(1, Math.min(4, Math.round(bands)));
  const fFull = 15 + 20 * n;
  return { fPre: 0.6 * fFull, fFull };
}

/** Податливість збруї та м'яких тканин, мм/Н — УМОВНЕ значення: частина ходу «з'їдається» розтягом строп. */
export const COMPLIANCE = 0.08;

/** Межа роботи без утоми: 20 % від максимального зусилля користувача (Hichert et al. 2018). */
export const FATIGUE_SHARE = 0.2;

export interface OpeningInput {
  raw: number; // хід, створений тілом, мм
  k: number; // коефіцієнт уловлювання збруєю
  mu: number;
  theta: number; // рад
  bands: number;
  lReq: number; // хід троса на гаку для повного відкриття, мм
  fMax: number; // максимальне зусилля користувача на тросі, Н
  compliance?: number;
}

export interface OpeningResult {
  x: number; // частка відкриття 0…1
  limit: 'full' | 'excursion' | 'force';
  fOut: number; // зусилля на важелі гака, Н
  fIn: number; // зусилля, яке створює тіло, Н
  eta: number;
  fInFull: number; // зусилля тіла для повного відкриття, Н
  excAtHook: number; // хід троса на гаку, мм
  excNeededBody: number; // хід тіла, потрібний для повного відкриття, мм
  fatigueRatio: number; // fInFull / (20 % fMax)
}

/** Розв'язок рівноваги: тіло тягне на k·raw мм, частина ходу йде на розтяг збруї (c·F_вх),
 *  решта відкриває гак; зусилля обмежене максимумом користувача. */
export function solveOpening(p: OpeningInput): OpeningResult {
  const c = p.compliance ?? COMPLIANCE;
  const E = Math.exp(p.mu * p.theta);
  const { fPre, fFull } = hookSpring(p.bands);
  const dF = fFull - fPre;
  const captured = p.k * Math.max(0, p.raw);
  const xExc = (captured - c * E * fPre) / (p.lReq + c * E * dF);
  const xForce = (p.fMax / E - fPre) / dF;
  let x = Math.min(xExc, xForce);
  const limit: OpeningResult['limit'] = x >= 1 ? 'full' : xExc <= xForce ? 'excursion' : 'force';
  x = Math.max(0, Math.min(1, x));
  let fOut: number;
  if (x > 0) fOut = fPre + dF * x;
  else fOut = Math.min(fPre, captured / (c * E), p.fMax / E); // гак ще не відкрився: трос лише натягнутий
  const fInFull = E * fFull;
  return {
    x,
    limit,
    fOut,
    fIn: E * fOut,
    eta: 1 / E,
    fInFull,
    excAtHook: x * p.lReq,
    excNeededBody: (p.lReq + c * fInFull) / p.k,
    fatigueRatio: fInFull / (FATIGUE_SHARE * p.fMax),
  };
}

// ---------------------------------------------------------------- схема протеза передпліччя (інженерний вигляд збоку)
// Схема, а не анатомічна модель: передпліччя горизонтально, тильна поверхня вгорі, гак праворуч.
// Кут підходу троса від збруї задається явно: у реальності він залежить від збруї, положення ліктя й ретейнера,
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
