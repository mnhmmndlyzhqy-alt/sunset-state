var Heatline = globalThis.Heatline || {};
(function(H){
    H.contactShadows442=function(game){
        if(!game.renderer.gl)return game.tireMarks;
        const lighter=game.qualityScale<.76;
        const range=lighter?65:122;
        let budget=lighter?16:45;
        const decals=game.tireMarks.slice();
        if(game.boat444)H.marinaFoam444(game.boat444,decals);
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
