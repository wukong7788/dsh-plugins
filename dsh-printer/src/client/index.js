import { PrintAction } from './PrintAction.js'

const NS = 'dsh-printer'

const zh = {
  'action.print': '打印',
  'action.empty': '这条消息没有可打印的文字',
  'preview.title': '打印预览',
  'preview.print': '打印',
  'preview.cancel': '取消',
  'preview.close': '关闭',
}

const en = {
  'action.print': 'Print',
  'action.empty': 'This message has no printable text',
  'preview.title': 'Print preview',
  'preview.print': 'Print',
  'preview.cancel': 'Cancel',
  'preview.close': 'Close',
}

export const name = '@ron777/dsh-printer'

/** Slot registry + locale dictionaries. */
export const inject = ['slots', 'locale']

/**
 * Register the Print entry on the assistant IconActions strip (between Copy and Branch).
 * @param {any} ctx
 */
export function apply(ctx) {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-printer: dictionaries')

  ctx.slots.inject('conversation.chat.assistant-actions', () => {
    const dispose = ctx.slots.register(
      {
        name: 'conversation.chat.assistant-actions',
        id: 'dsh-printer',
        // Before feedback (order 10): sits immediately after the built-in Copy control.
        order: 5,
        locale: NS,
        label: () => 'Print',
      },
      PrintAction,
    )
    return dispose
  })
}
