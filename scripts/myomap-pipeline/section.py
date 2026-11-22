import pickle, numpy as np, trimesh, json
from shapely.geometry import Polygon, MultiPolygon
from shapely.ops import unary_union
from keys import classify
d=pickle.load(open('upper3.pkl','rb')); metrics=json.load(open('muscle_metrics.json'))
SECS=[('tr_s1',1.065,'tr'),('tr_s2',1.000,'tr'),('tr_s3',0.950,'tr'),('th_s1',1.290,'th'),('th_s2',1.200,'th'),('ph_s1',0.855,'ph')]
CENTER={'tr':['radius','ulna'],'th':['humerus'],'ph':['metacarpus']}
RAD={'tr':0.05,'th':0.065,'ph':0.06}
def polys_at(mesh,y):
    s=mesh.section(plane_origin=[0,y,0],plane_normal=[0,1,0])
    if s is None: return []
    out=[]
    for ent in s.discrete:
        pts=ent[:, [0,2]]
        if len(pts)>=3:
            p=Polygon(pts)
            if not p.is_valid: p=p.buffer(0)
            if p.area>1e-7: out.append(p)
    if not out: return []
    # even-odd union for holes
    u=out[0]
    for p in out[1:]: u=u.symmetric_difference(p)
    return [u]
def to_path(geom,tx):
    gs=[geom] if geom.geom_type=='Polygon' else list(geom.geoms)
    s=''
    for g in gs:
        if g.geom_type!='Polygon' or g.area<=0: continue
        g=g.simplify(0.00012)
        for ring in [g.exterior]+list(g.interiors):
            c=[tx(x,z) for x,z in ring.coords]
            s+='M'+'L'.join(f'{a:.1f} {b:.1f}' for a,b in c)+'Z'
    return s
out={}
for sid,y,lvl in SECS:
    bykey={}; kinds={}; raw={}
    for n,D in d.items():
        if n=='Skin': continue
        k,kind=classify(n)
        if kind=='ctx' and D['system']!='muscular': continue
        bmin=D['v'].min(0); bmax=D['v'].max(0)
        if not (bmin[1]<=y<=bmax[1]) or bmax[0]>-0.05: continue
        m=trimesh.Trimesh(D['v'],D['f'],process=False)
        ps=polys_at(m,y)
        if not ps: continue
        g=unary_union(ps)
        bykey.setdefault(k,[]).append(g); kinds[k]=kind; raw.setdefault(k,[]).append(n)
    geoms={k:unary_union(v) for k,v in bykey.items()}
    cen=unary_union([geoms[k] for k in CENTER[lvl] if k in geoms]).centroid
    geoms={k:g for k,g in geoms.items() if g.centroid.distance(cen)<RAD[lvl] or k in CENTER[lvl]}
    # drop far-away fragments of each structure
    def near(g):
        gs=[g] if g.geom_type=='Polygon' else list(g.geoms)
        return unary_union([p for p in gs if p.centroid.distance(cen)<RAD[lvl]]) if gs else g
    geoms={k:near(g) for k,g in geoms.items()}
    geoms={k:g for k,g in geoms.items() if not g.is_empty}
    allg=unary_union(list(geoms.values()))
    skin=None
    sec=trimesh.Trimesh(d['Skin']['v'],d['Skin']['f'],process=False).section(plane_origin=[0,y,0],plane_normal=[0,1,0])
    if sec is not None:
        P=np.vstack([e[:,[0,2]] for e in sec.discrete])
        c=np.array([cen.x,cen.y]); dist=np.linalg.norm(P-c,axis=1)
        hull=allg.convex_hull
        from shapely.geometry import Point
        keep=np.array([dist[i]<RAD[lvl]*1.15 and hull.distance(Point(P[i]))<0.016 for i in range(len(P))])
        Q=P[keep]
        if len(Q)>20:
            ang=np.arctan2(Q[:,1]-c[1],Q[:,0]-c[0]); order=np.argsort(ang); Q=Q[order]
            # radial max per angle bin -> star-shaped outline
            bins=np.linspace(-np.pi,np.pi,181); idx=np.digitize(ang[order],bins)
            ring=[]
            for b in range(1,len(bins)):
                sel=Q[idx==b]
                if len(sel): ring.append(sel[np.argmax(np.linalg.norm(sel-c,axis=1))])
            if len(ring)>20:
                skin=Polygon(ring).buffer(0)
                skin=unary_union([skin.intersection(allg.buffer(0.011)),allg.buffer(0.0035)]).buffer(0.0015).buffer(-0.0015).simplify(0.0003)
    ref=skin if skin is not None else allg
    minx,minz,maxx,maxz=ref.bounds; pad=0.006
    ppm={'tr':5200,'th':3600,'ph':4300}[lvl]
    W=int((maxx-minx+2*pad)*ppm); H=int((maxz-minz+2*pad)*ppm)
    tx=lambda x,z:((x-(minx-pad))*ppm,((maxz+pad)-z)*ppm)
    structs=[]
    for k,g in geoms.items():
        if g.area<2e-6: continue
        st={'key':k,'kind':kinds[k],'d':to_path(g,tx)}
        if kinds[k]=='muscle':
            # tendon test: thickness ratio
            per=g.length or 1; th=2*g.area/per*1000
            names=raw[k]; tmax=max(metrics.get(n,{}).get('thick_max',0) for n in names) or th
            amax=sum(metrics.get(n,{}).get('area_max_cm2',0) for n in names) or 1
            frac=g.area*1e4/amax
            st['tendon']=bool(frac<0.12 or th<0.30*tmax)
            st['area_cm2']=round(g.area*1e4,2)
        c=g.representative_point(); st['site']=[round(v,1) for v in tx(c.x,c.y)]
        structs.append(st)
    out[sid]={'id':sid,'level':lvl,'y':y,'w':W,'h':H,'ppm':ppm,'skin':to_path(skin,tx) if skin is not None else '','structs':structs}
    print(sid,W,H,len(structs),sorted((s['key'],s.get('tendon')) for s in structs if s['kind']=='muscle'))
json.dump(out,open('assets/sections.json','w'))
