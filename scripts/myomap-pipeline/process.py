import json, numpy as np, cv2, sys, os
from PIL import Image
from keys import classify
names=json.load(open('out/names.json')); views={v['id']:v for v in json.load(open('views.json'))}
os.makedirs('assets',exist_ok=True)
def paths_from_mask(mask, eps=0.9, minarea=25):
    cs,h=cv2.findContours(mask.astype(np.uint8),cv2.RETR_CCOMP,cv2.CHAIN_APPROX_NONE)
    out=[]
    for c in cs:
        if abs(cv2.contourArea(c))<minarea: continue
        a=cv2.approxPolyDP(c,eps,True).reshape(-1,2)
        if len(a)<3: continue
        out.append('M'+'L'.join(f'{x} {y}' for x,y in a)+'Z')
    return ''.join(out)
def process(vid):
    v=views[vid]
    idimg=np.array(Image.open(f'out/{vid}-id.png').convert('RGBA'))
    ids=idimg[...,0].astype(int)+idimg[...,1].astype(int)*256; ids[idimg[...,3]<255]=0
    tn=np.array(Image.open(f'out/{vid}-tendon.png').convert('RGBA')); tendon=(tn[...,0]>127)&(tn[...,3]>200)
    sk=np.array(Image.open(f'out/{vid}-skin.png').convert('RGBA'))[...,3]>0
    sh=np.array(Image.open(f'out/{vid}-shade.png').convert('RGBA'))
    H,W=ids.shape; ppm=v['ppm']
    keymask={}; kinds={}
    for i in np.unique(ids):
        if i==0: continue
        k,kind=classify(names[i-1])
        keymask.setdefault(k,np.zeros((H,W),bool)); keymask[k]|=(ids==i); kinds[k]=kind
    # shade: grayscale luminance with alpha = any structure
    alpha=(ids>0)
    lum=(0.3*sh[...,0]+0.59*sh[...,1]+0.11*sh[...,2]).astype(np.uint8)
    g=np.dstack([lum,lum,lum,(alpha*255).astype(np.uint8)])
    Image.fromarray(g,'RGBA').save(f'assets/{vid}.webp',quality=82,method=6)
    # idmap for hit testing: R=index, G=flags(1 tendon,2 bone,4 ctx)
    keys=[k for k in keymask if k!='ctx']+(['ctx'] if 'ctx' in keymask else [])
    R=np.zeros((H,W),np.uint8); G=np.zeros((H,W),np.uint8)
    for j,k in enumerate(keys):
        m=keymask[k]; R[m]=j+1
        if kinds[k]=='bone': G[m]=2
        elif kinds[k]=='ctx': G[m]=4
        else: G[m&tendon]=1
    Image.fromarray(np.dstack([R,G,np.zeros_like(R)]),'RGB').save(f'assets/{vid}-hit.png',optimize=True)
    structs=[]
    for j,k in enumerate(keys):
        m=keymask[k]; area=int(m.sum())
        if area<60: continue
        s={'key':k,'kind':kinds[k],'i':j+1,'d':paths_from_mask(m)}
        if kinds[k]=='muscle':
            belly=m&~tendon; td=m&tendon
            s['t']=paths_from_mask(td,minarea=40) if td.sum()>40 else ''
            src=belly if belly.sum()>80 else m
            dist=cv2.distanceTransform(src.astype(np.uint8),cv2.DIST_L2,5)
            y,x=np.unravel_index(np.argmax(dist),dist.shape)
            ys,xs=np.nonzero(src); pts=np.stack([xs,ys],1).astype(float); pts-=pts.mean(0)
            u,sv,vt=np.linalg.svd(pts,full_matrices=False); ax=vt[0]
            ang=float(np.degrees(np.arctan2(ax[1],ax[0])))
            if ang<0: ang+=180
            s.update({'site':[int(x),int(y)],'r_mm':round(float(dist.max())/ppm*1000,1),'axis':round(ang,1),'area_cm2':round(area/ppm/ppm*1e4,1),'belly_cm2':round(int(belly.sum())/ppm/ppm*1e4,1)})
        else:
            ys,xs=np.nonzero(m); s['site']=[int(np.median(xs)),int(np.median(ys))]
        structs.append(s)
    halo=cv2.dilate(alpha.astype(np.uint8),cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(int(0.011*ppm)*2+1,)*2))>0
    skm=(sk&halo)|cv2.dilate(alpha.astype(np.uint8),cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(int(0.004*ppm)*2+1,)*2)).astype(bool)
    skm=cv2.morphologyEx(skm.astype(np.uint8),cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(15,15)))>0
    skinpath=paths_from_mask(skm,eps=1.2,minarea=400)
    meta={'id':vid,'w':W,'h':H,'ppm':ppm,'from':v['from'],'skin':skinpath,'structs':structs}
    json.dump(meta,open(f'assets/{vid}.json','w'))
    print(vid,W,H,len(structs),'muscles',sum(1 for s in structs if s['kind']=='muscle'),'json',os.path.getsize(f'assets/{vid}.json')//1024,'KB webp',os.path.getsize(f'assets/{vid}.webp')//1024,'KB')
if __name__=="__main__":
    for vid in sys.argv[1:]: process(vid)
