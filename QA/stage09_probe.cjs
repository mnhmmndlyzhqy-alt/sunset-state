'use strict';
const {H,g}=require('./stage05_bootstrap.cjs');
const w=g.world, active=w.entrancePortals.filter(p=>p.interiorReady), dorm=w.entrancePortals.filter(p=>!p.interiorReady), coast=H.reference469.coast;
function info(list){let water=list.filter(p=>coast(p.x,p.z)<.1),negative=list.filter(p=>coast(p.x,p.z)<0),edge=list.filter(p=>coast(p.x,p.z)>=0&&coast(p.x,p.z)<2);return {count:list.length,belowPointOne:water.length,negative:negative.length,nearCoast:edge.length,min:Math.min(...list.map(p=>coast(p.x,p.z))),examples:water.slice(0,13).map(p=>({id:p.id,x:p.x,z:p.z,coast:coast(p.x,p.z),facing:p.facing,legacy:!p.stage05City20,ready:p.interiorReady}))}}
const dry=active.filter(p=>coast(p.x,p.z)<.1);
const game=active.map(p=>{const near=(x,z)=>H.coast461.landHeight(x,z); const shore=coast(p.x,p.z);return {id:p.id,x:p.x,z:p.z,shore,ground:typeof H.outdoorHeight==='function'?H.outdoorHeight(p.x,p.z):null,y:p.y,face:p.facing,stage05:!!p.stage05City20}});
console.log(JSON.stringify({total:w.entrancePortals.length,active:info(active),dormant:info(dorm),all:info(w.entrancePortals),activeLowest:game.sort((a,b)=>a.shore-b.shore).slice(0,28),Hnames:Object.keys(H.coast461),worldNames:Object.keys(w).filter(k=>/water|coast|shore|ground|ocean|land|portal|entry/i.test(k))},null,2));
