# Векторні ілюстрації атласу для PDF-зрізу: проєкції, поперечні зрізи, контури електродів.
# Геометрія — src/data/myomap-geo (BodyParts3D © DBCLS, CC BY 4.0, оброблено Praxis).
import base64, json, glob, math, html, os
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = str(HERE.parents[1])
BUILD = os.environ.get('MYOMAP_BUILD', str(HERE / 'build'))
D = json.load(open(f'{ROOT}/src/data/myomap.json'))
SEC = json.load(open(f'{ROOT}/src/data/myomap-geo/sections.json'))
GEO = {}
for f in glob.glob(f'{ROOT}/src/data/myomap-geo/*_*.json'):
    g = json.load(open(f)); GEO[g['id']] = g
U = json.load(open(f'{BUILD}/ui.json'))
ABBR = U['abbr']
ROLE_FILL = {'primary': '#3d6fd6', 'secondary': '#93b0ea', 'caution': '#e3b462', 'conditional': '#bccdf2', 'deep': '#b7bfcc', 'context': '#d5d9e0'}
SITE_ROLES = ('primary', 'secondary', 'conditional')
PX_PER_MM = 96 / 25.4  # CSS px на мм у Chromium


def role_of(lv, key):
    return D['levels'][lv]['roles'].get(key, 'context')


def is_tmr(lv, key):
    return lv in (D['muscles'].get(key, {}).get('tmr') or [])


_img_cache = {}
def shade_uri(vid):
    if vid not in _img_cache:
        b = open(f'{ROOT}/public/myomap/{vid}.webp', 'rb').read()
        _img_cache[vid] = 'data:image/webp;base64,' + base64.b64encode(b).decode()
    return _img_cache[vid]


def scale_bar(ppm, w):
    mm = 10
    for o in (10, 20, 50, 100):
        if o * ppm / 1000 <= 0.28 * w:
            mm = o
    return mm, mm * ppm / 1000


def esc(s):
    return html.escape(str(s), quote=True)


def base_svg(vid, lv):
    """Растровий шар проєкції: шкіра, затінення, м'язи за роллю (multiply), кістки, сухожилкові зони.
    Змішування multiply Chromium у PDF розтеризує фрагментами, тому шар готується заздалегідь (raster.cjs)."""
    g = GEO[vid]; w, h = g['w'], g['h']
    out = [f'<svg viewBox="0 0 {w} {h}" width="{w}" height="{h}" xmlns="http://www.w3.org/2000/svg" style="display:block;background:#fff">']
    out.append(f'<path d="{g["skin"]}" fill="#eef1f6" stroke="#c3cad6" stroke-width="1.2"/>')
    out.append(f'<image href="{shade_uri(vid)}" width="{w}" height="{h}"/>')
    for s in g['structs']:
        if s['kind'] == 'bone':
            out.append(f'<path d="{s["d"]}" fill="#ece2c7" fill-rule="evenodd" style="mix-blend-mode:multiply" stroke="rgba(22,27,34,0.16)" stroke-width="0.6"/>')
        elif s['kind'] == 'muscle':
            r = role_of(lv, s['key'])
            if s.get('schematic'):
                out.append(f'<path d="{s["d"]}" fill="{ROLE_FILL[r]}" fill-opacity="0.72" fill-rule="evenodd"/>')
            else:
                out.append(f'<path d="{s["d"]}" fill="{ROLE_FILL[r]}" fill-rule="evenodd" style="mix-blend-mode:multiply" stroke="rgba(22,27,34,0.16)" stroke-width="0.6"/>')
    for s in g['structs']:
        if s['kind'] == 'muscle' and s.get('t'):
            out.append(f'<path d="{s["t"]}" fill="#f3eee1" opacity="0.86" fill-rule="evenodd"/>')
    out.append('</svg>')
    return ''.join(out)


def raster_uri(vid):
    return 'data:image/jpeg;base64,' + base64.b64encode(open(f'{BUILD}/ras/{vid}.jpg', 'rb').read()).decode()


def view_svg(vid, lv, width_mm, uid, mm_label='мм', labels=True, sites=True, weak=True, bar=True):
    """Проєкція: растровий шар (base_svg) + векторні накладки: штрихування слабкого сигналу, найбільше вписане коло
    та довга вісь черевця для типових, додаткових і залежних від анатомії місць, підписи, масштабна лінійка."""
    g = GEO[vid]; w, h = g['w'], g['h']
    k = width_mm * PX_PER_MM / w          # CSS px на одиницю схеми
    fs = 7.4 / k                          # ~5.5 pt підпис
    out = [f'<svg class="fig-svg" viewBox="0 0 {w} {h}" width="{width_mm:.2f}mm" height="{width_mm * h / w:.2f}mm" xmlns="http://www.w3.org/2000/svg">']
    out.append(f'<defs><pattern id="w-{uid}" width="{6/k*0.9:.2f}" height="{6/k*0.9:.2f}" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">'
               f'<line x1="0" y1="0" x2="0" y2="{6/k*0.9:.2f}" stroke="rgba(150,110,50,0.55)" stroke-width="{0.9/k:.2f}"/></pattern></defs>')
    out.append(f'<image href="{raster_uri(vid)}" width="{w}" height="{h}"/>')
    mus = [s for s in g['structs'] if s['kind'] == 'muscle']
    for s in mus:
        if s.get('schematic'):
            out.append(f'<path d="{s["d"]}" fill="none" fill-rule="evenodd" stroke="#2756b8" stroke-width="{1.0/k:.2f}" stroke-dasharray="{4/k:.1f} {3/k:.1f}"/>')
    if weak:
        for s in mus:
            if s.get('t'):
                out.append(f'<path d="{s["t"]}" fill="url(#w-{uid})" fill-rule="evenodd"/>')
        for s in g['structs']:
            if s['kind'] == 'bone':
                out.append(f'<path d="{s["d"]}" fill="url(#w-{uid})" fill-rule="evenodd"/>')
    if sites:
        for s in mus:
            r = role_of(lv, s['key'])
            if r not in SITE_ROLES or s.get('schematic'):
                continue
            x, y = s['site']; rp = float(s['r_mm']) * g['ppm'] / 1000
            if rp * k < 3:
                continue
            a = math.radians(float(s['axis'])); L = rp + 5 * g['ppm'] / 1000
            out.append(f'<circle cx="{x}" cy="{y}" r="{rp:.1f}" fill="none" stroke="#161b22" stroke-opacity="0.75" stroke-width="{0.6/k:.2f}" stroke-dasharray="{2.2/k:.1f} {1.6/k:.1f}"/>')
            out.append(f'<line x1="{x - L*math.cos(a):.1f}" y1="{y - L*math.sin(a):.1f}" x2="{x + L*math.cos(a):.1f}" y2="{y + L*math.sin(a):.1f}" stroke="#161b22" stroke-opacity="0.75" stroke-width="{0.6/k:.2f}"/>')
    if labels:
        for s in mus:
            r = role_of(lv, s['key'])
            rp = float(s['r_mm']) * g['ppm'] / 1000
            if r == 'context' and float(s.get('belly_cm2') or 0) < 4:
                continue
            if rp * k < 3.2 or float(s.get('belly_cm2') or 0) < 0.3:
                continue
            x, y = s['site']
            x = min(max(x, fs * 1.4), w - fs * 1.4); y = min(max(y, fs * 0.8), h - fs * 0.8)  # не обрізати підпис краєм
            out.append(f'<text x="{x}" y="{y}" font-size="{fs:.1f}" class="lbl" stroke-width="{2.4/k:.2f}">{esc(ABBR.get(s["key"], s["key"]))}</text>')
    if bar:
        mm, px = scale_bar(g['ppm'], w)
        y0 = h - 10 / k
        out.append(f'<g class="bar"><path d="M{8/k:.1f} {y0 - 3/k:.1f}v{3/k:.1f}h{px:.1f}v{-3/k:.1f}" fill="none" stroke="#3b4452" stroke-width="{0.8/k:.2f}"/>'
                   f'<text x="{8/k + px/2:.1f}" y="{y0 - 5/k:.1f}" font-size="{6.6/k:.1f}" text-anchor="middle" class="bar-t">{mm} {mm_label}</text></g>')
    out.append('</svg>')
    return ''.join(out)


def section_svg(sid, lv, k, uid, mm_label='мм'):
    """Поперечний зріз у спільному масштабі k (CSS px на одиницю схеми); вигляд з дистального боку."""
    g = SEC[sid]; w, h = g['w'], g['h']; pad = 24
    W, H = w + 2 * pad, h + 2 * pad
    fs = 7.0 / k; sw = 0.9 / k
    out = [f'<svg class="fig-svg" viewBox="{-pad} {-pad} {W} {H}" width="{W*k/PX_PER_MM:.2f}mm" height="{H*k/PX_PER_MM:.2f}mm" xmlns="http://www.w3.org/2000/svg">']
    out.append(f'<defs><pattern id="w-{uid}" width="{5/k:.2f}" height="{5/k:.2f}" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">'
               f'<line x1="0" y1="0" x2="0" y2="{5/k:.2f}" stroke="rgba(150,110,50,0.55)" stroke-width="{0.8/k:.2f}"/></pattern></defs>')
    out.append(f'<path d="{g["skin"]}" fill="#f4efe6" stroke="#b9b1a0" stroke-width="{1.0/k:.2f}"/>')
    for s in g['structs']:
        if s['kind'] == 'bone':
            out.append(f'<path d="{s["d"]}" fill="#efe6cf" stroke="#b8ab88" stroke-width="{sw:.2f}" fill-rule="evenodd"/>')
        elif s['kind'] == 'muscle':
            ten = str(s.get('tendon')) == 'True' or s.get('tendon') is True
            fill = '#efe8d6' if ten else ROLE_FILL[role_of(lv, s['key'])]
            out.append(f'<path d="{s["d"]}" fill="{fill}" stroke="#fff" stroke-width="{sw:.2f}" fill-rule="evenodd"/>')
        else:
            out.append(f'<path d="{s["d"]}" fill="#d5d9e0" stroke="#fff" stroke-width="{sw:.2f}" fill-rule="evenodd"/>')
    for s in g['structs']:
        ten = str(s.get('tendon')) == 'True' or s.get('tendon') is True
        if ten or s['kind'] == 'bone':
            out.append(f'<path d="{s["d"]}" fill="url(#w-{uid})" fill-rule="evenodd"/>')
    thr = 0.15 if lv == 'ph' else 0.45
    for s in g['structs']:
        ten = str(s.get('tendon')) == 'True' or s.get('tendon') is True
        if s['kind'] == 'muscle' and not ten and float(s.get('area_cm2') or 0) > thr:
            x, y = s['site']
            out.append(f'<text x="{x}" y="{y}" font-size="{fs:.1f}" class="lbl" stroke-width="{2.2/k:.2f}">{esc(ABBR.get(s["key"], s["key"]))}</text>')
    mm, px = scale_bar(g['ppm'], w)
    out.append(f'<g class="bar"><path d="M{-14:.1f} {h + 12:.1f}v{3/k:.1f}h{px:.1f}v{-3/k:.1f}" fill="none" stroke="#3b4452" stroke-width="{0.8/k:.2f}"/>'
               f'<text x="{-14 + px/2:.1f}" y="{h + 12 - 2/k:.1f}" font-size="{6.4/k:.1f}" text-anchor="middle" class="bar-t">{mm} {mm_label}</text></g>')
    out.append('</svg>')
    return ''.join(out)


def electrode_svg(e, sc_mm=1.0):
    """Контур електрода в масштабі 1:1 (sc_mm мм на мм)."""
    W = (e['flange'][0] if e.get('flange') else e['w']) + 4
    H = (e['flange'][1] if e.get('flange') else max(e['h'], 14)) + 4
    cx, cy = W / 2, H / 2
    s = [f'<svg viewBox="0 0 {W} {H}" width="{W*sc_mm}mm" height="{H*sc_mm}mm" xmlns="http://www.w3.org/2000/svg">']
    if e.get('flange'):
        s.append(f'<ellipse cx="{cx}" cy="{cy}" rx="{e["flange"][0]/2}" ry="{e["flange"][1]/2}" fill="#e5ebd8" stroke="#8a9877" stroke-width="0.3"/>')
    if e.get('domes'):
        s.append(f'<rect x="{cx - e["w"]/2}" y="{cy - e["h"]/2}" width="{e["w"]}" height="{e["h"]}" rx="{e["h"]/2}" fill="#dfe3e9" stroke="#5b6472" stroke-width="0.3"/>')
        for d in e['domes']:
            s.append(f'<circle cx="{cx + d}" cy="{cy}" r="3.4" fill="#7f8a9b" stroke="#3b4350" stroke-width="0.25"/>')
    else:
        s.append(f'<rect x="{cx - e["w"]/2}" y="{cy - e["h"]/2}" width="{e["w"]}" height="{e["h"]}" rx="3" fill="#ced3db" stroke="#3f4754" stroke-width="0.35"/>')
        for c in e.get('contacts', []):
            s.append(f'<rect x="{cx + c["x"] - c["w"]/2}" y="{cy - c["h"]/2}" width="{c["w"]}" height="{c["h"]}" rx="{c["w"]/2}" fill="#7f8a9b" stroke="#3b4350" stroke-width="0.25"/>')
    s.append('</svg>')
    return ''.join(s)
