import { expect, test } from 'vitest'
import type { Command } from './Command'
import { CommandHistory } from './CommandHistory'

test('executes, undoes and redoes a command', () => {
  let value = 0
  const command: Command = {
    execute: () => { value = 10 },
    undo: () => { value = 0 },
  }
  const history = new CommandHistory()

  history.execute(command)
  expect(value).toBe(10)
  history.undo()
  expect(value).toBe(0)
  history.redo()
  expect(value).toBe(10)
})

test('clears redo commands after a new command', () => {
  const history = new CommandHistory()
  const command: Command = { execute() {}, undo() {} }
  history.execute(command)
  history.undo()
  history.execute(command)
  expect(history.canRedo()).toBe(false)
})
