import test from 'node:test'
import assert from 'node:assert/strict'
import { commandFromText } from '../src/index.js'

test('parses commands with optional bot usernames and arguments', () => {
  assert.deepEqual(commandFromText('/help'), { command: 'help', argument: '' })
  assert.deepEqual(commandFromText('/status@CloudNexa_bot'), { command: 'status', argument: '' })
  assert.deepEqual(commandFromText('/start secure-code'), { command: 'start', argument: 'secure-code' })
})

test('ignores non-command messages', () => {
  assert.equal(commandFromText('hello'), null)
  assert.equal(commandFromText('/'), null)
})
