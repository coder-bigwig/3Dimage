"""Export the approved .blend scene as independently controllable RAS/mm layers.

Run Blender with the scene loaded, then --python this-file.py.
The trial report beside the scene records the reversible source transform.
"""
import json
import shutil
from pathlib import Path
import bpy
from mathutils import Vector

root = Path(__file__).resolve().parents[2]
source = Path(bpy.data.filepath).parent
report = json.loads((source / 'report.json').read_text())
center = Vector(report['coordinateTransform']['centerRAS'])
scale = report['coordinateTransform']['scale']
output = root / 'front/public/public-data/blender-trial'
layers_dir = output / 'viewer'
layers_dir.mkdir(parents=True, exist_ok=True)
names = ['右上叶', '右中叶', '右下叶', '左上叶', '左下叶', '肺动脉', '肺静脉', '气道']
layers = []
evidence = []
for name, display in zip(report['structures'], names):
    original = bpy.data.objects[name]
    evaluated = original.evaluated_get(bpy.context.evaluated_depsgraph_get())
    mesh = bpy.data.meshes.new_from_object(evaluated)
    for vertex in mesh.vertices:
        vertex.co = vertex.co / scale + center
    obj = bpy.data.objects.new(name + '-export', mesh)
    bpy.context.collection.objects.link(obj)
    obj['structure'] = name
    obj['coordinateSystem'] = 'RAS'
    obj['unit'] = 'mm'
    shell = 'lobe' in name
    color = report['palette'][name]
    mat = bpy.data.materials.new(name + '-viewer')
    mat.use_nodes = True
    rgb = [int(color[i:i+2], 16)/255 for i in (1, 3, 5)]
    rgb = [v/12.92 if v <= .04045 else ((v+.055)/1.055)**2.4 for v in rgb]
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*rgb, 1)
    bsdf.inputs['Metallic'].default_value = 0
    bsdf.inputs['Roughness'].default_value = .35
    bsdf.inputs['Alpha'].default_value = .62 if shell else 1
    mat.surface_render_method = 'DITHERED'
    mesh.materials.clear()
    mesh.materials.append(mat)
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    asset_name = name + '.glb'
    bpy.ops.export_scene.gltf(filepath=str(layers_dir / asset_name), export_format='GLB',
                             use_selection=True, export_yup=False, export_extras=True)
    points = [v.co for v in mesh.vertices]
    bounds = [[min(p[i] for p in points) for i in range(3)], [max(p[i] for p in points) for i in range(3)]]
    assert len(mesh.vertices) > 100 and len(mesh.polygons) > 100
    assert 30 < max(bounds[1][i]-bounds[0][i] for i in range(3)) < 400
    evidence.append({'id': name, 'vertices': len(mesh.vertices), 'boundsRASmm': bounds})
    layers.append({'id':name, 'name':display, 'color':color, 'opacity':.62 if shell else 1,
                   'visible':True, 'assets':{'high':'/public-data/blender-trial/viewer/'+asset_name}})
    bpy.data.objects.remove(obj, do_unlink=True)
manifest = {'schemaVersion':1, 'dataset':'MSD Task06 Lung', 'caseId':'lung_001-blender-v2',
            'title':'公开肺部 CT · Blender 精修模型', 'unit':'mm', 'coordinateSystem':'RAS',
            'renderStyle':'clinical', 'layers':layers}
(output / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf8')
ct_source = root / 'front/public/public-data/msd-lung/lung_001'
for name in ['statistics.json', 'ct-volume.json', 'volume.bin']:
    shutil.copy2(ct_source / name, layers_dir / name)
(output / 'export-verification.json').write_text(json.dumps(evidence, indent=2))
print('EXPORTED_8_RAS_MM_LAYERS', flush=True)
