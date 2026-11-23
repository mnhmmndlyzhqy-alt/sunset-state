#!/usr/bin/env python3
"""Regenerate two actual, rig-compatible crocodile GLBs from original Natura V5.
No external downloads; skinned joints, authored animation tracks and PBR materials retained.
"""
from pathlib import Path
import base64,copy,gzip,io,json,math,re,struct,hashlib
import numpy as np
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'assets/crocodile_hi.js'
m=re.search(r'="([A-Za-z0-9+/=]+)";', SOURCE.read_text())
assert m,'Missing original crocodile GLB pack'
original=gzip.decompress(base64.b64decode(m.group(1)))
assert original[:4]==b'glTF'
old_jlen=struct.unpack_from('<I',original,12)[0]
old=json.loads(original[20:20+old_jlen])
sourcebin=original[28+old_jlen:]
component={5126:np.dtype('<f4'),5125:np.dtype('<u4'),5123:np.dtype('<u2'),5121:np.dtype('u1'),5122:np.dtype('<i2')}
arities={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}

def original_array(idx):
 a=old['accessors'][idx];v=old['bufferViews'][a['bufferView']]
 ar=arities[a['type']];dt=component[a['componentType']]
 off=v.get('byteOffset',0)+a.get('byteOffset',0)
 stride=v.get('byteStride',ar*dt.itemsize)
 if stride==ar*dt.itemsize:
  return np.frombuffer(sourcebin,dtype=dt,count=a['count']*ar,offset=off).reshape(-1,ar)
 raw=memoryview(sourcebin)[off:off+stride*a['count']]
 return np.ndarray((a['count'],ar),dtype=dt,buffer=raw,strides=(stride,dt.itemsize)).copy()

def make_asset(name,grid,uvstep,scale,keep_mesh):
 d=copy.deepcopy(old)
 d['bufferViews']=[];d['accessors']=[];d['buffers']=[{'byteLength':0}]
 d['asset']['generator']='SUNSET STATE stage18 voxel LOD from user authored Crocodile Natura V5 rig'
 blob=bytearray();copied_bv={};copied_ac={}
 def view(data,target=None,stride=None):
  while len(blob)%4:blob.append(0)
  off=len(blob);blob.extend(data)
  v={'buffer':0,'byteOffset':off,'byteLength':len(data)}
  if target:v['target']=target
  if stride:v['byteStride']=stride
  idx=len(d['bufferViews']);d['bufferViews'].append(v)
  return idx
 def clone_accessor(idx):
  if idx in copied_ac:return copied_ac[idx]
  a=copy.deepcopy(old['accessors'][idx]);v=old['bufferViews'][a['bufferView']]
  oldid=a['bufferView']
  if oldid not in copied_bv:
   start=v.get('byteOffset',0)
   copied_bv[oldid]=view(sourcebin[start:start+v['byteLength']],target=v.get('target'),stride=v.get('byteStride'))
  a['bufferView']=copied_bv[oldid]
  idxnew=len(d['accessors']);d['accessors'].append(a);copied_ac[idx]=idxnew
  return idxnew
 def new_accessor(a,data,minmax=False,kind='vertex'):
  out=copy.deepcopy(a);out.pop('sparse',None)
  out['count']=data.shape[0];out['byteOffset']=0
  if data.dtype.kind=='f':assert out['componentType']==5126
  out['bufferView']=view(data.tobytes(order='C'),target=34963 if kind=='indices' else 34962)
  if minmax:
   out['min']=data.min(axis=0).astype(float).tolist();out['max']=data.max(axis=0).astype(float).tolist()
  else:out.pop('min',None);out.pop('max',None)
  idx=len(d['accessors']);d['accessors'].append(out)
  return idx
 stats=[]
 for i,mesh in enumerate(d['meshes']):
  if i not in keep_mesh:
   mesh['primitives']=[]
   continue
  p=mesh['primitives'][0];origp=old['meshes'][i]['primitives'][0]
  arrays={name:original_array(ind) for name,ind in origp['attributes'].items()}
  old_index=original_array(origp['indices']).reshape(-1,3)
  pos=arrays['POSITION'];uv=arrays['TEXCOORD_0']
  keys=np.column_stack((np.floor(pos/grid+.5).astype(np.int32),np.floor(uv/uvstep+.5).astype(np.int32)))
  if 'JOINTS_0' in arrays:
   joint=arrays['JOINTS_0'];weights=arrays['WEIGHTS_0']
   keys=np.column_stack((keys,joint[np.arange(len(joint)),weights.argmax(axis=1)]))
  # inverse group index, a point in every spatial+UV+rig cluster
  _,first,inv=np.unique(keys,axis=0,return_index=True,return_inverse=True)
  faces=inv[old_index]
  keep=(faces[:,0]!=faces[:,1])&(faces[:,1]!=faces[:,2])&(faces[:,0]!=faces[:,2])
  faces=faces[keep]
  if not len(faces):
   # preserve original geometry if spatial grid is too coarse for a tiny part
   first=np.arange(len(pos));faces=old_index.astype(np.int64);inv=first
  else:
   # Keep just the referenced vertices; compact to preserve cache locality.
   used,remap=np.unique(faces,return_inverse=True)
   first=first[used];faces=remap.reshape(-1,3)
  newattr={}
  for attr,oldidx in origp['attributes'].items():
   # preserve source skin and atlas look. Position is representative of each grid.
   data=np.ascontiguousarray(arrays[attr][first])
   newattr[attr]=new_accessor(old['accessors'][oldidx],data,minmax=(attr=='POSITION'))
  ids=np.ascontiguousarray(faces.reshape(-1).astype(np.uint16 if len(first)<65536 else np.uint32))
  idxmeta=copy.deepcopy(old['accessors'][origp['indices']]);idxmeta['componentType']=5123 if ids.dtype.itemsize==2 else 5125
  p['attributes']=newattr;p['indices']=new_accessor(idxmeta,ids.reshape(-1,1),kind='indices')
  p.pop('targets',None)
  stats.append({'mesh':i,'triangles_before':len(old_index),'triangles_after':len(faces),'vertices_after':len(first)})
 # Empty meshes cannot be referenced by renderer: remove the reference, but keep nodes+rig hierarchy.
 for node in d.get('nodes',[]):
  if node.get('mesh') is not None and node['mesh'] not in keep_mesh: node.pop('mesh')
 # animation tracks and all original joint transforms preserved exactly
 for skin in d.get('skins',[]):
  if skin.get('inverseBindMatrices') is not None:skin['inverseBindMatrices']=clone_accessor(skin['inverseBindMatrices'])
 for anim in d.get('animations',[]):
  for sample in anim.get('samplers',[]):
   sample['input']=clone_accessor(sample['input']);sample['output']=clone_accessor(sample['output'])
 # Resample high source textures and keep the same materials, normal & ORM maps.
 image_stats=[]
 for k,img in enumerate(d.get('images',[])):
  sourceimg=old['images'][k];bv=old['bufferViews'][sourceimg['bufferView']]
  raw=sourcebin[bv.get('byteOffset',0):bv.get('byteOffset',0)+bv['byteLength']]
  im=Image.open(io.BytesIO(raw)).convert('RGB')
  w,h=im.size;w=max(64,int(w*scale)//4*4);h=max(32,int(h*scale)//4*4)
  im=im.resize((w,h),Image.Resampling.LANCZOS)
  target=io.BytesIO();fmt='JPEG' if sourceimg['mimeType']=='image/jpeg' else 'PNG'
  if fmt=='JPEG':im.save(target,format='JPEG',quality=87,optimize=True,subsampling=0)
  else:im.save(target,format='PNG',optimize=True,compress_level=7)
  image_stats.append({'name':sourceimg['name'],'size':[w,h],'bytes':len(target.getvalue())})
  img['bufferView']=view(target.getvalue());img['mimeType']=sourceimg['mimeType']
 d['buffers'][0]['byteLength']=len(blob)
 js=json.dumps(d,separators=(',',':'),ensure_ascii=False).encode('utf-8')
 while len(js)%4:js+=b' '
 while len(blob)%4:blob.append(0)
 glbsize=12+8+len(js)+8+len(blob)
 glb=struct.pack('<III',0x46546c67,2,glbsize)+struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(blob),0x004e4942)+blob
 assert len(glb)==glbsize
 compressed=gzip.compress(glb,compresslevel=8,mtime=0)
 encoded=base64.b64encode(compressed).decode('ascii')
 output=ROOT/f'assets/{name}.js'
 output.write_text(f'/* SUNSET STATE stage18 authored crocodile LOD: {name}; original 24-joint rig. */\n'+
  'globalThis.__SUNSET44_PACK=globalThis.__SUNSET44_PACK||Object.create(null);\n'+
  f'globalThis.__SUNSET44_PACK["{name}"]="{encoded}";\n')
 return {'asset':name,'bytes_glb':len(glb),'bytes_js':output.stat().st_size,
  'triangles_source':sum(row['triangles_before'] for row in stats),
  'triangles_lod':sum(row['triangles_after'] for row in stats),'draw_meshes':len(stats),
  'rig_nodes':len(d['nodes']),'skins':len(d['skins']),'clips':[a['name'] for a in d['animations']],
  'images':image_stats,'geometry':stats,'sha256':hashlib.sha256(output.read_bytes()).hexdigest()}

mid=make_asset('crocodile_mid',.04,.20,.50,set(range(24)))
far=make_asset('crocodile_far',.12,.40,.22,{0,1,2,3,5,17,19})
record={'source_sha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(), 'hi_source_triangles':sum(old['accessors'][p['indices']]['count']//3 for m in old['meshes'] for p in m['primitives']), 'mid':mid,'far':far}
(ROOT/'QA/STAGE18_LOD_ASSET_MANIFEST.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n')
print('LOD generated:',[(r['asset'],r['triangles_lod'],r['draw_meshes'],r['bytes_js']) for r in [mid,far]])
