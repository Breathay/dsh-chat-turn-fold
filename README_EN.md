# dsh-chat-turn-fold

[![npm version](https://img.shields.io/npm/v/dsh-chat-turn-fold)](https://www.npmjs.com/package/dsh-chat-turn-fold)
[![GitHub tag](https://img.shields.io/github/v/tag/Breathay/dsh-chat-turn-fold)](https://github.com/Breathay/dsh-chat-turn-fold)

A DSH web plugin that brings Codex-style conversation display to the DeepSeek Harness web GUI: **consecutive tool calls fold into one collapsible box, and each finished turn collapses into a summary card**.

- Zero dependencies, pure ESM, no build step
- **Does not modify any installed file** (serve-time patching) — uninstalling restores the original UI
- Verified against dsh `0.1.1-rc.2` (see [Compatibility](#compatibility))

---

## Features

### 🧰 Tool-call folding

- **Runs of 2+ consecutive tool calls** merge into one collapsible box; a **single tool call is not folded** and renders as a normal tool card
- **While running**: the header shows the current tool's own info (name + key argument, e.g. `read lib/client.js`) with a spinner; the icon follows the running tool
- **After completion**: the header shows Codex-style verb + noun phrases (e.g. `read files & write files & run shell`); the icon is taken from the most-called tool type in the group
- **Think-style chevron**: the tool icon is shown normally; on hover (or keyboard focus) it is replaced in place by the down chevron, which always points down and never rotates

### 📋 Turn-summary folding

- Each finished turn collapses into a summary card: a **`Time X · Total Y tokens`** line (e.g. `Time 30.2s · Total 34287 tokens`) sits on top, followed by the final summary paragraph (the last text block without tool calls)
- **User messages are never folded** — they always stay fully visible outside the card
- Clicking expands the full turn process (intermediate steps, tool calls, copy/branch actions)
- **Expanding/collapsing keeps the chat scroll position anchored**
- Inside a folded turn the tail no longer repeats the timing line (it appears only in the card header)

### 🖼️ Sketch

```
[user message] ……
┌ Time 30.2s · Total 34287 tokens          ▼(on hover) ┐
│ Done: …… (final summary paragraph, no bg, no border)  │
└───────────────────────────────────────────────────────┘
[read files & write files]                ← tool fold box (icon → chevron on hover)
```

---

## Installation

### Option 1: npm (recommended)

```bash
dsh plugin --profile <your-profile> add dsh-chat-turn-fold
```

`dsh plugin` installs the package into the profile's `node_modules` and mounts the plugin row automatically through the package's `cordis.patch.yml` (`dsh.bundle.patch`). Restart `dsh web` to activate.

### Option 2: straight from GitHub

```bash
cd ~/.dsh/profiles/<your-profile>
pnpm add "dsh-chat-turn-fold@github:Breathay/dsh-chat-turn-fold"
```

Then append `dsh-chat-turn-fold` to the `dsh.profile.bundles` array in the profile's `package.json` and restart.

### Option 3: local development

```bash
cd ~/.dsh/profiles/<your-profile>
pnpm add "dsh-chat-turn-fold@file:/path/to/dsh-chat-turn-fold"
```

Same as option 2: append the package name to `dsh.profile.bundles`.

> Manual mount (without the bundle channel) also works — add this to the profile's `cordis.patch.yml`:
>
> ```yaml
> - insert:
>     - id: chat-turn-fold
>       name: 'dsh-chat-turn-fold'
> ```

---

## Uninstall

Remove `dsh-chat-turn-fold` from the profile's dependencies and `dsh.profile.bundles` (or `cordis.patch.yml`), then restart. The plugin never writes to disk, so there is nothing left to clean up.

---

## Compatibility

| dsh version | Status |
| --- | --- |
| `0.1.1-rc.2` | ✅ verified |

The patch performs **byte-exact anchor replacements** on the `@deepseek-ai/dsh-client-ui-conversation` client bundle. If anchors drift after a dsh upgrade, the plugin **degrades gracefully to the original UI** and logs a warning (it never breaks the UI) — simply update `dsh-chat-turn-fold` to a version supporting your dsh release.

---

## How it works

The conversation flow renderer (`ChatView` → node rows) exposes no container-level Slot, so this plugin uses a **serve-time bundle patch**:

```
browser GET /plugins/@deepseek-ai/dsh-client-ui-conversation/client.js?rev=…
        │
        ▼
webServer route matching (exact table wins over prefix table)
        │
        ├─ this plugin's exact route (when mounted)
        │     reads the original bundle → applies the 8 replacements from
        │     patches/conversation-fold.js → serves the patched text
        │     (text/javascript, no-cache)
        │
        └─ not mounted / unsupported version / drifted anchor → falls back to
           dsh-client-modules' original /plugins prefix route
```

Key design decisions:

- **No disk writes**: the patch is applied only when serving; the bundle on disk stays untouched
- **Per-request patch-table re-import**: editing `patches/conversation-fold.js` takes effect after a browser refresh — no harness restart (the ESM cache is busted with a query string)
- **Fail-open**: an unsupported version or drifted anchor only logs a warning and skips the route; the original UI keeps working
- Everything happens inside the conversation bundle: per-turn token totals, the folding layer (`buildGroups` / `ToolRunGroup` / `TurnGroup` / `TurnGroupContext`), ChatView group rendering, tail-timing dedup, and zh/en strings

---

## Development & verification

```bash
npm run verify            # or: node scripts/verify-patch.mjs [bundle-path]
```

The verifier asserts every anchor matches exactly once, runs `node --check` on the patched output, and checks for expected markers. It is CI-friendly and catches anchor drift as soon as a dsh upgrade lands.

---

## FAQ

**Folding stopped working after upgrading dsh?**
Anchors drift across versions; the plugin fail-opens to the original UI and logs a warning. Update `dsh-chat-turn-fold` to the version supporting your dsh release (`dsh plugin --profile <name> update dsh-chat-turn-fold`).

**How is this different from patch-package?**
patch-package rewrites the installed files on disk; this plugin applies the patch **at response time** — zero disk mutation, and uninstalling restores everything instantly.

**Want to tweak the UI (font size, labels, icons)?**
Edit the folding layer inside `patches/conversation-fold.js` → refresh the browser page to see it. No restart needed.

**Why 8 string replacements instead of a full plugin?**
The conversation flow exposes no container-level Slot and rewriting the whole session view is impractical; byte-exact patching is the least invasive, verifiable, and gracefully degradable approach.

---

## License

[MIT](./LICENSE)
