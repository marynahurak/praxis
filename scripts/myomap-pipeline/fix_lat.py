# The schematic latissimus dorsi is drawn as a solid sheet: keep only its outer ring (no holes between ribs).
import json, re
def area(pts):
    return abs(sum(pts[i][0]*pts[(i+1)%len(pts)][1]-pts[(i+1)%len(pts)][0]*pts[i][1] for i in range(len(pts))))/2
for vid in ['sd_post', 'sd_ant']:
    g = json.load(open(f'assets/{vid}.json'))
    for s in g['structs']:
        if s['key'] == 'lat':
            subs = [p for p in s['d'].split('M') if p.strip()]
            def pts(p):
                n = list(map(float, re.findall(r'-?\d*\.?\d+', p))); return list(zip(n[::2], n[1::2]))
            best = max(subs, key=lambda p: area(pts(p)))
            s['d'] = 'M' + best.strip()
            print(vid, len(subs), '->1')
    json.dump(g, open(f'assets/{vid}.json', 'w'))
