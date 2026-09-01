/**
 * dsh-chat-turn-fold — offline patch verifier.
 *
 * Applies the replacement table to a copy of the target client bundle,
 * asserts every anchor matches exactly once, runs `node --check` on the
 * patched copy, and prints a summary. Safe to run against the live dsh
 * installation: it never touches the original file.
 *
 * Usage:
 *   node scripts/verify-patch.mjs [path-to-conversation-client.js]
 *
 * Without an argument the bundle is resolved through the same resolution the
 * host plugin uses (the nearest installed @deepseek-ai/dsh-client-ui-conversation).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { applyPatch, REPLACEMENTS, TARGET_PACKAGE, SUPPORTED } from "../patches/conversation-fold.js";

const require = createRequire(import.meta.url);

function resolveBundlePath() {
	const pkgPath = require.resolve(`${TARGET_PACKAGE}/package.json`);
	const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
	return { bundlePath: join(dirname(pkgPath), "lib", "client.js"), version: pkg.version };
}

const explicit = process.argv[2];
let bundlePath;
let version;
if (explicit === void 0) {
	({ bundlePath, version } = resolveBundlePath());
} else {
	bundlePath = explicit;
	const pkg = JSON.parse(readFileSync(join(dirname(bundlePath), "..", "package.json"), "utf8"));
	version = pkg.version;
}
const source = readFileSync(bundlePath, "utf8");

const result = applyPatch(source, version);
if (result.skipped) {
	console.error(`SKIP: ${TARGET_PACKAGE}@${version} is not in the supported set (${SUPPORTED.join(", ")}) — no patch applied.`);
	process.exit(1);
}

// Structural smoke checks on the patched output.
const required = [
	"TurnGroupContext",
	"function buildGroups(order, nodes, foldTurns = true)",
	"const ToolRunGroup",
	"const TurnGroup",
	"const TurnTimeIcon",
	"turnTokenTotal(finalized)",
	"\"turn.summary\"",
	"\"turn.toolCalls\"",
	"reading.runningLabel",
	"function toolRunName(root)",
	"function toolRunArgsLabel(root)",
	"function toolRunTarget(argsRaw)",
	"function toolIconOf(name)",
	"reading.dominant",
	"reading.labels.join(\" & \")",
	"IconLoadingOutline16",
	"clock: grouped ? void 0 : \"end\"",
	"totalTokens === null ? {} : { totalTokens }"
];
const missing = required.filter((needle) => !result.text.includes(needle));
if (missing.length > 0) {
	console.error(`FAIL: patched output is missing expected markers: ${missing.join(", ")}`);
	process.exit(1);
}

const outPath = join(dirname(bundlePath), "client.js.fold-check.js");
writeFileSync(outPath, result.text, "utf8");
const check = spawnSync(process.execPath, ["--check", outPath], { encoding: "utf8" });
if (check.status !== 0) {
	console.error(`FAIL: patched bundle failed node --check:\n${check.stderr}`);
	process.exit(1);
}
console.log(`OK: ${TARGET_PACKAGE}@${version}`);
console.log(`  bundle:      ${bundlePath} (${source.length} bytes)`);
console.log(`  replacements: ${result.replacements}/${REPLACEMENTS.length}`);
console.log(`  patched copy: ${outPath} (${result.text.length} bytes) — syntax valid`);
console.log(`  markers:     ${required.length}/${required.length} present`);
