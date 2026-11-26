var Heatline = globalThis.Heatline || {};
(function(H){
    H.contactShadows442=function(game){
        if(!game.renderer.gl)return game.tireMarks;
        const lighter=game.qualityScale<.76;
        const range=lighter?65:122;
        let budget=lighter?16:45;
        const decals=game.tireMarks.slice();
        if(game.boat444)H.marinaFoam444(game.boat444,decals);
        for(const wake of game.avatar.swim445?.wake||[]){
            const fade=H.clamp(1-(game.seconds-wake.at)/1.25,0,1);
            const span=.32+(1-fade)*.52, dx=Math.cos(wake.yaw)*span, dz=-Math.sin(wake.yaw)*span;
            decals.push({x0:wake.x-dx,z0:wake.z-dz,x1:wake.x+dx,z1:wake.z+dz,
                width:.31+(1-fade)*.48,strength:-1.04-fade*.42,age:0,waterFoam444:true});
        }
        const add=car=>{
            if(!budget||!car.alive||car.rollover||Math.abs(car.bodyRoll)>.52)return;
            const distance=Math.hypot(car.x-game.cam.x,car.z-game.cam.z);
            if(distance>range)return;
            const long=car.vehicleClass==='luxury'||car.vehicleClass==='utility'?2.75:2.42;
            const dx=Math.sin(car.yaw)*long,dz=Math.cos(car.yaw)*long;
            decals.push({x0:car.x-dx,z0:car.z-dz,x1:car.x+dx,z1:car.z+dz,width:2.85,
                strength:-.60*(1-H.clamp((distance-range*.62)/(range*.38),0,1)),age:0,contact442:true,deck443:car.deck443});
            budget--;
        };
        add(game.player);
        for(const car of game.civilian)add(car);
        for(const car of game.parked)add(car);
        for(const car of game.police)add(car);
        return decals;
    };
})(Heatline);
