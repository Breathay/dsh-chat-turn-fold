# dsh-chat-turn-fold

DSH Web 插件：把对话展示对齐 Codex CLI / Codex Web 风格——

1. **连续工具调用合并为一个折叠框**：同一轮次内连续出现的工具调用收进一个折叠框；执行中头部直接显示当前工具本身的信息（工具名 + 关键参数，如 `read lib/client.js`，带旋转指示与工具图标），全部结束后显示 Codex 风格的动词+名词短语（如 `read files & write files`），图标取调用次数最多的工具类型。
2. **已结束的轮次折叠为摘要卡片**：任务结束后只展示「最后一条没有 tool_call 的总结段落」，并把 **耗时 · Token 合计** 一行（如 `耗时 30.2s · Total 34287 tokens`）放在卡片最上方；默认折叠，点击展开后显示该轮次的完整过程（中间步骤、工具调用、复制/分支按钮）。
3. **用户消息不折叠**：用户/插话消息始终完整显示在卡片外。
4. **箭头 Think 风格**：工具折叠框平时显示工具图标、轮次折叠框平时显示时钟图标，鼠标悬浮（或键盘聚焦）时图标原位变成向下箭头；箭头始终朝下、不随展开旋转。
5. **展开不跳动**：展开/收起折叠卡片时保持聊天滚动位置不动。
6. 折叠轮次内不再重复显示耗时行（耗时只在卡片头部出现一次）。

## 安装

### 方式一：npm 发布后（推荐）

```bash
dsh plugin --profile <你的profile名> add dsh-chat-turn-fold
```

`dsh plugin` 会把包安装进 profile 的 `node_modules`，并依据包内 `cordis.patch.yml`（`dsh.bundle.patch`）自动挂载插件行。重启 `dsh web` 后生效。

### 方式二：GitHub 直装（未发布 npm 时）

把本仓库加入你的 profile 依赖：

```bash
cd ~/.dsh/profiles/<你的profile名>
pnpm add "dsh-chat-turn-fold@github:<你的用户名>/dsh-chat-turn-fold"
```

然后在 profile 的 `package.json` 中把 `dsh-chat-turn-fold` 追加进 `dsh.profile.bundles` 数组，重启生效。

### 方式三：本地开发安装

```bash
cd ~/.dsh/profiles/<你的profile名>
pnpm add "dsh-chat-turn-fold@file:/路径/to/dsh-chat-turn-fold"
```

同样需要把包名追加进 `dsh.profile.bundles`，重启生效。

> 手动挂载（不依赖 bundle 通道）也可以：在 profile 的 `cordis.patch.yml` 里加：
> ```yaml
> - insert:
>     - id: chat-turn-fold
>       name: 'dsh-chat-turn-fold'
> ```

## 卸载

把 `dsh-chat-turn-fold` 从 profile 的依赖与 `dsh.profile.bundles`（或 `cordis.patch.yml`）中移除，重启即恢复原始界面。插件**不修改任何已安装文件**，卸载无残留。

## 兼容性

| dsh 版本 | 支持 |
|---|---|
| `0.1.1-rc.2` | ✅ 已验证 |

补丁是对 `@deepseek-ai/dsh-client-ui-conversation` 的 client bundle 做**字节精确锚点替换**。升级 dsh 后若锚点漂移，插件会**自动降级为原始界面**并在日志中告警（不会破坏 UI）——此时更新 `dsh-chat-turn-fold` 到支持新版本的版本即可。

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
        └─ 未挂载/版本不匹配/锚点漂移时 → 落回 dsh-client-modules 的原始 /plugins 前缀路由
```

补丁内容（全部在对话包内，不改任何 host 侧）：

1. `tailData` 增加轮次 token 合计（`Total`，= 轮次内各请求 billed input + output 之和）；
2. 插入折叠层：`buildGroups`（连续 tool-call → 工具组；已结束轮次 → 轮次组）、`ToolRunGroup`（「工具调用 (N)」）、`TurnGroup`（摘要卡片 + `TurnGroupContext`）；
3. `ChatView` 用组渲染替代逐节点渲染；
4. `TurnTailNodeView` 在折叠轮次内隐藏重复的耗时行（copy/branch 保留）；
5. 中英文案（`turn.summary` / `turn.ranFor` / `turn.toolCalls`）。

## 开发与验证

零依赖、无构建步骤，纯 ESM。离线验证补丁（不触碰线上文件）：

```bash
node scripts/verify-patch.mjs [bundle路径]
```

脚本断言每个锚点恰好命中一次、对副本执行 `node --check`、并检查关键标记是否存在。可在 CI 中运行。

## License

MIT
