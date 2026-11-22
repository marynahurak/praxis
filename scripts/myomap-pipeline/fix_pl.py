# Крок 8 (v2.1.1): долонний апоневроз у сітці довгого долонного м'яза.
# У BodyParts3D сітка «Right palmaris longus» містить і долонний апоневроз (aponeurosis palmaris).
# Широкий плоский апоневроз не проходить пороги thickness.py як сухожилок, тому process.py
# сприймав його як черевце: на передній поверхні передпліччя рекомендоване місце потрапляло
# на долоню. Виправлення (лише для pl):
#   tr_ant — усе дистальніше найвужчого місця сухожилка (у нижніх 40% проєкції) позначено як
#            сухожилкову зону; рекомендоване місце, вісь і площі перераховано тим самим кодом, що в process.py;
#   ph_palm, ph_dors — на рівні кисті pl представлений лише сухожилком і апоневрозом, тож увесь
#            контур позначено як сухожилкову тканину (як для зовнішніх м'язів кисті на зрізі ph_s1).
# Запуск: python3 fix_pl.py <тека з *-id.png і *-tendon.png> <тека src/data/myomap-geo>
import json, sys, numpy as np, cv2
from PIL import Image
from keys import classify
from process import paths_from_mask

OUT, GEO = sys.argv[1], sys.argv[2]
names = json.load(open(f'{OUT}/names.json'))


def masks(vid):
    idimg = np.array(Image.open(f'{OUT}/{vid}-id.png').convert('RGBA'))
    ids = idimg[..., 0].astype(int) + idimg[..., 1].astype(int) * 256; ids[idimg[..., 3] < 255] = 0
    tn = np.array(Image.open(f'{OUT}/{vid}-tendon.png').convert('RGBA')); tendon = (tn[..., 0] > 127) & (tn[..., 3] > 200)
    m = np.zeros(ids.shape, bool)
    for i in np.unique(ids):
        if i and classify(names[i - 1])[0] == 'pl':
            m |= ids == i
    return m, tendon


def metrics(m, tendon, ppm):
    # той самий розрахунок, що в process.py
    belly = m & ~tendon; td = m & tendon
    t = paths_from_mask(td, minarea=40) if td.sum() > 40 else ''
    src = belly if belly.sum() > 80 else m
    dist = cv2.distanceTransform(src.astype(np.uint8), cv2.DIST_L2, 5)
    y, x = np.unravel_index(np.argmax(dist), dist.shape)
    ys, xs = np.nonzero(src); pts = np.stack([xs, ys], 1).astype(float); pts -= pts.mean(0)
    ax = np.linalg.svd(pts, full_matrices=False)[2][0]
    ang = float(np.degrees(np.arctan2(ax[1], ax[0])))
    if ang < 0: ang += 180
    return {'t': t, 'site': [int(x), int(y)], 'r_mm': round(float(dist.max()) / ppm * 1000, 1), 'axis': round(ang, 1),
            'area_cm2': round(int(m.sum()) / ppm / ppm * 1e4, 1), 'belly_cm2': round(int(belly.sum()) / ppm / ppm * 1e4, 1)}


for vid in ('tr_ant', 'ph_palm', 'ph_dors'):
    path = f'{GEO}/{vid}.json'; g = json.load(open(path)); ppm = g['ppm']
    s = next(x for x in g['structs'] if x.get('key') == 'pl')
    m, tendon = masks(vid)
    before = metrics(m, tendon, ppm)
    assert before['site'] == s['site'] and before['r_mm'] == s['r_mm'], (vid, before['site'], s['site'])  # маски ті самі, що в публікації
    if vid == 'tr_ant':
        H = m.shape[0]; rows = m.sum(1); lo = int(0.6 * H)
        cand = [y for y in range(lo, H) if rows[y] > 0]
        wmin = min(rows[y] for y in cand)
        cut = max(y for y in cand if rows[y] <= wmin + 1)   # найдистальніший рядок найвужчої частини сухожилка
        apo = m.copy(); apo[:cut + 1] = False
        print(vid, 'cut at row', cut, 'of', H, '; aponeurosis px', int(apo.sum()))
    else:
        apo = m.copy()
    after = metrics(m, tendon | apo, ppm)
    print(vid, 'before', {k: before[k] for k in ('site', 'r_mm', 'axis', 'belly_cm2')}, 'after', {k: after[k] for k in ('site', 'r_mm', 'axis', 'belly_cm2')})
    s.update(after)
    json.dump(g, open(path, 'w'))
