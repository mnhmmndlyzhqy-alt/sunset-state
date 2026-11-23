var Heatline=globalThis.Heatline||{};
(function(H){
    'use strict';
    const G=H.coast461;
    const pitch=17,half=pitch/2,x0=-1207,z0=-918,x1=1190,z1=900;
    const lerp=(a,b,t)=>a+(b-a)*t;

    H.buildShoreMesh463=(world,surfaceColor,addFallback)=>{
        const samples=new Map(),plans=new Map(),patches=[],vertices=[],indices=[];
        const key=(x,z)=>x+','+z;
        function sample(x,z){
            const id=key(x,z);
            let point=samples.get(id);
            if(!point){
                const shore=G.coast(x,z);
                let y=shore<0?Math.max(-2.05,-.085+shore*.053):H.baseGround467(x,z)-.071;
                if(shore>0&&G.keepFrame(x,z)&&H.onCorePavement463(x,z))y-=.17;
                const road=shore>0?(H.stage27TerrainRoadAt?H.stage27TerrainRoadAt(x,z):G.roadAt(x,z)):null;
                if(road&&!(road.road.id==='westExpress'&&G.grade(z)>.2)){
                    const roadY=lerp(road.a.y,road.b.y,road.t);
                    y=Math.min(y,roadY-.25);
                }
                point={x,z,y,shore,road:!!road};samples.set(id,point);
            }
            return point;
        }
        function appearance(p){
            if(p.appearance)return p.appearance;
            const {x,z,shore}=p;
            const [r,g,b]=H.rgb(surfaceColor(x,z,shore).color);
            const sand=Math.max(H.reference469.sandAt(x,z,shore),.61*(1-G.smooth(2,14,shore)));
            const dx=sample(x+2,z).y-sample(x-2,z).y,dz=sample(x,z+2).y-sample(x,z-2).y;
            return p.appearance=[-dx*.25,1,-dz*.25,lerp(r,.72,sand),lerp(g,.64,sand),lerp(b,.434,sand),sand];
        }
        function emit(a,b,c){
            // WebGL front faces use +Y. The fallback ribbon enforces its own winding.
            for(const p of [a,c,b]){
                if(p.vertexIndex===undefined){
                    p.vertexIndex=vertices.length/10;
                    vertices.push(p.x,p.y,p.z,...appearance(p));
                }
                indices.push(p.vertexIndex);
            }
            if(Math.min(a.shore,b.shore,c.shore)<-22&&Math.max(a.shore,b.shore,c.shore)<-.02)return;
            const x=(a.x+b.x+c.x)/3,z=(a.z+b.z+c.z)/3,shore=(a.shore+b.shore+c.shore)/3;
            const finish=surfaceColor(x,z,shore);
            addFallback(world,a,b,c,finish);
            const triangle=[a,b,c],poly=[];
            for(let i=0;i<3;i++){
                const p=triangle[i],q=triangle[(i+1)%3];
                if(p.shore>=0)poly.push(p);
                if((p.shore>=0)!==(q.shore>=0)){
                    const t=p.shore/(p.shore-q.shore);
                    poly.push({x:lerp(p.x,q.x,t),z:lerp(p.z,q.z,t)});
                }
            }
            if(poly.length>=3)patches.push({poly,color:finish.color});
        }
        for(let z=z0;z<=z1;z+=pitch)for(let x=x0;x<=x1;x+=pitch){
            const corners=[sample(x,z),sample(x+pitch,z),sample(x+pitch,z+pitch),sample(x,z+pitch)];
            const nearest=Math.max(...corners.map(p=>p.shore));
            if(nearest>=-26.5){
                const split=Math.min(...corners.map(p=>p.shore))<20||corners.some(p=>p.road)||!!G.roadAt(x+half,z+half);
                plans.set(key(x,z),{x,z,corners,split});
            }
        }
        for(const {x,z,corners,split} of plans.values()){
            const [a,b,c,d]=corners;
            const north=split||plans.get(key(x,z-pitch))?.split;
            const east=split||plans.get(key(x+pitch,z))?.split;
            const south=split||plans.get(key(x,z+pitch))?.split;
            const west=split||plans.get(key(x-pitch,z))?.split;
            if(!(north||east||south||west)){emit(a,b,c);emit(a,c,d);continue;}
            const ring=[a];
            if(north)ring.push(sample(x+half,z));ring.push(b);
            if(east)ring.push(sample(x+pitch,z+half));ring.push(c);
            if(south)ring.push(sample(x+half,z+pitch));ring.push(d);
            if(west)ring.push(sample(x,z+half));
            const center=sample(x+half,z+half);
            for(let i=0;i<ring.length;i++)emit(center,ring[i],ring[(i+1)%ring.length]);
        }
        world.boxes.shoreMesh463={vertices:new Float32Array(vertices),indices:new Uint32Array(indices)};
        world.terrain461=patches;
    };

    H.createShoreRenderer463=g=>{
        const compile=(type,code)=>{
            const s=g.createShader(type);g.shaderSource(s,code);g.compileShader(s);
            if(!g.getShaderParameter(s,g.COMPILE_STATUS))throw Error(g.getShaderInfoLog(s));
            return s;
        };
        const vertex=compile(g.VERTEX_SHADER,`#version 300 es
            precision highp float;
            layout(location=0) in vec3 position;
            layout(location=1) in vec3 normal;
            layout(location=2) in vec4 material;
            uniform mat4 viewProjection;
            out vec3 p,n; out vec4 tint;
            void main(){p=position;n=normal;tint=material;gl_Position=viewProjection*vec4(position,1.0);}
        `);
        const fragment=compile(g.FRAGMENT_SHADER,`#version 300 es
            precision highp float;
            precision highp sampler2DShadow;
            in vec3 p,n; in vec4 tint;
            uniform vec3 eye,sun;
            uniform vec4 weather;
            uniform float day,underwater;
            uniform sampler2DShadow shadowMap;
            uniform int shadows;
            uniform mat4 shadowProjection;
            out vec4 color;
            float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
            float noise(vec2 p){
                vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
                return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.0),f.x),f.y);
            }
            void main(){
                vec3 unit=normalize(n);
                float distanceToEye=length(p.xz-eye.xz);
                float range=length(vec3(p.x-eye.x,(p.y-eye.y)*.35,p.z-eye.z));
                vec2 uv=p.xz*mat2(.81,.586,-.586,.81);
                float macro=noise(uv*.058);
                float grain=0.5;
                if(range<120.0){
                    float footprint=length(fwidth(uv));
                    grain=mix(.5,noise(uv*8.4),1.0-smoothstep(.036,.31,footprint));
                }
                vec3 ground=tint.rgb*(.85+.25*macro+.19*(grain-.5));
                ground*=1.0-.16*weather.y;
                float cosine=max(.0,dot(unit,sun));
                if(shadows>0&&(shadows==3||distanceToEye<175.0)&&cosine>.05){
                    vec4 samplePoint=shadowProjection*vec4(p+unit*.048,1.0);
                    vec3 uvShadow=samplePoint.xyz/max(.0001,samplePoint.w)*.5+.5;
                    if(all(greaterThan(uvShadow,vec3(.005)))&&all(lessThan(uvShadow,vec3(.995))))
                        cosine*=mix(.31,1.0,texture(shadowMap,vec3(uvShadow.xy,uvShadow.z-(shadows==3?.00035:.0018))));
                }
                float slope=1.0-clamp(unit.y,.0,1.0);
                ground=mix(ground,vec3(.40,.346,.251),slope*(1.0-tint.a)*.56);
                float sky=max(.13,day),clear=1.0-.46*weather.x;
                vec3 light=vec3(.244,.321,.390)*(.45+.55*sky)+sky*vec3(.505,.50,.45)
                    +cosine*clear*sky*mix(vec3(.49,.29,.155),vec3(.344,.33,.30),smoothstep(.22,.67,sun.y));
                vec3 lit=ground*light;
                float haze=(1.0-exp(-range*.00062))*.68;
                lit=mix(lit,mix(vec3(.095,.131,.181),vec3(.55,.63,.67),sky),haze);
                if(underwater>.5)lit=mix(lit*vec3(.59,.83,.87),vec3(.085,.278,.31),1.0-exp(-distanceToEye*.062));
                color=vec4(lit,1.0);
            }
        `);
        const program=g.createProgram();g.attachShader(program,vertex);g.attachShader(program,fragment);g.linkProgram(program);
        g.deleteShader(vertex);g.deleteShader(fragment);
        if(!g.getProgramParameter(program,g.LINK_STATUS))throw Error(g.getProgramInfoLog(program));
        const buffer=g.createBuffer(),indexBuffer=g.createBuffer(),vao=g.createVertexArray(),locations={};
        g.bindVertexArray(vao);g.bindBuffer(g.ARRAY_BUFFER,buffer);
        g.bindBuffer(g.ELEMENT_ARRAY_BUFFER,indexBuffer);
        for(const [i,count,offset] of [[0,3,0],[1,3,12],[2,4,24]]){
            g.enableVertexAttribArray(i);g.vertexAttribPointer(i,count,g.FLOAT,false,40,offset);
        }
        g.bindVertexArray(null);
        for(const key of ['viewProjection','eye','sun','weather','day','underwater','shadows','shadowProjection'])locations[key]=g.getUniformLocation(program,key);
        g.useProgram(program);g.uniform1i(g.getUniformLocation(program,'shadowMap'),7);
        let uploaded=null;
        return (mesh,vp,c,sun,day,weather,shadows,shadowProjection)=>{
            g.useProgram(program);g.bindVertexArray(vao);
            if(uploaded!==mesh){
                g.bindBuffer(g.ARRAY_BUFFER,buffer);g.bufferData(g.ARRAY_BUFFER,mesh.vertices,g.STATIC_DRAW);
                g.bufferData(g.ELEMENT_ARRAY_BUFFER,mesh.indices,g.STATIC_DRAW);uploaded=mesh;
            }
            g.uniformMatrix4fv(locations.viewProjection,false,vp);g.uniform3f(locations.eye,c.x,c.y,c.z);
            g.uniform3f(locations.sun,...sun);g.uniform1f(locations.day,day);
            g.uniform4f(locations.weather,weather.cloud,weather.rain,weather.flash,weather.wind);
            g.uniform1f(locations.underwater,c.underwater445?1:0);
            g.uniform1i(locations.shadows,shadows);
            if(shadows)g.uniformMatrix4fv(locations.shadowProjection,false,shadowProjection);
            g.drawElements(g.TRIANGLES,mesh.indices.length,g.UNSIGNED_INT,0);
        };
    };
})(Heatline);
