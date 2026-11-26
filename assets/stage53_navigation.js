/* Island destinations use sea/air guidance instead of a road across the sea. */
(function(H){
 'use strict';
 if(!H.Navigator445)return;
 const P=H.Navigator445.prototype,update=P.update,places=P.buildPlaces;
 P.buildPlaces=function(){
  const result=places.call(this),estate=this.world.estate53;
  if(estate){
   for(const [id,p,name,icon] of [
    ['office',estate.office,'האי שלך · ניהול, דירות ושכירות','⌂'],
    ['runway',{x:(estate.runway.west+estate.runway.east)/2,z:estate.runway.z},'האי שלך · מסלול נחיתה','✈'],
    ['garage',estate.slots.car[0],'האי שלך · אחסון רכבים','▰']
   ])result.push({...p,id:'estate53:'+id,name,icon,level:0,district:true});
   const freight=H.transport53?.get(this.game)?.marina?.carDrop;
   if(freight)result.push({...freight,id:'freight53:marina',name:'מעבורת רכבים אל האי שלך',icon:'▰',level:0,district:true});
  }
  return result;
 };
 const meters=d=>d>1000?(d/1000).toFixed(1)+' ק״מ':Math.round(d)+' מ׳';
 function guide(nav,a,target,text,icon='✈',allowArrival=true){
  const distance=Math.hypot(target.x-a.x,target.z-a.z);
  const arrived=allowArrival&&distance<13;
  nav.route=null;nav.guide.hidden=false;nav.clearButton.disabled=false;
  nav.icon.textContent=arrived?'✓':icon;
  nav.cue.textContent=arrived?'הגעתם ליעד':text;
  nav.distance.textContent=target.name+' · '+meters(distance)+' בקו אווירי';
  nav.info.textContent=nav.distance.textContent;
 }
 P.update=function(...args){
  const target=this.target,id=target?.id;
  if(!target)return update.apply(this,args);
  const g=this.game,a=this.actor(),onEstate=!!H.estate53World?.walkable(a.x,a.z),
   estateTarget=!!H.estate53World?.walkable(target.x,target.z);
  if(estateTarget&&g.flight51?.pilot&&g.flight51.plane.airborne){
   guide(this,a,target,'נחתו במסלול האי הפרטי · L להכוונה','✈',false);
   return;
  }
  if(onEstate!==estateTarget){
   guide(this,a,target,g.boat444?'הפליגו אל הרציף · האטו לעגינה עם E':
    g.flight51?.pilot?'נחתו במסלול היעד · L להכוונה':
    g.inVehicle?'הגיעו למעבורת הרכבים ברציף · B לבחירת יעד':
    'הגעה דרך הרציף או מנחת המסוקים · בחירת יעד עם B',g.boat444?'⚓':'✈');
   return;
  }
  if(typeof id==='string'&&id.startsWith('island53:')){
   const island=id.slice(9);
   const port=(g.world.islandPorts53||[]).find(p=>p.id===island);
   if(port){
    const distance=Math.hypot(target.x-a.x,target.z-a.z),key=Math.floor(a.x/18)+','+Math.floor(a.z/18)+':'+id;
    if(this.islandCheck53?.key!==key){
     let land=distance<250;
     if(island==='estate')land=!!H.estate53World?.walkable(a.x,a.z);
     if(land&&island!=='estate')for(let t=0;t<=1;t+=1/Math.max(1,Math.ceil(distance/6))){
      if(!H.marinaWalk444(H.lerp(a.x,target.x,t),H.lerp(a.z,target.z,t))){land=false;break;}
     }
     this.islandCheck53={key,land};
    }
    if(!this.islandCheck53.land){
     guide(this,a,target,g.boat444?'הפליגו אל הרציף · האטו לעגינה עם E':
      g.flight51?.pilot?(island==='estate'?'נחתו במסלול האי הפרטי · L להכוונה':'לאי הזה מגיעים במסוק או בסירה'):
      'הגעה דרך המרינה או מנחת המסוקים · בחירת יעד עם B',g.boat444?'⚓':'✈');
     return;
    }
    if(island!=='estate'){
     guide(this,a,target,'עקבו אחרי שביל האי אל הרציף','⚓');
     return;
    }
   }
  }
  return update.apply(this,args);
 };
})(Heatline);
