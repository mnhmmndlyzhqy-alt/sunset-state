#!/usr/bin/env python3
"""Strict GLB+rig validator. CPU and binary checks; no GPU rendering."""
from pathlib import Path
import base64,gzip,io,json,re,struct,hashlib
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
manifest=json.loads((ROOT/'QA/STAGE18_LOD_ASSET_MANIFEST.json').read_text())
checks=0

def check(cond,msg):
 global checks
 if not cond:raise AssertionError(msg)
 checks+=1

def load(name):
 txt=(ROOT/f'assets/{name}.js').read_text()
 src=re.search(r'="([A-Za-z0-9+/=]+)";',txt)
 check(bool(src),'encoded JS '+name)
 full=gzip.decompress(base64.b64decode(src.group(1)))
 check(full[:4]==b'glTF','GLB signature '+name)
 magic,version,size=struct.unpack_from('<III',full,0)
 check(version==2 and size==len(full),'GLB size '+name)
 jlen,jtype=struct.unpack_from('<II',full,12)
 check(jtype==0x4e4f534a,'GLB JSON '+name)
 js=json.loads(full[20:20+jlen])
 binpos=20+jlen
 blen,btype=struct.unpack_from('<II',full,binpos)
 check(btype==0x004e4942 and binpos+8+blen==len(full),'GLB binary section '+name)
 data=full[binpos+8:];check(js['buffers'][0]['byteLength']<=len(data),'buffer length')
 for v in js['bufferViews']:
  check(v.get('byteOffset',0)+v['byteLength']<=len(data),'valid buffer view')
 for a in js['accessors']:
  check(0<=a['bufferView']<len(js['bufferViews']),'valid accessor view')
  v=js['bufferViews'][a['bufferView']]
  comp={5121:1,5123:2,5125:4,5126:4}[a['componentType']]
  dims={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']]
  stride=v.get('byteStride',comp*dims)
  check(a.get('byteOffset',0)+(a['count']-1)*stride+comp*dims<=v['byteLength'],'accessor inside view')
 def arr(ai):
  a=js['accessors'][ai];v=js['bufferViews'][a['bufferView']]
  dtype={5121:'u1',5123:'<u2',5125:'<u4',5126:'<f4'}[a['componentType']]
  dim={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']]
  return np.frombuffer(data,dtype=dtype,offset=v.get('byteOffset',0)+a.get('byteOffset',0),count=a['count']*dim).reshape(-1,dim)
 tris=0;draw=0;bounds=[]
 for m in js['meshes']:
  for prim in m.get('primitives',[]):
   pos=arr(prim['attributes']['POSITION']);ind=arr(prim['indices']).flatten();check(ind.size%3==0,'indexed triangles')
   check(ind.size>0 and int(ind.max())<len(pos),'valid index range')
   check(np.isfinite(pos).all(),'positions finite')
   tris+=len(ind)//3;draw+=1;bounds.append((pos.min(axis=0),pos.max(axis=0)))
   for at,ai in prim['attributes'].items():check(len(arr(ai))==len(pos),'attribute vertex counts match '+at)
 check(all(len(s['joints']) in [12,24] for s in js['skins']),'skinned joints count')
 check(len(js['animations'])==5,'all 5 animations')
 clips=[a['name'] for a in js['animations']]
 for anim in js['animations']:
  for sam in anim['samplers']:
   timeline=arr(sam['input']);check(np.isfinite(timeline).all(),'animation finite')
   check((np.diff(timeline[:,0])>=0).all(),'ordered clip times')
   check(np.isfinite(arr(sam['output'])).all(),'animation values finite')
 for img in js['images']:
  v=js['bufferViews'][img['bufferView']]
  payload=data[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']]
  picture=Image.open(io.BytesIO(payload));picture.verify();check(True,'embedded image intact')
 return {'name':name,'triangles':tris,'drawables':draw,'bones':[len(s['joints']) for s in js['skins']],
         'nodes':len(js['nodes']),'clips':clips,'bounding':[[float(v) for v in np.min([b[0] for b in bounds],axis=0)],
                   [float(v) for v in np.max([b[1] for b in bounds],axis=0)]],
         'packed_sha256':hashlib.sha256((ROOT/f'assets/{name}.js').read_bytes()).hexdigest()}

out=[load(key) for key in ['crocodile_hi','crocodile_mid','crocodile_far']]
hi,mid,far=out
check(hi['triangles']==manifest['hi_source_triangles'],'source triangle baseline')
check(mid['triangles']==manifest['mid']['triangles_lod'],'mid triangle count')
check(far['triangles']==manifest['far']['triangles_lod'],'far triangle count')
check(hi['nodes']==mid['nodes']==far['nodes']==50,'same original rig nodes')
check(hi['bones']==mid['bones']==far['bones'],'same 12/24 bone rigs')
check(hi['clips']==mid['clips']==far['clips'],'same five clip names in exact order')
for lod in (mid,far):
 for axis in range(3):
  check(abs(lod['bounding'][0][axis]-hi['bounding'][0][axis])<.30,'same silhouette low axis')
  check(abs(lod['bounding'][1][axis]-hi['bounding'][1][axis])<.30,'same silhouette high axis')
result={'stage':18,'passed':True,'checks':checks,'variants':out,'scope':'GLB geometry, rig, index, animation and embedded image structural checks, not GPU validation'}
(ROOT/'QA/STAGE18_GLB_ASSET_VALIDATION.json').write_text(json.dumps(result,indent=2))
print('PASS GLB',checks,'checks; triangles',hi['triangles'],mid['triangles'],far['triangles'],'drawables',hi['drawables'],mid['drawables'],far['drawables'])
