/**
 * Resolve printable plain text for one finalized assistant message.
 * @param {import('@deepseek-ai/dsh-client-runtime/client').ConversationSnapshot | null | undefined} snapshot
 * @param {string} messageId
 */
export function textForMessage(snapshot, messageId) {
  if (messageId == null || messageId === '') return ''
  const want = String(messageId)
  if (!snapshot) return ''

  const fromChat = textFromChatNodes(snapshot.chat?.nodes, want)
  if (fromChat) return fromChat

  for (const node of snapshot.nodes ?? []) {
    const text = textFromLegacyNode(node, want)
    if (text) return text
  }

  return ''
}

/**
 * @param {{ get?: Function, values?: Function } | null | undefined} nodes
 * @param {string} want
 */
function textFromChatNodes(nodes, want) {
  if (!nodes || typeof nodes.values !== 'function') return ''
  let list
  try {
    list = nodes.values()
  } catch {
    return ''
  }
  if (!list) return ''

  for (const node of list) {
    if (!node) continue
    if (node.kind === 'turn-tail') {
      const closing = node.data?.closing
      if (!closing) continue
      if (!idMatches(closing.finalNode?.messageId, want) && !idMatches(closing.messageId, want)) continue
      return firstNonEmpty(assistantText(closing.blocks), assistantText(closing.finalNode?.blocks))
    }
  }

  for (const node of list) {
    const data = node?.data
    if (!data) continue
    if (idMatches(data.finalNode?.messageId, want)) {
      return firstNonEmpty(assistantText(data.blocks), assistantText(data.finalNode?.blocks))
    }
    if (idMatches(data.messageId, want)) {
      return firstNonEmpty(assistantText(data.blocks), assistantText(data.content))
    }
  }

  return ''
}

/**
 * @param {any} node
 * @param {string} want
 */
function textFromLegacyNode(node, want) {
  if (!node) return ''
  if (node.kind === 'assistant' && idMatches(node.messageId, want)) {
    return firstNonEmpty(assistantText(node.blocks), assistantText(node.content))
  }
  if (idMatches(node.messageId, want) || idMatches(node.id, want)) {
    return firstNonEmpty(assistantText(node.blocks), assistantText(node.content))
  }
  return ''
}

function idMatches(actual, want) {
  if (actual == null) return false
  return String(actual) === want
}

function firstNonEmpty(...parts) {
  for (const part of parts) {
    if (typeof part === 'string' && part.trim() !== '') return part
  }
  return ''
}

/**
 * Collect visible prose from assistant / content blocks.
 * Accepts UI `kind: 'text'` blocks and wire `type: 'text'` blocks.
 * @param {readonly any[] | null | undefined} blocks
 */
export function assistantText(blocks) {
  if (!Array.isArray(blocks)) return ''
  const parts = []
  for (const block of blocks) {
    if (!block || typeof block !== 'object') continue
    const kind = block.kind ?? block.type
    if ((kind === 'text' || kind === 'reasoning') && typeof block.text === 'string' && block.text.length > 0) {
      parts.push(block.text)
    }
  }
  return parts.join('')
}

/**
 * Fallback when the session snapshot lookup misses: scrape the rendered
 * assistant bubble that sits above the IconActions / turn-tail row.
 * @param {Element | null | undefined} fromEl
 */
export function textFromDomNearActions(fromEl) {
  return contentFromDomNearActions(fromEl).text
}

/** @param {Element} el */
function elementPlainText(el) {
  const text = typeof el.innerText === 'string' ? el.innerText : el.textContent
  if (typeof text !== 'string') return ''
  const trimmed = text.replace(/\u00a0/g, ' ').trim()
  // Ignore chrome-only rows (clock / empty wrappers).
  if (trimmed.length < 2) return ''
  return text.replace(/\u00a0/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
}

/**
 * Capture rendered HTML of the assistant bubble near the actions row.
 * @param {Element | null | undefined} fromEl
 * @returns {{ text: string, html: string }}
 */
export function contentFromDomNearActions(fromEl) {
  const el = findMessageElementNearActions(fromEl)
  if (!el) return { text: '', html: '' }
  const text = elementPlainText(el)
  const clone = el.cloneNode(true)
  // Drop action chrome / interactive controls if they leaked into the bubble.
  for (const node of clone.querySelectorAll('button, [role="button"], textarea, input, select')) {
    node.remove()
  }
  const html = sanitizePreviewHtml(clone.innerHTML || '')
  return { text, html }
}

/** @param {Element | null | undefined} fromEl */
function findMessageElementNearActions(fromEl) {
  if (!fromEl || typeof fromEl.closest !== 'function') return null

  const tail = fromEl.closest('[data-turn-tail]')
  if (tail) {
    let sibling = tail.previousElementSibling
    while (sibling) {
      if (elementPlainText(sibling)) return sibling
      sibling = sibling.previousElementSibling
    }
  }

  let node = fromEl.parentElement
  for (let depth = 0; depth < 6 && node; depth += 1) {
    let sibling = node.previousElementSibling
    while (sibling) {
      if (elementPlainText(sibling)) return sibling
      sibling = sibling.previousElementSibling
    }
    node = node.parentElement
  }
  return null
}

/**
 * Keep a conservative HTML subset for preview / print.
 * @param {string} html
 */
export function sanitizePreviewHtml(html) {
  if (typeof html !== 'string' || html.trim() === '') return ''
  // Strip scripts/styles/event handlers without bringing in a sanitizer dependency.
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s(href|src)\s*=\s*("\s*javascript:[^"]*"|'\s*javascript:[^']*'|javascript:[^\s>]+)/gi, '')
}

/**
 * Open a print document and invoke the system print dialog.
 * @param {{ title?: string, bodyHtml: string }} opts
 */
export function printDocumentHtml(opts) {
  const title = opts.title ?? 'Print'
  const bodyHtml = opts.bodyHtml ?? ''
  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<title>${escapeHtml(title)}</title>
<style>
  @page { margin: 16mm; }
  html, body { margin: 0; padding: 0; }
  body {
    font: 14px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    color: #111;
    padding: 24px;
  }
  pre {
    white-space: pre-wrap;
    word-break: break-word;
    margin: 0;
    font: inherit;
  }
  .dshp_rich p { margin: 0 0 .75em; }
  .dshp_rich p:last-child { margin-bottom: 0; }
  .dshp_rich pre, .dshp_rich code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 12.5px;
  }
  .dshp_rich pre {
    background: #f6f8fa;
    border-radius: 8px;
    padding: 12px 14px;
    overflow: auto;
  }
</style>
</head>
<body>${bodyHtml}</body>
</html>`

  const frame = document.createElement('iframe')
  frame.setAttribute('aria-hidden', 'true')
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none'
  document.body.appendChild(frame)

  const win = frame.contentWindow
  const doc = frame.contentDocument
  if (!win || !doc) {
    frame.remove()
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }))
    const popup = window.open(url, '_blank', 'noopener,noreferrer')
    if (!popup) {
      URL.revokeObjectURL(url)
      throw new Error('popup-blocked')
    }
    const revoke = () => URL.revokeObjectURL(url)
    popup.addEventListener('afterprint', () => {
      revoke()
      popup.close()
    })
    popup.addEventListener('load', () => {
      try {
        popup.focus()
        popup.print()
      } catch {
        /* ignore */
      }
    })
    return
  }

  doc.open()
  doc.write(html)
  doc.close()

  const cleanup = () => {
    try {
      frame.remove()
    } catch {
      /* ignore */
    }
  }

  const run = () => {
    try {
      win.focus()
      win.print()
    } finally {
      window.setTimeout(cleanup, 1000)
    }
  }

  if (doc.readyState === 'complete') run()
  else frame.addEventListener('load', run, { once: true })
}

/**
 * @deprecated Use printDocumentHtml. Kept for callers that only have plain text.
 * @param {string} text
 * @param {{ title?: string }} [opts]
 */
export function printPlainText(text, opts = {}) {
  printDocumentHtml({
    title: opts.title,
    bodyHtml: `<pre>${escapeHtml(text)}</pre>`,
  })
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
