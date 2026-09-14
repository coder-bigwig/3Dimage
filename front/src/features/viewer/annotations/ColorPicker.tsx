import { useState, type KeyboardEvent, type MouseEvent, type ReactElement } from 'react'
import { hexToRgb, hsvToRgb, normalizeHex, rgbToHex, rgbToHsv, type Hsv, type Rgb } from './colorUtils'

const DEFAULT_COLOR = '#ff0000'
const SURFACE_WIDTH = 352
const SURFACE_HEIGHT = 150
const HUE_HEIGHT = 150

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function initialColor(value: string): string {
  return normalizeHex(value) ?? DEFAULT_COLOR
}

export function ColorPicker({
  value,
  onCommit,
  onCancel,
}: {
  value: string
  onCommit(value: string): void
  onCancel(): void
}): ReactElement {
  const initial = initialColor(value)
  const [currentColor] = useState(initial)
  const [draftColor, setDraftColor] = useState(initial)
  const [rgb, setRgb] = useState<Rgb>(() => hexToRgb(initial) ?? { r: 255, g: 0, b: 0 })
  const [hsv, setHsv] = useState<Hsv>(() => rgbToHsv(hexToRgb(initial) ?? { r: 255, g: 0, b: 0 }))
  const [hexInput, setHexInput] = useState(initial)
  const [hexError, setHexError] = useState(false)
  const [rgbInputs, setRgbInputs] = useState(() => ({ r: String(rgb.r), g: String(rgb.g), b: String(rgb.b) }))

  const updateColor = (nextRgb: Rgb, nextHsv = rgbToHsv(nextRgb)) => {
    const nextColor = rgbToHex(nextRgb)
    setRgb(nextRgb)
    setHsv(nextHsv)
    setDraftColor(nextColor)
    setHexInput(nextColor)
    setRgbInputs({ r: String(nextRgb.r), g: String(nextRgb.g), b: String(nextRgb.b) })
    setHexError(false)
  }

  const updateFromSurface = (nextS: number, nextV: number) => {
    const nextHsv = { ...hsv, s: clamp(nextS, 0, 1), v: clamp(nextV, 0, 1) }
    updateColor(hsvToRgb(nextHsv), nextHsv)
  }

  const updateFromHue = (nextH: number) => {
    const nextHsv = { ...hsv, h: (nextH + 360) % 360 }
    updateColor(hsvToRgb(nextHsv), nextHsv)
  }

  const handleSurfaceClick = (event: MouseEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    const width = bounds.width || SURFACE_WIDTH
    const height = bounds.height || SURFACE_HEIGHT
    updateFromSurface(
      (event.clientX - bounds.left) / width,
      1 - (event.clientY - bounds.top) / height,
    )
  }

  const handleHueClick = (event: MouseEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    const height = bounds.height || HUE_HEIGHT
    updateFromHue(((event.clientY - bounds.top) / height) * 360)
  }

  const handleSurfaceKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 0.1 : 0.01
    if (event.key === 'ArrowLeft') updateFromSurface(hsv.s - step, hsv.v)
    else if (event.key === 'ArrowRight') updateFromSurface(hsv.s + step, hsv.v)
    else if (event.key === 'ArrowUp') updateFromSurface(hsv.s, hsv.v + step)
    else if (event.key === 'ArrowDown') updateFromSurface(hsv.s, hsv.v - step)
    else return
    event.preventDefault()
  }

  const handleHueKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 10 : 1
    if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') updateFromHue(hsv.h - step)
    else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') updateFromHue(hsv.h + step)
    else return
    event.preventDefault()
  }

  const handleRgbChange = (channel: keyof Rgb, rawValue: string) => {
    setRgbInputs(previous => ({ ...previous, [channel]: rawValue }))
    const numericValue = Number(rawValue)
    if (!Number.isFinite(numericValue) || rawValue.trim() === '') return
    const nextRgb = { ...rgb, [channel]: clamp(numericValue, 0, 255) }
    updateColor(nextRgb)
  }

  const handleRgbBlur = (channel: keyof Rgb) => {
    const rawValue = rgbInputs[channel]
    const numericValue = Number(rawValue)
    if (!Number.isFinite(numericValue) || rawValue.trim() === '') {
      setRgbInputs(previous => ({ ...previous, [channel]: String(rgb[channel]) }))
      return
    }
    updateColor({ ...rgb, [channel]: clamp(numericValue, 0, 255) })
  }

  const handleHexChange = (rawValue: string) => {
    setHexInput(rawValue)
    const normalized = normalizeHex(rawValue)
    if (!normalized) {
      setHexError(true)
      return
    }
    const nextRgb = hexToRgb(normalized)
    if (nextRgb) updateColor(nextRgb)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      onCancel()
    }
  }

  const canCommit = !hexError && normalizeHex(hexInput) !== null

  return <section
    className="annotation-color-picker"
    role="dialog"
    aria-modal="false"
    aria-label="自定义颜色"
    onKeyDown={handleKeyDown}
  >
    <div className="annotation-color-picker-controls">
      <div
        className="annotation-color-surface"
        role="slider"
        aria-label="饱和度和明度"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(hsv.s * 100)}
        tabIndex={0}
        style={{ backgroundColor: `hsl(${hsv.h} 100% 50%)` }}
        onClick={handleSurfaceClick}
        onKeyDown={handleSurfaceKeyDown}
      />
      <div
        className="annotation-color-hue"
        role="slider"
        aria-label="色相"
        aria-valuemin={0}
        aria-valuemax={360}
        aria-valuenow={Math.round(hsv.h)}
        tabIndex={0}
        onClick={handleHueClick}
        onKeyDown={handleHueKeyDown}
      />
    </div>
    <div className="annotation-color-inputs">
      {(['r', 'g', 'b'] as const).map(channel => (
        <label key={channel}>
          {channel === 'r' ? '红色(R)' : channel === 'g' ? '绿色(G)' : '蓝色(B)'}
          <input
            type="number"
            min={0}
            max={255}
            value={rgbInputs[channel]}
            onChange={event => handleRgbChange(channel, event.target.value)}
            onBlur={() => handleRgbBlur(channel)}
            aria-label={channel === 'r' ? '红色(R)' : channel === 'g' ? '绿色(G)' : '蓝色(B)'}
          />
        </label>
      ))}
      <label>
        HEX
        <input
          type="text"
          value={hexInput}
          onChange={event => handleHexChange(event.target.value)}
          aria-label="HEX"
          aria-invalid={hexError}
          aria-describedby={hexError ? 'annotation-color-error' : undefined}
          spellCheck={false}
        />
      </label>
      {hexError && <p id="annotation-color-error" className="annotation-color-error">请输入六位十六进制颜色</p>}
    </div>
    <div className="annotation-color-preview" aria-label="颜色预览">
      <div><span>新增</span><i style={{ backgroundColor: draftColor }} /></div>
      <div><span>当前</span><i style={{ backgroundColor: currentColor }} /></div>
    </div>
    <div className="annotation-color-actions">
      <button type="button" onClick={() => onCommit(normalizeHex(hexInput)!)} disabled={!canCommit}>确定</button>
      <button type="button" onClick={onCancel}>取消</button>
    </div>
  </section>
}
