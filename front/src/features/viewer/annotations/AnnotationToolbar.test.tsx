import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { AnnotationToolbar } from './AnnotationToolbar'

function renderToolbar(onColor = vi.fn()) {
  render(
    <AnnotationToolbar
      mode="2d"
      color="#ff0000"
      kind="pen"
      text=""
      selected={false}
      ready
      onColor={onColor}
      onKind={vi.fn()}
      onText={vi.fn()}
      onDelete={vi.fn()}
      onUndo={vi.fn()}
      onClear={vi.fn()}
      onClose={vi.fn()}
    />,
  )
  return onColor
}

describe('AnnotationToolbar color controls', () => {
  test('opens the custom color picker from 调色', () => {
    renderToolbar()

    fireEvent.click(screen.getByRole('button', { name: '调色' }))

    expect(screen.getByRole('dialog', { name: '自定义颜色' })).toBeInTheDocument()
  })

  test('keeps the current color swatch as a non-interactive preview', () => {
    renderToolbar()

    fireEvent.click(screen.getByRole('img', { name: '当前颜色' }))

    expect(screen.queryByRole('dialog', { name: '自定义颜色' })).not.toBeInTheDocument()
  })

  test('keeps fixed palette colors immediately actionable', () => {
    const onColor = renderToolbar()

    fireEvent.click(screen.getByRole('button', { name: '颜色 #13b019' }))

    expect(onColor).toHaveBeenCalledWith('#13b019')
  })

  test('commits a custom color through onColor', () => {
    const onColor = renderToolbar()

    fireEvent.click(screen.getByRole('button', { name: '调色' }))
    fireEvent.change(screen.getByLabelText('HEX'), { target: { value: '00ff80' } })
    fireEvent.click(screen.getByRole('button', { name: '确定' }))

    expect(onColor).toHaveBeenCalledTimes(1)
    expect(onColor).toHaveBeenCalledWith('#00ff80')
    expect(screen.queryByRole('dialog', { name: '自定义颜色' })).not.toBeInTheDocument()
  })

  test('canceling a custom color leaves the parent callback untouched', () => {
    const onColor = renderToolbar()

    fireEvent.click(screen.getByRole('button', { name: '调色' }))
    fireEvent.change(screen.getByLabelText('HEX'), { target: { value: '00ff80' } })
    fireEvent.click(screen.getByRole('button', { name: '取消' }))

    expect(onColor).not.toHaveBeenCalled()
  })
})
