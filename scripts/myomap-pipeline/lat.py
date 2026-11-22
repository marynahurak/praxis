import json, numpy as np, cv2
from PIL import Image
from process import paths_from_mask
m=json.load(open('assets/sd_post.json')); H,W=m['h'],m['w']; ppm=m['ppm']
poly=[(0.0,1.275),(-0.06,1.268),(-0.098,1.276),(-0.13,1.293),(-0.165,1.318),(-0.178,1.332),(-0.189,1.316),(-0.184,1.27),(-0.171,1.2),(-0.16,1.13),(0.0,1.13)]
pts=np.array([[(0.02-x)*ppm,(1.62-y)*ppm] for x,y in poly],np.int32)
mask=np.zeros((H,W),np.uint8); cv2.fillPoly(mask,[pts],1)
hit=np.array(Image.open('assets/sd_post-hit.png').convert('RGB'))
idx={s['key']:s['i'] for s in m['structs']}
sup=[k for k in idx if k.startswith(('trap','delt','tb_','bb_','coraco','humerus','infra','teres_min'))]
for k in sup: mask[hit[...,0]==idx[k]]=0
mask[hit[...,0]==0]=0  # only over rendered anatomy
newi=max(s['i'] for s in m['structs'])+1
hit[...,0][mask==1]=newi; hit[...,1][mask==1]=8  # flag 8 = schematic
Image.fromarray(hit,'RGB').save('assets/sd_post-hit.png',optimize=True)
dist=cv2.distanceTransform(mask,cv2.DIST_L2,5); y,x=np.unravel_index(np.argmax(dist),dist.shape)
m['structs']=[s for s in m['structs'] if s['key']!='lat']
m['structs'].append({'key':'lat','kind':'muscle','i':int(newi),'schematic':True,'d':paths_from_mask(mask.astype(bool)),'t':'','site':[int(x),int(y)],'r_mm':round(float(dist.max())/ppm*1000,1),'axis':35.0,'area_cm2':round(int(mask.sum())/ppm/ppm*1e4,1),'belly_cm2':round(int(mask.sum())/ppm/ppm*1e4,1)})
json.dump(m,open('assets/sd_post.json','w')); print('lat area cm2', round(mask.sum()/ppm/ppm*1e4,1), 'site', x, y)
