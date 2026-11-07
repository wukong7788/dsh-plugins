# dsh-plugins

收集各类 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（DSH）插件的仓库。每个子目录是一个可独立安装、发布的插件包。

## 插件列表

| 目录 | npm 包 | 说明 |
| --- | --- | --- |
| [dsh-printer](./dsh-printer) | [`@ron777/dsh-printer`](https://www.npmjs.com/package/@ron777/dsh-printer) | 在已定稿助手消息的复制按钮旁增加打印；支持打印预览后再调起系统打印 |

## 安装示例

```bash
dsh plugin --profile desktop add @ron777/dsh-printer
```

本地开发：

```bash
cd dsh-printer
pnpm install
pnpm run build
dsh plugin --profile desktop add file:$(pwd)
```

重启 DeepSeek Harness 后生效。

## 仓库约定

- 一个插件一个子目录；目录名可与 npm 包名的末段一致（如目录 `dsh-printer` ↔ 包 `@ron777/dsh-printer`）
- 插件自带 `package.json`、`cordis.patch.yml`、`AGENTS.md` 与构建产物约定
- 本仓库根目录只放索引与公共说明，不混入具体插件源码之外的业务逻辑
