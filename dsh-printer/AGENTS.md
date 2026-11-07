# AGENTS.md — dsh-printer

本文件给任何在此仓库工作的 agent 在动代码前必读。优先遵守本文件与仓库内源码；不要用网上「最新」文档覆盖本机已安装的 DSH 版本事实。

## 项目定位

- **npm 包名**：`@ron777/dsh-printer`（无作用域名已被占用；Cordis 行 id 仍用短 id `dsh-printer`，`name` 指向 scoped 包）
- **用途**：DeepSeek Harness（DSH）打印相关插件（具体能力面：工具 / 设置页 / 系统打印桥 — 实现前先在 issue 或本文件「产品范围」补齐）
- **宿主实测**：本机 `dsh --version` → **`0.2.2-rc.1`**（DeepSeek Harness.app 内置 CLI）；profile 以 **`desktop`** 为主（另有空的 `web`）
- **Node 运行时**：Harness 声明 Node `24.x` 线；插件 `engines.node` 建议对齐官方 `^22.19.0 || >=24.0.0`

## 开发前先锁定目标

1. 确认插件要对齐的 DSH：本机二进制、`$DSH_HOME`（默认 `~/.dsh`）、或临时 checkout 的 **version + commit**。
2. 读本文件与即将改动路径最近的说明；保留无关本地改动，不要为了「干净证据」去 fetch/reset 用户 worktree。
3. API / 行为以 **目标版本源码、生成物、测试、真实报错** 为准；官方站文档只补源码答不上的事实，**不要拿 moving `master` 文档硬套旧宿主**。
4. DSH 目前 **没有稳定线**，几乎全是 prerelease；`npm latest` / `next` / `alpha` / GitHub Release tag 可能指向不同版本——写 peer / `engines.dsh` 前先对一下本机宿主。

## 插件形态（二选一，勿混）

| 形态 | 导出约定 |
| --- | --- |
| **Function plugin** | ESM 命名导出：`name`、`inject`、`Config`、`apply`；**禁止 default export** |
| **Service plugin** | default-export service class，跟宿主 service 生命周期 |

- 必需 Cordis 服务放 `inject`；可选服务用 `ctx.get(name)`，缺席要能容忍或 scoped 注入。
- 配置用 `@deepseek-ai/schemastery` schema；导出值名 `Config`，类型名建议 `PluginConfig`。
- 每个 listener / 定时器 / 注册项挂在插件 fiber：优先 `ctx.effect()` / `ctx.on()` / 注册返回的 disposer；disposal 后要可测。
- Waterfall 监听必须调用 `next()`。

## package.json / 清单硬约定

公开清单字段（对齐 0.2.2 契约）：

- `engines.node`、`engines.dsh`（SemVer **含 prerelease**；有 `engines.dsh` 时由它单独裁决兼容性）
- `dsh.manifestVersion`：当前公开格式为 `1`
- `dsh.bundle.patch`：相对包根的 patch 路径，或有序列表（同层按序应用）
- `dsh.client`（若有 Web 面）：`platform: 'web'`，可选 `inject` / `immediately` / `external`
- `exports` / `files` / `main` / `types` 与构建产物一致；发布前 `pnpm pack --dry-run --json` 核对文件列表

展示元数据（Plugin Manager 不激活包也能读）：

- 导出 `./locale/*.json`（至少 `meta.title` / `meta.description`；`en` 为发现入口）
- 顶层 `icon` 或导出 `./icon`（SVG/PNG/JPEG/WebP，≤256KiB，包内真实路径）

本仓库目标 `engines.dsh` 初稿：`>=0.2.2-0 <0.3.0`（对准本机 `0.2.2-rc.1`；若要兼容更早 0.2.x，再显式放宽并补回归）。

## 依赖分类（违反会炸运行时）

| 类别 | 放什么 |
| --- | --- |
| **peerDependencies** | 宿主提供的运行时：`@deepseek-ai/cordis`、`@deepseek-ai/schemastery`、以及消费的 `@deepseek-ai/dsh-*` |
| **dependencies** | 插件自己拥有并随包分发的库 |
| **devDependencies** | lint / test / build；以及对 peer 的可解析开发副本 |

**硬规则**：

- `@deepseek-ai/*` 宿主包 **只进 peer（+ 可选同名 dev）**，**绝不进 `dependencies`**。
- 原因：`dsh plugin add`（= pnpm）会把 `dependencies` 装进 profile `node_modules`，与宿主形成**双物理副本**；部分 Symbol 非 `Symbol.for()`，双副本互不认 → 工具调度等运行时崩溃。
- 0.2.x 勿用未加 scope 的 `cordis` / `schemastery` / `@cordisjs/plugin-loader`。
- 不要用 `link:` / `file:` 规格把宿主运行时塞进包；不要把 host runtime 打进 bundle。

安装后自检（在 **profile 目录** 下）：

```bash
node --input-type=module -e "
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
console.log(require.resolve('@deepseek-ai/dsh-tools'));
"
# 期望：解析到宿主 @deepseek-ai/dsh 安装树内的副本，而不是插件自己的嵌套副本
```

若 profile 下出现 `@deepseek-ai/*` 真副本：删掉副本，让 peer 回落宿主（常见诱因：误写 dependencies 或 `autoInstallPeers: true`）。

兼容性豁免（范围对不上宿主时）：

```bash
dsh plugin allow-version <包@精确版本> --dsh-version <精确版本> --accept-risk
# 撤销：dsh plugin revoke-version ...
```

豁免记在 profile 的 `compatibility.json`；**不**授权执行包的 build scripts。

## Bundle / cordis.patch.yml

- `dsh.bundle.patch` 指向的 YAML 是 **bundle 层**：`insert` 或按 `id` 覆盖；与 profile / home / CLI 层按序叠加。
- **按 id 覆盖会整段替换该行的 `config`**——要保留的字段必须重写一遍。
- 空文件无效；故意空层写 `[]`。
- `config` / `disabled` 可用 Loader 方言 `!!js`；`id` / `name` 保持字面量。
- 凭据不要写进 patch；用凭据引用或环境变量名。
- 包行 `name` 必须能被消费 profile 解析到。
- 针对不存在的 id 覆盖会在 stderr 警告——除非刻意缺席，视为组合失败。

本机 desktop 已装插件示例（可对照形态，勿抄业务）：`dsh-purge`、`dsh-context`、`@xmanrui/dsh-im`、`dshmarket` 等；用户层覆盖在 `~/.dsh/profiles/desktop/cordis.patch.yml`。

## 本地安装与迭代

```bash
# 开发构建后再装（file: 是真实副本，改代码必须 rebuild + 重装）
pnpm run build
dsh plugin --profile desktop remove @ron777/dsh-printer   # 版本/字节没变时 pnpm 可能复用缓存
dsh plugin --profile desktop add file:$PWD

# 确认配置树里出现本包
dsh --profile desktop --dump-config | grep -A3 'dsh-printer'
```

注意：

- **桌面版**优先用 App 自带 CLI（本机 `/usr/local/bin/dsh` 已指向 Harness runtime）；勿与另一份全局旧 `dsh` 混用。
- Git 频道安装会拉源码并可能跑 `prepare`；pnpm 10+ 默认拦 build scripts，需用户显式 allowBuilds。首装优先 **npm / 预构建 tarball**。
- 有 Web client 时：预构建 `./client`，改 client 源码后必须 rebuild + 重装 + 重启对应 UI 才生效；bundle 无 `harness.handle` 时，Client↔Host 走 webServer + 同源 fetch，并做好 loopback / 鉴权围栏。

## 质量门（加产品行为前先过基线）

```bash
pnpm install
pnpm run lint
pnpm test
pnpm run build
pnpm pack --dry-run --json
```

最低证据：Loader 导出形状、Config 默认值、可观察行为、fiber dispose。产品可见行为再补真实 profile 组装验证。

可选工具链（社区，非官方认证）：

- `dsh-plugin-guide` / `dsh-primer`：知识库 + `dsh-plugin-dev new|check|verify|seams`
- 官方侧也有 `cordis-plugin-development` 工作流精神：最小可证伪形态、效应归属、展示元数据 checklist

## 会话 / API 版本坑（0.1 → 0.2）

- 取会话事件：0.1.x 常见 `session.events`；0.2.x 多为 `session.snapshotEvents()`——封装一层兼容，勿假定单一形状。
- 0.2 世代还有 session format V4、settings 重建、invariant 移除、`readBytes`、slot 变更、`plugin` message source 退役等 seam；跨小版本前先查目标宿主源码或 migration 笔记。

## 仓库卫生

- 不提交 `node_modules/`、构建缓存、真实凭据、用户 `$DSH_HOME` 数据。
- 未经用户明确授权：不 commit / push / publish / 改 remote / 改全局 git config。
- 实现前先定：host-only / client-only / 双面；目录按能力拆分，不要为了「像模板」硬造空目录。

## 产品范围（待填）

- [ ] 打印对象：会话 transcript / 选中消息 / 任意文件 / PDF 预览？
- [ ] 出口：系统打印对话框（macOS）/ CUPS / 仅导出 PDF？
- [ ] 暴露面：agent tool、slash command、设置页、会话菜单？
- [ ] 是否需要 `dsh.client` Web UI？
- [ ] 目标 profile：仅 `desktop`，还是同时支持 `web`？

填完前，默认只 scaffold 契约与空 `apply`，不提前绑定打印后端。
`)