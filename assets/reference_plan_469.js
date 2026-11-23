var Heatline=globalThis.Heatline||{};
(function(H){
    'use strict';
    const data=H.referenceCoastData469;
    // Control points register the reference crop to the playable world. The
    // central grid, expressways and runway have independent surveyed anchors.
    const xAxis=[[0,-1194],[75,-1042],[124,-985],[218,-889],[350,-705],[430,-557],
        [534,-450],[552,-432],[974,432],[1029,548],[1080,643],[1140,735],[1195,906],[1290,1036],[1384,1190]];
    const zAxis=[[0,-904],[38,-836],[110,-705],[201,-536],[246,-432],
        [265,-324],[540,432],[560,454],[689,756],[720,828],[752,894]];
    function interpolate(axis,position,from,to){
        let lo=0,hi=axis.length-1;
        while(hi-lo>1){const mid=(hi+lo)>>1;if(position<axis[mid][from])hi=mid;else lo=mid;}
        const a=axis[lo],b=axis[hi];
        return a[to]+(position-a[from])*(b[to]-a[to])/(b[from]-a[from]);
    }
    const worldX=px=>interpolate(xAxis,px,0,1),worldZ=px=>interpolate(zAxis,px,0,1);
    const pixelX=x=>interpolate(xAxis,x,1,0),pixelZ=z=>interpolate(zAxis,z,1,0);
    const world=(u,v)=>({x:worldX(u),z:worldZ(v)});
    const pixels=(x,z)=>[pixelX(x),pixelZ(z)];
    const runway={west:worldX(555),east:worldX(864),north:worldZ(694),south:worldZ(706),elevation:2.04};
    runway.z=(runway.north+runway.south)/2;
    const airfieldGrade=[
        [549,689,872,711,runway.elevation],
        [458,554,955,685,runway.elevation]
    ];
    const grades=[
        [554,49,782,221,2.55],       // Prison compound
        [1002,343,1078,479,1.68],   // Stadium parking
        [125,36,204,226,1.77],      // Port apron
        ...airfieldGrade
    ].map(([u,v,U,V,height])=>[worldX(u),worldZ(v),worldX(U),worldZ(V),height]);
    const beachLine=[[0,1248],[65,1210],[139,1165],[214,1143],[302,1117],[397,1095],
        [478,1069],[551,1037],[625,1033],[691,1038],[704,1055]];
    function sandAt(x,z,shore){
        if(shore<-.3||x<552||z>worldZ(704))return 0;
        const v=pixelZ(z),u=pixelX(x),edge=interpolate(beachLine,v,0,1);
        if(u>1228&&v>377||u>1273||u>1200&&v>90&&v<306)return shore<9?.44:0;
        const t=Math.min(1,Math.max(0,(u-edge+3)/13));
        return t*t*(3-2*t);
    }
    function grade(x,z,height){
        for(const [left,north,right,south,level] of grades){
            const distance=Math.max(left-x,x-right,north-z,z-south);
            if(distance>=13)continue;
            const t=Math.max(0,distance)/13;
            return level+(height-level)*t*t*(3-2*t);
        }
        return height;
    }
    const urbanHills=[[-294,157,168,232,4.8],[240,-219,172,145,5.15],[151,290,155,138,2.65]];
    function cityRise(x,z){
        let rise=0;
        for(const [cx,cz,rx,rz,height] of urbanHills){
            const radius=((x-cx)/rx)**2+((z-cz)/rz)**2;
            const taper=Math.max(0,1-radius*.44);
            rise+=height*taper*taper*taper;
        }
        return rise;
    }
    const bytes=new Uint8Array(data.width*data.height),encoded=atob(data.coast);
    let offset=0;
    for(let i=0;i<encoded.length;i+=2){
        const count=encoded.charCodeAt(i);
        bytes.fill(encoded.charCodeAt(i+1),offset,offset+count);offset+=count;
    }
    if(offset!==bytes.length)throw Error('Reference coastal field size mismatch');
    const {width,height}=data;
    function coast(x,z){
        const [px,pz]=pixels(x,z);
        if(px<0||pz<0||px>width-1||pz>height-1){
            const dx=Math.max(0,-px,px-width+1),dz=Math.max(0,-pz,pz-height+1);
            return -Math.min(96,.08+Math.hypot(dx,dz)*2);
        }
        const ax=Math.min(width-2,Math.floor(px)),az=Math.min(height-2,Math.floor(pz)),u=px-ax,v=pz-az;
        const k=az*width+ax;
        const lo=bytes[k]*(1-u)+bytes[k+1]*u,hi=bytes[k+width]*(1-u)+bytes[k+width+1]*u;
        return (lo*(1-v)+hi*v-128)*1.36;
    }
    let raster;
    function paintMap(ctx,aerial){
        if(!raster){
            raster=document.createElement('canvas');raster.width=width;raster.height=height;
            const surface=raster.getContext('2d'),image=surface.createImageData(width,height);
            for(let i=0;i<bytes.length;i++){
                const land=bytes[i]>=128,shore=Math.abs(bytes[i]-128);
                if(land){image.data.set([98,117,75,255],i*4);continue;}
                if(shore<=24)image.data.set([63,141,147,Math.round((1-shore/25)*130)],i*4);
            }
            surface.putImageData(image,0,0);
        }
        ctx.save();ctx.globalAlpha=aerial?1:.87;
        for(let i=1;i<xAxis.length;i++)for(let j=1;j<zAxis.length;j++){
            const [a,x]=xAxis[i-1],[b,u]=xAxis[i],[c,z]=zAxis[j-1],[d,v]=zAxis[j];
            ctx.drawImage(raster,a,c,b-a,d-c,x,z,u-x,v-z);
        }
        ctx.restore();
    }
    const location={port:[173,143],golf:[456,141],prison:[675,219],flamingo:[891,88],center:[767,361],
        stadium:[1063,292],parking:[1034,410],hospital:[1035,565],airport:[705,610],private:[230,474],resort:[1292,551]};
    H.reference469={width,height,xAxis,zAxis,world,pixels,coast,grade,cityRise,sandAt,paintMap,location,runway,
        edge:(u,v)=>bytes[v*width+u]>=128,sha256:data.referenceSha256};
})(Heatline);
