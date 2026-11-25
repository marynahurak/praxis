// Тести фізичного ядра симулятора тягової системи.
// Запуск: node --experimental-strip-types --test scripts/tests/bodypowered.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  efficiency, outputForce, inputForceFor, turningAngle, angleBetween, MU_PTFE, MU_UNLINED,
  harnessCapture, CROSS_OPT, solveOpening, bodyExcursion, trScheme, TR_DEFAULT, toDeg, toRad,
  TD_DATA, tdCurve, tdForce, tdWidth, tdPreload, elbowMoment, solveElbow, TH, G, lockExcursion, thTdTheta,
} from '../../src/lib/bodypowered/physics.ts';

const close = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);

test('бенчмарки ККД з ТЗ (μ = 0,092 і 0,25)', () => {
  close(efficiency(MU_PTFE, Math.PI / 2) * 100, 86.5, 0.05, 'PTFE 90°');
  close(efficiency(MU_PTFE, Math.PI) * 100, 74.9, 0.05, 'PTFE 180°');
  close(efficiency(MU_UNLINED, Math.PI) * 100, 45.6, 0.05, 'без лайнера 180°');
});

test('F_вих монотонно спадає з θ і μ; обернена функція', () => {
  let prev = Infinity;
  for (let th = 0; th <= 2 * Math.PI; th += 0.1) {
    const f = outputForce(100, MU_PTFE, th);
    assert.ok(f < prev); prev = f;
  }
  assert.ok(outputForce(100, 0.2, 1) < outputForce(100, 0.1, 1));
  close(outputForce(inputForceFor(60, 0.15, 2), 0.15, 2), 60, 1e-9, 'обернена');
  assert.equal(outputForce(10, 0.1, 1, 50), 0);
});

test('кути: пряма лінія — 0; чверть кола — π/2', () => {
  assert.equal(turningAngle([[0, 0], [1, 0], [2, 0], [3, 0]]), 0);
  const arc = Array.from({ length: 91 }, (_, i) => [Math.cos((i * Math.PI) / 180), Math.sin((i * Math.PI) / 180)]);
  close(turningAngle(arc), Math.PI / 2, 0.02, 'чверть кола');
  close(angleBetween([1, 0], [0, 1]), Math.PI / 2, 1e-12, 'перпендикуляр');
});

test('бандаж: максимум у оптимальній точці, мінімум 0,6', () => {
  assert.equal(harnessCapture(CROSS_OPT), 1);
  close(harnessCapture([CROSS_OPT[0] + 200, CROSS_OPT[1]]), 0.6, 1e-12, 'далеко');
  assert.ok(harnessCapture([CROSS_OPT[0] + 30, CROSS_OPT[1]]) < 1);
});

test('ТП: крива зусилля проходить через виміряні точки (Smit et al. 2012); розкриття 50 мм при e50', () => {
  for (const kind of Object.keys(TD_DATA)) for (const d of TD_DATA[kind]) {
    close(tdForce(d, d.e50), d.f50, 1e-9, `${kind} f50`);
    close(tdForce(d, d.eFull), d.fFull, 1e-9, `${kind} fFull`);
    close(tdWidth(d, d.e50), 50, 1e-9, `${kind} 50 мм`);
    close(tdWidth(d, d.eFull), d.open, 1e-9, `${kind} максимум`);
    const f0 = tdPreload(d);
    assert.ok(f0 >= 0 && f0 <= d.f50);
    let prev = -1; // монотонність
    for (let e = 0; e <= d.eFull; e += 0.5) { const f = tdForce(d, e); assert.ok(f >= prev - 1e-12); prev = f; }
  }
  assert.deepEqual(TD_DATA.split.map((d) => d.fFull), [48, 72, 95]);
  assert.equal(tdCurve('spring', 2).fFull, 101);
  assert.equal(tdCurve('split', 9).fFull, 95); // межі налаштування
});

test('відкриття: достатньо ходу й сили → повне; мало ходу → обмеження ходом; мала сила → обмеження силою', () => {
  const td = tdCurve('split', 3);
  const base = { k: 1, mu: MU_PTFE, theta: Math.PI / 2, td, fMax: 400 };
  const full = solveOpening({ ...base, raw: 88 });
  assert.equal(full.x, 1); assert.equal(full.limit, 'full');
  close(full.fIn, 95 / efficiency(MU_PTFE, Math.PI / 2), 1e-9, 'зусилля тіла');
  close(full.width, 88, 1e-9, 'розкриття');
  const shortExc = solveOpening({ ...base, raw: 30 });
  assert.ok(shortExc.x < 1 && shortExc.limit === 'excursion');
  close(shortExc.e + 0.08 * shortExc.fIn, 30, 1e-6, 'баланс ходу (рівн. 5)');
  const weak = solveOpening({ ...base, raw: 88, fMax: 70 });
  assert.ok(weak.x < 1 && weak.limit === 'force');
  assert.ok(weak.fIn <= 70 + 1e-6);
  const none = solveOpening({ ...base, raw: 0 });
  assert.equal(none.x, 0);
  // більше тертя → менше відкриття за тієї ж сили
  const a = solveOpening({ ...base, raw: 88, fMax: 110 });
  const b = solveOpening({ ...base, raw: 88, fMax: 110, mu: MU_UNLINED });
  assert.ok(b.x < a.x);
  // кисть потребує більшого зусилля, ніж гак
  assert.ok(solveOpening({ ...base, raw: 88, td: tdCurve('hand', 1) }).fInFull > full.fInFull);
  close(full.fatigueRatio, full.fInFull / 80, 1e-12, 'частка утоми');
});

test('лікоть: момент 0 у звислому положенні; максимум при горизонтальному передпліччі; компенсація зменшує момент', () => {
  const m = { mForearm: 0.35, mTD: 0.2, comp: 0 };
  assert.equal(elbowMoment({ ...m, phi: 0, alpha: 0 }), 0);
  const wd = G * (0.35 * TH.comShare * TH.forearm + 0.2 * (TH.forearm + TH.tdArm));
  close(elbowMoment({ ...m, phi: 0, alpha: Math.PI / 2 }), wd, 1e-9, 'горизонтально');
  close(elbowMoment({ ...m, phi: toRad(30), alpha: toRad(60) }), wd, 1e-9, 'φ + α = 90°');
  close(elbowMoment({ ...m, phi: 0, alpha: Math.PI / 2, comp: 0.5 }), wd / 2, 1e-9, 'компенсація 50 %');
});

test('лікоть: згинання тягою — хід r·α; обмеження ходом і силою; зусилля за рівн. (9)', () => {
  const base = { k: 1, mu: MU_PTFE, rLift: 25, fMax: 300, phi: 0, mForearm: 0.35, mTD: 0.2, comp: 0 };
  const r = solveElbow({ ...base, raw: 30 });
  assert.equal(r.limit, 'excursion');
  close(r.exc + 0.08 * r.fIn, 30, 1e-6, 'баланс ходу');
  close(r.fIn, Math.exp(MU_PTFE * toRad(TH.thetaLift)) * r.moment / 25, 1e-9, 'F = e^(μθ)·M/r');
  assert.equal(solveElbow({ ...base, raw: 0 }).alpha, 0);
  const full = solveElbow({ ...base, raw: 88, k: 1 });
  assert.ok(full.alpha <= toRad(TH.alphaMax) + 1e-9);
  const weak = solveElbow({ ...base, raw: 88, fMax: 20 });
  assert.equal(weak.limit, 'force'); assert.ok(weak.fIn <= 20 + 1e-6);
  // більше плече сили → менше зусилля, але більший потрібний хід
  const a = solveElbow({ ...base, raw: 20, rLift: 35 });
  assert.ok(a.alpha < r.alpha || a.exc <= 20);
});

test('рівень плеча: блокування й кут оболонки ТП', () => {
  assert.equal(lockExcursion(0), 0);
  close(lockExcursion(1), TH.lockBody, 1e-12, 'максимум');
  assert.ok(lockExcursion(1) >= TH.lockExc); // замок досяжний
  close(thTdTheta(45, toRad(90)), toRad(135), 1e-12, 'θ = θ_пл + α');
  assert.ok(thTdTheta(45, toRad(100)) > thTdTheta(45, toRad(10)));
});

test('хід тіла: межі', () => {
  assert.equal(bodyExcursion(0, 0), 0);
  assert.equal(bodyExcursion(1, 90), 88);
  assert.equal(bodyExcursion(2, 200), 88);
});

test('схема: θ = вхід + вигин + вихід; надлишок оболонки збільшує вигин', () => {
  const g = trScheme(TR_DEFAULT);
  close(g.theta, g.entry + g.bend + g.exit, 1e-12, 'сума');
  const flat = trScheme({ ...TR_DEFAULT, slack: 0 });
  close(toDeg(flat.entry), TR_DEFAULT.approachDeg, 0.5, 'вхід = кут підходу при lead 0 і без надлишку');
  const loose = trScheme({ ...TR_DEFAULT, slack: 40 });
  assert.ok(loose.bend > g.bend);
  // більший кут підходу троса → більший θ
  assert.ok(trScheme({ ...TR_DEFAULT, approachDeg: 60 }).theta > g.theta);
  // межі параметрів обмежуються
  const clamped = trScheme({ ...TR_DEFAULT, sProx: -100, sDist: 999 });
  assert.equal(clamped.sP, 40); assert.equal(clamped.sD, 232);
});
