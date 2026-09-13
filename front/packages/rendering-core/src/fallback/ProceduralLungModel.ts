import {
  Color,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  Vector3,
} from 'three'

const lobeColors = ['#d96ac8', '#22c7d5', '#b6d94e', '#ec4d8c', '#e5bd55', '#5f79d3']

function material(color: string, opacity = 0.78) {
  return new MeshStandardMaterial({
    color: new Color(color),
    roughness: 0.58,
    metalness: 0.02,
    transparent: true,
    opacity,
    depthWrite: false,
  })
}

function lobe(name: string, color: string, position: [number, number, number], scale: [number, number, number]) {
  const mesh = new Mesh(new SphereGeometry(1, 28, 20), material(color))
  mesh.name = name
  mesh.position.set(...position)
  mesh.scale.set(...scale)
  return mesh
}

function airway(name: string, radius: number, length: number, position: [number, number, number], rotation: [number, number, number]) {
  const mesh = new Mesh(new CylinderGeometry(radius, radius * 1.08, length, 20), material('#e8e5d8', 0.92))
  mesh.name = name
  mesh.position.set(...position)
  mesh.rotation.set(...rotation)
  return mesh
}

function vessel(name: string, radius: number, length: number, position: [number, number, number], rotation: [number, number, number]) {
  const mesh = new Mesh(new ConeGeometry(radius, length, 10), material('#8d2f79', 0.66))
  mesh.name = name
  mesh.position.set(...position)
  mesh.rotation.set(...rotation)
  return mesh
}

export function createProceduralLungModel() {
  const model = new Group()
  model.name = 'procedural-lung-model'

  const left = new Group()
  left.name = 'left-lung'
  left.add(
    lobe('left-upper-lobe', lobeColors[0], [-2.05, 1.95, 0], [1.65, 1.8, 1.05]),
    lobe('left-lower-lobe', lobeColors[1], [-2.05, -0.45, 0.05], [1.72, 2.15, 1.12]),
    lobe('left-base-lobe', lobeColors[2], [-1.95, -2.0, 0.08], [1.56, 1.08, 1.08]),
  )

  const right = new Group()
  right.name = 'right-lung'
  right.add(
    lobe('right-upper-lobe', lobeColors[3], [2.05, 2.05, 0], [1.7, 1.65, 1.08]),
    lobe('right-middle-lobe', lobeColors[4], [2.18, 0.42, 0.04], [1.75, 1.15, 1.1]),
    lobe('right-lower-lobe', lobeColors[1], [2.05, -1.25, 0.08], [1.82, 1.7, 1.15]),
    lobe('right-base-lobe', lobeColors[2], [1.96, -2.25, 0.08], [1.58, 0.86, 1.05]),
  )

  const airways = new Group()
  airways.name = 'airways'
  airways.add(
    airway('trachea', 0.3, 3.45, [0, 4.35, 0], [0, 0, 0]),
    airway('left-main-bronchus', 0.2, 2.35, [-0.85, 2.78, 0], [0, 0, -0.95]),
    airway('right-main-bronchus', 0.2, 2.35, [0.85, 2.78, 0], [0, 0, 0.95]),
  )

  const vessels = new Group()
  vessels.name = 'vessels'
  vessels.add(
    vessel('left-vessel', 0.07, 3.4, [-1.65, 0.25, 0.95], [0.1, 0.2, -0.55]),
    vessel('right-vessel', 0.07, 3.6, [1.65, 0.2, 0.95], [-0.08, -0.2, 0.55]),
    vessel('center-vessel', 0.06, 2.5, [0, 0.1, 1.05], [Math.PI / 2, 0, 0]),
  )

  model.add(left, right, airways, vessels)
  model.traverse(object => {
    if (object instanceof Mesh) object.castShadow = false
  })
  model.position.set(0, -0.2, 0)
  model.userData.fallbackCenter = new Vector3(0, 0.8, 0)
  return model
}
