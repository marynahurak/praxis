// Тести фізичного ядра симулятора тягової системи.
// Запуск: node --experimental-strip-types --test scripts/tests/bodypowered.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  efficiency, outputForce, inputForceFor, turningAngle, angleBetween, MU_PTFE, MU_UNLINED,
  harnessCapture, CROSS_OPT, hookSpring, solveOpening, bodyExcursion, trScheme, TR_DEFAULT, toDeg,
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

test('збруя: максимум у оптимальній точці, мінімум 0,6', () => {
  assert.equal(harnessCapture(CROSS_OPT), 1);
  close(harnessCapture([CROSS_OPT[0] + 200, CROSS_OPT[1]]), 0.6, 1e-12, 'далеко');
  assert.ok(harnessCapture([CROSS_OPT[0] + 30, CROSS_OPT[1]]) < 1);
});

test('гумки: 1–4 → 35/55/75/95 Н; повне відкриття потребує більше зусилля', () => {
  assert.deepEqual([1, 2, 3, 4].map((n) => hookSpring(n).fFull), [35, 55, 75, 95]);
});

test('відкриття: достатньо ходу й сили → повне; мало ходу → обмеження ходом; мала сила → обмеження силою', () => {
  const base = { k: 1, mu: MU_PTFE, theta: Math.PI / 2, bands: 3, lReq: 50, fMax: 400 };
  const full = solveOpening({ ...base, raw: 88 });
  assert.equal(full.x, 1); assert.equal(full.limit, 'full');
  close(full.fIn, 75 / efficiency(MU_PTFE, Math.PI / 2), 1e-9, 'зусилля тіла');
  const shortExc = solveOpening({ ...base, raw: 30 });
  assert.ok(shortExc.x < 1 && shortExc.limit === 'excursion');
  const weak = solveOpening({ ...base, raw: 88, fMax: 70 });
  assert.ok(weak.x < 1 && weak.limit === 'force');
  assert.ok(weak.fIn <= 70 + 1e-9);
  const none = solveOpening({ ...base, raw: 0 });
  assert.equal(none.x, 0);
  // більше тертя → менше відкриття за тієї ж сили
  const a = solveOpening({ ...base, raw: 88, fMax: 90 });
  const b = solveOpening({ ...base, raw: 88, fMax: 90, mu: MU_UNLINED });
  assert.ok(b.x < a.x);
  // утома: 20 % від максимуму
  close(full.fatigueRatio, full.fInFull / 80, 1e-12, 'частка утоми');
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
