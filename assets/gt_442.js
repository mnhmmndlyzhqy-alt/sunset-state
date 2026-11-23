var Heatline = globalThis.Heatline || {};
(function(H){
    const paints=['#ddd9ce','#6d202e','#c49039','#153a55','#454b4d','#41615c','#d9dfdc'];
    const touringPaint=paint=>[2,3,5].includes(H.mod(paint,7));
    H.vehicleLabel442=car=>{
        const type=H.carClass(car);
        if(type==='luxury')return touringPaint(car.paint)?'Sunset GT Touring · רכב יוקרה':'Sunset GT Classic · רכב יוקרה';
        return H.VEHICLE_CLASSES[type].label;
    };
    H.drawGT442=function(car,out,range){
        const color=paints[H.mod(car.paint,paints.length)];
        const touring=touringPaint(car.paint);
        const yaw=-car.yaw, anchor=1.02;
        const pose={yaw,roll:car.bodyRoll,pitch:car.bodyPitch};
        const add=(x,y,z,w,h,d,shade,shape,material,glow=0, body=true)=>{
            const p=body?H.rotateBoxLocal(pose,x,y-anchor,z):[x,y-anchor,z];
            const b=H.box(car.x+p[0],anchor+p[1]+car.suspension,car.z+p[2],w,h,d,shade,yaw,4,glow);
            b.shape=shape;b.material=material;
            if(body){b.roll=car.bodyRoll;b.pitch=car.bodyPitch;}
            out.push(b);return b;
        };
        const mesh=(name,shade,material)=>add(0,0,0,1,1,1,shade,(touring?'gt442_touring_':'gt442_')+name,material);
        mesh('paint',color,'premium_paint');
        mesh('trim','#263139','rubber');
        if(car.glassDamage<.94)mesh('glass','#283844','vehicle_glass444');
        if(H.mod(car.paint,7)===0 && range<63)mesh('stripe','#963749','auto_paint');
        add(0,.375,-2.58,1.67,.11,.27,'#22292c','rounded_smooth','rubber');
        add(0,.522,-2.609,touring?1.26:.92,.22,.061,'#162126','rounded_smooth','rubber');
        add(0,.464,-2.656,touring?.96:.75,.037,.035,'#718086','rounded','metal');
        if(!touring)add(0,.516,-2.653,.75,.023,.035,'#48565c','rounded','metal');
        add(0,.435,2.59,1.55,.26,.25,'#252d30','rounded_smooth','rubber');
        add(0,.64,2.646,.45,.139,.034,'#3b403c','rounded','rubber');
        add(0,.64,2.667,.40,.105,.012,'#e1dac8','rounded','paint');
        if(range<25){
            for(let i=0;i<7;i++)add((i-3)*.047,.64,2.676,.015+(i%3)*.007,.043,.004,'#34434a','cube','paint');
            add(0,.674,2.676,.28,.012,.004,'#ad7655','cube','paint');
        }
        add(0,.823,-2.633,.094,.076,.031,'#c9a66e','luxury_crest','metal');
        for(const side of [-1,1]){
            add(side*.67,.49,-2.568,.39,.19,.096,'#15232a','rounded_smooth','rubber');
            if(car.frontDamage<.92){
                add(side*.69,touring?.784:.735,-2.581,touring?.42:.37,touring?.17:.115,.096,'#28414e','rounded_smooth','glass');
                add(side*.70,touring?.820:.76,-2.631,.32,.029,.032,'#ecf5ee','rounded_smooth','light_emissive',.38);
                add(side*.57,.725,-2.632,.071,.047,.034,'#dedfc8','rounded','glass');
            }
            if(car.rearDamage<.92){
                add(side*.61,.802,2.623,.42,.095,.07,'#321e27','rounded_smooth','rubber');
                add(side*.61,.812,2.664,.38,.036,.033,'#e33751','rounded_smooth','light_emissive',car.brakeLight>.25?1.15:.26);
                add(side*.62,.757,2.66,.24,.024,.029,'#9f2940','rounded','glass');
            }
            for(const dx of [0,.115])
                add(side*(.6+dx),.355,2.663,.081,.078,.088,'#748184','rounded_smooth','metal');
            add(side*.93,1.09,-.60,.27,.09,.14,color,'rounded_smooth','premium_paint');
            add(side*1.055,1.094,-.532,.15,.075,.016,'#577180','rounded_smooth','glass');
            if(range<70){
                const pillar=add(side*.741,1.35,.142,.047,.57,.093,'#263239','rounded','rubber');
                pillar.roll+=side*.25;
                add(side*1.014,.892,.28,.031,.038,.16,'#a4afb0','rounded_smooth','metal');
                add(side*1.046,.66,.83,.067,.17,.24,'#28373d','rounded_smooth','rubber');
                for(let k=0;k<3;k++)add(side*1.08,.614+k*.053,.84,.042,.027,.228,'#53616a','rounded','metal');
            }
            for(const front of [true,false]){
                const {fx,fz,rx,rz}=H.vehicleAxes(car),hub=H.worldWheelCenter(car,side,front);
                const shift=side*.124, index=(front?0:2)+(side===-1?0:1);
                const flat=Math.max(car.damagedWheel===index?car.tireWear:0,car.wheelDamage[index]);
                const x=hub.x-rx*shift,z=hub.z-rz*shift,y=.448+car.suspension-flat*.09;
                const tire=H.box(x,y,z,.302,.896-flat*.18,.89,'#171c20',yaw,4);
                tire.shape='wheel';tire.material='rubber';tire.steer=front?-car.wheelSteer:0;tire.spin=-car.wheelSpin;
                out.push(tire);
                for(const [kind,shade] of [['dark','#303a40'],['metal','#c7ccca']]){
                    const rim=H.box(x,y,z,.322,.717-flat*.1,.717,shade,yaw,4);
                    rim.shape='s20_rim_5_'+kind;rim.material=kind==='dark'?'rubber':'metal';
                    rim.spin=tire.spin;rim.steer=tire.steer;out.push(rim);
                }
                if(range<60){
                    const dust=H.box(x,y,z,.294,.565,.565,touring?'#665d53':'#4b4d4c',yaw,4);
                    dust.shape='s20_rim_5_dark';dust.material='metal';dust.steer=tire.steer;dust.spin=tire.spin;out.push(dust);
                    const local=H.rotateBoxLocal({yaw,steer:tire.steer},side*.168,0,0);
                    const hubCap=H.box(x+local[0],y,z+local[2],.062,.115,.115,'#b29a70',yaw,4);
                    hubCap.shape='alloy_rim';hubCap.material='metal';hubCap.steer=tire.steer;
                    out.push(hubCap);
                }
            }
        }
        if(range<38){
            // Visors, wiper blades and duct fins sit flush with the existing canopy.
            for(const side of [-1,1]){
                const wiper=add(side*.354,1.122,-1.027,.033,.032,.421,'#252c31','rounded','rubber');
                wiper.yaw+=side*.69;wiper.pitch+=.52;
                const duct=add(side*.908,.857,1.18,.188,.033,.49,'#313a3e','rounded','rubber');
                duct.roll+=side*.16;
            }
            for(let i=0;i<6;i++)
                add(0,.521+i*.023,-2.646,.76,.006,.009,'#51595b','cube','metal');
        }
        if(touring&&car.rearDamage<.92)
            add(0,.816,2.664,1.09,.037,.031,'#bd374d','rounded_smooth','light_emissive',car.brakeLight>.25?1.18:.25);
    };
})(Heatline);
