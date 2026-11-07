# @ron777/dsh-printer

在 DeepSeek Harness **已定稿助手消息**的 IconActions 行里，紧挨 **复制** 按钮增加 **打印**；先打开打印预览，再调系统打印对话框。

挂载点：`conversation.chat.assistant-actions`（order `5`，在官方反馈按钮之前）。

npm 包名：`@ron777/dsh-printer`（无作用域名 `dsh-printer` 已被占用）。

## Install

```bash
dsh plugin --profile desktop add @ron777/dsh-printer
```

本地开发：

```bash
pnpm install
pnpm run build
dsh plugin --profile desktop remove @ron777/dsh-printer 2>/dev/null || true
dsh plugin --profile desktop remove dsh-printer 2>/dev/null || true
dsh plugin --profile desktop add file:$(pwd)
```

然后重启对应的 DSH / Desktop 进程。

## Develop

```bash
pnpm install   # 仅用于 scripts/build.mjs 的 esbuild
pnpm run build
pnpm run check
```

Host 入口几乎为空；真实 UI 在 `lib/client.js`（`window.__ModuleLoader__` 工厂）。
