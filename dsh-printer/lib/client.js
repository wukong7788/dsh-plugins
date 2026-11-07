window.__ModuleLoader__.load({
  id: '@ron777/dsh-printer',
  factory(require) {
    const module = { exports: {} };
    const exports = module.exports;
    const __require = require;
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name2 in all)
        __defProp(target, name2, { get: all[name2], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

    // src/client/index.js
    var index_exports = {};
    __export(index_exports, {
      apply: () => apply,
      inject: () => inject,
      name: () => name
    });
    module.exports = __toCommonJS(index_exports);

    // src/client/PrintAction.js
    var import_react2 = __require("react");
    var import_react_dom = __require("react-dom");
    var import_dsh_client_ui_primitives = __require("@deepseek-ai/dsh-client-ui-primitives");

    // src/client/print-message.js
    function textForMessage(snapshot, messageId) {
      if (messageId == null || messageId === "") return "";
      const want = String(messageId);
      if (!snapshot) return "";
      const fromChat = textFromChatNodes(snapshot.chat?.nodes, want);
      if (fromChat) return fromChat;
      for (const node of snapshot.nodes ?? []) {
        const text = textFromLegacyNode(node, want);
        if (text) return text;
      }
      return "";
    }
    function textFromChatNodes(nodes, want) {
      if (!nodes || typeof nodes.values !== "function") return "";
      let list;
      try {
        list = nodes.values();
      } catch {
        return "";
      }
      if (!list) return "";
      for (const node of list) {
        if (!node) continue;
        if (node.kind === "turn-tail") {
          const closing = node.data?.closing;
          if (!closing) continue;
          if (!idMatches(closing.finalNode?.messageId, want) && !idMatches(closing.messageId, want)) continue;
          return firstNonEmpty(assistantText(closing.blocks), assistantText(closing.finalNode?.blocks));
        }
      }
      for (const node of list) {
        const data = node?.data;
        if (!data) continue;
        if (idMatches(data.finalNode?.messageId, want)) {
          return firstNonEmpty(assistantText(data.blocks), assistantText(data.finalNode?.blocks));
        }
        if (idMatches(data.messageId, want)) {
          return firstNonEmpty(assistantText(data.blocks), assistantText(data.content));
        }
      }
      return "";
    }
    function textFromLegacyNode(node, want) {
      if (!node) return "";
      if (node.kind === "assistant" && idMatches(node.messageId, want)) {
        return firstNonEmpty(assistantText(node.blocks), assistantText(node.content));
      }
      if (idMatches(node.messageId, want) || idMatches(node.id, want)) {
        return firstNonEmpty(assistantText(node.blocks), assistantText(node.content));
      }
      return "";
    }
    function idMatches(actual, want) {
      if (actual == null) return false;
      return String(actual) === want;
    }
    function firstNonEmpty(...parts) {
      for (const part of parts) {
        if (typeof part === "string" && part.trim() !== "") return part;
      }
      return "";
    }
    function assistantText(blocks) {
      if (!Array.isArray(blocks)) return "";
      const parts = [];
      for (const block of blocks) {
        if (!block || typeof block !== "object") continue;
        const kind = block.kind ?? block.type;
        if ((kind === "text" || kind === "reasoning") && typeof block.text === "string" && block.text.length > 0) {
          parts.push(block.text);
        }
      }
      return parts.join("");
    }
    function elementPlainText(el) {
      const text = typeof el.innerText === "string" ? el.innerText : el.textContent;
      if (typeof text !== "string") return "";
      const trimmed = text.replace(/\u00a0/g, " ").trim();
      if (trimmed.length < 2) return "";
      return text.replace(/\u00a0/g, " ").replace(/\n{3,}/g, "\n\n").trim();
    }
    function contentFromDomNearActions(fromEl) {
      const el = findMessageElementNearActions(fromEl);
      if (!el) return { text: "", html: "" };
      const text = elementPlainText(el);
      const clone = el.cloneNode(true);
      for (const node of clone.querySelectorAll('button, [role="button"], textarea, input, select')) {
        node.remove();
      }
      const html = sanitizePreviewHtml(clone.innerHTML || "");
      return { text, html };
    }
    function findMessageElementNearActions(fromEl) {
      if (!fromEl || typeof fromEl.closest !== "function") return null;
      const tail = fromEl.closest("[data-turn-tail]");
      if (tail) {
        let sibling = tail.previousElementSibling;
        while (sibling) {
          if (elementPlainText(sibling)) return sibling;
          sibling = sibling.previousElementSibling;
        }
      }
      let node = fromEl.parentElement;
      for (let depth = 0; depth < 6 && node; depth += 1) {
        let sibling = node.previousElementSibling;
        while (sibling) {
          if (elementPlainText(sibling)) return sibling;
          sibling = sibling.previousElementSibling;
        }
        node = node.parentElement;
      }
      return null;
    }
    function sanitizePreviewHtml(html) {
      if (typeof html !== "string" || html.trim() === "") return "";
      return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "").replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "").replace(/\s(href|src)\s*=\s*("\s*javascript:[^"]*"|'\s*javascript:[^']*'|javascript:[^\s>]+)/gi, "");
    }
    function printDocumentHtml(opts) {
      const title = opts.title ?? "Print";
      const bodyHtml = opts.bodyHtml ?? "";
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
    </html>`;
      const frame = document.createElement("iframe");
      frame.setAttribute("aria-hidden", "true");
      frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none";
      document.body.appendChild(frame);
      const win = frame.contentWindow;
      const doc = frame.contentDocument;
      if (!win || !doc) {
        frame.remove();
        const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
        const popup = window.open(url, "_blank", "noopener,noreferrer");
        if (!popup) {
          URL.revokeObjectURL(url);
          throw new Error("popup-blocked");
        }
        const revoke = () => URL.revokeObjectURL(url);
        popup.addEventListener("afterprint", () => {
          revoke();
          popup.close();
        });
        popup.addEventListener("load", () => {
          try {
            popup.focus();
            popup.print();
          } catch {
          }
        });
        return;
      }
      doc.open();
      doc.write(html);
      doc.close();
      const cleanup = () => {
        try {
          frame.remove();
        } catch {
        }
      };
      const run = () => {
        try {
          win.focus();
          win.print();
        } finally {
          window.setTimeout(cleanup, 1e3);
        }
      };
      if (doc.readyState === "complete") run();
      else frame.addEventListener("load", run, { once: true });
    }
    function escapeHtml(value) {
      return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
    }

    // src/client/print-preview.js
    var import_react = __require("react");
    var CSS_ID = "dsh-printer/PrintPreview.css";
    var css = `
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
    `;
    function ensureCss() {
      if (typeof document === "undefined") return;
      if (document.querySelector(`style[data-plugin-css=${JSON.stringify(CSS_ID)}]`)) return;
      const tag = document.createElement("style");
      tag.dataset.plugin = "dsh-printer";
      tag.dataset.pluginCss = CSS_ID;
      tag.textContent = css;
      document.head.appendChild(tag);
    }
    function PrintPreview({ open, title, text, html, labels, onClose }) {
      ensureCss();
      const titleId = (0, import_react.useId)();
      const dialogRef = (0, import_react.useRef)(null);
      const printBtnRef = (0, import_react.useRef)(null);
      (0, import_react.useEffect)(() => {
        if (!open) return void 0;
        const prev = document.activeElement;
        printBtnRef.current?.focus();
        const onKey = (event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onClose();
          }
        };
        window.addEventListener("keydown", onKey);
        return () => {
          window.removeEventListener("keydown", onKey);
          if (prev && typeof prev.focus === "function") prev.focus();
        };
      }, [open, onClose]);
      const onPrint = (0, import_react.useCallback)(() => {
        const bodyHtml = html && html.trim() ? `<div class="dshp_rich">${html}</div>` : `<pre>${escapeHtml2(text)}</pre>`;
        printDocumentHtml({
          title,
          bodyHtml
        });
      }, [html, text, title]);
      if (!open) return null;
      const sheetChildren = html && html.trim() ? (0, import_react.createElement)("div", {
        className: "dshp_rich",
        dangerouslySetInnerHTML: { __html: html }
      }) : (0, import_react.createElement)("pre", null, text);
      return (0, import_react.createElement)(
        "div",
        {
          className: "dshp_overlay",
          role: "presentation",
          onMouseDown: (event) => {
            if (event.target === event.currentTarget) onClose();
          }
        },
        (0, import_react.createElement)(
          "div",
          {
            ref: dialogRef,
            className: "dshp_dialog",
            role: "dialog",
            "aria-modal": "true",
            "aria-labelledby": titleId
          },
          (0, import_react.createElement)(
            "div",
            { className: "dshp_header" },
            (0, import_react.createElement)("h2", { id: titleId, className: "dshp_title" }, title),
            (0, import_react.createElement)(
              "button",
              {
                type: "button",
                className: "dshp_close",
                "aria-label": labels.close,
                onClick: onClose
              },
              "\xD7"
            )
          ),
          (0, import_react.createElement)("div", { className: "dshp_body" }, (0, import_react.createElement)("div", { className: "dshp_sheet" }, sheetChildren)),
          (0, import_react.createElement)(
            "div",
            { className: "dshp_footer" },
            (0, import_react.createElement)(
              "button",
              { type: "button", className: "dshp_btn dshp_btnSecondary", onClick: onClose },
              labels.cancel
            ),
            (0, import_react.createElement)(
              "button",
              {
                ref: printBtnRef,
                type: "button",
                className: "dshp_btn dshp_btnPrimary",
                onClick: onPrint
              },
              labels.print
            )
          )
        )
      );
    }
    function escapeHtml2(value) {
      return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
    }

    // src/client/PrintAction.js
    var CSS_ID2 = "dsh-printer/PrintAction.css";
    var css2 = `
    .dshp_action{
      width:28px;height:28px;color:var(--dsw-alias-label-tertiary);cursor:pointer;
      background:0 0;border:none;border-radius:28px;justify-content:center;align-items:center;
      padding:6px;display:inline-flex
    }
    .dshp_action:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary)}
    .dshp_action:disabled{cursor:default;opacity:.4}
    .dshp_action[data-active]{color:var(--dsw-alias-label-primary)}
    `;
    function ensureCss2() {
      if (typeof document === "undefined") return;
      if (document.querySelector(`style[data-plugin-css=${JSON.stringify(CSS_ID2)}]`)) return;
      const tag = document.createElement("style");
      tag.dataset.plugin = "dsh-printer";
      tag.dataset.pluginCss = CSS_ID2;
      tag.textContent = css2;
      document.head.appendChild(tag);
    }
    function IconPrinter16() {
      return (0, import_react2.createElement)(
        "svg",
        {
          width: 16,
          height: 16,
          viewBox: "0 0 16 16",
          fill: "none",
          xmlns: "http://www.w3.org/2000/svg",
          "aria-hidden": true
        },
        (0, import_react2.createElement)("path", {
          d: "M4.5 2.5h7A1.5 1.5 0 0 1 13 4v2h.5A1.5 1.5 0 0 1 15 7.5v4A1.5 1.5 0 0 1 13.5 13H13v1.5A1.5 1.5 0 0 1 11.5 16h-7A1.5 1.5 0 0 1 3 14.5V13h-.5A1.5 1.5 0 0 1 1 11.5v-4A1.5 1.5 0 0 1 2.5 6H3V4A1.5 1.5 0 0 1 4.5 2.5Zm0 1A.5.5 0 0 0 4 4v2h8V4a.5.5 0 0 0-.5-.5h-7ZM2.5 7a.5.5 0 0 0-.5.5v4a.5.5 0 0 0 .5.5H3V10.5A1.5 1.5 0 0 1 4.5 9h7a1.5 1.5 0 0 1 1.5 1.5V12h.5a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 0-.5-.5h-11ZM4.5 10a.5.5 0 0 0-.5.5v4a.5.5 0 0 0 .5.5h7a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 0-.5-.5h-7Z",
          fill: "currentColor"
        })
      );
    }
    function PrintAction({ messageId, useSession, t }) {
      ensureCss2();
      const buttonRef = (0, import_react2.useRef)(null);
      const [busy, setBusy] = (0, import_react2.useState)(false);
      const [preview, setPreview] = (0, import_react2.useState)(null);
      const snapshotText = useSession((snapshot) => textForMessage(snapshot, messageId));
      const tip = (0, import_react2.useMemo)(() => t("action.print"), [t]);
      const closePreview = (0, import_react2.useCallback)(() => setPreview(null), []);
      const onClick = (0, import_react2.useCallback)(
        (event) => {
          if (busy) return;
          const fromDom = contentFromDomNearActions(event.currentTarget ?? buttonRef.current);
          const fromSnapshot = typeof snapshotText === "string" ? snapshotText.trim() : "";
          const text = (fromDom.text || fromSnapshot).trim();
          if (!text && !(fromDom.html && fromDom.html.trim())) return;
          setBusy(true);
          try {
            setPreview({
              text: text || fromDom.text,
              html: fromDom.html
            });
          } finally {
            setBusy(false);
          }
        },
        [busy, snapshotText]
      );
      const previewNode = (0, import_react2.createElement)(PrintPreview, {
        open: preview !== null,
        title: t("preview.title"),
        text: preview?.text ?? "",
        html: preview?.html ?? "",
        labels: {
          print: t("preview.print"),
          cancel: t("preview.cancel"),
          close: t("preview.close")
        },
        onClose: closePreview
      });
      return (0, import_react2.createElement)(
        import_react2.Fragment,
        null,
        (0, import_react2.createElement)(
          import_dsh_client_ui_primitives.Tooltip,
          { label: tip, side: "bottom" },
          (0, import_react2.createElement)(
            "button",
            {
              ref: buttonRef,
              type: "button",
              className: "dshp_action",
              "aria-label": tip,
              disabled: busy,
              onClick
            },
            (0, import_react2.createElement)(IconPrinter16)
          )
        ),
        typeof document !== "undefined" ? (0, import_react_dom.createPortal)(previewNode, document.body) : previewNode
      );
    }

    // src/client/index.js
    var NS = "dsh-printer";
    var zh = {
      "action.print": "\u6253\u5370",
      "action.empty": "\u8FD9\u6761\u6D88\u606F\u6CA1\u6709\u53EF\u6253\u5370\u7684\u6587\u5B57",
      "preview.title": "\u6253\u5370\u9884\u89C8",
      "preview.print": "\u6253\u5370",
      "preview.cancel": "\u53D6\u6D88",
      "preview.close": "\u5173\u95ED"
    };
    var en = {
      "action.print": "Print",
      "action.empty": "This message has no printable text",
      "preview.title": "Print preview",
      "preview.print": "Print",
      "preview.cancel": "Cancel",
      "preview.close": "Close"
    };
    var name = "@ron777/dsh-printer";
    var inject = ["slots", "locale"];
    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), "dsh-printer: dictionaries");
      ctx.slots.inject("conversation.chat.assistant-actions", () => {
        const dispose = ctx.slots.register(
          {
            name: "conversation.chat.assistant-actions",
            id: "dsh-printer",
            // Before feedback (order 10): sits immediately after the built-in Copy control.
            order: 5,
            locale: NS,
            label: () => "Print"
          },
          PrintAction
        );
        return dispose;
      });
    }

    return module.exports;
  },
});
