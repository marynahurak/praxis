// Клієнтська логіка анатомічного атласу для міотестингу (src/views/MyoMap.astro).
// Геометрія перевіряється через Path2D (canvas), тож не залежить від рендерингу SVG.
// Усі розрахунки — у пікселях схеми; переведення в мм через ppm (пікселів на метр) кожної проєкції.

type Pt = { x: number; y: number };
type Struct = { key: string; kind: 'muscle' | 'bone'; path: Path2D; bb: number[]; tz?: { path: Path2D; bb: number[] }; tendon?: boolean };
type Stage = {
  id: string; svg: SVGSVGElement; v: any; s: number; kind: 'view' | 'section';
  structs: Struct[]; els: SVGGElement; skin?: { pts: Pt[]; nrm: Pt[]; c: Pt };
};
type Placed = { uid: number; type: string; x: number; y: number; a: number; i?: number; q?: string };

const NS = 'http://www.w3.org/2000/svg';

function parsePolys(d: string): Pt[][] {
  const out: Pt[][] = [];
  for (const part of d.split('M')) {
    const nums = part.match(/-?\d*\.?\d+(?:e-?\d+)?/g);
    if (!nums || nums.length < 4) continue;
    const poly: Pt[] = [];
    for (let i = 0; i + 1 < nums.length; i += 2) poly.push({ x: +nums[i], y: +nums[i + 1] });
    out.push(poly);
  }
  return out;
}
function bbox(d: string): number[] {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of parsePolys(d)) for (const q of p) { if (q.x < x0) x0 = q.x; if (q.x > x1) x1 = q.x; if (q.y < y0) y0 = q.y; if (q.y > y1) y1 = q.y; }
  return [x0, y0, x1, y1];
}
const inBB = (b: number[], x: number, y: number) => x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3];
const polyArea = (p: Pt[]) => { let a = 0; for (let i = 0; i < p.length; i++) { const j = (i + 1) % p.length; a += p[i].x * p[j].y - p[j].x * p[i].y; } return a / 2; };
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;
const axisDiff = (a: number, b: number) => { let d = Math.abs((((a - b) % 180) + 180) % 180); return d > 90 ? 180 - d : d; };
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);

export function initMyoMap() {
  const root = document.querySelector<HTMLElement>('.mm');
  const dataEl = document.getElementById('mm-data');
  if (!root || !dataEl) return;
  const D = JSON.parse(dataEl.textContent || '{}');
  const FB = D.fb;
  const fmt = (x: number, d = 1) => x.toFixed(d).replace('.', D.lang === 'uk' ? ',' : '.');
  const EL: Record<string, any> = Object.fromEntries(D.el.map((e: any) => [e.id, e]));
  const ctx = document.createElement('canvas').getContext('2d')!;
  const st = {
    level: root.dataset.level as string, view: root.dataset.view as string, mode: 'direct',
    type: D.el[0].id as string, armed: false, align: true, selEl: 0, selKey: '' as string,
  };
  const placed: Record<string, Placed[]> = {};
  let uid = 1;
  const stages: Record<string, Stage> = {};
  const fig = root.querySelector<HTMLElement>('.fig')!;
  const tip = root.querySelector<HTMLElement>('.tip')!;
  const hint = root.querySelector<HTMLElement>('.armed-hint')!;
  const fbBox = root.querySelector<HTMLElement>('.fb')!;
  const fbTitle = fbBox.querySelector('.fb-title')?.textContent ?? '';

  // ---------------------------------------------------------------- geometry
  function getStage(id: string): Stage {
    if (stages[id]) return stages[id];
    const svg = root!.querySelector<SVGSVGElement>(`svg.stage[data-view="${id}"]`)!;
    const v = D.views[id];
    const structs: Struct[] = [];
    const tzs: Record<string, { path: Path2D; bb: number[] }> = {};
    svg.querySelectorAll<SVGPathElement>('.tz[data-tz]').forEach((p) => {
      const d = p.getAttribute('d') || '';
      tzs[p.dataset.tz!] = { path: new Path2D(d), bb: bbox(d) };
    });
    svg.querySelectorAll<SVGPathElement>('.structs path.hit').forEach((p) => {
      const d = p.getAttribute('d') || '';
      const key = p.dataset.key || p.dataset.bone || '';
      structs.push({ key, kind: p.dataset.key ? 'muscle' : 'bone', path: new Path2D(d), bb: bbox(d), tz: tzs[key], tendon: p.classList.contains('tendon') });
    });
    structs.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'muscle' ? -1 : 1));
    const S: Stage = { id, svg, v, s: v.ppm / 1000, kind: v.kind, structs, els: svg.querySelector<SVGGElement>('.els')! };
    if (v.kind === 'section') {
      const polys = parsePolys(svg.querySelector('.skin')!.getAttribute('d') || '');
      let outer = polys[0];
      for (const p of polys) if (Math.abs(polyArea(p)) > Math.abs(polyArea(outer))) outer = p;
      // centroid
      let A = 0, cx = 0, cy = 0;
      for (let i = 0; i < outer.length; i++) {
        const j = (i + 1) % outer.length; const f = outer[i].x * outer[j].y - outer[j].x * outer[i].y;
        A += f; cx += (outer[i].x + outer[j].x) * f; cy += (outer[i].y + outer[j].y) * f;
      }
      const c = { x: cx / (3 * A), y: cy / (3 * A) };
      // densify ~1 mm
      const step = S.s;
      const pts: Pt[] = [];
      for (let i = 0; i < outer.length; i++) {
        const p = outer[i], q = outer[(i + 1) % outer.length];
        const L = Math.hypot(q.x - p.x, q.y - p.y); const n = Math.max(1, Math.round(L / step));
        for (let k = 0; k < n; k++) pts.push({ x: p.x + ((q.x - p.x) * k) / n, y: p.y + ((q.y - p.y) * k) / n });
      }
      const nrm: Pt[] = pts.map((p, i) => {
        const a = pts[(i - 3 + pts.length) % pts.length], b = pts[(i + 3) % pts.length];
        let nx = b.y - a.y, ny = -(b.x - a.x); const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
        if (nx * (p.x - c.x) + ny * (p.y - c.y) < 0) { nx = -nx; ny = -ny; }
        return { x: nx, y: ny };
      });
      S.skin = { pts, nrm, c };
    }
    stages[id] = S;
    return S;
  }
  function classify(S: Stage, x: number, y: number): { k: 'muscle' | 'tendon' | 'bone' | 'none'; key?: string } {
    for (const t of S.structs) {
      if (!inBB(t.bb, x, y) || !ctx.isPointInPath(t.path, x, y, 'evenodd')) continue;
      if (t.kind === 'bone') return { k: 'bone', key: t.key };
      if (t.tendon) return { k: 'tendon', key: t.key };
      if (t.tz && inBB(t.tz.bb, x, y) && ctx.isPointInPath(t.tz.path, x, y, 'evenodd')) return { k: 'tendon', key: t.key };
      return { k: 'muscle', key: t.key };
    }
    return { k: 'none' };
  }
  const nearestSkin = (S: Stage, x: number, y: number) => {
    let bi = 0, bd = Infinity;
    S.skin!.pts.forEach((p, i) => { const d = (p.x - x) ** 2 + (p.y - y) ** 2; if (d < bd) { bd = d; bi = i; } });
    return bi;
  };
  const skinPose = (S: Stage, i: number) => {
    const n = S.skin!.pts.length; i = ((i % n) + n) % n;
    const p = S.skin!.pts[i], nr = S.skin!.nrm[i];
    return { x: p.x, y: p.y, a: deg(Math.atan2(nr.y, nr.x)), i };
  };

  // ---------------------------------------------------------------- names, roles
  const mName = (k: string) => D.muscles[k]?.n ?? k;
  const sName = (k: string, kind: string) => (kind === 'bone' ? D.bones[k] ?? k : mName(k));
  const roleOf = (k: string) => D.roles[st.level]?.[k] ?? 'context';

  // ---------------------------------------------------------------- electrodes: drawing
  function svgEl(tag: string, attrs: Record<string, any>, parent?: Element) {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
    if (parent) parent.appendChild(e);
    return e;
  }
  function drawElectrode(S: Stage, P: Placed, n: number, extraCls = '') {
    const E = EL[P.type]; const s = S.s;
    const g = svgEl('g', { class: `el ${P.q ?? ''} ${extraCls}`.trim(), transform: `translate(${P.x.toFixed(1)} ${P.y.toFixed(1)}) rotate(${P.a.toFixed(1)})`, 'data-uid': P.uid, tabindex: 0, role: 'button', 'aria-label': `${D.ui.ch} ${n}: ${E.n}` }) as SVGGElement;
    const hw = S.kind === 'view' ? (E.f ? E.f[0] : E.w) * s + 12 : 12 * s + 12;
    const hh = (E.f ? E.f[1] : E.h) * s + 8;
    svgEl('rect', { x: S.kind === 'view' ? -hw / 2 : -6, y: -hh / 2, width: hw, height: hh, class: 'el-hit' }, g);
    if (S.kind === 'view') {
      if (E.f) svgEl('ellipse', { cx: 0, cy: 0, rx: (E.f[0] * s) / 2, ry: (E.f[1] * s) / 2, class: 'el-fl' }, g);
      if (E.d.length) {
        svgEl('rect', { x: (-E.w * s) / 2, y: (-E.h * s) / 2, width: E.w * s, height: E.h * s, rx: (E.h * s) / 2, class: 'el-pad' }, g);
        for (const d of E.d) svgEl('circle', { cx: d * s, cy: 0, r: 3.4 * s, class: 'el-dome' }, g);
      } else {
        svgEl('rect', { x: (-E.w * s) / 2, y: (-E.h * s) / 2, width: E.w * s, height: E.h * s, rx: 3 * s, class: 'el-body' }, g);
        for (const c of E.c) svgEl('rect', { x: (c.x - c.w / 2) * s, y: (-c.h * s) / 2, width: c.w * s, height: c.h * s, rx: (c.w * s) / 2, class: 'el-ct' }, g);
      }
      const L = (E.w / 2 + 7) * s;
      svgEl('line', { x1: -L, y1: 0, x2: L, y2: 0, class: 'el-axis' }, g);
      const hy = -((E.f ? E.f[1] : E.h) / 2) * s - 16;
      svgEl('line', { x1: 0, y1: 0, x2: 0, y2: hy, class: 'el-rotline' }, g);
      svgEl('circle', { cx: 0, cy: hy, r: 8, class: 'el-rot', 'data-rot': 1 }, g);
      const bx = (E.w / 2) * s + 4, by = (-E.h / 2) * s - 4;
      const b = svgEl('g', { transform: `translate(${bx} ${by}) rotate(${-P.a})` }, g);
      svgEl('circle', { r: 9, class: 'el-badge' }, b);
      svgEl('text', { class: 'el-num' }, b).textContent = String(n);
    } else {
      // section: local +x = outward normal; the electrode lies on the skin, its long axis runs along the limb (out of plane)
      const wide = E.d.length ? 10 : E.h; const thick = E.d.length ? 4 : 9.5;
      if (E.f) svgEl('rect', { x: 0, y: (-E.f[1] * s) / 2, width: 2 * s, height: E.f[1] * s, class: 'el-fl' }, g);
      svgEl('rect', { x: 0, y: (-wide * s) / 2, width: thick * s, height: wide * s, rx: 2 * s, class: E.d.length ? 'el-pad' : 'el-body' }, g);
      if (E.d.length) svgEl('circle', { cx: 0, cy: 0, r: 3 * s, class: 'el-dome' }, g);
      else svgEl('rect', { x: -0.6 * s, y: (-wide * s) / 2 + 2 * s, width: 1.2 * s, height: (wide - 4) * s, class: 'el-ct' }, g);
      if (P.q && (P as any).depth) {
        const dd = (P as any).depth * s;
        svgEl('line', { x1: 0, y1: 0, x2: -dd, y2: 0, class: 'el-depth' }, g);
        svgEl('circle', { cx: -dd, cy: 0, r: 2.5, class: 'el-depth-dot' }, g);
      }
      const b = svgEl('g', { transform: `translate(${thick * s + 12} 0) rotate(${-P.a})` }, g);
      svgEl('circle', { r: 9, class: 'el-badge' }, b);
      svgEl('text', { class: 'el-num' }, b).textContent = String(n);
    }
    if (P.uid === st.selEl) g.classList.add('sel');
    S.els.appendChild(g);
    return g;
  }
  function renderStage(id: string) {
    const S = getStage(id);
    const list = placed[id] ?? [];
    list.forEach((P) => evaluate(S, P));
    S.els.replaceChildren();
    list.forEach((P, i) => drawElectrode(S, P, i + 1));
    renderFeedback();
  }

  // ---------------------------------------------------------------- evaluation
  function evaluate(S: Stage, P: Placed) {
    return S.kind === 'view' ? evalView(S, P) : evalSection(S, P);
  }
  function evalView(S: Stage, P: Placed) {
    const E = EL[P.type]; const s = S.s; const ca = Math.cos(rad(P.a)), sa = Math.sin(rad(P.a));
    const at = (u: number, v: number) => ({ x: P.x + (u * ca - v * sa) * s, y: P.y + (u * sa + v * ca) * s });
    const cnt: Record<string, number> = {}; let tend = 0, bone = 0, none = 0, N = 0;
    const tendKeys: Record<string, number> = {};
    const nu = 9, nv = 5;
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
      const u = -E.w / 2 + 1 + ((E.w - 2) * i) / (nu - 1), v = -E.h / 2 + 1 + ((E.h - 2) * j) / (nv - 1);
      const p = at(u, v); const c = classify(S, p.x, p.y); N++;
      if (c.k === 'muscle') cnt[c.key!] = (cnt[c.key!] ?? 0) + 1;
      else if (c.k === 'tendon') { tend++; tendKeys[c.key!] = (tendKeys[c.key!] ?? 0) + 1; }
      else if (c.k === 'bone') bone++; else none++;
    }
    let main = ''; let mc = 0;
    for (const [k, c] of Object.entries(cnt)) if (c + (tendKeys[k] ?? 0) * 0.5 > mc) { mc = c + (tendKeys[k] ?? 0) * 0.5; main = k; }
    if (!main) for (const [k, c] of Object.entries(tendKeys)) if (c > mc) { mc = c; main = k; }
    const bellyFrac = main ? (cnt[main] ?? 0) / N : 0;
    const others = Object.keys(cnt).filter((k) => k !== main && cnt[k] / N >= 0.06);
    // contacts
    const cpos = E.d.length ? E.d : E.c.map((c: any) => c.x);
    const cres = cpos.map((u: number) => { const p = at(u, 0); return classify(S, p.x, p.y); });
    const contactsOk = !!main && cres.every((c: any) => c.k === 'muscle' && c.key === main);
    // 5-mm ring around the footprint
    const near = new Set<string>();
    const W = E.w / 2 + 5, H = E.h / 2 + 5;
    for (let i = 0; i < 32; i++) {
      const t = (i / 32) * 4; let u: number, v: number;
      if (t < 1) { u = -W + 2 * W * t; v = -H; } else if (t < 2) { u = W; v = -H + 2 * H * (t - 1); } else if (t < 3) { u = W - 2 * W * (t - 2); v = H; } else { u = -W; v = H - 2 * H * (t - 3); }
      const p = at(u, v); const c = classify(S, p.x, p.y);
      if ((c.k === 'muscle' || c.k === 'tendon') && c.key !== main && !others.includes(c.key!)) near.add(c.key!);
    }
    const info = main ? S.v.s[main] : null;
    const dAng = info ? axisDiff(P.a, info.a) : 0;
    const role = main ? roleOf(main) : 'none';
    const roleBad = st.mode === 'direct' && ['deep', 'context', 'caution'].includes(role);
    let q = 'fair';
    if (!main || bellyFrac < 0.35) q = 'poor';
    else if (bellyFrac >= 0.75 && contactsOk && dAng <= 20 && !others.length && !roleBad) q = 'good';
    Object.assign(P, { q, r: { main, bellyFrac, tend: tend / N, bone: bone / N, none: none / N, others, near: [...near], contactsOk, dAng, role, info } });
  }
  function evalSection(S: Stage, P: Placed) {
    const s = S.s; const nx = Math.cos(rad(P.a)), ny = Math.sin(rad(P.a));
    const segs: { k: string; key?: string; from: number; to: number }[] = [];
    for (let d = 0.25; d <= 20; d += 0.5) {
      const c = classify(S, P.x - nx * d * s, P.y - ny * d * s);
      const last = segs[segs.length - 1];
      if (last && last.k === c.k && last.key === c.key) last.to = d; else segs.push({ k: c.k, key: c.key, from: d, to: d });
    }
    const first = segs.find((g) => g.k === 'muscle' || g.k === 'tendon');
    const firstBone = segs.find((g) => g.k === 'bone');
    const blocked = firstBone && first && firstBone.from < first.from;
    const E = EL[P.type]; const wide = E.d.length ? 10 : E.h;
    const others = new Set<string>();
    let main = first?.key ?? '';
    if (first) {
      const depth = first.from + 2; const tx = -ny, ty = nx;
      for (let j = -3; j <= 3; j++) {
        const off = (j / 3) * (wide / 2);
        const c = classify(S, P.x - nx * depth * s + tx * off * s, P.y - ny * depth * s + ty * off * s);
        if ((c.k === 'muscle' || c.k === 'tendon') && c.key !== main) others.add(c.key!);
      }
    }
    const role = main ? roleOf(main) : 'none';
    let q = 'fair';
    if (!first || first.from > 15 || blocked) q = 'poor';
    else if (first.k === 'muscle' && !others.size && !(st.mode === 'direct' && ['deep', 'context', 'caution'].includes(role))) q = 'good';
    Object.assign(P, { q, depth: first && !blocked ? first.from : 0, r: { main, segs, first, others: [...others], role, blocked } });
  }

  // ---------------------------------------------------------------- feedback panel
  let fbRaf = 0;
  function renderFeedback() {
    cancelAnimationFrame(fbRaf);
    fbRaf = requestAnimationFrame(() => {
      const list = placed[st.view] ?? [];
      const P = list.find((p) => p.uid === st.selEl) ?? list[list.length - 1];
      if (!P) { fbBox.hidden = true; return; }
      fbBox.hidden = false;
      const S = getStage(st.view); const r: any = (P as any).r ?? {};
      const n = list.indexOf(P) + 1;
      const items: [string, string][] = [];
      const pct = (x: number) => `${Math.round(x * 100)}%`;
      if (S.kind === 'view') {
        if (!r.main) items.push(['bad', FB.none]);
        else {
          const extra = [r.tend > 0.02 ? `${pct(r.tend)} ${FB.tendonPart}` : '', r.bone > 0.02 ? `${pct(r.bone)} ${FB.bonePart}` : '', r.none > 0.02 ? `${pct(r.none)} ${FB.nonePart}` : ''].filter(Boolean).join('; ');
          items.push([r.bellyFrac >= 0.75 ? 'ok' : r.bellyFrac >= 0.35 ? 'warn' : 'bad', `${FB.over}: <strong>${esc(mName(r.main))}</strong> — ${pct(r.bellyFrac)} ${FB.of}${extra ? `; ${extra}` : ''}.`]);
          items.push([r.contactsOk ? 'ok' : 'bad', r.contactsOk ? FB.contactsOk : FB.contactsBad]);
          const dA = Math.round(r.dAng);
          items.push(dA <= 20 ? ['ok', `${FB.orientOk} (${dA}°).`] : dA <= 40 ? ['warn', `${FB.orientWarn}: ${dA}°.`] : ['bad', `${FB.orientBad} (${dA}°).`]);
          if (r.others.length) items.push(['warn', `${FB.others}: ${r.others.map(mName).join(', ')}.`]);
          if (r.near.length) items.push(['info', `${FB.near}: ${r.near.map(mName).join(', ')} — ${FB.xtRisk}.`]);
          if (r.info) {
            const dia = Math.round(r.info.r * 2);
            const narrow = dia < EL[P.type].h;
            items.push([narrow ? 'warn' : 'info', `${FB.fits} ~${dia} ${D.ui.mm}${narrow ? ` — ${FB.narrow}` : ''}.`]);
          }
          if (D.muscles[r.main]?.sc) items.push(['warn', FB.schem]);
        }
      } else {
        if (r.blocked || !r.first || r.first.from > 15) items.push(['bad', r.blocked ? FB.bonePart : FB.skinOnly]);
        if (r.segs) {
          const parts = r.segs.filter((g: any) => g.k !== 'none').slice(0, 3).map((g: any) => {
            const nm = g.k === 'bone' ? D.bones[g.key] ?? g.key : `${mName(g.key)}${g.k === 'tendon' ? ` (${FB.tendonM})` : ''}`;
            return g.to >= 19.75 ? `${esc(nm)} ${FB.from} ${fmt(g.from)} ${D.ui.mm}` : `${esc(nm)} ${FB.at} ${fmt(g.from)}–${fmt(g.to + 0.25)} ${D.ui.mm}`;
          });
          if (parts.length) items.push([r.first && r.first.k === 'muscle' && !r.blocked ? 'ok' : 'warn', `${FB.depth} (${FB.model}): ${parts.join(' → ')}.`]);
        }
        if (r.others?.length) items.push(['warn', `${FB.others}: ${r.others.map(mName).join(', ')} — ${FB.xtRisk}.`]);
      }
      if (r.main) {
        if (st.mode === 'direct') {
          const bad = ['deep', 'caution', 'context'].includes(r.role);
          items.push([bad ? 'warn' : 'info', `${FB.role}: ${esc(D.roleNames[r.role] ?? r.role)}.`]);
        }
        const e = D.muscles[r.main]?.e;
        if (e) items.push([e === 'high' ? 'warn' : 'info', `${FB.eff}: ${esc(D.effortNames[e])}.`]);
      }
      const ic: Record<string, string> = { ok: '✓', warn: '!', bad: '✕', info: 'i' };
      fbBox.querySelector('.fb-list')!.innerHTML = items.map(([c, t]) => `<li class="${c}"><span class="ic" aria-hidden="true">${ic[c]}</span><span>${t}</span></li>`).join('');
      const badge = fbBox.querySelector<HTMLElement>('.fb-badge')!;
      badge.className = `fb-badge ${P.q}`; badge.textContent = FB[P.q ?? 'fair'];
      fbBox.querySelector('.fb-title')!.textContent = `${fbTitle} · ${D.ui.ch} ${n}`;
      fbBox.querySelectorAll<HTMLElement>('[data-el-act="rotl"],[data-el-act="rotr"],[data-el-act="align"]').forEach((b) => (b.hidden = S.kind !== 'view'));
      // pair (direct control): channels 1 and 2
      let pair = '';
      if (st.mode === 'direct' && list.length >= 2) {
        const a: any = list[0], b: any = list[1];
        const dist = Math.hypot(a.x - b.x, a.y - b.y) / S.s;
        const ka = a.r?.main, kb = b.r?.main; const ga = D.muscles[ka]?.g, gb = D.muscles[kb]?.g;
        let rel = '';
        if (ka && kb) rel = ka === kb ? FB.sameM : ga && gb ? (ga !== gb ? FB.antag : FB.sameG) : '';
        pair = `${FB.dist}: ~${Math.round(dist)} ${D.ui.mm}${rel ? `; ${rel}` : ''}.`;
      }
      fbBox.querySelector('.fb-pair')!.textContent = pair;
    });
  }

  // ---------------------------------------------------------------- placement helpers
  function addElectrode(viewId: string, P: Omit<Placed, 'uid'>) {
    const S = getStage(viewId);
    const p: Placed = { ...P, uid: uid++ };
    (placed[viewId] ??= []).push(p);
    st.selEl = p.uid;
    evaluate(S, p);
    renderStage(viewId);
    return p;
  }
  function recommendedPose(S: Stage, key: string, type: string) {
    const info = S.v.s[key]; if (!info) return null;
    if (S.kind === 'view') return { type, x: info.x, y: info.y, a: info.a };
    const i = nearestSkin(S, info.x, info.y); return { type, ...skinPose(S, i) };
  }
  function poseAt(S: Stage, x: number, y: number, type: string, keepA?: number) {
    if (S.kind === 'section') return { type, ...skinPose(S, nearestSkin(S, x, y)) };
    let a = keepA ?? 90;
    if (st.align && keepA === undefined) { const c = classify(S, x, y); if (c.key && S.v.s[c.key]) a = S.v.s[c.key].a; }
    return { type, x, y, a };
  }
  function toSvg(svg: SVGSVGElement, cx: number, cy: number) {
    const m = svg.getScreenCTM(); if (!m) return { x: 0, y: 0 };
    const p = new DOMPoint(cx, cy).matrixTransform(m.inverse()); return { x: p.x, y: p.y };
  }
  function setArmed(on: boolean) {
    st.armed = on;
    root!.classList.toggle('armed', on);
    root!.querySelectorAll<HTMLElement>('.pal-item').forEach((b) => b.classList.toggle('armed', on && b.dataset.el === st.type));
    hint.textContent = on ? D.ui.armed : '';
    hint.classList.toggle('on', on);
  }
  function setType(t: string) {
    st.type = t;
    root!.querySelectorAll<HTMLElement>('.pal-item').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.el === t)));
  }

  // ---------------------------------------------------------------- level / view / mode / cards
  const viewsOf = (lv: string) => Object.keys(D.views).filter((k) => D.views[k].level === lv);
  function setView(id: string, push = true) {
    if (!D.views[id]) return;
    st.view = id; st.level = D.views[id].level;
    root!.dataset.view = id; root!.dataset.level = st.level;
    const isSec = D.views[id].kind === 'section';
    root!.classList.toggle('is-sec', isSec);
    root!.querySelectorAll<HTMLElement>('.stage-wrap').forEach((w) => (w.hidden = w.dataset.stage !== id));
    root!.querySelectorAll<HTMLElement>('[data-set-level]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.setLevel === st.level)));
    root!.querySelectorAll<HTMLElement>('.vbtn').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.secBtn ? isSec && b.dataset.lv === st.level : b.dataset.setView === id)));
    root!.querySelectorAll<HTMLElement>('.chip-btn').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.setView === id)));
    root!.querySelectorAll<HTMLElement>('.card-intro').forEach((c) => (c.hidden = c.dataset.intro !== st.level || !!st.selKey));
    st.selEl = 0;
    renderStage(id);
    if (st.selKey) showCard(st.selKey, false);
    if (push) history.replaceState(null, '', `#${id}${st.selKey && !st.selKey.startsWith('bone:') ? `/${st.selKey}` : ''}`);
  }
  function showCard(key: string | '', push = true) {
    st.selKey = key;
    root!.querySelectorAll<HTMLElement>('.card-m').forEach((c) => (c.hidden = c.dataset.card !== key));
    root!.querySelectorAll<HTMLElement>('.card-intro').forEach((c) => (c.hidden = !!key || c.dataset.intro !== st.level));
    root!.querySelectorAll('.stage .mus.is-sel').forEach((p) => p.classList.remove('is-sel'));
    if (key && !key.startsWith('bone:')) {
      root!.querySelectorAll(`.stage .mus[data-key="${key}"]`).forEach((p) => p.classList.add('is-sel'));
      const card = root!.querySelector<HTMLElement>(`.card-m[data-card="${key}"]`);
      if (card) {
        const role = roleOf(key); const badge = card.querySelector<HTMLElement>('.role-badge')!;
        badge.textContent = D.roleNames[role] ?? ''; badge.className = `role-badge r-${role}`;
        const S = getStage(st.view); const info = S.v.s[key];
        const line = card.querySelector<HTMLElement>('.area-line')!;
        line.textContent = !info ? '' : S.kind === 'view'
          ? `${FB.belly}: ${fmt(info.b)} ${FB.cm2}; ${FB.diam}: ~${Math.round(info.r * 2)} ${D.ui.mm} (${FB.model}).`
          : `${FB.csa}: ${fmt(info.c, 2)} ${FB.cm2} (${FB.model}).`;
        const btn = card.querySelector<HTMLButtonElement>('.place-here')!;
        btn.hidden = !info;
      }
    }
    if (push) history.replaceState(null, '', `#${st.view}${key && !key.startsWith('bone:') ? `/${key}` : ''}`);
  }
  function setMode(m: string) {
    st.mode = m; root!.dataset.mode = m;
    root!.querySelectorAll<HTMLElement>('[data-set-mode]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.setMode === m)));
    renderStage(st.view);
  }

  root.querySelectorAll<HTMLElement>('[data-set-level]').forEach((b) => b.addEventListener('click', () => { st.selKey = ''; showCard('', false); setView(viewsOf(b.dataset.setLevel!)[0]); }));
  root.querySelectorAll<HTMLElement>('[data-set-view]').forEach((b) => b.addEventListener('click', () => setView(b.dataset.setView!)));
  root.querySelectorAll<HTMLElement>('[data-set-mode]').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.setMode!)));
  root.querySelectorAll<HTMLInputElement>('[data-toggle]').forEach((c) => c.addEventListener('change', () => {
    const k = c.dataset.toggle!;
    if (k === 'align') st.align = c.checked; else root!.dataset[k] = c.checked ? 'on' : 'off';
  }));
  root.querySelectorAll<HTMLElement>('.back').forEach((b) => b.addEventListener('click', () => showCard('')));
  root.querySelectorAll<HTMLElement>('.place-here').forEach((b) => b.addEventListener('click', () => {
    const S = getStage(st.view); const pose = recommendedPose(S, b.dataset.place!, st.type);
    if (pose) { addElectrode(st.view, pose); S.svg.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
  }));

  // ---------------------------------------------------------------- stage interactions
  let drag: null | { S: Stage; P: Placed; mode: 'move' | 'rot'; dx: number; dy: number; moved: boolean; id: number } = null;
  root.querySelectorAll<SVGSVGElement>('svg.stage').forEach((svg) => {
    const id = svg.dataset.view!;
    svg.addEventListener('touchstart', (e) => { if ((e.target as Element).closest('.el')) e.preventDefault(); }, { passive: false });
    svg.addEventListener('pointerdown', (e) => {
      const g = (e.target as Element).closest<SVGGElement>('.el');
      if (!g) return;
      const S = getStage(id); const P = (placed[id] ?? []).find((p) => p.uid === +g.dataset.uid!); if (!P) return;
      e.preventDefault();
      st.selEl = P.uid;
      const pt = toSvg(svg, e.clientX, e.clientY);
      drag = { S, P, mode: (e.target as Element).hasAttribute('data-rot') ? 'rot' : 'move', dx: pt.x - P.x, dy: pt.y - P.y, moved: false, id: e.pointerId };
      svg.setPointerCapture(e.pointerId);
      g.classList.add('drag');
      S.els.querySelectorAll('.el').forEach((x) => x.classList.toggle('sel', x === g));
      renderFeedback();
    });
    svg.addEventListener('pointermove', (e) => {
      if (drag && drag.id === e.pointerId) {
        const pt = toSvg(svg, e.clientX, e.clientY); const { S, P } = drag; drag.moved = true;
        if (drag.mode === 'rot') { P.a = (deg(Math.atan2(pt.y - P.y, pt.x - P.x)) + 90 + 360) % 360; }
        else if (S.kind === 'view') { P.x = pt.x - drag.dx; P.y = pt.y - drag.dy; }
        else Object.assign(P, skinPose(S, nearestSkin(S, pt.x, pt.y)));
        evaluate(S, P);
        const g = S.els.querySelector<SVGGElement>(`.el[data-uid="${P.uid}"]`);
        if (g && S.kind === 'view') {
          g.setAttribute('transform', `translate(${P.x.toFixed(1)} ${P.y.toFixed(1)}) rotate(${P.a.toFixed(1)})`);
          g.classList.remove('good', 'fair', 'poor'); g.classList.add(P.q!);
          const b = g.querySelector('g'); if (b) { const t = b.getAttribute('transform')!.replace(/rotate\([^)]*\)/, `rotate(${-P.a})`); b.setAttribute('transform', t); }
          renderFeedback();
        } else renderStage(id);
        return;
      }
      // hover tooltip
      const t = e.target as Element;
      const key = (t as HTMLElement).dataset?.key, bone = (t as HTMLElement).dataset?.bone;
      if ((key || bone) && e.pointerType === 'mouse') {
        const r = fig.getBoundingClientRect();
        tip.innerHTML = key ? `${esc(mName(key))}<small>${esc(st.mode === 'direct' ? D.roleNames[roleOf(key)] ?? '' : '')}</small>` : esc(D.bones[bone!] ?? bone!);
        tip.style.left = `${Math.min(e.clientX - r.left + 14, r.width - 250)}px`; tip.style.top = `${e.clientY - r.top + 14}px`;
        tip.classList.add('on');
      } else tip.classList.remove('on');
    });
    svg.addEventListener('pointerleave', () => tip.classList.remove('on'));
    const end = (e: PointerEvent) => {
      if (!drag || drag.id !== e.pointerId) return;
      const { S } = drag; drag = null;
      S.els.querySelectorAll('.drag').forEach((x) => x.classList.remove('drag'));
      renderStage(S.id);
    };
    svg.addEventListener('pointerup', end);
    svg.addEventListener('pointercancel', end);
    svg.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      if (t.closest('.el')) return;
      const key = t.dataset?.key, bone = t.dataset?.bone;
      const S = getStage(id);
      if (key && st.armed) {
        const pose = recommendedPose(S, key, st.type);
        if (pose) addElectrode(id, pose);
        setArmed(false);
        showCard(key);
        return;
      }
      if (key) { showCard(key); return; }
      if (bone) { showCard(`bone:${bone}`); return; }
      if (st.selEl) { st.selEl = 0; S.els.querySelectorAll('.el.sel').forEach((x) => x.classList.remove('sel')); renderFeedback(); }
    });
    svg.addEventListener('keydown', (e) => {
      const t = e.target as HTMLElement;
      if (t.classList?.contains('mus') && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); t.dispatchEvent(new MouseEvent('click', { bubbles: true })); return; }
      const g = t.closest?.('.el') as SVGGElement | null; if (!g) return;
      const S = getStage(id); const P = (placed[id] ?? []).find((p) => p.uid === +g.dataset.uid!); if (!P) return;
      const big = e.shiftKey ? 5 : 1; let handled = true;
      if (S.kind === 'view') {
        if (e.key === 'ArrowLeft') P.x -= big * S.s; else if (e.key === 'ArrowRight') P.x += big * S.s;
        else if (e.key === 'ArrowUp') P.y -= big * S.s; else if (e.key === 'ArrowDown') P.y += big * S.s;
        else if (e.key === '[') P.a = (P.a - 5 + 360) % 360; else if (e.key === ']') P.a = (P.a + 5) % 360;
        else handled = false;
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') Object.assign(P, skinPose(S, (P.i ?? 0) - big));
      else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') Object.assign(P, skinPose(S, (P.i ?? 0) + big));
      else handled = false;
      if (e.key === 'Delete' || e.key === 'Backspace') { placed[id] = (placed[id] ?? []).filter((p) => p !== P); handled = true; }
      if (!handled) return;
      e.preventDefault(); st.selEl = P.uid; renderStage(id);
      S.els.querySelector<SVGGElement>(`.el[data-uid="${P.uid}"]`)?.focus();
    });
  });

  // feedback actions
  fbBox.querySelectorAll<HTMLElement>('[data-el-act]').forEach((b) => b.addEventListener('click', () => {
    const list = placed[st.view] ?? []; const P = list.find((p) => p.uid === st.selEl) ?? list[list.length - 1]; if (!P) return;
    const S = getStage(st.view); const r: any = (P as any).r ?? {}; const act = b.dataset.elAct;
    if (act === 'rotl') P.a = (P.a - 15 + 360) % 360;
    else if (act === 'rotr') P.a = (P.a + 15) % 360;
    else if (act === 'align' && r.main && S.v.s[r.main]) P.a = S.v.s[r.main].a;
    else if (act === 'site' && r.main) { const pose = recommendedPose(S, r.main, P.type); if (pose) Object.assign(P, pose); }
    else if (act === 'del') { placed[st.view] = list.filter((p) => p !== P); st.selEl = 0; }
    if (act !== 'del') st.selEl = P.uid;
    renderStage(st.view);
  }));
  root.querySelector('[data-act="clear"]')?.addEventListener('click', () => { placed[st.view] = []; st.selEl = 0; renderStage(st.view); });
  root.querySelector('[data-act="ring"]')?.addEventListener('click', () => {
    const S = getStage(st.view); if (S.kind !== 'section') return;
    const { pts, c } = S.skin!; placed[st.view] = [];
    const type = EL.remote ? 'remote' : st.type; setType(type);
    for (let k = 0; k < 8; k++) {
      const th = -Math.PI / 2 + (k * Math.PI) / 4;
      let bi = 0, bd = Infinity;
      pts.forEach((p, i) => { const a = Math.atan2(p.y - c.y, p.x - c.x); let d = Math.abs(a - th); d = Math.min(d, 2 * Math.PI - d); if (d < bd) { bd = d; bi = i; } });
      const p: Placed = { uid: uid++, type, ...skinPose(S, bi) };
      placed[st.view].push(p);
    }
    st.selEl = 0; renderStage(st.view);
  });

  // ---------------------------------------------------------------- palette: tap to arm, drag to place
  root.querySelectorAll<HTMLElement>('.pal-item').forEach((item) => {
    let start: { x: number; y: number; id: number } | null = null; let ghost: HTMLElement | null = null; let dragging = false;
    let overStage: Stage | null = null; let preview: SVGGElement | null = null;
    const clearPreview = () => { preview?.remove(); preview = null; };
    item.addEventListener('pointerdown', (e) => { start = { x: e.clientX, y: e.clientY, id: e.pointerId }; dragging = false; item.setPointerCapture(e.pointerId); });
    item.addEventListener('pointermove', (e) => {
      if (!start || start.id !== e.pointerId) return;
      if (!dragging && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 6) {
        dragging = true; setType(item.dataset.el!); setArmed(false);
        ghost = document.createElement('div'); ghost.className = 'mm-ghost';
        ghost.innerHTML = item.querySelector('.pal-svg')!.innerHTML; document.body.appendChild(ghost);
      }
      if (!dragging) return;
      const under = document.elementFromPoint(e.clientX, e.clientY);
      const svg = under?.closest<SVGSVGElement>('svg.stage');
      clearPreview();
      if (svg) {
        overStage = getStage(svg.dataset.view!);
        const pt = toSvg(svg, e.clientX, e.clientY);
        const pose = poseAt(overStage, pt.x, pt.y, st.type);
        preview = drawElectrode(overStage, { uid: -1, ...pose }, (placed[overStage.id]?.length ?? 0) + 1, 'preview');
        if (ghost) ghost.style.display = 'none';
      } else {
        overStage = null;
        if (ghost) { ghost.style.display = ''; ghost.style.left = `${e.clientX}px`; ghost.style.top = `${e.clientY}px`; }
      }
    });
    const finish = (e: PointerEvent, cancel = false) => {
      if (!start || start.id !== e.pointerId) return;
      start = null; ghost?.remove(); ghost = null; clearPreview();
      if (!dragging) {
        if (cancel) return;
        const same = st.type === item.dataset.el && st.armed;
        setType(item.dataset.el!); setArmed(!same);
        return;
      }
      dragging = false;
      if (overStage && !cancel) {
        const pt = toSvg(overStage.svg, e.clientX, e.clientY);
        addElectrode(overStage.id, poseAt(overStage, pt.x, pt.y, st.type));
      }
      overStage = null;
    };
    item.addEventListener('pointerup', (e) => finish(e));
    item.addEventListener('pointercancel', (e) => finish(e, true));
    item.addEventListener('keydown', (e) => { if (e.key === 'Escape') setArmed(false); });
    item.addEventListener('click', (e) => { if (e.detail === 0) { const same = st.type === item.dataset.el && st.armed; setType(item.dataset.el!); setArmed(!same); } });
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && st.armed) setArmed(false); });

  // ---------------------------------------------------------------- hash
  const fromHash = () => {
    const [v, k] = decodeURIComponent(location.hash.replace('#', '')).split('/');
    if (!v) return;
    const id = D.views[v] ? v : ['ph', 'tr', 'th', 'sd'].includes(v) ? viewsOf(v)[0] : '';
    if (!id) return;
    st.selKey = k && D.muscles[k] ? k : '';
    setView(id, false);
    if (st.selKey) showCard(st.selKey, false);
  };
  window.addEventListener('hashchange', fromHash);
  if (location.hash) fromHash(); else setView(st.view, false);

  initSim();
}

// ---------------------------------------------------------------- EMG simulator
function initSim() {
  const box = document.querySelector<HTMLElement>('.sim');
  const cv = box?.querySelector<HTMLCanvasElement>('.sim-cv');
  const data = document.getElementById('mm-data');
  if (!box || !cv || !data) return;
  const D = JSON.parse(data.textContent || '{}');
  const c = cv.getContext('2d')!;
  const inp = (k: string) => box.querySelector<HTMLInputElement>(`[data-sim="${k}"]`)!;
  const stateEl = box.querySelector<HTMLElement>('.sim-state')!;
  const f1 = box.querySelector<SVGGElement>('.sh-f1')!, f2 = box.querySelector<SVGGElement>('.sh-f2')!;
  const N = 360;
  const raw1 = new Float32Array(N), raw2 = new Float32Array(N), env1 = new Float32Array(N), env2 = new Float32Array(N);
  let e1 = 0, e2 = 0, ap = 0.3, head = 0, running = false, lastState = '';
  const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const W = cv.width, H = cv.height;
  function step() {
    const A = +inp('a').value / 100, B = +inp('b').value / 100, thr = +inp('thr').value / 100;
    const x = inp('x').checked, t = inp('t').checked;
    for (let k = 0; k < 3; k++) {
      const m1 = gauss() * A * (t ? 0.15 : 1), m2 = gauss() * B;
      const r1 = m1 + (x ? 0.3 * m2 : 0) + gauss() * 0.02, r2 = m2 + (x ? 0.3 * m1 : 0) + gauss() * 0.02;
      e1 += 0.06 * (Math.abs(r1) / 0.8 - e1); e2 += 0.06 * (Math.abs(r2) / 0.8 - e2);
      raw1[head] = r1; raw2[head] = r2; env1[head] = e1; env2[head] = e2; head = (head + 1) % N;
    }
    const on1 = e1 > thr, on2 = e2 > thr;
    let s = 'idle';
    if (on1 && on2) s = 'both';
    else if (on1) { ap = Math.min(1, ap + 0.012 * (e1 - thr) / (1 - thr + 0.01) + 0.002); s = 'open'; }
    else if (on2) { ap = Math.max(0, ap - 0.012 * (e2 - thr) / (1 - thr + 0.01) - 0.002); s = 'close'; }
    if (s === 'open' && ap >= 1) s = 'idle';
    if (s === 'close' && ap <= 0) s = 'idle';
    if (s !== lastState) { stateEl.textContent = D.ui.simState[s]; lastState = s; }
    f1.setAttribute('transform', `rotate(${20 - ap * 48} 38 86)`); f2.setAttribute('transform', `rotate(${-5 + ap * 16} 74 82)`);
    draw(thr);
  }
  function trace(buf: Float32Array, y0: number, h: number, col: string, scale: number, fill = false) {
    c.beginPath();
    for (let i = 0; i < N; i++) {
      const v = buf[(head + i) % N]; const x = (i / (N - 1)) * (W - 20) + 10; const y = y0 - Math.max(-1.2, Math.min(1.2, v * scale)) * h;
      i ? c.lineTo(x, y) : c.moveTo(x, y);
    }
    c.strokeStyle = col; c.lineWidth = fill ? 2 : 1; c.stroke();
  }
  function draw(thr: number) {
    c.clearRect(0, 0, W, H);
    c.font = '12px ui-monospace, monospace'; c.fillStyle = '#6b7380';
    c.fillText(`${D.ui.ch} 1 · ${D.ui.raw}`, 12, 16); c.fillText(`${D.ui.ch} 2`, 12, 96);
    c.strokeStyle = '#e3e7ee'; c.lineWidth = 1;
    [50, 130].forEach((y) => { c.beginPath(); c.moveTo(10, y); c.lineTo(W - 10, y); c.stroke(); });
    trace(raw1, 50, 28, '#2756b8', 1); trace(raw2, 130, 28, '#c98a1b', 1);
    const y0 = 300, h = 120;
    c.fillText(D.ui.env, 12, 176);
    c.beginPath(); c.moveTo(10, y0); c.lineTo(W - 10, y0); c.strokeStyle = '#cfd5de'; c.stroke();
    c.setLineDash([6, 5]); c.beginPath(); c.moveTo(10, y0 - thr * h); c.lineTo(W - 10, y0 - thr * h); c.strokeStyle = '#b23b3b'; c.stroke(); c.setLineDash([]);
    trace(env1, y0, h, '#2756b8', 1, true); trace(env2, y0, h, '#c98a1b', 1, true);
  }
  const loop = () => { if (!running) return; step(); requestAnimationFrame(loop); };
  const io = new IntersectionObserver((es) => { const vis = es.some((e) => e.isIntersecting); if (vis && !running) { running = true; requestAnimationFrame(loop); } else if (!vis) running = false; });
  io.observe(cv);
  draw(+inp('thr').value / 100);
}
