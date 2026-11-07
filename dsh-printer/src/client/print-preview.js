import { createElement as h, useCallback, useEffect, useId, useRef } from 'react'
import { printDocumentHtml } from './print-message.js'

const CSS_ID = 'dsh-printer/PrintPreview.css'
const css = `
.dshp_overlay{
  position:fixed;inset:0;z-index:100000;
  background:color-mix(in srgb, #000 45%, transparent);
  display:flex;align-items:center;justify-content:center;
  padding:24px;box-sizing:border-box
}
.dshp_dialog{
  width:min(820px,100%);
  max-height:min(88vh,920px);
  background:var(--dsw-alias-bg-primary,#fff);
  color:var(--dsw-alias-label-primary,#111);
  border:1px solid var(--dsw-alias-border-secondary,rgba(0,0,0,.08));
  border-radius:16px;
  box-shadow:var(--dsw-shadow-lv3,0 16px 48px rgba(0,0,0,.22));
  display:flex;flex-direction:column;overflow:hidden
}
.dshp_header{
  display:flex;align-items:center;justify-content:space-between;gap:12px;
  padding:14px 16px;border-bottom:1px solid var(--dsw-alias-border-secondary,rgba(0,0,0,.08))
}
.dshp_title{font-size:15px;font-weight:600;line-height:22px;margin:0}
.dshp_close{
  width:28px;height:28px;border:none;border-radius:8px;cursor:pointer;
  background:transparent;color:var(--dsw-alias-label-tertiary,#888);
  display:inline-flex;align-items:center;justify-content:center
}
.dshp_close:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.06));color:var(--dsw-alias-label-secondary,#555)}
.dshp_body{
  flex:1;min-height:0;overflow:auto;padding:20px 16px;
  background:var(--dsw-alias-bg-secondary,#f4f4f5)
}
.dshp_sheet{
  margin:0 auto;width:min(680px,100%);
  background:#fff;color:#111;
  border-radius:4px;
  box-shadow:0 1px 2px rgba(0,0,0,.06),0 8px 24px rgba(0,0,0,.08);
  padding:28px 32px;box-sizing:border-box;
  font:14px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif
}
.dshp_sheet pre{
  margin:0;white-space:pre-wrap;word-break:break-word;font:inherit
}
.dshp_sheet .dshp_rich{
  white-space:normal;word-break:break-word
}
.dshp_sheet .dshp_rich p{margin:0 0 .75em}
.dshp_sheet .dshp_rich p:last-child{margin-bottom:0}
.dshp_sheet .dshp_rich pre,.dshp_sheet .dshp_rich code{
  font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;
  font-size:12.5px
}
.dshp_sheet .dshp_rich pre{
  background:#f6f8fa;border-radius:8px;padding:12px 14px;overflow:auto
}
.dshp_footer{
  display:flex;justify-content:flex-end;gap:8px;
  padding:12px 16px;border-top:1px solid var(--dsw-alias-border-secondary,rgba(0,0,0,.08))
}
.dshp_btn{
  height:32px;padding:0 14px;border-radius:10px;border:none;cursor:pointer;
  font-size:13px;line-height:32px
}
.dshp_btnSecondary{
  background:transparent;color:var(--dsw-alias-label-secondary,#555)
}
.dshp_btnSecondary:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.06))}
.dshp_btnPrimary{
  background:var(--dsw-alias-interactive-bg-primary,#1f6feb);
  color:var(--dsw-alias-label-inverse,#fff)
}
.dshp_btnPrimary:hover{filter:brightness(1.05)}
.dshp_btnPrimary:disabled{opacity:.45;cursor:default}
@media print{
  .dshp_overlay{display:none!important}
}
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

/**
 * @param {{
 *   open: boolean,
 *   title: string,
 *   text: string,
 *   html?: string,
 *   labels: { print: string, cancel: string, close: string },
 *   onClose: () => void,
 * }} props
 */
export function PrintPreview({ open, title, text, html, labels, onClose }) {
  ensureCss()
  const titleId = useId()
  const dialogRef = useRef(null)
  const printBtnRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const prev = document.activeElement
    printBtnRef.current?.focus()
    const onKey = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      if (prev && typeof prev.focus === 'function') prev.focus()
    }
  }, [open, onClose])

  const onPrint = useCallback(() => {
    const bodyHtml = html && html.trim()
      ? `<div class="dshp_rich">${html}</div>`
      : `<pre>${escapeHtml(text)}</pre>`
    printDocumentHtml({
      title,
      bodyHtml,
    })
  }, [html, text, title])

  if (!open) return null

  const sheetChildren = html && html.trim()
    ? h('div', {
        className: 'dshp_rich',
        dangerouslySetInnerHTML: { __html: html },
      })
    : h('pre', null, text)

  return h(
    'div',
    {
      className: 'dshp_overlay',
      role: 'presentation',
      onMouseDown: (event) => {
        if (event.target === event.currentTarget) onClose()
      },
    },
    h(
      'div',
      {
        ref: dialogRef,
        className: 'dshp_dialog',
        role: 'dialog',
        'aria-modal': 'true',
        'aria-labelledby': titleId,
      },
      h(
        'div',
        { className: 'dshp_header' },
        h('h2', { id: titleId, className: 'dshp_title' }, title),
        h(
          'button',
          {
            type: 'button',
            className: 'dshp_close',
            'aria-label': labels.close,
            onClick: onClose,
          },
          '×',
        ),
      ),
      h('div', { className: 'dshp_body' }, h('div', { className: 'dshp_sheet' }, sheetChildren)),
      h(
        'div',
        { className: 'dshp_footer' },
        h(
          'button',
          { type: 'button', className: 'dshp_btn dshp_btnSecondary', onClick: onClose },
          labels.cancel,
        ),
        h(
          'button',
          {
            ref: printBtnRef,
            type: 'button',
            className: 'dshp_btn dshp_btnPrimary',
            onClick: onPrint,
          },
          labels.print,
        ),
      ),
    ),
  )
}

/** @param {string} value */
function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}
