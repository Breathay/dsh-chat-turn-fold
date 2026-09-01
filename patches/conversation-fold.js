/**
 * dsh-chat-turn-fold — patch table for the @deepseek-ai/dsh-client-ui-conversation
 * client bundle.
 *
 * The host plugin (`lib/index.js`) reads the shipped bundle text, applies these
 * byte-exact string replacements at serve time, and answers the bundle route
 * with the patched text. Every `before` anchor MUST occur exactly once in the
 * target bundle; the patcher verifies that and fails loudly (serving the
 * original bundle) when the target dsh version drifts.
 *
 * All anchors were extracted verbatim from
 * `@deepseek-ai/dsh-client-ui-conversation@0.1.1-rc.2/lib/client.js`
 * (LF line endings, tab indentation, no BOM).
 */

/** The npm package whose client bundle is patched. */
export const TARGET_PACKAGE = "@deepseek-ai/dsh-client-ui-conversation";

/** dsh versions whose bundle these anchors match (extend as versions ship). */
export const SUPPORTED = ["0.1.1-rc.2"];

/**
 * The UI code inserted right after the ChatNodeSeat region, before the
 * `ChatView.js` region: a Codex-style folding layer over the chat flow.
 *
 * - `buildGroups` folds consecutive `tool-call` nodes into one group, and
 *   folds every settled turn (a turn-tail node with closing text exists) into
 *   one turn group; user/steering messages stay visible OUTSIDE the fold and
 *   other nodes stay single rows.
 * - `ToolRunGroup` renders one collapsible box for a run of tool calls. While
 *   a member is still running, its header shows that tool's own info (name +
 *   key argument) with a spinner and the tool's icon; once every call settles
 *   it shows Codex-style verb+noun phrases (e.g. "read files & write files")
 *   and the most-called tool type's icon. On hover the leading icon becomes
 *   the down chevron (Think style), which never rotates.
 * - `TurnGroup` renders the collapsed turn summary: a header line with the
 *   turn's wall time and total tokens on top, plus the final assistant text
 *   (closing blocks, no tool calls); expanding reveals the full process with
 *   tool calls grouped inside, wrapped in `TurnGroupContext` so the turn-tail
 *   actions row suppresses its own duplicate timing line.
 * - Toggling either group keeps the chat's scroll position anchored to the
 *   header row.
 */
const FOLD_LAYER = `\t\t//#region dsh-chat-turn-fold: Codex-style flow folding (patched in by dsh-chat-turn-fold)
\t\tconst TurnGroupContext = react.createContext(false);
\t\tconst turnFoldCss = ".tf1_turnRoot{flex-direction:column;gap:4px;min-width:0;display:flex}.tf1_turnHeader{text-align:left;cursor:pointer;background:0 0;border:none;align-items:center;gap:8px;width:100%;padding:0;display:flex}.tf1_turnMeta{min-width:0;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;text-overflow:ellipsis;flex:auto;font-size:12px;line-height:20px;white-space:nowrap;overflow:hidden}.tf1_chevron{color:var(--dsw-alias-label-tertiary);opacity:0;flex:none;transition:opacity .12s ease;display:grid;place-items:center}.tf1_turnHeader:hover .tf1_chevron,.tf1_turnHeader:focus-visible .tf1_chevron{opacity:1}.tf1_lead{flex:none;width:14px;height:14px;display:grid;place-items:center;position:relative}.tf1_lead>.tf1_leadIcon,.tf1_lead>.tf1_chevron{grid-area:1/1;transition:opacity .12s ease}.tf1_spin{color:var(--dsw-alias-state-business-primary);animation:1s linear infinite tf1_tool-spin;flex:none;display:grid;place-items:center}@keyframes tf1_tool-spin{to{transform:rotate(360deg)}}.tf1_summary{flex-direction:column;gap:6px;min-width:0;display:flex}.tf1_body{flex-direction:column;gap:8px;min-width:0;display:flex}.tf1_toolRoot{flex-direction:column;gap:2px;min-width:0;display:flex}.tf1_toolHeader{text-align:left;cursor:pointer;background:0 0;border:none;align-items:center;gap:8px;width:100%;padding:2px 0;display:flex}.tf1_leadIcon{color:var(--dsw-alias-label-secondary);opacity:1}.tf1_toolHeader:hover .tf1_chevron,.tf1_toolHeader:focus-visible .tf1_chevron{opacity:1}.tf1_turnHeader:hover .tf1_chevron,.tf1_turnHeader:focus-visible .tf1_chevron{opacity:1}.tf1_toolHeader:hover .tf1_leadIcon,.tf1_toolHeader:focus-visible .tf1_leadIcon{opacity:0}.tf1_turnHeader:hover .tf1_leadIcon,.tf1_turnHeader:focus-visible .tf1_leadIcon{opacity:0}.tf1_toolTitle{min-width:0;color:var(--dsw-alias-label-secondary);text-overflow:ellipsis;white-space:nowrap;flex:auto;font-size:14px;font-weight:500;line-height:24px;overflow:hidden}.tf1_toolList{flex-direction:column;gap:8px;min-width:0;display:flex}";
\t\tconst turnFoldCssTag = "@deepseek-ai/dsh-chat-turn-fold/TurnFold.module.css";
\t\tif (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(turnFoldCssTag) + "]") === null) {
\t\t\tconst tag = document.createElement("style");
\t\t\ttag.dataset.plugin = "@deepseek-ai/dsh-chat-turn-fold";
\t\t\ttag.dataset.pluginCss = turnFoldCssTag;
\t\t\ttag.textContent = turnFoldCss;
\t\t\tdocument.head.appendChild(tag);
\t\t}
\t\tvar TurnFold_module_css_default = {
\t\t\t"body": "tf1_body",
\t\t\t"chevron": "tf1_chevron",
\t\t\t"lead": "tf1_lead",
\t\t\t"spin": "tf1_spin",
\t\t\t"summary": "tf1_summary",
\t\t\t"toolHeader": "tf1_toolHeader",
\t\t\t"leadIcon": "tf1_leadIcon",
\t\t\t"toolList": "tf1_toolList",
\t\t\t"toolRoot": "tf1_toolRoot",
\t\t\t"toolTitle": "tf1_toolTitle",
\t\t\t"turnHeader": "tf1_turnHeader",
\t\t\t"turnMeta": "tf1_turnMeta",
\t\t\t"turnRoot": "tf1_turnRoot"
\t\t};
\t\t/** Turn number of any chat node (uniform accessor over the location index). */
\t\tfunction turnOfNode(node) {
\t\t\treturn locationCoordinates(node.location).turn;
\t\t}
\t\t/** Sum the turn's request usage (billed input + output) into one Total figure; null when no step reports usage. */
\t\tfunction turnTokenTotal(finalized) {
\t\t\tlet total = 0;
\t\t\tlet saw = false;
\t\t\tfor (const candidate of finalized) {
\t\t\t\tconst usage = candidate?.finalNode?.usage;
\t\t\t\tif (usage === void 0 || usage === null || typeof usage !== "object") continue;
\t\t\t\tconst input = billedInputTokens(usage);
\t\t\t\tif (!Number.isFinite(input) || !Number.isFinite(usage.outputTokens)) continue;
\t\t\t\ttotal += input + usage.outputTokens;
\t\t\t\tsaw = true;
\t\t\t}
\t\t\treturn saw ? total : null;
\t\t}
\t\t/** Fold the ordered node keys into flow groups: singles, consecutive tool runs, and settled turns. */
\t\tfunction buildGroups(order, nodes, foldTurns = true) {
\t\t\tconst tails = /* @__PURE__ */ new Map();
\t\t\tfor (const key of order) {
\t\t\t\tconst node = nodes.get(key);
\t\t\t\tif (node === void 0 || node.kind !== "turn-tail") continue;
\t\t\t\tconst closing = node.data?.closing;
\t\t\t\tif (closing === null || closing === void 0) continue;
\t\t\t\ttails.set(node.data.turn, key);
\t\t\t}
\t\t\tconst groups = [];
\t\t\tlet current = null;
\t\t\tconst close = () => {
\t\t\t\tif (current === null) return;
\t\t\t\tif (current.type === "tool-run" && current.keys.length === 1) groups.push({ type: "single", key: current.keys[0] });
\t\t\t\telse groups.push(current);
\t\t\t\tcurrent = null;
\t\t\t};
\t\t\tfor (const key of order) {
\t\t\t\tconst node = nodes.get(key);
\t\t\t\tif (node === void 0) {
\t\t\t\t\tclose();
\t\t\t\t\tgroups.push({ type: "single", key });
\t\t\t\t\tcontinue;
\t\t\t\t}
\t\t\t\tconst turn = turnOfNode(node);
\t\t\t\tconst tailKey = turn === void 0 ? void 0 : tails.get(turn);
\t\t\t\tconst inSettledTurn = foldTurns && tailKey !== void 0;
\t\t\t\tif (inSettledTurn && (node.kind === "user" || node.kind === "steering")) {
\t\t\t\t\t/* User text stays visible OUTSIDE the folded turn card; an open
\t\t\t\t\tturn buffer below it remains open so the rest folds as one card. */
\t\t\t\t\tif (current === null || current.type !== "turn" || current.tailKey !== tailKey) close();
\t\t\t\t\tgroups.push({ type: "single", key });
\t\t\t\t\tcontinue;
\t\t\t\t}
\t\t\t\tif (inSettledTurn) {
\t\t\t\t\tif (current === null || current.type !== "turn" || current.tailKey !== tailKey) {
\t\t\t\t\t\tclose();
\t\t\t\t\t\tcurrent = { type: "turn", keys: [], tailKey };
\t\t\t\t\t}
\t\t\t\t\tcurrent.keys.push(key);
\t\t\t\t\tcontinue;
\t\t\t\t}
\t\t\t\tif (node.kind === "tool-call") {
\t\t\t\t\tif (current === null || current.type !== "tool-run") {
\t\t\t\t\t\tclose();
\t\t\t\t\t\tcurrent = { type: "tool-run", keys: [] };
\t\t\t\t\t}
\t\t\t\t\tcurrent.keys.push(key);
\t\t\t\t\tcontinue;
\t\t\t\t}
\t\t\t\tclose();
\t\t\t\tgroups.push({ type: "single", key });
\t\t\t}
\t\t\tclose();
\t\t\treturn groups;
\t\t}
\t\t/** Render one flow group; used at the top level and recursively inside an expanded turn. */
\t\tfunction renderFlowGroup(group, seatProps) {
\t\t\tif (group.type === "tool-run") return (0, react_jsx_runtime.jsx)(ToolRunGroup, { ...seatProps, keys: group.keys }, group.keys[0]);
\t\t\tif (group.type === "turn") return (0, react_jsx_runtime.jsx)(TurnGroup, { ...seatProps, keys: group.keys, tailKey: group.tailKey }, group.keys[0]);
\t\t\treturn (0, react_jsx_runtime.jsx)(ChatNodeSeat, { ...seatProps, nodeKey: group.key }, group.key);
\t\t}
\t\t/** Per-tool icon mirroring the tool cards; the fold header follows the running tool, then the dominant one. */
\t\tfunction toolIconOf(name) {
\t\t\tif (typeof name !== "string" || name === "") return _deepseek_ai_dsh_client_ui_primitives.IconApiOutline14;
\t\t\tif (name.startsWith("cordis_")) return _deepseek_ai_dsh_client_ui_primitives.IconCordisPluginOutline14;
\t\t\tswitch (name) {
\t\t\t\tcase "read":
\t\t\t\tcase "web_fetch":
\t\t\t\t\treturn _deepseek_ai_dsh_client_ui_primitives.IconBrowseOutline16;
\t\t\t\tcase "grep":
\t\t\t\tcase "glob":
\t\t\t\t\treturn _deepseek_ai_dsh_client_ui_primitives.IconSearchOutline16;
\t\t\t\tcase "write":
\t\t\t\tcase "edit":
\t\t\t\t\treturn _deepseek_ai_dsh_client_ui_primitives.IconEditOutline16;
\t\t\t\tcase "bash":
\t\t\t\tcase "pwsh":
\t\t\t\t\treturn _deepseek_ai_dsh_client_ui_primitives.IconApiOutline14;
\t\t\t\tcase "web_search":
\t\t\t\t\treturn _deepseek_ai_dsh_client_ui_primitives.IconGlobeOutline14;
\t\t\t\tcase "todo_write":
\t\t\t\t\treturn _deepseek_ai_dsh_client_ui_primitives.IconChecklistOutline14;
\t\t\t\tcase "ask_user_question":
\t\t\t\t\treturn _deepseek_ai_dsh_client_ui_primitives.IconQuestionOutline14;
\t\t\t\tcase "skill":
\t\t\t\t\treturn _deepseek_ai_dsh_client_ui_primitives.IconSkillOutline16;
\t\t\t\tcase "subagent":
\t\t\t\tcase "subagent_fork":
\t\t\t\t\treturn _deepseek_ai_dsh_client_ui_primitives.IconAgentPresetOutline16;
\t\t\t\tcase "goal":
\t\t\t\t\treturn _deepseek_ai_dsh_client_ui_primitives.IconGoalOutline16;
\t\t\t\tdefault:
\t\t\t\t\treturn _deepseek_ai_dsh_client_ui_primitives.IconApiOutline14;
\t\t\t}
\t\t}
\t\t/** Small clock glyph for the turn-summary header (no clock icon ships in the primitives set). */
\t\tconst TurnTimeIcon = (0, react.memo)(function TurnTimeIcon({ size = 14, className }) {
\t\t\treturn (0, react_jsx_runtime.jsx)("svg", {
\t\t\t\twidth: size,
\t\t\t\theight: size,
\t\t\t\tviewBox: "0 0 14 14",
\t\t\t\tfill: "none",
\t\t\t\tclassName,
\t\t\t\tchildren: [
\t\t\t\t\t(0, react_jsx_runtime.jsx)("circle", { cx: 7, cy: 7, r: 5.5, stroke: "currentColor" }),
\t\t\t\t\t(0, react_jsx_runtime.jsx)("path", { d: "M7 3.8v3.4l2.4 1.4", stroke: "currentColor", "stroke-linecap": "round", "stroke-linejoin": "round" })
\t\t\t\t]
\t\t\t});
\t\t});
\t\t/** The wire tool name of one tool-call root. */
\t\tfunction toolNameOf(root) {
\t\t\treturn root?.call?.name ?? root?.name;
\t\t}
\t\t/** The tool's own info while running: name plus its most meaningful argument (path, query, command…). */
\t\tfunction toolRunArgsLabel(root) {
\t\t\tconst name = toolNameOf(root);
\t\t\tif (typeof name !== "string" || name === "") return null;
\t\t\tconst target = toolRunTarget(root?.call?.argsRaw ?? root?.argsRaw);
\t\t\treturn target === null ? name : \`\${name} \${target}\`;
\t\t}
\t\tfunction toolRunTarget(argsRaw) {
\t\t\tif (typeof argsRaw !== "string") return null;
\t\t\tlet args;
\t\t\ttry {
\t\t\t\targs = JSON.parse(argsRaw);
\t\t\t} catch {
\t\t\t\treturn null;
\t\t\t}
\t\t\tif (args === null || typeof args !== "object" || Array.isArray(args)) return null;
\t\t\tconst keys = ["file_path", "filePath", "path", "name", "query", "queries", "command", "url", "pattern", "package", "prompt", "description", "question", "title"];
\t\t\tfor (const key of keys) {
\t\t\t\tconst value = args[key];
\t\t\t\tif (typeof value === "string" && value.trim() !== "") return shortenText(value.trim());
\t\t\t\tif (Array.isArray(value) && value.length > 0 && typeof value[0] === "string" && value[0].trim() !== "") return shortenText(value[0].trim());
\t\t\t}
\t\t\treturn null;
\t\t}
\t\tfunction shortenText(value) {
\t\t\tconst norm = value.replace(/\\\\/g, "/");
\t\t\tif (norm.includes("/")) {
\t\t\t\tconst parts = norm.split("/").filter((part) => part !== "");
\t\t\t\tconst tail = parts.slice(-2).join("/");
\t\t\t\treturn tail.length > 48 ? parts[parts.length - 1] : tail;
\t\t\t}
\t\t\treturn value.length > 48 ? \`\${value.slice(0, 48)}…\` : value;
\t\t}
\t\t/** Codex-style phrase for one tool call: verb + target noun, no arguments. */
\t\tfunction toolRunName(root) {
\t\t\tconst name = toolNameOf(root);
\t\t\tif (typeof name !== "string" || name === "") return null;
\t\t\tswitch (name) {
\t\t\t\tcase "read": return "read files";
\t\t\t\tcase "write": return "write files";
\t\t\t\tcase "edit": return "edit files";
\t\t\t\tcase "grep": return "search files";
\t\t\t\tcase "glob": return "find files";
\t\t\t\tcase "web_search": return "search web";
\t\t\t\tcase "web_fetch": return "fetch web";
\t\t\t\tcase "bash":
\t\t\t\tcase "pwsh": return "run shell";
\t\t\t\tcase "skill": return "load skill";
\t\t\t\tcase "subagent":
\t\t\t\tcase "subagent_fork": return "run subagent";
\t\t\t\tcase "todo_write": return "update todos";
\t\t\t\tcase "ask_user_question": return "ask question";
\t\t\t\tcase "goal": return "update goal";
\t\t\t\tcase "jobs": return "manage jobs";
\t\t\t\tcase "cordis_define": return "define plugin";
\t\t\t\tdefault: return name.startsWith("cordis_") ? "manage plugin" : name;
\t\t\t}
\t\t}
\t\t/** Toggle a fold header while keeping the chat scroll anchored to that row. */
\t\tfunction toggleFold(headerRef, setOpen) {
\t\t\tconst el = headerRef.current;
\t\t\tconst scrollport = el === null ? null : (el.closest("[data-conversation-scroll]") ?? el.closest("[data-chat-flow]")?.parentElement ?? el);
\t\t\tconst before = el === null || scrollport === null ? null : el.getBoundingClientRect().top - scrollport.getBoundingClientRect().top;
\t\t\tsetOpen((value) => !value);
\t\t\tif (before === null) return;
\t\t\twindow.setTimeout(() => {
\t\t\t\tif (headerRef.current === null || scrollport === null) return;
\t\t\t\tconst after = headerRef.current.getBoundingClientRect().top - scrollport.getBoundingClientRect().top;
\t\t\t\tscrollport.scrollTop += after - before;
\t\t\t}, 0);
\t\t}
\t\t/** One collapsible box for a consecutive run of tool calls. */
\t\tconst ToolRunGroup = (0, react.memo)(function ToolRunGroup({ keys, useSession, nodeStore, selectedCallId, cwd, openFile, inspectCall, forkAt, renderMessageImages, fileMentions, renderSlot, t }) {
\t\t\tconst [open, setOpen] = (0, react.useState)(false);
\t\t\tconst headerRef = (0, react.useRef)(null);
\t\t\tconst reading = (0, react.useMemo)(() => {
\t\t\t\tconst labels = [];
\t\t\t\tconst counts = /* @__PURE__ */ new Map();
\t\t\t\tlet runningLabel = null;
\t\t\t\tlet runningName = null;
\t\t\t\tfor (const key of keys) {
\t\t\t\t\tconst root = nodeStore.get(key)?.data?.root;
\t\t\t\t\tconst name = toolNameOf(root);
\t\t\t\t\tconst label = toolRunName(root);
\t\t\t\t\tconst argsLabel = toolRunArgsLabel(root);
\t\t\t\t\tif (label !== null && !labels.includes(label)) labels.push(label);
\t\t\t\t\tif (typeof name === "string" && name !== "") counts.set(name, (counts.get(name) ?? 0) + 1);
\t\t\t\t\tif (root === void 0 || root.kind !== "tool-result") {
\t\t\t\t\t\trunningLabel = argsLabel;
\t\t\t\t\t\trunningName = name;
\t\t\t\t\t}
\t\t\t\t}
\t\t\t\tlet dominant = null;
\t\t\t\tlet best = 0;
\t\t\t\tfor (const [name, count] of counts) if (count > best) {
\t\t\t\t\tbest = count;
\t\t\t\t\tdominant = name;
\t\t\t\t}
\t\t\t\treturn { labels, runningLabel, runningName, dominant };
\t\t\t}, [keys, nodeStore]);
\t\t\tlet title;
\t\t\tif (reading.runningLabel !== void 0 && reading.runningLabel !== null) title = reading.runningLabel;
\t\t\telse if (reading.labels.length > 0) title = reading.labels.join(" & ");
\t\t\telse title = t("turn.toolCalls", { count: keys.length });
\t\t\tconst iconTool = reading.runningName !== void 0 && reading.runningName !== null ? reading.runningName : reading.dominant;
\t\t\tconst ToolIcon = toolIconOf(iconTool);
\t\t\treturn (0, react_jsx_runtime.jsxs)("div", {
\t\t\t\tclassName: ChatView_module_css_default.flowItem + " " + TurnFold_module_css_default.toolRoot,
\t\t\t\t"data-chat-anchor-key": keys[0],
\t\t\t\t"data-chat-flow-key": keys[0],
\t\t\t\t"data-chat-flow-kind": "tool-run",
\t\t\t\tchildren: [
\t\t\t\t\t(0, react_jsx_runtime.jsx)("button", {
\t\t\t\t\t\ttype: "button",
\t\t\t\t\t\tref: headerRef,
\t\t\t\t\t\tclassName: TurnFold_module_css_default.toolHeader,
\t\t\t\t\t\t"aria-expanded": open,
\t\t\t\t\t\tonClick: () => toggleFold(headerRef, setOpen),
\t\t\t\t\t\tchildren: [
\t\t\t\t\t\t\t(0, react_jsx_runtime.jsx)("span", {
\t\t\t\t\t\t\t\tclassName: TurnFold_module_css_default.lead,
\t\t\t\t\t\t\t\tchildren: [
\t\t\t\t\t\t\t\t\t(0, react_jsx_runtime.jsx)(ToolIcon, {
\t\t\t\t\t\t\t\t\t\tsize: 14,
\t\t\t\t\t\t\t\t\t\tclassName: TurnFold_module_css_default.leadIcon
\t\t\t\t\t\t\t\t\t}),
\t\t\t\t\t\t\t\t\t(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, {
\t\t\t\t\t\t\t\t\t\tsize: 14,
\t\t\t\t\t\t\t\t\t\tclassName: TurnFold_module_css_default.chevron
\t\t\t\t\t\t\t\t\t})
\t\t\t\t\t\t\t\t]
\t\t\t\t\t\t\t}),
\t\t\t\t\t\t\t(0, react_jsx_runtime.jsx)("span", { className: TurnFold_module_css_default.toolTitle, children: title }),
\t\t\t\t\t\t\treading.runningLabel !== void 0 && reading.runningLabel !== null && (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconLoadingOutline16, {
\t\t\t\t\t\t\t\tsize: 14,
\t\t\t\t\t\t\t\tclassName: TurnFold_module_css_default.spin
\t\t\t\t\t\t\t})
\t\t\t\t\t\t]
\t\t\t\t\t}),
\t\t\t\t\topen && (0, react_jsx_runtime.jsx)("div", {
\t\t\t\t\t\tclassName: TurnFold_module_css_default.toolList,
\t\t\t\t\t\tchildren: keys.map((key) => (0, react_jsx_runtime.jsx)(ChatNodeSeat, {
\t\t\t\t\t\t\tnodeKey: key,
\t\t\t\t\t\t\tuseSession,
\t\t\t\t\t\t\tselectedCallId,
\t\t\t\t\t\t\tcwd,
\t\t\t\t\t\t\topenFile,
\t\t\t\t\t\t\tinspectCall,
\t\t\t\t\t\t\tforkAt,
\t\t\t\t\t\t\trenderMessageImages,
\t\t\t\t\t\t\tfileMentions,
\t\t\t\t\t\t\trenderSlot,
\t\t\t\t\t\t\tt
\t\t\t\t\t\t}, key))
\t\t\t\t\t})
\t\t\t\t]
\t\t\t});
\t\t});
\t\t/** One collapsed turn: time/token header on top, final summary text when folded, full process when open. */
\t\tconst TurnGroup = (0, react.memo)(function TurnGroup({ keys, tailKey, useSession, nodeStore, selectedCallId, cwd, openFile, inspectCall, forkAt, renderMessageImages, fileMentions, renderSlot, t }) {
\t\t\tconst [open, setOpen] = (0, react.useState)(false);
\t\t\tconst headerRef = (0, react.useRef)(null);
\t\t\tconst tailNode = nodeStore.get(tailKey);
\t\t\tconst tail = tailNode?.data;
\t\t\tconst closing = tail?.closing;
\t\t\tconst turnObj = tailNode?.location?.kind === "turn" || tailNode?.location?.kind === "step" ? tailNode?.location?.turn : void 0;
\t\t\tconst runMs = turnObj === void 0 || turnObj.start === void 0 || turnObj.end === void 0 ? void 0 : Math.max(0, turnObj.end.time - turnObj.start.time);
\t\t\tlet meta = null;
\t\t\tif (runMs !== void 0) {
\t\t\t\tif (tail?.totalTokens === void 0) meta = t("turn.ranFor", { duration: formatDuration(runMs) });
\t\t\t\telse meta = t("turn.summary", { duration: formatDuration(runMs), tokens: String(tail.totalTokens) });
\t\t\t}
\t\t\tconst owner = (0, react.useMemo)(() => {
\t\t\t\tif (closing === void 0 || closing.finalNode === void 0 || turnObj === void 0) return void 0;
\t\t\t\treturn {
\t\t\t\t\tturn: turnObj,
\t\t\t\t\tseq: closing.finalNode.seq,
\t\t\t\t\topenFile
\t\t\t\t};
\t\t\t}, [closing, openFile, turnObj]);
\t\t\tconst mentions = (0, react.useMemo)(() => owner === void 0 ? void 0 : fileMentions(owner), [fileMentions, owner]);
\t\t\tconst seatProps = {
\t\t\t\tuseSession,
\t\t\t\tnodeStore,
\t\t\t\tselectedCallId,
\t\t\t\tcwd,
\t\t\t\topenFile,
\t\t\t\tinspectCall,
\t\t\t\tforkAt,
\t\t\t\trenderMessageImages,
\t\t\t\tfileMentions,
\t\t\t\trenderSlot,
\t\t\t\tt
\t\t\t};
\t\t\treturn (0, react_jsx_runtime.jsxs)("div", {
\t\t\t\tclassName: ChatView_module_css_default.flowItem + " " + TurnFold_module_css_default.turnRoot,
\t\t\t\t"data-chat-anchor-key": keys[0],
\t\t\t\t"data-chat-flow-key": keys[0],
\t\t\t\t"data-chat-flow-kind": "turn",
\t\t\t\tchildren: [
\t\t\t\t\t(0, react_jsx_runtime.jsx)("button", {
\t\t\t\t\t\ttype: "button",
\t\t\t\t\t\tref: headerRef,
\t\t\t\t\t\tclassName: TurnFold_module_css_default.turnHeader,
\t\t\t\t\t\t"aria-expanded": open,
\t\t\t\t\t\tonClick: () => toggleFold(headerRef, setOpen),
\t\t\t\t\t\tchildren: [
\t\t\t\t\t\t\t(0, react_jsx_runtime.jsx)("span", {
\t\t\t\t\t\t\t\tclassName: TurnFold_module_css_default.lead,
\t\t\t\t\t\t\t\tchildren: [
\t\t\t\t\t\t\t\t\t(0, react_jsx_runtime.jsx)(TurnTimeIcon, {
\t\t\t\t\t\t\t\t\t\tsize: 14,
\t\t\t\t\t\t\t\t\t\tclassName: TurnFold_module_css_default.leadIcon
\t\t\t\t\t\t\t\t\t}),
\t\t\t\t\t\t\t\t\t(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, {
\t\t\t\t\t\t\t\t\t\tsize: 14,
\t\t\t\t\t\t\t\t\t\tclassName: TurnFold_module_css_default.chevron
\t\t\t\t\t\t\t\t\t})
\t\t\t\t\t\t\t\t]
\t\t\t\t\t\t\t}),
\t\t\t\t\t\t\tmeta === null ? null : (0, react_jsx_runtime.jsx)("span", { className: TurnFold_module_css_default.turnMeta, children: meta })
\t\t\t\t\t\t]
\t\t\t\t\t}),
\t\t\t\t\topen ? (0, react_jsx_runtime.jsx)(TurnGroupContext.Provider, {
\t\t\t\t\t\tvalue: true,
\t\t\t\t\t\tchildren: (0, react_jsx_runtime.jsx)("div", {
\t\t\t\t\t\t\tclassName: TurnFold_module_css_default.body,
\t\t\t\t\t\t\tchildren: buildGroups(keys, nodeStore, false).map((group) => renderFlowGroup(group, seatProps))
\t\t\t\t\t\t})
\t\t\t\t\t}) : closing === void 0 ? null : (0, react_jsx_runtime.jsx)("div", {
\t\t\t\t\t\tclassName: TurnFold_module_css_default.summary,
\t\t\t\t\t\tchildren: (0, react_jsx_runtime.jsx)(AssistantMarkdown, {
\t\t\t\t\t\t\tblocks: closing.blocks,
\t\t\t\t\t\t\tstreaming: false,
\t\t\t\t\t\t\tinterrupted: false,
\t\t\t\t\t\t\trenderMessageImages,
\t\t\t\t\t\t\tmentions,
\t\t\t\t\t\t\tt
\t\t\t\t\t\t})
\t\t\t\t\t})
\t\t\t\t]
\t\t\t});
\t\t});
\t\t//#endregion
`;

/**
 * Byte-exact replacements. Order matters: each `before` must appear exactly
 * once in the target bundle after the previous replacements have run.
 */
export const REPLACEMENTS = [
	{
		label: "tailData: per-turn token total",
		before: `\t\t\tconst metrics = deriveTurnMetrics(finalized.map((candidate) => candidate.finalNode)).get(end.event.data.turn);
\t\t\treturn {
\t\t\t\tturn: end.event.data.turn,
\t\t\t\tseq: end.event.seq,
\t\t\t\ttime: end.event.time,
\t\t\t\tclosing,
\t\t\t\tbranchUnavailable: closing === null || latestTranscriptSeq !== closing.finalNode.seq,
\t\t\t\t...metrics?.ttftMs === void 0 ? {} : { ttftMs: metrics.ttftMs },`,
		after: `\t\t\tconst metrics = deriveTurnMetrics(finalized.map((candidate) => candidate.finalNode)).get(end.event.data.turn);
\t\t\tconst totalTokens = turnTokenTotal(finalized);
\t\t\treturn {
\t\t\t\tturn: end.event.data.turn,
\t\t\t\tseq: end.event.seq,
\t\t\t\ttime: end.event.time,
\t\t\t\tclosing,
\t\t\t\tbranchUnavailable: closing === null || latestTranscriptSeq !== closing.finalNode.seq,
\t\t\t\t...totalTokens === null ? {} : { totalTokens },
\t\t\t\t...metrics?.ttftMs === void 0 ? {} : { ttftMs: metrics.ttftMs },`
	},
	{
		label: "insert folding layer before the ChatView region",
		before: `\t\t//#region lib/types/client/chat/ChatView.js`,
		after: `${FOLD_LAYER}\t\t//#region lib/types/client/chat/ChatView.js`
	},
	{
		label: "ChatView: derive flow groups",
		before: `\t\t\tconst selectedCallId = useStore((s) => s.selection?.callId);`,
		after: `\t\t\tconst selectedCallId = useStore((s) => s.selection?.callId);
\t\t\tconst groups = (0, react.useMemo)(() => buildGroups(order, nodeStore), [order, nodeStore]);`
	},
	{
		label: "ChatView: render flow groups instead of plain node rows",
		before: `\t\t\t\t\t\t\torder.map((nodeKey) => (0, react_jsx_runtime.jsx)(ChatNodeSeat, {
\t\t\t\t\t\t\t\tnodeKey,
\t\t\t\t\t\t\t\tuseSession,
\t\t\t\t\t\t\t\tselectedCallId,
\t\t\t\t\t\t\t\tcwd,
\t\t\t\t\t\t\t\topenFile: requestOpenFile,
\t\t\t\t\t\t\t\tinspectCall,
\t\t\t\t\t\t\t\tforkAt,
\t\t\t\t\t\t\t\trenderMessageImages,
\t\t\t\t\t\t\t\tfileMentions,
\t\t\t\t\t\t\t\trenderSlot,
\t\t\t\t\t\t\t\tt
\t\t\t\t\t\t\t}, nodeKey)),`,
		after: `\t\t\t\t\t\t\tgroups.map((group) => renderFlowGroup(group, {
\t\t\t\t\t\t\t\tuseSession,
\t\t\t\t\t\t\t\tnodeStore,
\t\t\t\t\t\t\t\tselectedCallId,
\t\t\t\t\t\t\t\tcwd,
\t\t\t\t\t\t\t\topenFile: requestOpenFile,
\t\t\t\t\t\t\t\tinspectCall,
\t\t\t\t\t\t\t\tforkAt,
\t\t\t\t\t\t\t\trenderMessageImages,
\t\t\t\t\t\t\t\tfileMentions,
\t\t\t\t\t\t\t\trenderSlot,
\t\t\t\t\t\t\t\tt
\t\t\t\t\t\t\t})),`
	},
	{
		label: "TurnTailNodeView: read the turn-group context",
		before: `\t\tconst TurnTailNodeView = (0, react.memo)(function TurnTailNodeView({ node, openFile, forkAt, renderSlot, renderSlotChain, t, useSession }) {
\t\t\tconst data = node.data;
\t\t\tconst hasLaterChatNode = useSession((snapshot) => snapshot.chat.locations.getTurn(data.turn).at(-1) !== node.key);
\t\t\tconst turn = node.location.kind === "turn" || node.location.kind === "step" ? node.location.turn : void 0;`,
		after: `\t\tconst TurnTailNodeView = (0, react.memo)(function TurnTailNodeView({ node, openFile, forkAt, renderSlot, renderSlotChain, t, useSession }) {
\t\t\tconst data = node.data;
\t\t\tconst hasLaterChatNode = useSession((snapshot) => snapshot.chat.locations.getTurn(data.turn).at(-1) !== node.key);
\t\t\tconst turn = node.location.kind === "turn" || node.location.kind === "step" ? node.location.turn : void 0;
\t\t\tconst grouped = (0, react.useContext)(TurnGroupContext);`
	},
	{
		label: "TurnTailNodeView: hide the duplicated timing line inside a folded turn",
		before: `\t\t\t\t\tclock: "end",`,
		after: `\t\t\t\t\tclock: grouped ? void 0 : "end",`
	},
	{
		label: "locale zh: turn summary strings",
		before: `\t\t\t"stats.tokens": "输入 {input} tok · 输出 {output} tok",`,
		after: `\t\t\t"stats.tokens": "输入 {input} tok · 输出 {output} tok",
\t\t\t"turn.summary": "耗时 {duration} · Total {tokens} tokens",
\t\t\t"turn.ranFor": "耗时 {duration}",
\t\t\t"turn.toolCalls": "工具调用 {count}",`
	},
	{
		label: "locale en: turn summary strings",
		before: `\t\t\t"stats.tokens": "Input {input} tok · Output {output} tok",`,
		after: `\t\t\t"stats.tokens": "Input {input} tok · Output {output} tok",
\t\t\t"turn.summary": "Time {duration} · Total {tokens} tokens",
\t\t\t"turn.ranFor": "Time {duration}",
\t\t\t"turn.toolCalls": "Tool calls {count}",`
	}
];

/**
 * Apply the patch table to one bundle text.
 * @param source - raw bundle text.
 * @param version - the target package's version.
 * @returns `{ text, skipped, replacements }`; `skipped` when the version is
 * not in {@link SUPPORTED} (the caller then serves the original text).
 * @throws {Error} when any anchor is missing or ambiguous.
 */
export function applyPatch(source, version) {
	if (!SUPPORTED.includes(version)) return { text: source, skipped: true, replacements: 0 };
	let text = source;
	let replacements = 0;
	for (const [index, replacement] of REPLACEMENTS.entries()) {
		const before = replacement.before;
		let count = 0;
		let from = 0;
		while (text.indexOf(before, from) !== -1) {
			count += 1;
			from = text.indexOf(before, from) + before.length;
		}
		if (count !== 1) {
			const suffix = count === 0 ? ` (anchor not found — dsh version ${version} may not match; supported: ${SUPPORTED.join(", ")})` : " (ambiguous)";
			throw new Error(`dsh-chat-turn-fold: replacement #${index} "${replacement.label}" matched ${count} time(s); expected exactly 1${suffix}`);
		}
		text = text.replace(before, replacement.after);
		replacements += 1;
	}
	return { text, skipped: false, replacements };
}
