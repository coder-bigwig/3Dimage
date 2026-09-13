import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import type { ManifestLayer } from '../../api/sharedViewer'
import { FixedAnatomyStrip } from './FixedAnatomyStrip'
import { buildStripItems } from './stripItems'
import { referenceCategory } from './referenceCategory'

function layer(overrides: Partial<ManifestLayer> & { id: string; name: string }): ManifestLayer {
  return {
    parentId: null, code: overrides.id, color: '#ffffff', opacity: 1, visible: true,
    volumeMl: null, sortOrder: 0, assets: {}, ...overrides,
  }
}

describe('buildStripItems', () => {
  test('uses reference categories with real volumes when the case provides them', () => {
    const items = buildStripItems([
      layer({ id: 'lung', name: '肺', color: '#ef1111', volumeMl: 3557.92 }),
      layer({ id: 'artery', name: '动脉', color: '#ee2222', volumeMl: 99.14 }),
      layer({ id: 'trachea', name: '气管', color: '#ffffff', volumeMl: 45.89 }),
    ], new Set())

    expect(items.map(item => item.name)).toEqual(['肺', '动脉', '气管'])
    expect(items.map(item => item.volume)).toEqual(['3557.92ml', '99.14ml', '45.89ml'])
    expect(items[0].color).toBe('#ef1111')
  })

  test('falls back to anatomical lobe groups when only lobes are present', () => {
    const items = buildStripItems([
      layer({ id: 'lung-upper-lobe-right', name: 'Right upper lobe', volumeMl: 799.36 }),
      layer({ id: 'lung-lower-lobe-left', name: 'Left lower lobe', volumeMl: 753.03 }),
    ], new Set())

    expect(items.map(item => item.name)).toEqual(['右上', '左下'])
    expect(items[0].volume).toBe('799.36ml')
  })

  test('never invents a volume when the data carries none', () => {
    const items = buildStripItems([layer({ id: 'lung-upper-lobe-right', name: 'Right upper lobe' })], new Set())
    expect(items[0].volume).toBeUndefined()
  })

  test('marks a partially hidden group as mixed rather than off', () => {
    const items = buildStripItems([
      layer({ id: 'rs1', code: 'RUL', name: '右上叶' }),
      layer({ id: 'rs2', code: 'RUL', name: '右上叶二段' }),
    ], new Set(['rs1']))

    expect(items[0].name).toBe('右上')
    expect(items[0].off).toBe(false)
    expect(items[0].mixed).toBe(true)
  })
})

describe('FixedAnatomyStrip', () => {
  test('switches the child row and toggles only the chosen real layer', () => {
    const layers = [layer({ id: 'segment-a', name: 'rs5a', volumeMl: 12 }), layer({ id: 'artery', name: '动脉' })]
    const onSelect = vi.fn()
    const onToggle = vi.fn()
    const { rerender } = render(<FixedAnatomyStrip layers={layers} selected="肺段" onSelect={onSelect} onToggle={onToggle} />)
    const children = screen.getByRole('region', { name: '肺段子模型' })
    expect(within(children).getByText('rs5a')).toBeVisible()
    fireEvent.click(within(children).getByRole('button', { name: '隐藏 rs5a' }))
    expect(onToggle).toHaveBeenCalledWith(['segment-a'])
    fireEvent.click(screen.getByRole('button', { name: '选择 动脉' }))
    expect(onSelect).toHaveBeenCalledWith('动脉')
    rerender(<FixedAnatomyStrip layers={layers} selected="动脉" onToggle={onToggle} />)
    expect(screen.queryByText('rs5a')).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: '动脉子模型' })).toBeVisible()
  })

  test('renders data-driven items with eye state taken from the hidden set', () => {
    render(<FixedAnatomyStrip
      layers={[layer({ id: 'lung-artery', name: '动脉', volumeMl: 99.14 }), layer({ id: 'lung-trachea', name: '气管', volumeMl: 45.89 })]}
      hidden={new Set(['lung-trachea'])}
      selected="动脉"
    />)

    const items = [...document.querySelectorAll<HTMLElement>('.reference-layer-item')]
    expect(items.map(item => item.querySelector('.reference-layer-name')?.textContent)).toEqual(['动脉', '气管'])
    expect(within(items[0]).getByText('99.14ml')).toBeInTheDocument()
    expect(screen.getByText('45.89ml')).toBeInTheDocument()
    expect(items[0].querySelector('.reference-eye--off')).toBeNull()
    expect(items[1].querySelector('.reference-eye--off')).toBeTruthy()
    expect(document.querySelector('.reference-layer-item.is-selected')).toBe(items[0])
  })

  test('renders nothing when there is no layer data', () => {
    const { container } = render(<FixedAnatomyStrip layers={[]} />)
    expect(container.querySelector('.reference-anatomy-strip')).toBeNull()
  })
})

test.each([
  ['RUL', '右上', '肺'],
  ['segment', '右上肺段', '肺段'],
  ['artery', '肺动脉', '动脉'],
  ['vein', '肺静脉', '静脉'],
  ['bronchus', '支气管', '气管'],
  ['nodule', '肺结节', '占位'],
  ['margin-15mm', '占位_安全边界(15mm)', '占位_安全边界(15mm)'],
  ['margin-20mm', '占位_安全边界(20mm)', '占位_安全边界(20mm)'],
  ['margin-10mm', '占位_安全边界(10mm)', undefined],
  ['unknown', '未知结构', undefined],
])('maps %s without mixing structures', (code, name, expected) => {
  expect(referenceCategory(layer({ id: code, name }))).toBe(expected)
})
