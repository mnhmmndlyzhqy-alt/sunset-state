#!/usr/bin/env python3
"""Apply exactly Stage37's renderer optimization while saving every edited original."""
from pathlib import Path
import shutil
BASE=Path(__file__).resolve().parents[1]
back=BASE/'BACKUPS/STAGE37_OF105'; back.mkdir(parents=True,exist_ok=True)

def patch(path,replacements):
    src=BASE/path; data=src.read_text(encoding='utf8'); old=data
    for old_anchor,new_anchor in replacements:
        n=data.count(old_anchor)
        if n!=1:raise AssertionError(f'{path}: anchor matches={n} {old_anchor[:90]}')
        data=data.replace(old_anchor,new_anchor,1)
    if data==old:raise AssertionError(f'{path}: unchanged')
    dest=back/path;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(src,dest)
    src.write_text(data,encoding='utf8')
    print(path,'patched',len(old),'=>',len(data))

for name in ['index.html','START_GAME.html']:
    patch(name,[('<script src="assets/stage36_performance_audit.js"></script>',
        '<script src="assets/stage36_performance_audit.js"></script>\n  <script src="assets/stage37_render_optimization.js"></script>')])

r=[
 ('''            const ix = Math.floor(c.x / 90), iz = Math.floor(c.z / 90);
            // More than 685m + overlap margin in every direction, including cell edges.
            for (let dx = -18; dx <= 18; dx++)
                for (let dz = -18; dz <= 18; dz++) {
                    const cell = scene.cells.get(`${ix + dx},${iz + dz}`);
''',
 '''            const ix = Math.floor(c.x / 90), iz = Math.floor(c.z / 90);
            // Stage37: indexed numeric rows avoid allocating thousands of cell-key
            // strings per camera refresh. The original Map remains the source of truth.
            const indexedRows37=Heatline.stage37RenderOptimizer?.grid(scene);
            // More than 685m + overlap margin in every direction, including cell edges.
            for (let dx = -18; dx <= 18; dx++) {
                const indexedRow37=indexedRows37?.get(ix+dx);
                if(indexedRows37&&!indexedRow37)continue;
                for (let dz = -18; dz <= 18; dz++) {
                    const cell = indexedRows37?indexedRow37.get(iz+dz):scene.cells.get(`${ix + dx},${iz + dz}`);
'''),
 ('''                }
            scene.visible = result;
            return result;
''',
 '''                }
            }
            scene.visible = result;
            return result;
'''),
 ('''                g.bufferData(g.ARRAY_BUFFER, this.pack(cubes,this.reuseStaticPacking475===true), g.STATIC_DRAW);''',
 '''                if(Heatline.stage37RenderOptimizer?.enabled())Heatline.stage37RenderOptimizer.uploadStatic(g,scene.cubes,this.pack(cubes,this.reuseStaticPacking475===true),g.STATIC_DRAW);
                else g.bufferData(g.ARRAY_BUFFER, this.pack(cubes,this.reuseStaticPacking475===true), g.STATIC_DRAW);'''),
 ('''                g.bufferData(g.ARRAY_BUFFER, this.pack(sea,this.reuseStaticPacking475===true), g.STATIC_DRAW);''',
 '''                if(Heatline.stage37RenderOptimizer?.enabled())Heatline.stage37RenderOptimizer.uploadStatic(g,scene.sea,this.pack(sea,this.reuseStaticPacking475===true),g.STATIC_DRAW);
                else g.bufferData(g.ARRAY_BUFFER, this.pack(sea,this.reuseStaticPacking475===true), g.STATIC_DRAW);'''),
 ('''                g.bufferData(g.ARRAY_BUFFER, this.pack(wedges,this.reuseStaticPacking475===true), g.STATIC_DRAW);''',
 '''                if(Heatline.stage37RenderOptimizer?.enabled())Heatline.stage37RenderOptimizer.uploadStatic(g,scene.wedges,this.pack(wedges,this.reuseStaticPacking475===true),g.STATIC_DRAW);
                else g.bufferData(g.ARRAY_BUFFER, this.pack(wedges,this.reuseStaticPacking475===true), g.STATIC_DRAW);'''),
 ('''                    g.bufferData(g.ARRAY_BUFFER, this.pack(list,this.reuseStaticPacking475===true), g.STATIC_DRAW);
                    entry.count = list.length;''',
 '''                    if(Heatline.stage37RenderOptimizer?.enabled())Heatline.stage37RenderOptimizer.uploadStatic(g,entry.buffer,this.pack(list,this.reuseStaticPacking475===true),g.STATIC_DRAW);
                    else g.bufferData(g.ARRAY_BUFFER, this.pack(list,this.reuseStaticPacking475===true), g.STATIC_DRAW);
                    entry.count = list.length;'''),
 ('''            g.drawElementsInstanced(g.TRIANGLES, 36, g.UNSIGNED_INT, 0, scene.cubeCount);
''',
 '''            if(scene.cubeCount)g.drawElementsInstanced(g.TRIANGLES, 36, g.UNSIGNED_INT, 0, scene.cubeCount);
            else if(Heatline.stage37RenderOptimizer?.enabled())Heatline.stage37RenderOptimizer.skipEmpty();
'''),
 ('''            g.bindBuffer(g.ARRAY_BUFFER, this.dynamicBuffer);
            g.bufferData(g.ARRAY_BUFFER, this.pack(cubes, true), g.DYNAMIC_DRAW);
            this.bindInstances(this.dynamicBuffer);
            g.drawElementsInstanced(g.TRIANGLES, 36, g.UNSIGNED_INT, 0, cubes.length);
''',
 '''            if(cubes.length){
                g.bindBuffer(g.ARRAY_BUFFER, this.dynamicBuffer);
                g.bufferData(g.ARRAY_BUFFER, this.pack(cubes, true), g.DYNAMIC_DRAW);
                this.bindInstances(this.dynamicBuffer);
                g.drawElementsInstanced(g.TRIANGLES, 36, g.UNSIGNED_INT, 0, cubes.length);
            } else if(Heatline.stage37RenderOptimizer?.enabled())Heatline.stage37RenderOptimizer.skipEmpty();
''')
]
patch('engine44.js',r)
