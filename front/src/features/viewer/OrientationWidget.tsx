import { useEffect, useRef } from 'react'
import { AmbientLight, DirectionalLight, OrthographicCamera, Scene, WebGLRenderer } from 'three'
import { createOrientationHuman } from '../../../packages/rendering-core/src/orientation/createOrientationHuman'

export function OrientationWidget() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current!
    const stage = canvas.parentElement!.parentElement!
    let renderer: WebGLRenderer
    try { renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true }) } catch { return }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setSize(64, 120, false)
    const scene = new Scene()
    const human = createOrientationHuman()
    scene.add(human, new AmbientLight(0xffffff, 0.22))
    const light = new DirectionalLight(0xffffff, 2.8)
    light.position.set(-1, 1.5, 5)
    scene.add(light)
    const camera = new OrthographicCamera(-0.64, 0.64, 1.2, -1.2, 0.1, 20)
    camera.position.z = 5
    const render = () => renderer.render(scene, camera)
    const update = (event: Event) => {
      human.quaternion.fromArray((event as CustomEvent<number[]>).detail)
      render()
    }
    stage.addEventListener('viewer-orientation', update)
    render()
    return () => {
      stage.removeEventListener('viewer-orientation', update)
      human.traverse(object => {
        if ('geometry' in object) (object.geometry as { dispose(): void }).dispose()
      })
      human.userData.material.dispose()
      renderer.dispose()
    }
  }, [])
  return <div className="orientation-widget" role="img" aria-label="人体方向指示器"><canvas ref={canvasRef} /></div>
}

