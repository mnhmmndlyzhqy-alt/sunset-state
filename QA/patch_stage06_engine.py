from pathlib import Path
p=Path(__file__).resolve().parent.parent/'engine44.js'
s=p.read_text()
changes=[
('targetZ:p.z+3.65,targetX:p.x};',
 'targetZ:Heatline.stage06Orientation?.isActive(p)?Heatline.stage06Orientation.pos(p,-3.65).z:p.z+3.65,\n                targetX:Heatline.stage06Orientation?.isActive(p)?Heatline.stage06Orientation.pos(p,-3.65).x:p.x};'),
('this.avatar.x=Heatline.lerp(q.startX,p.x,eased);', 'this.avatar.x=Heatline.lerp(q.startX,q.targetX,eased);'),
('this.avatar.yaw=Math.PI;\n            }\n            if(q.elapsed>=q.duration)',
 'this.avatar.yaw=Heatline.stage06Orientation?.isActive(p)?\n                    Math.atan2(Heatline.stage06Orientation.dir(p).x,Heatline.stage06Orientation.dir(p).z):Math.PI;\n            }\n            if(q.elapsed>=q.duration)'),
('this.avatar=Heatline.createWalker(scene.entrance.x,scene.entrance.z+3.35,Math.PI,1);\n                this.footCameraYaw=Math.PI;',
 '''const side=Heatline.stage06Orientation?.isActive(door)?Heatline.stage06Orientation.dir(door):null;
                const sx=side?door.x-side.x*3.65:scene.entrance.x;
                const sz=side?door.z-side.z*3.65:scene.entrance.z+3.35;
                const sy=side?Math.atan2(side.x,side.z):Math.PI;
                this.avatar=Heatline.createWalker(sx,sz,sy,1);
                this.footCameraYaw=sy;'''),
('targetX:p.x,targetZ:p.z-2.1,id:p.id,switched:false};',
 'targetX:Heatline.stage06Orientation?.isActive(p)?Heatline.stage06Orientation.pos(p,2.1).x:p.x,\n                targetZ:Heatline.stage06Orientation?.isActive(p)?Heatline.stage06Orientation.pos(p,2.1).z:p.z-2.1,id:p.id,switched:false};'),
('this.avatar.yaw=0;this.avatar.vx=this.avatar.vz=0;\n            if(!q.switched && this.avatar.z<=p.z+1.25)',
 '''this.avatar.yaw=Heatline.stage06Orientation?.isActive(p)?
                Math.atan2(-Heatline.stage06Orientation.dir(p).x,-Heatline.stage06Orientation.dir(p).z):0;
            this.avatar.vx=this.avatar.vz=0;
            if(!q.switched && (Heatline.stage06Orientation?.passedThreshold(this.avatar,p)??this.avatar.z<=p.z+1.25))'''),
('Math.abs(this.avatar.x-exitPortal.x)<Math.max(1.3,exitPortal.width*.5-.38)&&\n                this.avatar.z<exitPortal.z+1.15)',
 '(Heatline.stage06Orientation?.exitThreshold(this.avatar,exitPortal)??\n                 (Math.abs(this.avatar.x-exitPortal.x)<Math.max(1.3,exitPortal.width*.5-.38)&&\n                  this.avatar.z<exitPortal.z+1.15)))'),
('if(Math.abs(this.avatar.x-door.x)>door.width*.5-.35||\n                       this.avatar.z<door.z+1.48||this.avatar.z>door.z+5.5)continue;',
 'if(!(Heatline.stage06Orientation?.entryThreshold(this.avatar,door)??\n                      (Math.abs(this.avatar.x-door.x)<=door.width*.5-.35&&\n                       this.avatar.z>=door.z+1.48&&this.avatar.z<=door.z+5.5)))continue;'),
('for(const door of thresholdDoors){\n                    const visitor=this.inVehicle?this.player:this.avatar;',
 'for(const door of thresholdDoors){\n                    if(Heatline.stage06Orientation?.drawDoor(this,door,out))continue;\n                    const visitor=this.inVehicle?this.player:this.avatar;')
]
for a,b in changes:
 count=s.count(a)
 if count!=1:raise Exception(f'Expected 1 occurrence, got {count} for {a[:85]}')
 s=s.replace(a,b)
p.write_text(s)
print('Patched',len(changes),'engine integration points; size',p.stat().st_size)
