"""Validate actual offline GLB payloads without graphics; no render-quality claims."""
from pathlib import Path
import base64, gzip, json, re, struct, hashlib
root=Path(__file__).resolve().parents[1]
keys=['crocodile_hi','heron_hi','heron_far','flamingo_hi','flamingo_mid','fish_unique','airliner_hi','airliner_mid','urban_01-oat-jacket']
results=[]
for key in keys:
 p=root/'assets'/(key+'.js')
 item={'key':key,'exists':p.exists()}
 if not p.exists():results.append(item);continue
 try:
  txt=p.read_text()
  m=re.search(r'=\s*"([A-Za-z0-9+/=]+)"\s*;',txt)
  assert m, 'No embedded base64'
  payload=gzip.decompress(base64.b64decode(m.group(1)))
  sig,version,total=struct.unpack_from('<III',payload,0)
  assert sig==0x46546c67 and version==2, (sig,version)
  assert total==len(payload),(total,len(payload))
  jlen,jtyp=struct.unpack_from('<II',payload,12)
  assert jtyp==0x4e4f534a,'GLB JSON chunk absent'
  meta=json.loads(payload[20:20+jlen].decode())
  triangles=0;missing=[]
  accessors=meta.get('accessors',[])
  for mesh in meta.get('meshes',[]):
   for prim in mesh.get('primitives',[]):
    idx=prim.get('indices',prim.get('attributes',{}).get('POSITION'))
    if idx is None or idx<0 or idx>=len(accessors):missing.append('missing_accessor');continue
    triangles+=accessors[idx]['count']//3
  item.update({'ok':not missing,'compressedBytes':len(m.group(1))*3//4,'glbBytes':len(payload),'meshes':len(meta.get('meshes',[])),'materials':len(meta.get('materials',[])),'nodes':len(meta.get('nodes',[])),'animations':len(meta.get('animations',[])),'textures':len(meta.get('textures',[])),'trianglesApprox':triangles,'error':missing or None})
 except Exception as e:item.update({'ok':False,'error':str(e)})
 results.append(item)
 print(key,item.get('ok'),item.get('glbBytes'),item.get('trianglesApprox'),flush=True)
out={'scope':'GLB byte structure and mesh references from original base64 gzip assets; no GPU rendering or visual assessment','assets':results,'tested':len(results),'passed':sum(x.get('ok',False) for x in results)}
(root/'QA/RECOVERY07_GLTF_VALIDATION.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print('PASS',out['passed'],'/',out['tested'])
if out['passed']!=out['tested']:raise SystemExit(2)
