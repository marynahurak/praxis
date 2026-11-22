import json, gzip, re, numpy as np, trimesh, pickle, sys
import os
SRC=os.environ.get('BP3D_MODEL_DIR','node_modules/@dagno/anatomy-model/model/')  # BodyParts3D 4.0 via @dagno/anatomy-model (CC BY 4.0)
a=json.load(open(SRC+'atlas.json'))
chunks={}
def chunk(i):
    if i not in chunks: chunks[i]=gzip.open(SRC+a['chunks'][i]['gzip']).read()
    return chunks[i]
want=re.compile(r'(^Right |of right |right (pectoralis|deltoid|trapezius|biceps|triceps|flexor carpi|pronator|adductor))',re.I)
upper=re.compile(r'(carpi|digitorum superficialis|digitorum profundus|extensor digitorum$|pronator|supinator|brachioradialis|biceps|triceps|deltoid|pectoralis major|latissimus|pollicis|interossei of right hand|infraspinatus|teres|trapezius|brachialis|palmaris longus|digiti minimi of right hand|digiti minimi$|anconeus|indicis|coracobrachialis|radius|ulna$|humerus|scapula|clavicle|metacarpal|lumbricals of right hand|phalanx of right (thumb|index|middle|ring|little)|capitate|hamate|lunate|pisiform|scaphoid|trapezium|trapezoid|triquetral|supraspinatus|serratus anterior|rhomboid|levator scapulae|subscapularis|interosseous membrane of right forearm)',re.I)
out={}
for p in a['parts']:
    n=p['name']
    if not want.search(n) or not upper.search(n): continue
    if re.search(r'foot|toe|artery|vein|nerve',n,re.I): continue
    b=chunk(p['chunk']); vc=p['vertexCount']; ic=p['indexCount']
    pos=np.frombuffer(b,dtype='<f4',count=vc*3,offset=p['positions']).reshape(-1,3).astype(np.float64)
    idx=np.frombuffer(b,dtype='<u4',count=ic,offset=p['indices']).reshape(-1,3)
    out.setdefault(n,[]).append((pos,idx,p['system'],p['conceptId'],p['id']))
meshes={}
for n,lst in out.items():
    ms=[trimesh.Trimesh(vertices=pos,faces=idx,process=False) for pos,idx,_,_,_ in lst]
    m=trimesh.util.concatenate(ms) if len(ms)>1 else ms[0]
    meshes[n]={'mesh':m,'system':lst[0][2],'fma':lst[0][3]}
for n in sorted(meshes): 
    m=meshes[n]['mesh']; print(f"{meshes[n]['system']:9s} {n:55s} v={len(m.vertices):6d} b={np.round(m.bounds,3).tolist()}")
pickle.dump({n:{'v':d['mesh'].vertices,'f':d['mesh'].faces,'system':d['system'],'fma':d['fma']} for n,d in meshes.items()},open('upper.pkl','wb'))
print(len(meshes))
