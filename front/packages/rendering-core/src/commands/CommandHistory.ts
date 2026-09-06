import type { Command } from './Command'

export class CommandHistory {
  readonly #undoStack: Command[] = []
  readonly #redoStack: Command[] = []

  constructor(private readonly capacity = 100) {
    if (!Number.isInteger(capacity) || capacity < 1) throw new Error('History capacity must be positive')
  }

  execute(command: Command) {
    command.execute()
    for (const stale of this.#redoStack) stale.dispose?.()
    this.#redoStack.length = 0
    this.#undoStack.push(command)
    if (this.#undoStack.length > this.capacity) this.#undoStack.shift()?.dispose?.()
  }

  undo() {
    const command = this.#undoStack.pop()
    if (!command) return false
    command.undo()
    this.#redoStack.push(command)
    return true
  }

  redo() {
    const command = this.#redoStack.pop()
    if (!command) return false
    command.execute()
    this.#undoStack.push(command)
    return true
  }

  canUndo() { return this.#undoStack.length > 0 }
  canRedo() { return this.#redoStack.length > 0 }

  clear() {
    for (const command of [...this.#undoStack, ...this.#redoStack]) command.dispose?.()
    this.#undoStack.length = 0
    this.#redoStack.length = 0
  }
}
