# dsh-chat-turn-fold

[![npm version](https://img.shields.io/npm/v/dsh-chat-turn-fold)](https://www.npmjs.com/package/dsh-chat-turn-fold)
[![GitHub tag](https://img.shields.io/github/v/tag/Breathay/dsh-chat-turn-fold)](https://github.com/Breathay/dsh-chat-turn-fold)

DSH Web 插件：把对话展示对齐 Codex CLI / Codex Web 风格，让历史对话不再冗长——**连续工具调用合并折叠、已结束的轮次折叠成摘要卡片**。

- 零依赖、纯 ESM、无构建步骤
- **不修改任何已安装文件**（serve-time 补丁），卸载即恢复原样
- 兼容 dsh `0.1.1-rc.2`（见[兼容性](#兼容性)）

---

## 功能

### 🧰 工具调用折叠

- **连续 ≥2 个工具调用**合并为一个折叠框；**单个工具调用不折叠**，正常显示工具卡片
- **执行中**：头部直接显示当前工具本身的信息（工具名 + 关键参数，如 `read lib/client.js`）和旋转指示；图标跟随正在运行的工具
- **结束后**：显示 Codex 风格的动词 + 名词短语（如 `read files & write files & run shell`）；图标取该组中调用次数最多的工具类型
- **Think 式箭头**：平时显示工具图标，鼠标悬浮（或键盘聚焦）时图标原位变成向下箭头；箭头始终朝下、不随展开旋转

### 📋 轮次摘要折叠

- 已结束的轮次折叠为摘要卡片：**`耗时 X · Total Y tokens`**（如 `耗时 30.2s · Total 34287 tokens`）置于卡片顶部，下方只展示最终总结段落（最后一条无 tool_call 的文本）
- **用户消息不折叠**：用户/插话消息始终完整显示在卡片外
- 点击展开后显示该轮次的完整过程（中间步骤、工具调用、复制/分支按钮）
- **展开/收起保持聊天滚动位置不动**
- 折叠轮次内不再重复显示耗时行（耗时只在卡片头部出现一次）

### 🖼️ 效果示意

```
[用户消息] ……
┌ 耗时 30.2s · Total 34287 tokens          ▼(悬浮时) ┐
│ 已完成 xxx：……（最终总结段落，无背景无边框）          │
└──────────────────────────────────────────────┘
[read files & write files]                ← 工具折叠框（图标悬浮变箭头）
```

---

## 安装

### 方式一：npm 发布版（推荐）

```bash
dsh plugin --profile <你的profile名> add dsh-chat-turn-fold
```

`dsh plugin` 会把包安装进 profile 的 `node_modules`，并依据包内 `cordis.patch.yml`（`dsh.bundle.patch`）自动挂载插件行。重启 `dsh web` 后生效。

### 方式二：GitHub 直装（未发布 npm 时 / 想用最新源码）

```bash
cd ~/.dsh/profiles/<你的profile名>
pnpm add "dsh-chat-turn-fold@github:Breathay/dsh-chat-turn-fold"
```

然后在 profile 的 `package.json` 中把 `dsh-chat-turn-fold` 追加进 `dsh.profile.bundles` 数组，重启生效。

### 方式三：本地开发安装

```bash
cd ~/.dsh/profiles/<你的profile名>
pnpm add "dsh-chat-turn-fold@file:/路径/to/dsh-chat-turn-fold"
```

同样需要把包名追加进 `dsh.profile.bundles`。

> 手动挂载（不依赖 bundle 通道）也可以：在 profile 的 `cordis.patch.yml` 里加：
>
> ```yaml
> - insert:
>     - id: chat-turn-fold
>       name: 'dsh-chat-turn-fold'
> ```

---

## 卸载

把 `dsh-chat-turn-fold` 从 profile 的依赖与 `dsh.profile.bundles`（或 `cordis.patch.yml`）中移除，重启即恢复原始界面。插件**不修改任何已安装文件**，卸载无残留。

---

## 兼容性

| dsh 版本 | 支持 |
| --- | --- |
| `0.1.1-rc.2` | ✅ 已验证 |

补丁是对 `@deepseek-ai/dsh-client-ui-conversation` 的 client bundle 做**字节精确锚点替换**。升级 dsh 后若锚点漂移，插件会**自动降级为原始界面**并在日志中告警（不会破坏 UI）——此时更新 `dsh-chat-turn-fold` 到支持新版本的版本即可。

---

## 工作原理

DSH 的对话流渲染（`ChatView` → 节点行）没有对外暴露容器级 Slot，因此本插件采用 **serve-time bundle patch** 方案：

```
浏览器 GET /plugins/@deepseek-ai/dsh-client-ui-conversation/client.js?rev=…
        │
        ▼
webServer 路由匹配（exact 表优先于前缀表）
        │
        ├─ 本插件的 exact 路由（已挂载时）
        │     读取原始 bundle → 应用 patches/conversation-fold.js 的 8 处替换
        │     → 返回补丁后内容（text/javascript, no-cache）
        │
        └─ 未挂载 / 版本不匹配 / 锚点漂移时 → 落回 dsh-client-modules 的原始 /plugins 前缀路由
```

关键设计：

- **不落盘**：补丁只在响应时应用，磁盘上的 bundle 始终保持原样
- **按请求重读补丁表**：修改 `patches/conversation-fold.js` 后**刷新页面即可生效**，无需重启 harness（ESM 缓存用查询串破除）
- **fail-open**：版本不匹配或锚点漂移时只告警、不注册路由，原始界面照常工作
- 补丁内容全部在对话包内：轮次 token 合计、折叠层（`buildGroups` / `ToolRunGroup` / `TurnGroup` / `TurnGroupContext`）、ChatView 组渲染、尾部耗时去重、中英文案

---

## 开发与验证

```bash
npm run verify            # 或 node scripts/verify-patch.mjs [bundle路径]
```

验证脚本：断言每个锚点恰好命中一次、对补丁产物执行 `node --check`、检查关键标记是否存在。可在 CI 中运行，保证升级 dsh 后能第一时间发现锚点漂移。

---

## FAQ

**升级 dsh 后折叠失效了？**
锚点随版本漂移，插件会 fail-open 退回原始界面并告警。更新 `dsh-chat-turn-fold` 到支持新版本的版本即可（`dsh plugin --profile <name> update dsh-chat-turn-fold`）。

**它和 patch-package 有什么区别？**
patch-package 直接改写磁盘上的 node_modules 文件；本插件在**响应时**应用补丁，磁盘零修改，卸载即完全恢复。

**想调整显示细节（字号、文案、图标）？**
编辑 `patches/conversation-fold.js` 里的折叠层代码 → 浏览器刷新即可看到，无需重启。

**为什么是 8 处字符串替换而不是一个完整插件？**
对话流渲染没有对外容器级 Slot，重写整个会话视图不现实；字节精确补丁是最小侵入、可验证、可降级的方案。

---

## License

[MIT](./LICENSE)
