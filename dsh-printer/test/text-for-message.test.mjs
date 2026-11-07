import test from 'node:test'
import assert from 'node:assert/strict'
import { textForMessage, assistantText } from '../src/client/print-message.js'

test('assistantText joins text blocks only', () => {
  assert.equal(assistantText([{ kind: 'text', text: 'a' }, { kind: 'think', text: 'x' }, { kind: 'text', text: 'b' }]), 'ab')
})

test('assistantText accepts wire type:text blocks', () => {
  assert.equal(assistantText([{ type: 'text', text: 'hi' }]), 'hi')
})

test('textForMessage reads turn-tail closing blocks', () => {
  const snapshot = {
    chat: {
      nodes: {
        values() {
          return [
            {
              kind: 'turn-tail',
              data: {
                closing: {
                  finalNode: { messageId: 'm1' },
                  blocks: [{ kind: 'text', text: 'hello' }],
                },
              },
            },
          ]
        },
      },
    },
    nodes: [],
  }
  assert.equal(textForMessage(snapshot, 'm1'), 'hello')
  assert.equal(textForMessage(snapshot, 'other'), '')
})

test('textForMessage matches stringified message ids', () => {
  const snapshot = {
    chat: {
      nodes: {
        values() {
          return [
            {
              kind: 'assistant-step',
              data: {
                finalNode: { messageId: 42, blocks: [{ kind: 'text', text: 'n' }] },
                blocks: [],
              },
            },
          ]
        },
      },
    },
    nodes: [],
  }
  assert.equal(textForMessage(snapshot, '42'), 'n')
})

test('textForMessage falls back to legacy assistant nodes', () => {
  const snapshot = {
    chat: { nodes: { values: () => [] } },
    nodes: [{ kind: 'assistant', messageId: 'm9', blocks: [{ kind: 'text', text: 'legacy' }] }],
  }
  assert.equal(textForMessage(snapshot, 'm9'), 'legacy')
})
