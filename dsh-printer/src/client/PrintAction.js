import { Fragment, createElement as h, useCallback, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Tooltip } from '@deepseek-ai/dsh-client-ui-primitives'
import { contentFromDomNearActions, textForMessage } from './print-message.js'
import { PrintPreview } from './print-preview.js'

const CSS_ID = 'dsh-printer/PrintAction.css'
const css = `
.dshp_action{
  width:28px;height:28px;color:var(--dsw-alias-label-tertiary);cursor:pointer;
  background:0 0;border:none;border-radius:28px;justify-content:center;align-items:center;
  padding:6px;display:inline-flex
}
.dshp_action:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary)}
.dshp_action:disabled{cursor:default;opacity:.4}
.dshp_action[data-active]{color:var(--dsw-alias-label-primary)}
`

function ensureCss() {
  if (typeof document === 'undefined') return
  if (document.querySelector(`style[data-plugin-css=${JSON.stringify(CSS_ID)}]`)) return
  const tag = document.createElement('style')
  tag.dataset.plugin = 'dsh-printer'
  tag.dataset.pluginCss = CSS_ID
  tag.textContent = css
  document.head.appendChild(tag)
}

function IconPrinter16() {
  return h(
    'svg',
    {
      width: 16,
      height: 16,
      viewBox: '0 0 16 16',
      fill: 'none',
      xmlns: 'http://www.w3.org/2000/svg',
      'aria-hidden': true,
    },
    h('path', {
      d: 'M4.5 2.5h7A1.5 1.5 0 0 1 13 4v2h.5A1.5 1.5 0 0 1 15 7.5v4A1.5 1.5 0 0 1 13.5 13H13v1.5A1.5 1.5 0 0 1 11.5 16h-7A1.5 1.5 0 0 1 3 14.5V13h-.5A1.5 1.5 0 0 1 1 11.5v-4A1.5 1.5 0 0 1 2.5 6H3V4A1.5 1.5 0 0 1 4.5 2.5Zm0 1A.5.5 0 0 0 4 4v2h8V4a.5.5 0 0 0-.5-.5h-7ZM2.5 7a.5.5 0 0 0-.5.5v4a.5.5 0 0 0 .5.5H3V10.5A1.5 1.5 0 0 1 4.5 9h7a1.5 1.5 0 0 1 1.5 1.5V12h.5a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 0-.5-.5h-11ZM4.5 10a.5.5 0 0 0-.5.5v4a.5.5 0 0 0 .5.5h7a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 0-.5-.5h-7Z',
      fill: 'currentColor',
    }),
  )
}

/**
 * Print control for one finalized assistant message (IconActions strip).
 * @param {{ messageId: string, useSession: Function, t: (key: string, params?: object) => string }} props
 */
export function PrintAction({ messageId, useSession, t }) {
  ensureCss()
  const buttonRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState(null)

  const snapshotText = useSession((snapshot) => textForMessage(snapshot, messageId))
  const tip = useMemo(() => t('action.print'), [t])

  const closePreview = useCallback(() => setPreview(null), [])

  const onClick = useCallback(
    (event) => {
      if (busy) return
      const fromDom = contentFromDomNearActions(event.currentTarget ?? buttonRef.current)
      const fromSnapshot = typeof snapshotText === 'string' ? snapshotText.trim() : ''
      const text = (fromDom.text || fromSnapshot).trim()
      if (!text && !(fromDom.html && fromDom.html.trim())) return

      setBusy(true)
      try {
        setPreview({
          text: text || fromDom.text,
          html: fromDom.html,
        })
      } finally {
        setBusy(false)
      }
    },
    [busy, snapshotText],
  )

  const previewNode = h(PrintPreview, {
    open: preview !== null,
    title: t('preview.title'),
    text: preview?.text ?? '',
    html: preview?.html ?? '',
    labels: {
      print: t('preview.print'),
      cancel: t('preview.cancel'),
      close: t('preview.close'),
    },
    onClose: closePreview,
  })

  return h(
    Fragment,
    null,
    h(
      Tooltip,
      { label: tip, side: 'bottom' },
      h(
        'button',
        {
          ref: buttonRef,
          type: 'button',
          className: 'dshp_action',
          'aria-label': tip,
          disabled: busy,
          onClick,
        },
        h(IconPrinter16),
      ),
    ),
    typeof document !== 'undefined' ? createPortal(previewNode, document.body) : previewNode,
  )
}
