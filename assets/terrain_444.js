var Heatline=globalThis.Heatline||{};
(function(H){
    const district={west:-912,east:-669,north:178,south:390};
    const basin=[{west:-1300,east:-1067,north:437,south:869},
        {west:-1067,east:-948,north:437,south:449},{west:-1067,east:-948,north:740,south:869},
        {west:-997,east:-948,north:460,south:740}];
    const surfaces=new Set(['#46505b','#696c70','#748ca2','#cbd5d1','#e8aa53','#d8bb73',
        '#45516a','#849994','#e0b96f','#d8b57a','#d4d7cd','#d5d8ce','#b8cde0','#e3e7dd','#b8b9ad','#dbbb7a']);
    const kerbs=new Set(['#9fa9a4','#a6b4ae','#a9afaa','#a5b3ad','#a9b6b1']);
    H.ridgeDistrict444=(x,z)=>x>district.west&&x<district.east&&z>district.north&&z<district.south;
    H.maritimeBasin444=basin;
    H.openSea444=(x,z)=>x<-948.001&&z>437&&z<869&&(
        x<-1067||z<449||z>740||(x>-997&&z>460));

    function subtract(patch,mask){
        const left=patch.x-patch.w*.5,right=patch.x+patch.w*.5;
        const front=patch.z-patch.d*.5,back=patch.z+patch.d*.5;
        if(left>=mask.east||right<=mask.west||front>=mask.south||back<=mask.north)return [patch];
        const minX=Math.max(left,mask.west),maxX=Math.min(right,mask.east);
        const minZ=Math.max(front,mask.north),maxZ=Math.min(back,mask.south);
        const result=[];
        for(const [a,b,c,d] of [[left,minX,front,back],[maxX,right,front,back],[minX,maxX,front,minZ],[minX,maxX,maxZ,back]]){
            if(b-a<=.002||d-c<=.002)continue;
            const x=(a+b)*.5,z=(c+d)*.5;
            result.push({...patch,x,z,w:b-a,d:d-c,y:patch.y+(patch.gradeX||0)*(x-patch.x)+(patch.gradeZ||0)*(z-patch.z)});
        }
        return result;
    }

    H.trimRidgeGrid444=function*(patches){
        for(const patch of patches){
            const gridPart=patch.h<.25&&!patch.yaw&&((patch.layer>=1&&patch.layer<=3&&surfaces.has(patch.color))||
                (patch.layer===4&&Math.min(patch.w,patch.d)<.6&&kerbs.has(patch.color)));
            const master=patch.layer===0&&patch.w>2400&&patch.d>2400;
            const shoreSurface=patch.layer>=1&&patch.layer<=3&&!patch.yaw&&patch.h<.24&&patch.material!=='wood'&&
                ['asphalt','paving','concrete','foliage','paint'].includes(patch.material);
            if(patch.material==='water39'&&patch.color==='#3d8793')continue;
            if(patch.layer>=4&&!patch.arch38&&H.openSea444(patch.x,patch.z)&&
                ['foliage','bark'].includes(patch.material))continue;
            let parts=gridPart?subtract(patch,district):[master?{...patch,terrainBase444:true}:patch];
            if((gridPart||master||shoreSurface)&&patch.x-patch.w*.5<-948&&patch.z+patch.d*.5>437&&patch.z-patch.d*.5<869)
                for(const area of basin)parts=parts.flatMap(surface=>subtract(surface,area));
            yield* parts;
        }
    };

    // Two shared triangles, each with an affine basis, keep joints continuous
    // without a new draw call or a unique mesh for each metre of road.
    H.addRibbon444=function(world,rows,{color,material,visibility=660,layer=3,thickness=1}){
        const diff=(a,b)=>a.map((v,i)=>v-b[i]);
        const triangle=(a,b,c,west)=>{
            const across=west?diff(b,c):diff(b,a);
            const along=west?diff(c,a):diff(c,b);
            const nx=along[1]*across[2]-along[2]*across[1];
            const ny=along[2]*across[0]-along[0]*across[2];
            const nz=along[0]*across[1]-along[1]*across[0];
            const length=Math.hypot(nx,ny,nz);
            if(length<.0001)return;
            const norm=[nx/length*thickness,ny/length*thickness,nz/length*thickness];
            const diag=west?b:c;
            const center=a.map((v,i)=>(v+diag[i]-norm[i])*.5);
            const part=H.box(center[0],center[1],center[2],Math.hypot(...across),thickness,Math.hypot(...along),color,0,layer);
            part.basis444=[across,norm,along];part.shape=west?'grade_west':'grade_east';
            part.material=material;part.visibilityCap=visibility;part.gradeX=0;
            world.add(part);
        };
        for(let i=1;i<rows.length;i++){
            const [a,b]=rows[i-1], [d,c]=rows[i];
            triangle(a,b,c,false); triangle(a,c,d,true);
        }
    };

    // Sweep a single connected cross-section along surveyed heights. Neighbouring
    // faces use the same endpoints, including where the wall tapers into a slope.
    H.addRetainingWall444=function(world,samples,width,colors){
        const bevel=Math.min(.085,width*.19);
        const offset=(p,d,y)=>[p.x+p.nx*d,y,p.z+p.nz*d];
        const faces=[
            {left:[-width*.5,'base'],right:[-width*.5,'shoulder'],color:colors.face},
            {left:[-width*.5,'shoulder'],right:[-width*.5+bevel,'crest'],color:colors.trim},
            {left:[-width*.5+bevel,'crest'],right:[width*.5-bevel,'crest'],color:colors.cap},
            {left:[width*.5-bevel,'crest'],right:[width*.5,'shoulder'],color:colors.trim},
            {left:[width*.5,'shoulder'],right:[width*.5,'base'],color:colors.face},
        ];
        for(const {left,right,color} of faces){
            const row=samples.map(p=>{
                const y={base:p.bottom,crest:p.top,shoulder:Math.max(p.bottom+.008,p.top-bevel)};
                return [offset(p,left[0],y[left[1]]),offset(p,right[0],y[right[1]])];
            });
            H.addRibbon444(world,row,{color,material:'concrete',visibility:670,layer:4});
        }
        const caps=[samples[0],samples[samples.length-1]];
        for(const [index,p] of caps.entries()){
            const left=[offset(p,-width*.497,p.bottom),offset(p,width*.497,p.bottom)];
            const right=[offset(p,-width*.497,p.top-bevel*.6),offset(p,width*.497,p.top-bevel*.6)];
            H.addRibbon444(world,index?[right,left]:[left,right],{color:colors.face,material:'concrete',layer:4});
        }
    };
})(Heatline);
