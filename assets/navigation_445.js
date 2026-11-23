var Heatline=globalThis.Heatline||{};
(function(H){
    const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
    const point=(x,z,level=0)=>({x,z,level});
    const rampEnd=22;
    const meters=d=>d<1000?Math.round(d/5)*5+' מ׳':(d/1000).toFixed(1)+' ק״מ';
    function project(p,a,b){
        const dx=b.x-a.x,dz=b.z-a.z,length2=dx*dx+dz*dz;
        const t=length2?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/length2)):0;
        return {...point(a.x+dx*t,a.z+dz*t,a.level),t};
    }
    function intersects(a,b,c,d){
        const dx=b.x-a.x,dz=b.z-a.z,ux=d.x-c.x,uz=d.z-c.z;
        const det=dx*uz-dz*ux;
        if(Math.abs(det)<1e-7)return null;
        const x=c.x-a.x,z=c.z-a.z;
        const s=(x*uz-z*ux)/det,t=(x*dz-z*dx)/det;
        return s>=-1e-7&&s<=1.0000001&&t>=-1e-7&&t<=1.0000001?[s,t]:null;
    }
    class RoadNetwork445{
        constructor(world){
            const paths=[], nodesByKey=new Map(), roadBlock=H.BLOCK;
            const add=(a,b,kind)=>{if(distance(a,b)>.07)paths.push({a,b,kind,cuts:[0,1]});};
            const bridge=world.overpass443;
            for(let i=-11;i<=11;i++)for(let j=-11;j<11;j++){
                const p=i*roadBlock,start=j*roadBlock,end=start+roadBlock;
                for(const axis of ['x','z']){
                    const vertical=axis==='z';
                    if(H.cityPlan463.showRail&&!vertical&&p===H.TRAM_Z&&start>=-9*roadBlock&&end<=9*roadBlock)continue;
                    if(bridge&&vertical&&p===bridge.x&&start>=bridge.z0&&end<=bridge.z1)continue;
                    const at=s=>vertical?point(p,s):point(s,p);
                    const samples=[start];
                    for(let v=start+3;v<end;v+=3)samples.push(v);
                    samples.push(end);
                    const allowed=s=>{
                        const {x,z}=at(s);
                        return H.coast461.keepLegacy(x,z)&&H.coast461.land(x,z);
                    };
                    let from=null;
                    for(let k=0;k<samples.length-1;k++){
                        const ok=allowed((samples[k]+samples[k+1])*.5);
                        if(ok&&from===null)from=samples[k];
                        if(from!==null&&(!ok||k===samples.length-2)){
                            add(at(from),at(samples[k+(ok?1:0)]),i%3===0?'main':'local');from=null;
                        }
                    }
                }
            }
            for(const {x1,z1,x2,z2} of world.annexRoads||[])
                if(!H.openSea444((x1+x2)*.5,(z1+z2)*.5))add(point(x1,z1),point(x2,z2),'local');
            const ridge=world.ridgeRoad443?.points||[];
            for(let i=1;i<ridge.length;i++)add(point(...ridge[i-1]),point(...ridge[i]),'ridge');
            if(bridge){
                const {x,z0,z1}=bridge;
                add(point(x,z0),point(x,z0+rampEnd,1),'ramp');
                add(point(x,z0+rampEnd,1),point(x,z1-rampEnd,1),'bridge');
                add(point(x,z1-rampEnd,1),point(x,z1),'ramp');
            }
            for(const road of world.roads461||[]){
                const kind=['northRing','westExpress','southRing','eastCoast','toResort'].includes(road.id)?'main':'local';
                const points=road.samples.filter((p,i)=>p.junction||i%4===0);
                for(let i=1;i<points.length;i++){
                    const a=points[i-1],b=points[i];
                    const la=road.id==='westExpress'&&a.z>-516&&a.z<-348?2:0;
                    const lb=road.id==='westExpress'&&b.z>-516&&b.z<-348?2:0;
                    add(point(a.x,a.z,la),point(b.x,b.z,lb),la||lb?'coastGrade':kind);
                }
            }
            if(world.yard445){const {x,z,entranceZ}=world.yard445;add(point(x,entranceZ),point(x,z),'driveway');}
            // Split real at-grade junctions. A crossing below a bridge keeps its own endpoints.
            for(let i=0;i<paths.length;i++){
                const {a,b,cuts,kind}=paths[i];
                if(kind==='bridge'||kind==='ramp'||kind==='coastGrade')continue;
                for(let j=i+1;j<paths.length;j++){
                    const other=paths[j],{a:c,b:d}=other;
                    if(other.kind==='bridge'||other.kind==='ramp'||other.kind==='coastGrade'||
                        Math.max(a.x,b.x)+.01<Math.min(c.x,d.x)||Math.max(c.x,d.x)+.01<Math.min(a.x,b.x)||
                        Math.max(a.z,b.z)+.01<Math.min(c.z,d.z)||Math.max(c.z,d.z)+.01<Math.min(a.z,b.z))continue;
                    const crossing=intersects(a,b,c,d);
                    if(crossing){cuts.push(crossing[0]);other.cuts.push(crossing[1]);}
                    else{
                        // Parallel annex segments can end on a main street.
                        for(const p of [c,d]){const q=project(p,a,b);if(distance(p,q)<.06)cuts.push(q.t);}
                        for(const p of [a,b]){const q=project(p,c,d);if(distance(p,q)<.06)other.cuts.push(q.t);}
                    }
                }
            }
            this.nodes=[];this.edges=[];
            const node=p=>{
                const key=Math.round(p.x*10)+','+Math.round(p.z*10)+','+p.level;
                if(!nodesByKey.has(key)){
                    const n={...p,id:this.nodes.length,links:[]};nodesByKey.set(key,n);this.nodes.push(n);
                }
                return nodesByKey.get(key);
            };
            const seen=new Set();
            for(const {a,b,kind,cuts} of paths){
                const mixes=t=>point(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t,t<.00001?a.level:b.level);
                const ordered=[...new Set(cuts.map(t=>Math.round(t*1e6)/1e6))].sort((x,y)=>x-y);
                for(let i=1;i<ordered.length;i++){
                    const u=node(mixes(ordered[i-1])),v=node(mixes(ordered[i]));
                    const key=Math.min(u.id,v.id)+':'+Math.max(u.id,v.id);
                    if(u===v||seen.has(key))continue;
                    const length=distance(u,v),factor=kind==='main'?1:kind==='bridge'?.95:kind==='driveway'?1.22:1.08;
                    const edge={a:u,b:v,length,cost:length*factor,kind};
                    seen.add(key);this.edges.push(edge);u.links.push({node:v,edge});v.links.push({node:u,edge});
                }
            }
        }
        nearest(p,level=0){
            let best=null;
            for(const e of this.edges){
                const q=project(p,e.a,e.b),gap=distance(p,q);
                const deck=e.kind==='coastGrade'?(H.coast461.grade(q.z)>.65?2:0):
                    e.kind==='bridge'||e.kind==='ramp'&&H.deckRise443(q.z)>.85?1:0;
                if(deck!==level)continue;
                if(!best||gap<best.gap)best={point:q,gap,edge:e};
            }
            return best;
        }
        route(origin,destination){
            const start=this.nearest(origin,origin.level),goal=this.nearest(destination,destination.level);
            if(!start||!goal)return null;
            const {point:s,edge:se}=start,{point:g,edge:ge}=goal;
            const choices=new Set([ge.a,ge.b]);
            const costs=new Float32Array(this.nodes.length).fill(Infinity),previous=new Int32Array(this.nodes.length).fill(-1);
            const open=new Set();
            for(const n of [se.a,se.b]){costs[n.id]=distance(s,n)*se.cost/se.length;open.add(n);}
            let best=se===ge?distance(s,g)*se.cost/se.length:Infinity,end=null;
            while(open.size){
                let current=null,score=Infinity;
                for(const n of open){const f=costs[n.id]+distance(n,g)*.94;if(f<score){score=f;current=n;}}
                if(!current||score>=best)break;
                open.delete(current);
                if(choices.has(current)){
                    const total=costs[current.id]+distance(current,g)*ge.cost/ge.length;
                    if(total<best){best=total;end=current;}
                }
                for(const {node,edge} of current.links){
                    const total=costs[current.id]+edge.cost;
                    if(total+1e-4>=costs[node.id])continue;
                    costs[node.id]=total;previous[node.id]=current.id;open.add(node);
                }
            }
            if(!Number.isFinite(best))return null;
            const reverse=[];
            for(let n=end;n;n=this.nodes[previous[n.id]])reverse.push(n);
            const points=[s,...reverse.reverse(),g].filter((p,i,list)=>i===0||distance(p,list[i-1])>.06);
            return {points,access:start.gap,finalWalk:goal.gap};
        }
    }

    function maneuver(a,b,c){
        const x=b.x-a.x,z=b.z-a.z,u=c.x-b.x,v=c.z-b.z;
        const angle=Math.atan2(x*v-z*u,x*u+z*v);
        return Math.abs(angle)<.64?null:Math.abs(angle)>2.58?'uturn':angle>0?'right':'left';
    }
    const commands={left:['↰','פנו שמאלה'],right:['↱','פנו ימינה'],uturn:['↶','בצעו פניית פרסה'],straight:['↑','המשיכו ישר'],
        access:['↗','התחברו לכביש המסומן'],final:['●','היעד בסוף הקטע'],arrived:['✓','הגעתם ליעד'],foot:['●','המשיכו ליעד ברגל']};
    class Navigator445{
        constructor(game){
            this.game=game;this.world=game.world;this.target=null;this.route=null;this.lastPlan=-100;
            this.center=this.overviewCenter();this.zoom=1;this.base=new Map();this.aerial=true;this.labels=true;
            const el=id=>document.getElementById(id);
            this.full=el('large-map-canvas');this.mini=el('minimap');this.panel=el('large-map');
            this.guide=el('route-guide445');this.icon=el('route-icon445');this.cue=el('route-cue445');
            this.distance=el('route-distance445');this.info=el('route-info445');this.clearButton=el('route-clear445');
            this.places=this.buildPlaces();
            this.satellite=new Image();
            this.satellite.onload=()=>{
                this.base.delete(true);
                if(this.game.showFullMap&&this.aerial)this.draw(this.full,false);
            };
            this.satellite.src='assets/satellite_472.png';
            this.bind();
        }
        buildPlaces(){
            const w=this.world,places=[];
            const named=(item,name,icon,detail=false)=>{if(item)places.push({...point(item.x,item.z),name,icon,detail});};
            for(const place of H.coast461.places)places.push({...place,level:0,district:true});
            named(w.civicPolice461,'תחנת משטרה','P');
            named(w.stage44Bank,'בנק החוף','B');named(w.stage44Depot,'אולם רכב · קנייה ומכירה','$');
            named(w.ridgeRoad443?.view,'מצפור הרכס','▲');
            if(w.marina444)named(point(-939,821),'מרינת סאנסט','⚓');
            for(const [i,s] of w.fuelStations.entries())named(s,'תחנת דלק '+(i+1),'F');
            for(const c of w.commerce442||[])named(c,c.label||'מרכז מסחרי','•',true);
            for(const c of w.luxuryBays442||[])named(c,'חניית רכבי יוקרה','◆',true);
            return places;
        }
        get roads(){return this.network??=new RoadNetwork445(this.world);}
        actor(){
            const g=this.game,a=g.boat444||g.roofVisit?.pilot&&g.roofVisit.aircraft||(g.inVehicle?g.player:g.avatar);
            return {...point(a.x,a.z,a.coastDeck461?2:a.deck443?1:0),yaw:a.yaw||0};
        }
        open(force){
            const g=this.game,on=force??!g.showFullMap;
            if(on){this.drag=null;g.keys.clear();}
            g.showFullMap=on;this.panel.classList.toggle('hidden',!on);
            document.getElementById('map-button').setAttribute('aria-expanded',String(on));
            if(on){this.full.focus({preventScroll:true});this.draw(this.full,false);}
        }
        bind(){
            const el=id=>document.getElementById(id);
            this.mini.addEventListener('click',()=>this.open());
            this.mini.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();this.open();}});
            this.full.addEventListener('pointerdown',e=>{
                if(e.button!==0)return;
                this.drag={id:e.pointerId,x:e.clientX,y:e.clientY,center:{...this.center},moved:false};
                this.full.setPointerCapture(e.pointerId);
            });
            this.full.addEventListener('pointermove',e=>{
                if(this.drag?.id!==e.pointerId)return;
                const dx=e.clientX-this.drag.x,dy=e.clientY-this.drag.y;
                if(Math.hypot(dx,dy)<5&&!this.drag.moved)return;
                this.drag.moved=true;
                const r=this.full.getBoundingClientRect(),view=this.transform(this.full,false,this.drag.center);
                this.center=view.unmap(this.full.width/2-dx*this.full.width/r.width,this.full.height/2-dy*this.full.height/r.height);
                this.draw(this.full,false);
            });
            this.full.addEventListener('pointerup',e=>{
                if(this.drag?.id!==e.pointerId)return;
                if(!this.drag.moved){
                    const r=this.full.getBoundingClientRect();
                    const q=this.transform(this.full,false).unmap((e.clientX-r.left)*this.full.width/r.width,(e.clientY-r.top)*this.full.height/r.height);
                    this.select(q);
                }
                this.drag=null;
            });
            this.full.addEventListener('pointercancel',()=>{this.drag=null;});
            this.full.addEventListener('contextmenu',e=>{e.preventDefault();this.clear();});
            this.full.addEventListener('wheel',e=>{e.preventDefault();this.changeZoom(e.deltaY<0?1.25:.8);},{passive:false});
            this.full.addEventListener('keydown',e=>{
                const directions={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
                if(directions[e.key]){
                    e.preventDefault();const [x,z]=directions[e.key];this.center.x+=x*105/this.zoom;this.center.z+=z*105/this.zoom;
                    this.draw(this.full,false);
                }
                if(e.key==='Enter'||e.key===' '){e.preventDefault();this.select(point(this.center.x,this.center.z));}
            });
            el('route-close445').onclick=()=>this.open(false);
            el('route-clear445').onclick=()=>this.clear();
            el('route-zoom-in445').onclick=()=>this.changeZoom(1.33);
            el('route-zoom-out445').onclick=()=>this.changeZoom(.75);
            el('route-center445').onclick=()=>{const a=this.actor();this.center={x:a.x,z:a.z};this.zoom=2.8;this.draw(this.full,false);};
            el('route-overview445').onclick=()=>{this.center=this.overviewCenter();this.zoom=1;this.draw(this.full,false);};
            el('route-story445').onclick=()=>{
                const p=this.game.story445.destination();
                if(p)this.select(this.game.story445.step===3?{...point(-939,821),name:'קו המים · גישה דרך רציף המרינה',story:true}:{...p,story:true});
            };
            el('route-aerial445').onclick=e=>{this.aerial=!this.aerial;e.currentTarget.setAttribute('aria-pressed',String(this.aerial));this.draw(this.full,false);};
            el('route-labels445').onclick=e=>{this.labels=!this.labels;e.currentTarget.setAttribute('aria-pressed',String(this.labels));this.draw(this.full,false);};
        }
        changeZoom(n){this.zoom=Math.min(12,Math.max(.75,this.zoom*n));this.draw(this.full,false);}
        clear(){
            this.target=null;this.route=null;this.guide.hidden=true;this.clearButton.disabled=true;
            this.info.textContent='לחיצה על המפה קובעת יעד · גרירה מזיזה את המפה';
            if(this.game.showFullMap)this.draw(this.full,false);
        }
        select(p){
            const range=(2*H.WORLD_LIMIT+140)/this.zoom/56;
            let place=null,nearest=range;
            for(const m of this.places){const d=distance(m,p);if(d<nearest){nearest=d;place=m;}}
            if(place&&!p.story)p=place;
            if(!Number.isFinite(p.x)||!Number.isFinite(p.z)||Math.abs(p.x)>H.WORLD_LIMIT||Math.abs(p.z)>H.WORLD_LIMIT||
                !H.marinaWalk444(p.x,p.z)){
                this.info.textContent='בחרו יעד על היבשה או בסמוך לכביש';return false;
            }
            const over=this.world.overpass443;
            const level=!place&&this.zoom>=3&&Math.abs(p.z+432)>9?
                Math.abs(p.x-H.coast461.westX)<6&&H.coast461.grade(p.z)>1.0?2:
                over&&Math.abs(p.x-over.x)<6&&H.deckRise443(p.z)>1.15?1:0:0;
            this.target={...p,name:p.name||(level?'המחלף העליון':'יעד מסומן'),level};this.lastPlan=-100;
            this.clearButton.disabled=false;this.update(true);
            if(this.game.showFullMap)this.draw(this.full,false);
            return true;
        }
        update(force=false){
            if(!this.target)return;
            const g=this.game,a=this.actor(),delta=g.seconds-this.lastPlan;
            if(force||delta>.64&&(!this.planOrigin||distance(a,this.planOrigin)>7||a.level!==this.planOrigin.level)||delta>4){
                this.route=this.roads.route(a,this.target);this.planOrigin=a;this.lastPlan=g.seconds;
            }
            if(!this.route){this.info.textContent='אין מסלול כביש לנקודה שסומנה';this.guide.hidden=true;return;}
            const {points,finalWalk}=this.route;
            let gap=Infinity,index=0,along=0;
            for(let i=1;i<points.length;i++){
                const q=project(a,points[i-1],points[i]),d=distance(a,q);
                if(d<gap){gap=d;index=i;along=distance(q,points[i]);}
            }
            const arrival=distance(a,this.target);
            let step='straight',ahead=along,remaining=along+finalWalk;
            for(let i=Math.max(1,index);i<points.length-1;i++){
                const length=distance(points[i],points[i+1]);remaining+=length;
                if(step==='straight'){
                    const turn=maneuver(points[i-1],points[i],points[i+1]);
                    if(turn)step=turn;
                    else ahead+=length;
                }
            }
            if(arrival<13){step='arrived';ahead=0;remaining=0;}
            else if(points.length<2||index===points.length-1&&along<17&&finalWalk>16){step='foot';ahead=arrival;}
            else if(gap>24&&this.route.access>19){step='access';ahead=gap;remaining+=gap;}
            else if(g.inVehicle&&g.player.speed>3&&index>0){
                const from=points[index-1],to=points[index],len=distance(from,to);
                const agreement=((-Math.sin(a.yaw))*(to.x-from.x)-Math.cos(a.yaw)*(to.z-from.z))/len;
                if(agreement<-.74){step='uturn';ahead=0;}
            }
            if(step==='straight'&&remaining<90){step='final';ahead=remaining;}
            const [glyph,cue]=commands[step];
            this.guide.hidden=false;this.icon.textContent=glyph;this.cue.textContent=step==='arrived'?cue:cue+' · '+meters(ahead);
            this.distance.textContent=this.target.name+(remaining>0?' · '+meters(remaining)+' נותרו':'');
            this.info.textContent=this.distance.textContent;
        }

        overviewCenter(){
            const R=H.reference469;return R.world(R.width/2,R.height/2);
        }
        transform(canvas,mini,center=this.center){
            const c=mini?this.actor():center;
            if(!mini&&this.aerial&&this.satellite.naturalWidth===H.reference469.width){
                const R=H.reference469,[cx,cz]=R.pixels(c.x,c.z);
                const raster=Math.min(canvas.width/(R.width+36),canvas.height/(R.height+26))*this.zoom;
                const left=cx-canvas.width/(2*raster),top=cz-canvas.height/(2*raster);
                const scale=(R.pixels(c.x+1,c.z)[0]-cx)*raster;
                return {raster,left,top,scale,map:(x,z)=>{
                    const [u,v]=R.pixels(x,z);return [(u-left)*raster,(v-top)*raster];
                },unmap:(x,z)=>R.world(left+x/raster,top+z/raster)};
            }
            const size=H.coast461.extent;
            const scale=mini?canvas.width/(this.game.inVehicle?370:280):
                Math.min(canvas.width/(size.x*2+36),canvas.height/(size.z*2+36))*this.zoom;
            const left=c.x-canvas.width/2/scale,top=c.z-canvas.height/2/scale;
            return {scale,left,top,map:(x,z)=>[(x-left)*scale,(z-top)*scale],unmap:(x,z)=>point(left+x/scale,top+z/scale)};
        }
        bake(aerial){
            const layer=document.createElement('canvas');layer.width=layer.height=2280;
            const ctx=layer.getContext('2d'),offset=H.WORLD_LIMIT+100,scale=layer.width/(2*offset);
            ctx.translate(offset*scale,offset*scale);ctx.scale(scale,scale);
            ctx.fillStyle='#17282d';ctx.fillRect(-offset,-offset,offset*2,offset*2);
            const w=this.world;
            H.paintCoastMap461(ctx,w,aerial);
            for(const [i,b] of w.buildings.entries()){
                const x=b.x-b.w/2,z=b.z-b.d/2;
                if(aerial){
                    const d=Math.min(36,b.h*.24);
                    ctx.fillStyle='#17292770';ctx.beginPath();ctx.moveTo(x,z);ctx.lineTo(x+d,z+d*.62);
                    ctx.lineTo(x+b.w+d,z+d*.62);ctx.lineTo(x+b.w+d,z+b.d+d*.62);ctx.lineTo(x+b.w,z+b.d);ctx.lineTo(x,z+b.d);ctx.fill();
                    ctx.fillStyle=['#958f7b','#777e76','#b1a58e','#83877a','#9c927f'][i%5];
                    ctx.fillRect(x,z,b.w,b.d);ctx.fillStyle='#565e526c';
                    ctx.fillRect(x+b.w*.13,z+b.d*.78,b.w*.71,b.d*.12);
                    ctx.fillRect(x+b.w*.64,z+b.d*.24,b.w*.19,b.d*.34);
                }else{ctx.fillStyle='#344647';ctx.fillRect(x,z,b.w,b.d);}
            }
            const rail=H.cityPlan463.showRail?H.RAIL_LOOP:null;
            if(rail?.length){
                ctx.beginPath();for(let i=0;i<rail.length;i+=7){const p=rail[i];ctx.lineTo(p.x,p.z);}ctx.closePath();
                ctx.strokeStyle='#6d7463';ctx.lineWidth=3.6;ctx.stroke();
            }
            const stroke=(list,color,width)=>{
                ctx.beginPath();for(const {a,b} of list){ctx.moveTo(a.x,a.z);ctx.lineTo(b.x,b.z);}
                ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.stroke();
            };
            const roads=this.roads.edges;
            stroke(roads,'#162227',13);
            stroke(roads.filter(r=>r.kind!=='bridge'&&r.kind!=='ramp'&&r.kind!=='main'&&r.kind!=='coastGrade'),aerial?'#81867b':'#52646a',8);
            stroke(roads.filter(r=>r.kind==='main'),aerial?'#9e9988':'#7b8a88',10);
            stroke(roads.filter(r=>r.kind==='bridge'||r.kind==='ramp'||r.kind==='coastGrade'),'#26383e',16);
            stroke(roads.filter(r=>r.kind==='bridge'||r.kind==='ramp'||r.kind==='coastGrade'),'#a4b1a5',8);
            return {layer,offset,scale};
        }
        draw(canvas,mini){
            const aerial=!mini&&this.aerial;
            const ctx=canvas.getContext('2d'),{scale,left,top,map,raster}=this.transform(canvas,mini);
            const w=canvas.width,h=canvas.height;
            ctx.fillStyle='#17282d';ctx.fillRect(0,0,w,h);
            if(raster)ctx.drawImage(this.satellite,-left*raster,-top*raster,this.satellite.naturalWidth*raster,this.satellite.naturalHeight*raster);
            else{
                if(!this.base.has(aerial))this.base.set(aerial,this.bake(aerial));
                const {layer,offset,scale:baseScale}=this.base.get(aerial);
                ctx.drawImage(layer,(-offset-left)*scale,(-offset-top)*scale,layer.width*scale/baseScale,layer.height*scale/baseScale);
            }
            const radio=this.game.policeRadio;
            if(radio?.phase==='search'&&this.game.heat>0){
                const [x,z]=map(radio.lastKnownX,radio.lastKnownZ);
                ctx.beginPath();ctx.arc(x,z,(38+this.game.heat*7)*scale,0,Math.PI*2);
                ctx.fillStyle='#d9756747';ctx.fill();ctx.lineWidth=1.35;ctx.strokeStyle='#f1917c';ctx.setLineDash([3,4]);ctx.stroke();ctx.setLineDash([]);
            }
            const pin=(p,label,fill,size)=>{
                const [x,z]=map(p.x,p.z);if(x<-12||z<-12||x>w+12||z>h+12)return;
                ctx.beginPath();ctx.arc(x,z,size,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle='#152428';ctx.lineWidth=1.5;ctx.stroke();
                if(label){ctx.font=`700 ${size+3}px system-ui`;ctx.fillStyle='#17242b';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,x,z+.3);}
            };
            if(this.route?.points.length){
                const points=this.route.points;
                ctx.beginPath();for(const p of points)ctx.lineTo(...map(p.x,p.z));
                ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#122737';ctx.lineWidth=mini?7:9;ctx.stroke();
                ctx.strokeStyle='#65dfed';ctx.lineWidth=mini?3.8:5;ctx.stroke();
                if(this.route.finalWalk>11){
                    ctx.beginPath();ctx.moveTo(...map(points.at(-1).x,points.at(-1).z));ctx.lineTo(...map(this.target.x,this.target.z));
                    ctx.setLineDash([3,4]);ctx.lineWidth=2;ctx.stroke();ctx.setLineDash([]);
                }
            }
            const drawnLabels=[];
            for(const place of this.places){
                if(place.detail&&(!mini&&this.zoom<2.1))continue;
                if(!mini&&this.zoom<=1.25&&!place.district)continue;
                pin(place,place.icon,place.icon==='◆'?'#c7b5ff':'#e6bd87',mini?5:8);
                if(mini||!this.labels)continue;
                const [lx,lz]=map(place.x,place.z);
                if(lx<8||lx>w-8||lz<22||lz>h)continue;
                ctx.font='700 15px system-ui';
                const ww=ctx.measureText(place.name).width+9,labelY=lz-20;
                const rect={x:Math.max(3,Math.min(w-ww-3,lx-ww/2)),y:labelY,w:ww};
                if(drawnLabels.some(r=>Math.abs(r.y-rect.y)<19&&r.x<rect.x+ww&&rect.x<r.x+r.w))continue;
                drawnLabels.push(rect);ctx.fillStyle='#1a2829e8';ctx.fillRect(rect.x,rect.y-10,ww,18);
                ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#f5eed9';ctx.fillText(place.name,rect.x+ww/2,rect.y);
            }
            if(!mini&&this.labels&&!this.world.terrain461&&this.zoom<2.0){
                ctx.font='700 20px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';
                for(const [dx,dz,name] of [[-300,-600,'רובע החוף'],[359,-535,'השדרה הצפונית'],[363,390,'גני סאנסט'],[-691,579,'הרכס המערבי']]){
                    const [px,pz]=map(dx,dz);
                    ctx.strokeStyle='#1c2925bd';ctx.lineWidth=5;ctx.strokeText(name,px,pz);
                    ctx.fillStyle='#e4e0c2';ctx.fillText(name,px,pz);
                }
            }
            for(const marker of H.prisonMarkers472(this.game,this.actor()))
                pin(marker,marker.label,'#b9e2cc',mini?5.2:7.0);
            if(H.cityPlan463.showRail)for(const stop of H.RAIL_PLATFORMS||[])pin(stop,mini?'':'T','#b6b79c',mini?2.7:5);
            for(const stop of H.BUS_STOPS||[])pin(stop,mini?'B':'','#acd5b6',mini?4:3.4);
            if(mini){
                for(const cops of this.game.police)pin(cops,'','#f47b70',2.7);
                for(const bus of this.game.buses)pin(bus,'','#a3d2ac',2.4);
                const yard=this.world.yard445;
                if(yard)for(const c of this.game.parked)
                    if(c.market44==='yardStock'&&H.carClass(c)==='luxury')pin(c,'','#c7b5ff',3.1);
                const a=this.actor(),doors=[];
                for(const p of this.world.entrancePortals){
                    if(!p.interiorReady)continue;
                    const d2=(p.x-a.x)**2+(p.z-a.z)**2;
                    if(d2<74**2)doors.push({p,d2});
                }
                doors.sort((a,b)=>a.d2-b.d2);
                for(const {p} of doors.slice(0,5))pin(p,'','#7fc3b1',2.8);
            }
            const goal=this.game.missions30?.objective;
            if(goal?.x!==undefined)pin(goal,'★','#ffd179',mini?6:8);
            const story=this.game.story445?.destination();
            if(story)pin(story,'◆','#bfb6fa',mini?5:8);
            if(this.target){
                pin(this.target,'•','#7cf4fc',mini?6.5:10);
                if(mini){
                    const [mx,mz]=map(this.target.x,this.target.z),dx=mx-w*.5,dz=mz-h*.5;
                    const extent=Math.max(Math.abs(dx)/(w/2-11),Math.abs(dz)/(h/2-11));
                    if(extent>1){
                        ctx.save();ctx.translate(w*.5+dx/extent,h*.5+dz/extent);ctx.rotate(Math.atan2(dx,-dz));
                        ctx.fillStyle='#7cf4fc';ctx.strokeStyle='#10282d';ctx.lineWidth=2;ctx.beginPath();
                        ctx.moveTo(0,-8);ctx.lineTo(-5,4);ctx.lineTo(5,4);ctx.closePath();ctx.stroke();ctx.fill();ctx.restore();
                    }
                }
            }
            const a=this.actor(),[x,z]=map(a.x,a.z);
            ctx.save();ctx.translate(x,z);ctx.rotate(-a.yaw);
            ctx.beginPath();ctx.moveTo(0,-9);ctx.lineTo(6,6);ctx.lineTo(0,3.4);ctx.lineTo(-6,6);ctx.closePath();
            ctx.fillStyle='#fff1d8';ctx.strokeStyle='#1d292e';ctx.lineWidth=2;ctx.stroke();ctx.fill();ctx.restore();
            ctx.font='700 12px system-ui';ctx.textAlign='left';ctx.textBaseline='top';ctx.fillStyle='#e9efdc';ctx.fillText('N ↑',10,8);
            if(mini){
                const level=a.level?'↗':this.game.inVehicle?'▰':'◆';
                ctx.textAlign='right';ctx.fillText(level,w-8,9);
                ctx.fillStyle='#11262bd9';ctx.fillRect(6,h-22,45,15);
                ctx.fillStyle='#d5e2d6';ctx.font='600 9px system-ui';ctx.direction='rtl';ctx.textAlign='right';ctx.fillText('50 מ׳',49,h-21);
                ctx.fillRect(8,h-10,50*scale,1.3);ctx.direction='inherit';
            }
            if(!mini){
                ctx.fillStyle='#ffffff66';ctx.fillRect(w/2-5,h/2,10,1);ctx.fillRect(w/2,h/2-5,1,10);
                const px=scale*(this.zoom<3?500:100);
                ctx.strokeStyle='#d1ded7';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(15,h-22);ctx.lineTo(15,h-16);ctx.lineTo(15+px,h-16);ctx.lineTo(15+px,h-22);ctx.stroke();
                ctx.fillText(meters(this.zoom<3?500:100),15,h-39);
            }
        }
    }
    H.RoadNetwork445=RoadNetwork445;
    H.Navigator445=Navigator445;
})(Heatline);
