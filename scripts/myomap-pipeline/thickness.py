import pickle, numpy as np, trimesh, json, base64
from shapely.geometry import Polygon
d=pickle.load(open('upper3.pkl','rb'))
names=sorted(d)
res={}
for n in names:
    D=d[n]
    if D['system']!='muscular' or D.get('context'): continue
    m=trimesh.Trimesh(D['v'],D['f'],process=True)
    v=m.vertices; c=v.mean(0); u,s,vt=np.linalg.svd(v-c,full_matrices=False); ax=vt[0]
    t=(v-c)@ax; tmin,tmax=t.min(),t.max(); N=48
    heights=np.linspace(tmin,tmax,N+2)[1:-1]
    secs=m.section_multiplane(plane_origin=c+ax*0, plane_normal=ax, heights=list(heights))
    A=[];P=[]
    for sct in secs:
        if sct is None: A.append(0);P.append(1);continue
        polys=[p for p in sct.polygons_full]
        a=sum(p.area for p in polys); per=sum(p.length for p in polys) or 1
        A.append(a);P.append(per)
    A=np.array(A);P=np.array(P); th=2*A/P*1000  # mm (half-thickness*2 ~ hydraulic)
    Amax=A.max() or 1
    # per-vertex interpolated thickness / area fraction
    thv=np.interp(t,heights,th); afv=np.interp(t,heights,A/Amax)
    tendon=(afv<0.16)|(thv<0.36*th.max())
    res[n]={'tendon':tendon,'thick_max':float(th.max()),'area_max_cm2':float(Amax*1e4),'profile':[round(x,2) for x in th.tolist()],'frac':float(tendon.mean())}
    # keep processed vertex order mapping: re-map to original vertices by nearest
    if len(m.vertices)!=len(D['v']):
        from scipy.spatial import cKDTree
        idx=cKDTree(m.vertices).query(D['v'])[1]; res[n]['tendon']=tendon[idx]
for n,r in sorted(res.items(), key=lambda x:-x[1]['frac'])[:60]:
    print(f"{n:50s} thickmax={r['thick_max']:5.1f}mm Amax={r['area_max_cm2']:5.2f}cm2 tendon%={r['frac']*100:4.0f}")
pickle.dump({n:r['tendon'] for n,r in res.items()},open('tendon.pkl','wb'))
json.dump({n:{'thick_max':r['thick_max'],'area_max_cm2':r['area_max_cm2']} for n,r in res.items()},open('muscle_metrics.json','w'),indent=1)
