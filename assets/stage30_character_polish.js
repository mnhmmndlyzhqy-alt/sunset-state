/* SUNSET STATE / 35-stage programme / Stage 30.
 * Character-only finishing pass on ORIGINAL Stage 29 game and meshes.
 * Uses the existing AeroWild hero, Street Character V8 and urban GLB rigs.
 * No new actors, animation state saved, movement changes, colliders or meshes loaded.
 * A/B switch: ?stage30CharactersOff=1 or __SUNSET_STAGE30_CHARACTERS_OFF=true.
 * Original model functions are called first: all assets, accessories and motions survive.
 */
var Heatline=globalThis.Heatline||{};
(function(H){'use strict';
  const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
  const fine=n=>Number.isFinite(n);
  const stats={installed:false,heroCalls:0,heroExtraMeshes:0,npcCalls:0,
    npcCloseCalls:0,npcExtraMeshes:0,premiumFaceCalls:0,disabledCalls:0,
    newColliders:0,worldMutations:0,saveFormatChanges:0,
    hardwareGPUVerified:false,fullHD50FPSVerified:false};
  const PLAYER_SCALE=.90;
  function off(){return globalThis.__SUNSET_STAGE30_CHARACTERS_OFF===true||
    (typeof location!=='undefined'&&typeof URLSearchParams==='function'&&
      new URLSearchParams(location.search||'').get('stage30CharactersOff')==='1');}
  function addLocal(w,out,kind,lx,ly,lz,width,height,depth,color,material,cap,scale=1){
    const yaw=-w.yaw,c=Math.cos(yaw),s=Math.sin(yaw);
    const rootY=w.y+(w.grounded ? .013*clamp(w.stride||0,0,1)*(1-Math.cos((w.phase||0)*2)) : 0)
       -Math.min(.09,(w.stumble||0)*.08);
    const b=H.box(w.x+(c*lx-s*lz)*scale,rootY+ly*scale,
      w.z+(s*lx+c*lz)*scale,width*scale,height*scale,depth*scale,color,yaw,4);
    b.shape='rounded_smooth';b.material=material;
    b.visibilityCap=cap;b.lodMax=cap;
    b.stage30CharacterDetail=true;b.stage30Kind=kind;
    out.push(b);return b;
  }
  function moveFront(w,b,localZ){
    const yaw=-w.yaw,s=Math.sin(yaw),c=Math.cos(yaw);
    b.x-=s*localZ*PLAYER_SCALE;
    b.z+=c*localZ*PLAYER_SCALE;
  }
  function finishHero(w,out,seconds,webgl,start){
    if(w.injuryState!=='walking'||out.length===start)return;
    // The original face has eyes sunk too deep inside the rounded head.
    // Advance the existing eye/brow group along local forward (-Z), without
    // replacing the user's approved character, kippah or tzitzit meshes.
    const breath=Math.sin(seconds*1.72+.31)*.0047;
    let feet=0,eyes=0;
    for(let i=start;i<out.length;i++){
      const b=out[i],color=b.color;
      if((b.shape==='aerowild_head'||(!webgl&&color==='#bd866b'&&b.h>.32&&b.y>w.y+1.60))){
        b.w*=.959;b.d*=.971;b.h*=1.007;
      }
      if(color==='#e5dacf'||color==='#3a332b'){
        if(b.h<.060){moveFront(w,b,-.057);eyes++;}
      }
      if(color==='#745147'&&b.h<.035){moveFront(w,b,-.061);}
      if(color==='#292529'&&b.h<.020&&b.y>w.y+1.72&&b.y<w.y+1.90){
        moveFront(w,b,-.048);
      }
      if(color==='#326da7'&&b.h>.35&&b.y>w.y+.80&&b.y<w.y+1.40){
        b.h*=1+breath;b.pitch=(b.pitch||0)+breath*.7;
      }
      if(color==='#292a2c'&&b.h>.16&&b.d>.22&&b.d<.30&&feet<2){
        const side=feet++===0?-1:1;
        if(w.grounded){
          const cycle=Math.max(0,side*Math.sin(w.phase||0));
          const lift=clamp(w.stride||0,0,1)*.053*Math.pow(cycle,1.65);
          b.y+=lift;
          b.pitch=(b.pitch||0)+side*clamp(w.stride||0,0,1)*.072;
        }
      }
    }
    // Anatomical landmarks in the model's existing facial coordinate system.
    // Thin, rounded parts sit on the skin plane; no excessive toy-like eyes.
    const add=(...p)=>addLocal(w,out,...p,86,PLAYER_SCALE);
    add('nasal-bridge',0,1.897,-.202,.053,.119,.055,'#bb8268','skin');
    add('nasal-tip',0,1.839,-.246,.086,.041,.058,'#c18b73','skin');
    for(const side of [-1,1]){
      add('nostril',side*.032,1.826,-.274,.018,.009,.014,'#775043','skin');
      add('lower-eyelid',side*.061,1.951,-.227,.079,.012,.014,'#b68069','skin');
      add('cheek',side*.127,1.882,-.163,.060,.078,.033,'#bd866b','skin');
    }
    add('upper-lip',0,1.771,-.219,.102,.017,.019,'#9f665d','skin');
    add('lower-lip',0,1.747,-.216,.084,.011,.017,'#bd8875','skin');
    for(const side of [-1,1]){
      const collar=add('jacket-collar',side*.116,1.587,-.180,.118,.069,.042,'#7194b4','fabric');
      collar.roll=-side*.27;
    }
    stats.lastHeroFaceElementsAdvanced=eyes;
  }
  function finishNpc(w,out,seconds,distance,start){
    if(w.injuryState!=='walking'||distance>40)return 0;
    const stride=clamp(w.stride||0,0,1),phase=w.phase||0;
    const appearance=w.appearance>>>0;
    const calm=stride<.15&&w.panic<=0;
    const social=['talk','chat','listen','perform'].includes(w.socialPose)&&w.navActivity!=='phone';
    const breath=Math.sin(seconds*1.45+(appearance%31)*.17)*.009*(1-stride);
    for(let i=start;i<out.length;i++){
      const b=out[i];
      if(!b.shape||typeof b.shape!=='string'||!b.shape.endsWith('_hi'))continue;
      const part=b.shape.slice(4,-3);
      if(part==='head'){
        b.w*=.971;b.h*=1.012;b.d*=.993;
      }else if(part==='torso'){
        b.pitch=(b.pitch||0)+breath;
        b.roll=(b.roll||0)+.011*stride*Math.sin(phase);
      }else if(part==='shoeL'||part==='soleL'||part==='shoeR'||part==='soleR'){
        const sign=part.endsWith('L')?-1:1;
        b.pitch=(b.pitch||0)+sign*stride*.066*Math.max(0,-sign*Math.sin(phase));
      }else if(part==='armR'||part==='rightHand'){
        if(social)b.pitch=(b.pitch||0)+.13+.09*Math.sin(seconds*2.15+(appearance%19));
      }else if(part==='brows'){
        if(w.panic>.12||w.fear>.38)b.y+=.009;
      }else if(part==='mouth'){
        if(social)b.h*=1.0+.075*Math.max(0,Math.sin(seconds*5.1+appearance%7));
      }
    }
    if(distance>15||!fine(w.x)||!fine(w.y)||!fine(w.z))return 0;
    // Fitted clothing highlights at near LOD only: original face geometry,
    // kippah, tzitzit and skin-tones remain sourced from Street Character V8.
    const palette=['#acb9b5','#c1b2a5','#9fb0bd','#b9b5a3'];
    const cloth=palette[(appearance>>>3)%palette.length];
    const scale=[.93,.974,1.014,1.055,1.085][(appearance>>>3)%5];
    const add=(kind,x,y,z,ww,hh,dd,color)=>addLocal(w,out,kind,x,y*scale,z,ww,hh,dd,color,'fabric',16,1);
    const before=out.length;
    for(const side of [-1,1]){
      const seam=add('collar-edge',side*.095,1.385,-.148,.091,.037,.017,cloth);
      seam.roll=-side*.29;
    }
    if((appearance&3)!==3){
      add('shirt-placket',0,1.286,-.158,.023,.190,.018,cloth);
      for(const y of [1.33,1.255])add('shirt-button',0,y,-.171,.014,.015,.012,'#4a4d4b');
    }else{
      add('jacket-pocket',.123,1.254,-.163,.111,.024,.018,cloth);
    }
    if(calm){
      // Tiny idle fabric movement; independent of world navigation/physics.
      const last=out[out.length-1];if(last?.stage30CharacterDetail)last.roll=(last.roll||0)+breath*.30;
    }
    return out.length-before;
  }
  function install(){
    if(stats.installed)return;
    if(typeof H.aerowildPlayerPose!=='function'||typeof H.streetCharacterPose32!=='function'||
       typeof H.expression443!=='function')throw Error('Stage30 requires hero, Street Character V8 and urban expressions');
    const originalHero=H.aerowildPlayerPose;
    const originalNpc=H.streetCharacterPose32;
    const originalExpression=H.expression443;
    H.aerowildPlayerPose=function stage30Hero(w,out,seconds,webgl){
      const first=out.length,result=originalHero(w,out,seconds,webgl);
      if(off()){stats.disabledCalls++;return result;}
      if(result===true){
        stats.heroCalls++;
        const old=out.length;
        finishHero(w,out,seconds,webgl,first);
        stats.heroExtraMeshes+=out.length-old;
      }
      return result;
    };
    H.streetCharacterPose32=function stage30NpcOrEntry(w,out,seconds,player=false,distance=0,webgl=true,entryTime){
      const first=out.length,result=originalNpc(w,out,seconds,player,distance,webgl,entryTime);
      if(off()){stats.disabledCalls++;return result;}
      if(!player){
        stats.npcCalls++;
        if(webgl&&distance<=40){
          stats.npcCloseCalls++;
          const added=finishNpc(w,out,seconds,distance,first);
          stats.npcExtraMeshes+=added;
        }
      }
      return result;
    };
    H.expression443=function stage30PremiumGLBExpression(actor,seconds){
      const e=originalExpression(actor,seconds);
      if(off()||!e||actor.injuryState!=='walking')return e;
      stats.premiumFaceCalls++;
      const id=(actor.appearance>>>0)%59;
      const isIdle=clamp(actor.stride||0,0,1)<.17;
      const saccade=isIdle?.022*Math.sin(seconds*.68+id*.34):.007*Math.sin(seconds*.67+id);
      e.yaw=clamp(e.yaw+saccade,-.33,.33);
      e.roll=clamp(e.roll+.006*Math.sin(seconds*1.17+id),-.19,.19);
      if(e.mode==='talk'){
        // Calm, conversational jaw/hand gestures (no new scripted AI behavior).
        e.vector[2]=clamp(e.vector[2]*.88,0,.65);
        e.arms=clamp(e.arms+.026*Math.sin(seconds*1.7+id),0,.35);
      }else if(e.mode==='calm'){
        e.pitch=clamp(e.pitch+.006*Math.sin(seconds*1.42+id),-.25,.25);
      }
      return e;
    };
    stats.installed=true;
  }
  H.stage30CharacterPolish={install,off,stats,addLocal,finishNpc};
  install();
})(Heatline);
