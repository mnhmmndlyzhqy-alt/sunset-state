from pathlib import Path
root=Path(__file__).resolve().parents[1]
# Minimal targeted integration: preserve existing engine and script order.
engine=root/'engine44.js';s=engine.read_text('utf8')
target='            const atDoor = this.nearestEntrance(), atShop = this.preferredRetailDoor(atDoor), atHub = this.nearestHub(), atStreet = this.nearestStreetVenue();'
patch='            if (Heatline.stage29InteriorPolish) Heatline.stage29InteriorPolish.updateHUD(this);\n'
assert s.count(target)==1
s=s.replace(target,patch+target,1)
engine.write_text(s,'utf8')
style='''
/* Stage29: compact live wayfinding, no modal or HUD control interception. */
#stage29-wayfinding,#stage29-shop-guide{font-size:11px;line-height:1.48;color:#d5e6df;
  background:rgba(28,57,64,.80);border:1px solid rgba(147,186,178,.28);
  border-radius:8px;padding:6px 8px;max-width:275px;pointer-events:none}
#stage29-wayfinding.hidden,#stage29-shop-guide.hidden{display:none!important}
#stage29-shop-guide{position:absolute;bottom:112px;right:24px;z-index:9;direction:rtl}
@media(max-width:700px){#stage29-wayfinding{font-size:10px}#stage29-shop-guide{right:8px;bottom:100px;max-width:200px;font-size:10px}}
'''
for name in ('START_GAME.html','index.html'):
 p=root/name;h=p.read_text('utf8')
 script='<script src="assets/stage19_persistent_save.js"></script>'
 assert h.count(script)==1
 h=h.replace(script,script+'\n<script src="assets/stage29_interior_retail_polish.js"></script>',1)
 # append new HUD under existing rooms, same line to avoid reflow.
 marker='<div id="interior-transport" aria-live="off">'
 assert h.count(marker)==1
 h=h.replace(marker,'<div id="stage29-wayfinding" class="hidden" role="status" aria-live="off"></div>\n    '+marker,1)
 marker2='<div id="business-panel44" class="hidden"'
 assert h.count(marker2)==1
 h=h.replace(marker2,'<div id="stage29-shop-guide" class="hidden" role="status" aria-live="off"></div>\n'+marker2,1)
 h=h.replace('</style>',style+'</style>',1)
 p.write_text(h,'utf8')
assert (root/'START_GAME.html').read_bytes()==(root/'index.html').read_bytes()
bootstrap=root/'QA/stage05_bootstrap.cjs'
s=bootstrap.read_text('utf8')
needle="if(process.env.STAGE28_FACADES_OFF==='1')ctx.__SUNSET_STAGE28_FACADES_OFF=true;"
assert s.count(needle)==1
s=s.replace(needle,needle+"\nif(process.env.STAGE29_INTERIORS_OFF==='1')ctx.__SUNSET_STAGE29_INTERIORS_OFF=true;",1)
bootstrap.write_text(s,'utf8')
print('Stage29 runtime patched without changing existing engine behavior outside HUD hook')
