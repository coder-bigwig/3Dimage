import { Group, Mesh, MeshStandardMaterial, SphereGeometry, Vector3 } from 'three'
import { MarchingCubes } from 'three/examples/jsm/objects/MarchingCubes.js'

/** Standing figure facing +Z, with +Y superior. */
export function createOrientationHuman() {
  const human = new Group()
  const material = new MeshStandardMaterial({ color: '#dededc', roughness: 0.38, metalness: 0.05 })
  human.userData.material = material
  const oval = (x: number, y: number, z: number, sx: number, sy: number, sz: number) => {
    const mesh = new Mesh(new SphereGeometry(1, 24, 18), material)
    mesh.position.set(x, y, z)
    mesh.scale.set(sx, sy, sz)
    human.add(mesh)
    return mesh
  }
  const limb = (a: number[], b: number[], radius: number, depth = radius) => {
    const start = new Vector3(...a), end = new Vector3(...b)
    const center = start.clone().add(end).multiplyScalar(0.5)
    const mesh = oval(center.x, center.y, center.z, radius, start.distanceTo(end) / 2 + radius * 0.35, depth)
    mesh.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), end.sub(start).normalize())
  }
  oval(0, 0.9, 0, 0.095, 0.135, 0.095)
  oval(0, 0.865, 0.071, 0.068, 0.085, 0.039)
  oval(0, 0.9, 0.105, 0.018, 0.033, 0.027)
  limb([0, 0.7, 0], [0, 0.8, 0], 0.048)
  oval(0, 0.53, 0, 0.19, 0.235, 0.105)
  oval(0, 0.3, 0, 0.145, 0.19, 0.092)
  oval(0, 0.14, 0, 0.162, 0.145, 0.105)
  for (const side of [-1, 1]) {
    oval(side * 0.202, 0.65, 0, 0.068, 0.087, 0.075)
    limb([side * 0.22, 0.62, 0], [side * 0.32, 0.35, 0], 0.06)
    oval(side * 0.32, 0.34, 0, 0.046, 0.055, 0.048)
    limb([side * 0.32, 0.33, 0], [side * 0.405, 0.08, 0.025], 0.043)
    oval(side * 0.418, 0.015, 0.028, 0.039, 0.079, 0.024)
    limb([side * 0.435, -0.025, 0.03], [side * 0.445, -0.09, 0.035], 0.017)
    limb([side * 0.389, 0.045, 0.045], [side * 0.38, -0.005, 0.055], 0.018)
    limb([side * 0.085, 0.11, 0], [side * 0.105, -0.39, 0.018], 0.081, 0.08)
    oval(side * 0.105, -0.4, 0.022, 0.06, 0.07, 0.069)
    limb([side * 0.105, -0.44, 0], [side * 0.116, -0.79, -0.005], 0.056, 0.065)
    limb([side * 0.116, -0.77, 0], [side * 0.12, -0.98, 0], 0.038)
    oval(side * 0.12, -1.025, 0.055, 0.055, 0.045, 0.115)
  }
  // Blend the anatomical volumes into one continuous skin surface. Separate
  // intersecting ellipsoids leave hard seams that look like a jointed mannequin.
  const resolution = 112
  const surface = new MarchingCubes(resolution, material, false, false, 40000)
  surface.isolation = 0
  surface.field.fill(-2)
  const local = new Vector3()
  const extent = 1.2
  const blend = 0.045
  for (const object of human.children) {
    const mesh = object as Mesh
    const inverseRotation = mesh.quaternion.clone().invert()
    const radius = Math.max(mesh.scale.x, mesh.scale.y, mesh.scale.z) + blend * 2
    const lower = mesh.position.clone().addScalar(-radius).divideScalar(extent).addScalar(1).multiplyScalar(resolution / 2).floor()
    const upper = mesh.position.clone().addScalar(radius).divideScalar(extent).addScalar(1).multiplyScalar(resolution / 2).ceil()
    for (let z = Math.max(1, lower.z); z < Math.min(resolution - 1, upper.z); z++) {
      for (let y = Math.max(1, lower.y); y < Math.min(resolution - 1, upper.y); y++) {
        for (let x = Math.max(1, lower.x); x < Math.min(resolution - 1, upper.x); x++) {
          local.set((x * 2 / resolution - 1) * extent, (y * 2 / resolution - 1) * extent, (z * 2 / resolution - 1) * extent)
          local.sub(mesh.position).applyQuaternion(inverseRotation)
          const k0 = Math.hypot(local.x / mesh.scale.x, local.y / mesh.scale.y, local.z / mesh.scale.z)
          const k1 = Math.hypot(local.x / mesh.scale.x ** 2, local.y / mesh.scale.y ** 2, local.z / mesh.scale.z ** 2)
          const value = k1 > 1e-8 ? -k0 * (k0 - 1) / k1 : Math.min(mesh.scale.x, mesh.scale.y, mesh.scale.z)
          const index = x + y * resolution + z * resolution * resolution
          const previous = surface.field[index]
          const h = Math.max(blend - Math.abs(previous - value), 0) / blend
          surface.field[index] = Math.max(previous, value) + h * h * blend / 4
        }
      }
    }
    mesh.geometry.dispose()
  }
  surface.update()
  human.clear()
  const skin = new Mesh(surface.geometry, material)
  skin.scale.setScalar(extent)
  human.add(skin)
  return human
}



