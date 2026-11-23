var Heatline=globalThis.Heatline||{};
(function(H){
    'use strict';
    function prism(profile,smoothSides=false){
        const out=[],count=profile.length;
        const top=profile.map(([x,z])=>[x,.5,z]),bottom=profile.map(([x,z])=>[x,-.5,z]);
        const face=(a,b,c,wall=false)=>{
            const u=b.map((v,i)=>v-a[i]),v=c.map((p,i)=>p-a[i]);
            const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],mag=Math.hypot(...n)||1;
            out.push([a,b,c].map(p=>smoothSides&&wall?
                [...p,p[0]*2,0,p[2]*2]:[...p,...n.map(q=>q/mag)]));
        };
        for(let i=0;i<count;i++){
            const j=(i+1)%count;
            face(bottom[i],top[i],top[j],true);face(bottom[i],top[j],bottom[j],true);
            face([0,.5,0],top[j],top[i]);face([0,-.5,0],bottom[i],bottom[j]);
        }
        return out;
    }
    const ellipse=Array.from({length:30},(_,i)=>[Math.cos(i*Math.PI/15)*.50,Math.sin(i*Math.PI/15)*.50]);
    const chamfer=[[-.33,-.50],[.33,-.50],[.50,-.33],[.50,.33],[.33,.50],[-.33,.50],[-.50,.33],[-.50,-.33]];
    const notched=[[-.50,-.50],[.50,-.50],[.50,.06],[.14,.06],[.14,.50],[-.50,.50]];
    const prow=[[-.46,-.50],[.44,-.38],[.50,-.27],[.06,.50],[-.11,.44],[-.50,-.34]];
    const slab=[[-.45,-.50],[.45,-.50],[.50,-.42],[.50,.42],[.45,.50],[-.45,.50],[-.50,.42],[-.50,-.42]];
    H.coastMeshes461.reference_round469=prism(ellipse,true);
    H.coastMeshes461.reference_octagon469=prism(chamfer);
    H.coastMeshes461.reference_step469=prism(notched);
    H.coastMeshes461.reference_prow469=prism(prow);
    H.coastMeshes461.reference_slab469=prism(slab);
    const families={
        round:{mesh:'reference_round469',levels:[[0,.90,1],[.90,1,.88]],stone:'#b1b9b2',glass:'#597b87',pane:1.85,trim:'#aeb0a1'},
        oval:{mesh:'reference_round469',levels:[[0,.55,1],[.55,1,.91]],stone:'#8b9da0',glass:'#315c6c',pane:2.37,trim:'#abb5b4'},
        octagon:{mesh:'reference_octagon469',levels:[[0,.70,1],[.70,1,.84]],stone:'#a0adaf',glass:'#406878',pane:2.78,trim:'#b9c4bd'},
        step:{mesh:'reference_step469',levels:[[0,.39,1],[.39,.72,.87],[.72,1,.68]],stone:'#9daaa3',glass:'#426a71',pane:2.09,trim:'#b5b8ab'},
        prow:{mesh:'reference_prow469',levels:[[0,.84,1],[.84,1,.90]],stone:'#72868c',glass:'#3a5d75',pane:0,trim:'#8d9ba1'},
        slab:{mesh:'reference_slab469',levels:[[0,.83,1],[.83,1,.91]],stone:'#849195',glass:'#2d526c',pane:0,trim:'#aab5b9',cladding:'metal'},
        terrace:{mesh:'reference_slab469',levels:[[0,.32,1],[.32,.76,.84],[.76,1,.72]],stone:'#9e7866',glass:'#4b5a68',pane:1.60,trim:'#a99382',cladding:'brickwork'},
        garden:{mesh:'reference_slab469',levels:[[0,.78,1],[.78,1,.92]],stone:'#9aaea8',glass:'#325b66',pane:2.54,trim:'#acb5a3'}
    };
    H.finishReferenceBuildings469=w=>{
        const buildings=w.buildings.filter(b=>b.silhouette469);
        const terrain=w.boxes.shoreMesh463;
        const candidates=buildings.map(b=>({b,y:H.outdoorHeight(b.x,b.z)}));
        const ownership=new Map(candidates.map(site=>[site.b.silhouette469.id,site]));
        w.boxes=w.boxes.flatMap(o=>{
            if(o.layer<4)return [o];
            const owner=ownership.get(o.referenceOwner469)??candidates.find(({b,y})=>
                !o.basis444&&Math.abs(o.x-b.x)<b.w*.5+2.55&&Math.abs(o.z-b.z)<b.d*.5+2.55&&
                o.y+o.h*.5>y+8.2&&o.y-o.h*.5<y+b.h+9&&o.w<b.w+7.8&&o.d<b.d+7.8);
            if(!owner)return [o];
            const lower=o.y-o.h*.5,limit=owner.y+8.2;
            if(o.y+o.h*.5<=limit)return [o];
            if(lower>=limit-.04)return [];
            return [{...o,y:(lower+limit)/2,h:limit-lower,lodMin:undefined,lodMax:undefined}];
        });
        w.boxes.shoreMesh463=terrain;
        for(const {b,y} of candidates){
            const {form}=b.silhouette469,{mesh,levels,stone,glass,pane,trim,cladding='travertine471'}=families[form];
            const trimFinish=form==='terrace'?'bronze471':'anodized471';
            const base=y+8.08,rise=b.h-8.08;
            for(const [lo,hi,scale] of levels){
                const bottom=base+lo*rise,top=base+hi*rise,h=top-bottom,ww=b.w*scale,dd=b.d*scale;
                const mass=H.coastShape461(w,b.x,bottom+h/2,b.z,ww,h,dd,stone,cladding,mesh,0,3500);
                mass.stage450Proxy=true;mass.stage461Mass=true;
                if(!pane){
                    const curtain=H.coastShape461(w,b.x,bottom+h/2,b.z,ww+.11,h-.23,dd+.11,glass,'tower_glass469',mesh,0,3500);
                    curtain.stage450Proxy=true;
                    for(let floor=bottom+6.95;floor<top-1.2;floor+=10.65){
                        const joint=H.coastShape461(w,b.x,floor,b.z,ww+.17,.115,dd+.17,trim,'anodized471',mesh,0,600);
                        joint.lodMax=420;
                    }
                }else{
                    const story=b.kind==='glass'||b.kind==='tech'?3.55:3.28;
                    for(let band=bottom+(story-pane)*.54;band<top-pane-.07;band+=story){
                        const opening=H.coastShape461(w,b.x,band+pane/2,b.z,ww+.094,pane,dd+.094,glass,'tower_glass469',mesh,0,1400);
                        opening.lodMax=1280;
                    }
                }
                const ledge=H.coastShape461(w,b.x,top-.12,b.z,ww+.32,.28,dd+.32,trim,trimFinish,mesh,0,1900);
                ledge.stage450Proxy=true;
                if(form==='terrace'&&hi<1)
                    for(const sign of [-1,1]){
                        const x=b.x+sign*ww*.449;
                        H.coastShape461(w,x,top+.31,b.z,.64,.62,dd*.54,'#8f8572','concrete','rounded',0,660);
                        for(let i=-2;i<=2;i++)
                            H.coastShape461(w,x,top+.78,b.z+i*dd*.092,.72,.52,1.26,'#728065','foliage','urban_crown',i,640);
                    }
            }
            const top=y+b.h,size=levels.at(-1)[2];
            const green=form==='garden';
            H.coastShape461(w,b.x,top+.13,b.z,b.w*(green?.85:.67)*size,.28,b.d*(green?.80:.67)*size,
                green?'#748954':'#a5a797',green?'lawn443':'concrete',mesh,0,1540);
            if(green){
                for(const sign of [-1,1]){
                    const x=b.x+sign*b.w*.375*size;
                    H.coastShape461(w,x,top+.28,b.z,.91,.58,b.d*.57*size,'#8d9a84','concrete','rounded',0,760);
                    for(const dz of [-.24,-.12,0,.12,.24])
                        H.coastShape461(w,x,top+.82,b.z+b.d*dz,.81,.61,1.36,'#52744f','foliage','urban_crown',dz,678);
                }
            }
            if(form==='round'||form==='oval'){
                H.coastShape461(w,b.x,top+.34,b.z,b.w*.30,.24,b.d*.30,
                    '#aaafa6','metal','reference_round469',0,1600);
                H.coastShape461(w,b.x,top+.49,b.z,b.w*.25,.11,b.d*.25,
                    '#62909a','tower_glass469','reference_round469',0,1220);
            }
        }
        w.referenceBuildings469=buildings.map(b=>({...b.silhouette469,x:b.x,z:b.z,w:b.w,d:b.d,height:b.h}));
    };
})(Heatline);
