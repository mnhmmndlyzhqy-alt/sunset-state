var Heatline=globalThis.Heatline||{};
(function(H){
    'use strict';
    const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
    const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);};
    const xy=(x,z)=>({x,z});
    function ring(points, rounds=2){
        let list=points.map(([x,z])=>xy(x,z));
        for(let k=0;k<rounds;k++)list=list.flatMap((p,i)=>{
            const q=list[(i+1)%list.length];
            return [xy(p.x*.79+q.x*.21,p.z*.79+q.z*.21),xy(p.x*.21+q.x*.79,p.z*.21+q.z*.79)];
        });
        return list;
    }
    function district(id,points,rounds){
        const outline=ring(points,rounds);
        return {id,outline,edges:outline.map((a,i)=>{
            const b=outline[(i+1)%outline.length],dx=b.x-a.x,dz=b.z-a.z;
            return {a,b,dx,dz,inverse:1/(dx*dx+dz*dz)};
        }),bounds:[Math.min(...outline.map(p=>p.x)),Math.max(...outline.map(p=>p.x)),Math.min(...outline.map(p=>p.z)),Math.max(...outline.map(p=>p.z))]};
    }
    const districts=[
        district('mainland',[[-453,875],[-532,834],[-541,763],[-509,646],[-450,568],[-402,463],
            [-455,355],[-468,237],[-467,83],[-475,-93],[-547,-222],[-552,-327],[-511,-416],[-565,-477],
            [-651,-525],[-624,-593],[-545,-654],[-466,-753],[-432,-856],[-109,-857],
            [119,-842],[172,-768],[169,-663],[251,-597],[320,-539],[412,-521],[540,-532],
            [603,-593],[642,-705],[695,-803],[826,-851],[868,-759],[841,-610],[809,-433],
            [771,-286],[735,-101],[714,70],[712,279],[687,463],[672,612],[598,757],[554,835],[448,875]],1),
        district('port',[[-1084,-852],[-787,-852],[-680,-846],[-625,-811],[-651,-758],[-748,-727],
            [-820,-673],[-846,-597],[-913,-525],[-1065,-526],[-1084,-552]],1),
        district('keysNorth',[[-840,-576],[-728,-538],[-656,-474],[-603,-384],[-625,-242],[-666,-223],[-697,-246],
            [-734,-229],[-755,-209],[-819,-191],[-936,-184],[-997,-247],[-970,-292],[-935,-304],[-947,-360],[-902,-446]],2),
        district('keysMiddle',[[-670,-182],[-573,-200],[-558,-138],[-566,-34],[-538,68],[-522,148],
            [-569,265],[-637,305],[-735,268],[-780,187],[-770,55],[-737,-84]],2),
        district('keysWest',[[-982,-172],[-903,-191],[-811,-144],[-807,-33],[-850,47],[-809,116],[-839,235],
            [-898,329],[-988,343],[-1015,254],[-996,154],[-1006,60],[-1018,-29]],2),
        district('keysSouth',[[-924,371],[-861,307],[-809,333],[-815,386],[-783,416],[-743,396],[-737,359],
            [-707,374],[-638,348],[-558,378],[-529,447],[-571,558],[-606,568],[-648,551],[-671,565],
            [-650,596],[-634,661],[-761,731],[-856,742],[-929,723],[-990,664],[-963,559],[-973,462]],2),
        district('marina',[[-947,789],[-915,782],[-850,798],[-814,847],[-868,881],[-940,864],[-948,841]],2),
        district('outerWest',[[-1178,-87],[-1112,-115],[-1045,-63],[-1032,26],[-1049,95],[-1144,118],
            [-1184,83],[-1186,8]],2),
        district('eastNorth',[[1009,-628],[1077,-658],[1124,-626],[1111,-594],[1148,-582],[1167,-537],
            [1120,-472],[1048,-455],[982,-516]],2),
        district('eastKeys',[[1006,-397],[1085,-442],[1148,-408],[1173,-347],[1149,-284],[1152,-231],[1118,-179],
            [1048,-199],[974,-267],[970,-340]],2),
        district('resort',[[943,397],[1018,352],[1082,358],[1138,412],[1140,500],[1114,570],
            [1038,611],[959,579],[919,516],[912,456]],2),
        district('wetNorth',[[227,-834],[298,-873],[397,-873],[450,-829],[430,-773],[384,-744],[410,-674],
            [353,-640],[282,-644],[249,-696],[263,-738],[215,-784]],2),
        district('wetEast',[[469,-847],[519,-887],[623,-877],[671,-811],[643,-752],[571,-730],
            [589,-677],[546,-626],[473,-634],[449,-704],[480,-764]],2),
        district('wetSpur',[[241,-571],[280,-608],[309,-597],[378,-616],[433,-584],[483,-616],[496,-571],
            [468,-511],[390,-499],[294,-504]],2),
        district('wetIslet',[[420,-718],[449,-746],[479,-712],[467,-668],[430,-659],[405,-685]],2),
        district('wetSouthIslet',[[376,-651],[400,-666],[414,-641],[402,-625],[380,-623]],2),
        district('wetEastIslet',[[598,-691],[616,-704],[630,-690],[630,-665],[608,-657],[590,-671]],2)
    ];
    function signed(region,x,z){
        let inside=false,min=Infinity;
        for(const {a,b,dx,dz,inverse} of region.edges){
            const px=x-a.x,pz=z-a.z,t=clamp((px*dx+pz*dz)*inverse,0,1);
            min=Math.min(min,(px-dx*t)**2+(pz-dz*t)**2);
            if((a.z>z)!==(b.z>z)&&x<a.x+(z-a.z)*dx/dz)inside=!inside;
        }
        return Math.sqrt(min)*(inside?1:-1);
    }
    const R=H.reference469,coast=R.coast;
    const land=(x,z)=>coast(x,z)>=0;
    const keepCity=(x,z)=>x>=-438&&x<=486&&z>=-348&&z<=431;
    const keepFrame=(x,z)=>x>=-452&&x<=505&&z>=-374&&z<=449;
    const keepOverpass=(x,z)=>(Math.abs(x-216)<18&&z>=-554&&z<=-316)||(Math.abs(z+432)<14&&x>=108&&x<=324);
    const keepMarina=(x,z)=>x>=-1024&&x<=-813&&z>=777&&z<=864;
    const keepLegacy=(x,z)=>keepFrame(x,z)||keepOverpass(x,z);
    const flattenAir=(x,z)=>x>=-481&&x<=511&&z>=521&&z<838;
    function landHeight(x,z,shore=coast(x,z)){
        if(shore<0)return -.20+Math.max(-7,shore*.095);
        const hill=(cx,cz,rx,rz)=>Math.exp(-(((x-cx)/rx)**2+((z-cz)/rz)**2));
        const plateau=2.1+2.6*hill(-508,-520,150,208)+4.6*hill(-613,106,93,145)+
            6.1*hill(-800,555,193,164)+5.5*hill(-1138,-6,70,93)+
            2.0*hill(1016,466,139,134)+7.5*hill(-488,-676,118,97)+
            5.8*hill(-891,568,87,125)+4.6*hill(-715,-399,76,81)+
            3.9*hill(1100,-326,57,76)+.66*Math.sin(x*.011)*Math.cos(z*.009);
        const beach=smooth(617,689,x)*(1-smooth(875,934,x))*(1-smooth(573,673,z));
        const marsh=smooth(172,216,x)*(1-smooth(579,625,x))*(1-smooth(-514,-475,z));
        const airport=flattenAir(x,z)?1:smooth(-520,-481,x)*(1-smooth(511,547,x))*smooth(493,521,z)*(1-smooth(838,873,z));
        const normal=.035+Math.max(.34,plateau)*smooth(0,49,shore);
        const lowCoast=(.72+plateau*.23)*smooth(0,36,shore),lowMarsh=(.62+plateau*.23)*smooth(0,27,shore);
        const graded=normal+(lowCoast-normal)*beach;
        const leveled=graded+(lowMarsh-graded)*marsh;
        return R.grade(x,z,leveled+(2.04*smooth(0,23,shore)-leveled)*airport);
    }
    function surface(x,z,legacy){
        if(keepLegacy(x,z))return land(x,z)?R.grade(x,z,legacy):legacy;
        const height=landHeight(x,z);
        if(keepMarina(x,z))return land(x,z)?Math.min(.12,height):height;
        const d=Math.max(-452-x,x-505,-374-z,z-449);
        return d>58||!land(x,z)?height:R.grade(x,z,legacy+(height-legacy)*smooth(0,58,d));
    }
    const places=[
        {id:'port',name:'נמל',x:-935,z:-650,icon:'⚓'},
        {id:'golf',name:'מגרש גולף',x:-511,z:-545,icon:'⚑'},
        {id:'prison',name:'בית כלא',x:-137,z:-578,icon:'■'},
        {id:'flamingo',name:'פלמינגו',x:442,z:-619,icon:'◎'},
        {id:'center',name:'מרכז העיר',x:58,z:68,icon:'●'},
        {id:'stadium',name:'אצטדיון',x:632,z:-203,icon:'◉'},
        {id:'parking',name:'חניון',x:593,z:23,icon:'P'},
        {id:'hospital',name:'בית חולים',x:544,z:325,icon:'+'},
        {id:'airport',name:'שדה תעופה',x:23,z:595,icon:'✈'},
        {id:'private',name:'איים פרטיים',x:-777,z:491,icon:'◇'},
        {id:'resort',name:'אי הנופש',x:1036,z:473,icon:'☀'}
    ];
    // Coordinates at junctions are shared exactly by the rendered roads and the GPS.
    const roads=[
        ['northRing',17.2,[[-877,-632],[-819,-579],[-748,-532],[-635,-487],[-526,-433],[-432,-432],[-416,-432],[-324,-432],[-232,-432],[-216,-432],[0,-432],[108,-432],[324,-432],[465,-432],[587,-426],[664,-389],[684,-344]]],
        ['westExpress',13,[[-324,-779],[-324,-666],[-324,-543],[-324,-516],[-324,-497],[-324,-432],[-324,-367],[-324,-348],[-324,-324],[-324,0],[-324,324],[-324,432],[-324,497],[-329,572],[-344,632]]],
        ['northwestRamp',6.0,[[-416,-432],[-396,-436],[-384,-445],[-375,-466],[-362,-491],[-346,-508],[-324,-516]]],
        ['northeastRamp',6.0,[[-324,-516],[-302,-509],[-283,-490],[-274,-462],[-258,-441],[-232,-432]]],
        ['southwestRamp',6.0,[[-416,-432],[-396,-427],[-379,-410],[-366,-385],[-348,-359],[-324,-348]]],
        ['southeastRamp',6.0,[[-324,-348],[-301,-355],[-282,-382],[-273,-407],[-255,-425],[-232,-432]]],
        ['northAccessWest',8,[[-432,-432],[-432,-368],[-432,-324]]],
        ['northAccessMarket',8,[[-216,-432],[-216,-373],[-216,-324]]],
        ['northAccessCentral',9,[[0,-432],[0,-372],[0,-324]]],
        ['northAccessEast',9,[[324,-432],[324,-374],[324,-324]]],
        ['eastAccessNorth',8,[[486,-324],[538,-324],[600,-330],[642,-338],[684,-344]]],
        ['eastAccessMid',8,[[486,108],[534,108],[588,116],[626,143],[647,176]]],
        ['southRing',17.6,[[-851,520],[-770,479],[-690,461],[-598,448],[-520,442],[-432,436],[-324,432],[0,432],[216,432],[432,432],[534,419],[643,399]]],
        ['eastCoast',12,[[685,-790],[687,-707],[678,-594],[672,-495],[664,-389],[684,-344],[677,-285],[659,-208],[639,-118],[632,-33],[643,69],[647,176],[650,281],[643,399],[613,509],[555,638],[493,773]]],
        ['toResort',10,[[643,399],[709,418],[801,432],[910,440],[964,449],[1036,473]]],
        ['isletLink',7.6,[[677,-285],[738,-279],[822,-265],[911,-282],[985,-308],[1058,-323],[1044,-395],[1039,-487],[1056,-548]]],
        ['northKeys',8.6,[[-819,-579],[-810,-496],[-771,-429],[-797,-346],[-864,-305],[-895,-223],[-895,-142],[-911,-63],[-918,14],[-916,96],[-916,177],[-933,265],[-938,382],[-903,499],[-851,520],[-838,617],[-876,670]]],
        ['keysCanals',8.3,[[-864,-305],[-770,-281],[-682,-308],[-626,-271],[-646,-167],[-654,-83],[-610,-30],[-588,48],[-611,123],[-670,188],[-697,271],[-690,351],[-690,461],[-643,543],[-725,653],[-838,617]]],
        ['keysNorthLoop',7.2,[[-771,-429],[-723,-423],[-689,-393],[-688,-351],[-735,-324],[-797,-346]]],
        ['keysWestLoop',7.0,[[-895,-142],[-948,-128],[-975,-87],[-975,-35],[-952,-4],[-918,14]]],
        ['keysWestSouthLoop',7.0,[[-916,96],[-960,131],[-968,186],[-957,232],[-933,265]]],
        ['keysMiddleLoop',7.2,[[-654,-83],[-703,-44],[-723,25],[-718,79],[-694,113],[-670,188]]],
        ['keysCrossing',7.6,[[-916,96],[-871,105],[-806,130],[-740,130],[-694,113]]],
        ['keysSouthLoop',7.2,[[-903,499],[-933,542],[-939,599],[-915,650],[-876,670],[-803,691],[-744,678],[-725,653]]],
        ['outerLink',7.2,[[-918,14],[-992,21],[-1048,22],[-1105,25],[-1145,50]]],
        ['marinaAccess',7.8,[[-838,617],[-889,677],[-911,738],[-902,795],[-924,821],[-939,821]]],
        ['northPrison',9,[[-108,-432],[-111,-471],[-130,-512],[-137,-544],[-137,-578]]],
        ['wetlands',8,[[465,-432],[449,-474],[424,-515],[415,-559],[442,-619]]],
        ['golfEntry',8.8,[[-526,-433],[-516,-476],[-510,-541],[-494,-604]]],
        ['stadiumEntry',8,[[659,-208],[646,-208],[638,-204]]],
        ['parkingEntry',8,[[643,69],[614,55],[603,23]]],
        ['hospitalEntry',8,[[650,281],[608,294],[568,315],[544,313]]],
        ['hospitalWest',8,[[432,324],[486,324],[513,313],[544,313]]],
        ['terminalEntry',10,[[216,432],[214,489],[183,525],[102,542],[22,558],[22,595]]],
        ['airportWestAccess',9,[[-344,632],[-341,593],[-312,556],[-263,539],[-174,537],[-87,540],[22,558]]],
        ['cargoEntry',9,[[-819,-579],[-877,-632],[-925,-662],[-978,-695],[-1020,-728]]]
    ].map(([id,width,values])=>({id,width,points:values.map(([x,z])=>xy(x,z))}));
    const px=p=>R.world(...p);
    const westX=px([531,245]).x,delta=westX+324;
    const road=id=>roads.find(r=>r.id===id);
    for(const id of ['westExpress','northwestRamp','northeastRamp','southwestRamp','southeastRamp'])
        for(const p of road(id).points)p.x+=delta;
    road('westExpress').points.unshift(px([525,1]),px([522,25]),px([530,49]));
    // Reference centerlines. Shared objects at junctions avoid double nodes.
    const northEast=px([1046,224]),eastSouth=px([975,543]),resortJunction=px([976,559]),portJunction=px([226,140]);
    const set=(id,points)=>{road(id).points=points.map(p=>Array.isArray(p)?px(p):p);};
    // Stage 02/35: The reference point [463,246] is already east of westX-92.
    // The old extra waypoint forced a 22 m reverse and a 180 degree U-turn.
    // Remove only that duplicate/backtracking point; keep every reference
    // anchor and the shared westExpress junction unchanged. Road samples,
    // terrain/bridge heights, traffic paths and road surface use this route.
    set('northRing',[portJunction,[263,167],[309,208],[353,232],[408,243],[463,246],
        xy(westX,-432),xy(westX+92,-432),xy(-216,-432),xy(-108,-432),
        xy(0,-432),xy(108,-432),xy(324,-432),[960,246],[1001,242],northEast]);
    set('cargoEntry',[portJunction,[195,122],[169,106],[146,79]]);
    roads.push({id:'portService469',width:8,points:[[195,122],[189,136],[173,143]].map(px)});
    road('northKeys').points[0]=portJunction;
    set('eastCoast',[[1202,8],[1181,55],[1150,105],[1123,148],[1085,190],northEast,
        [1020,248],[1011,270],[1003,304],[993,332],[984,365],[979,415],[973,477],[972,512],eastSouth,resortJunction,
        [967,593],[959,635],[967,675],[973,704],[973,745]]);
    set('southRing',[[-853,521]].map(p=>xy(...p)).concat([[324,579],[355,555],[390,547],[431,545],[487,545],
        xy(westX,432),xy(-324,432),xy(0,432),xy(216,432),xy(408,432),eastSouth]));
    set('toResort',[resortJunction,[1096,559],[1167,558],[1231,558],[1262,555],[1291,553]]);
    set('eastAccessNorth',[xy(486,-324),[1009,266],[1011,270]]);
    set('eastAccessMid',[xy(432,108),[977,419],[979,415]]);
    set('isletLink',[[1123,148],[1151,216],[1198,229],[1239,204],[1262,190],[1290,180],[1328,201],[1316,259]]);
    set('stadiumEntry',[[1003,304],[1026,307],[1046,308]]);
    set('parkingEntry',[[979,415],[1002,420],[1034,415]]);
    set('hospitalEntry',[[972,512],[996,518],[1020,526],[1035,562]]);
    set('hospitalWest',[xy(432,324),[968,506],[972,512]]);
    set('northPrison',[xy(-108,-432),[682,230],[676,222],[675,200]]);
    set('wetlands',[xy(324,-432),[926,235],[935,219],[899,201],[875,158],[889,128],[890,96]]);
    // Stage 03/35: discard the spurious spur from (-918,14) to [219,377].
    // On the approved city reference the spur crosses a residential plot and
    // causes a 135.9 degree U-turn. Retain all 13 mapped bridge/island anchors.
    // The historic northKeys connector was misplaced; junction reconciliation
    // remains open for a dedicated roads and intersection review.
    roads.push({id:'privateSpine469',width:8.6,points:[[219,377],[217,420],[215,455],
        [212,473],[173,476],[134,498],[118,541],[123,584],[169,618],[228,634],[279,619],[327,566],[355,555] ].map(px)});
    const terminalJoin=px([727,577]);
    set('terminalEntry',[xy(216,432),[804,554],[789,569],terminalJoin,[708,598],[705,610]]);
    set('airportWestAccess',[road('westExpress').points.at(-1),[535,582],[576,573],[642,573],terminalJoin]);
    for(const p of places){
        const at=R.location[p.id];
        if(at)Object.assign(p,px(at));
    }
    const sectors=new Map();
    const activeRoads=new Set();
    const bucket=(x,z)=>Math.floor(x/32)+','+Math.floor(z/32);
    function roadAt(x,z){
        for(const {a,b,length,half,road} of sectors.get(bucket(x,z))||[]){
            const dx=b.x-a.x,dz=b.z-a.z,t=clamp(((x-a.x)*dx+(z-a.z)*dz)/(length*length),0,1);
            if((x-a.x-t*dx)**2+(z-a.z-t*dz)**2<half*half)return {road,a,b,t};
        }
        return null;
    }
    function carveRoads(roadsToUse){
        sectors.clear();activeRoads.clear();
        for(const road of roadsToUse){
            activeRoads.add(road.id);
            for(let i=1;i<road.samples.length;i++){
                const a=road.samples[i-1],b=road.samples[i],length=Math.hypot(b.x-a.x,b.z-a.z),half=road.width*.5+1.35;
                if(length<.01)continue;
                const edge={a,b,length,half,road};
                for(let m=Math.floor((Math.min(a.x,b.x)-half)/32);m<=Math.floor((Math.max(a.x,b.x)+half)/32);m++)
                    for(let n=Math.floor((Math.min(a.z,b.z)-half)/32);n<=Math.floor((Math.max(a.z,b.z)+half)/32);n++){
                        const key=m+','+n,list=sectors.get(key)||[];
                        list.push(edge);sectors.set(key,list);
                    }
            }
        }
    }
    const isRouteRoad=(x,z)=>Boolean(roadAt(x,z));
    const boardwalk=[[890,96],[881,85],[887,71],[900,88],[915,96],[941,94],[962,106],[990,114],
        [1017,103],[1034,112],[1023,121],[997,116]].map(([u,v],i)=>({...R.world(u,v),y:2.57+1.18*(1-smooth(0,3,i))}));
    const traceBounds=[Math.min(...boardwalk.map(p=>p.x))-3,Math.max(...boardwalk.map(p=>p.x))+3,
        Math.min(...boardwalk.map(p=>p.z))-3,Math.max(...boardwalk.map(p=>p.z))+3];
    function trailAt(x,z){
        // Heavy timber walkway removed in 4.7.7, including its hidden collision plane.
        return null;
    }
    const grade=z=>6.45*smooth(0,65,84-Math.abs(z+432));
    function followGrade(actor,x,z){
        const rise=grade(actor.z),near=Math.abs(actor.x-westX);
        if(actor.coastDeck461){
            if(rise<.045){actor.coastDeck461=false;return;}
            if(near>6.08){actor.x=westX+Math.sign(actor.x-westX)*6.08;actor.vx*=.28;}
        }else if(rise>.025&&rise<1.0&&near<5.6&&Math.abs(actor.z-z)>Math.abs(actor.x-x)*.75)
            actor.coastDeck461=true;
    }
    const risk=(x,z)=>{
        const [u,v]=R.pixels(x,z);
        return u<75&&u>3&&v>314&&v<448&&coast(x,z)>2;
    };
    const geo={districts,places,roads,coast,land,landHeight,surface,keepCity,keepFrame,keepOverpass,keepLegacy,keepMarina,
        flattenAir,carveRoads,roadAt,isRouteRoad,risk,smooth,clamp,extent:{x:1260,z:900},
        boardwalk, trailAt, grade, followGrade, westX,
        flight:(x,z)=>{
            const {west,east,z:center}=R.runway;
            return {x:west+57+(z+1044)*(east-west-98)/401,z:center-(x-883)*.82};
        },
        wet:(x,z)=>R.world(873+(x+965)*.065,59+(z+824)*.056)};
    H.coast461=geo;
})(Heatline);
