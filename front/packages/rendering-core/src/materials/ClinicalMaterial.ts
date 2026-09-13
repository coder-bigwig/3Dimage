import { FrontSide, Mesh, MeshPhongMaterial, type Object3D } from 'three'

/** Apply the approved trial's materials only to manifests that opt in. */
export function applyClinicalMaterial(object: Object3D, color: string, opacity: number) {
  object.traverse(child => {
    if (!(child instanceof Mesh)) return
    const original = Array.isArray(child.material) ? child.material : [child.material]
    const shell = opacity < 1
    const material = new MeshPhongMaterial({
      color, opacity, transparent: shell, depthWrite: !shell,
      shininess: shell ? 55 : 38, specular: 0x454545, side: FrontSide,
    })
    if (shell) {
      material.onBeforeCompile = shader => {
        shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `
          float edge = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 2.0);
          diffuseColor.a = clamp(opacity * (1.0 + 0.7 * edge), 0.0, 1.0);
          #include <opaque_fragment>
        `)
      }
      material.customProgramCacheKey = () => 'clinical-shell-edge-v2'
    }
    child.material = material
    child.renderOrder = shell ? 1 : 0
    original.forEach(previous => previous.dispose())
  })
}
