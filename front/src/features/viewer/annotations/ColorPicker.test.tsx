import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { ColorPicker } from './ColorPicker'

function renderPicker() {
  const onCommit = vi.fn()
  const onCancel = vi.fn()
  render(<ColorPicker value="#ff0000" onCommit={onCommit} onCancel={onCancel} />)
  return { onCommit, onCancel }
}

describe('ColorPicker', () => {
  test('starts from the provided color and updates HEX from RGB edits', () => {
    renderPicker()

    expect(screen.getByLabelText('HEX')).toHaveValue('#ff0000')
    fireEvent.change(screen.getByLabelText('红色(R)'), { target: { value: '0' } })
    fireEvent.change(screen.getByLabelText('绿色(G)'), { target: { value: '255' } })
    fireEvent.change(screen.getByLabelText('蓝色(B)'), { target: { value: '128' } })

    expect(screen.getByLabelText('HEX')).toHaveValue('#00ff80')
  })

  test('updates RGB values from a valid HEX edit', () => {
    renderPicker()

    const hex = screen.getByLabelText('HEX')
    fireEvent.change(hex, { target: { value: '3366cc' } })

    expect(screen.getByLabelText('红色(R)')).toHaveValue(51)
    expect(screen.getByLabelText('绿色(G)')).toHaveValue(102)
    expect(screen.getByLabelText('蓝色(B)')).toHaveValue(204)
  })

  test('marks invalid HEX and disables confirmation', () => {
    renderPicker()

    const hex = screen.getByLabelText('HEX')
    fireEvent.change(hex, { target: { value: '#12ab' } })

    expect(hex).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('button', { name: '确定' })).toBeDisabled()
  })

  test('cancel and Escape discard the draft without committing', () => {
    const { onCommit, onCancel } = renderPicker()

    fireEvent.change(screen.getByLabelText('HEX'), { target: { value: '00ff80' } })
    fireEvent.click(screen.getByRole('button', { name: '取消' }))
    fireEvent.keyDown(screen.getByRole('dialog', { name: '自定义颜色' }), { key: 'Escape' })

    expect(onCommit).not.toHaveBeenCalled()
    expect(onCancel).toHaveBeenCalledTimes(2)
  })

  test('commits a normalized HEX value once', () => {
    const { onCommit } = renderPicker()

    fireEvent.change(screen.getByLabelText('HEX'), { target: { value: '00FF80' } })
    fireEvent.click(screen.getByRole('button', { name: '确定' }))

    expect(onCommit).toHaveBeenCalledTimes(1)
    expect(onCommit).toHaveBeenCalledWith('#00ff80')
  })
})
