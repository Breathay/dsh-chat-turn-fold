/**
 * dsh-chat-turn-fold — host half.
 *
 * Codex-style conversation folding for the DSH web GUI, delivered as a
 * serve-time bundle patch: this plugin reads the shipped
 * `@deepseek-ai/dsh-client-ui-conversation` client bundle, applies the
 * byte-exact replacement table in `patches/conversation-fold.js`, and answers
 * the bundle route with the patched text. Nothing on disk is modified:
 * uninstalling the plugin restores the original UI.
 *
 * Route precedence (dsh-host-webserver matches the exact table before the
 * longest prefix) lets this exact route win over the client-modules
 * `/plugins` prefix route for this one bundle; every other `/plugins/*`
 * request still falls through to the original handler.
 *
 * Fail-open policy: when the target package version is unsupported or an
 * anchor drifts, the plugin logs the problem and does NOT register the route,
 * so the original bundle keeps serving.
 *
 * Live-edit: the request handler re-imports the patch table fresh (the ESM
 * cache is busted with a query string), so updating
 * `patches/conversation-fold.js` takes effect after a browser refresh — no
 * harness restart needed once the plugin is mounted.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { applyPatch, REPLACEMENTS, SUPPORTED, TARGET_PACKAGE } from "../patches/conversation-fold.js";

/** Plugin identity for cordis.yml rows. */
const name = "dsh-chat-turn-fold";

/** Services required before mounting: the browser HTTP carrier. */
const inject = ["webServer"];

/** The exact bundle route this plugin answers (browser URL path, before `?rev=`). */
const BUNDLE_PATH = `/plugins/${TARGET_PACKAGE}/client.js`;

/** Locate the target package and read its shipped client bundle text. */
function loadTargetBundle() {
	const require = createRequire(import.meta.url);
	const pkgPath = require.resolve(`${TARGET_PACKAGE}/package.json`);
	const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
	const bundlePath = join(dirname(pkgPath), "lib", "client.js");
	return {
		version: pkg.version,
		source: readFileSync(bundlePath, "utf8")
	};
}

/** Read the untouched bundle text, or null when the package is unreadable. */
function readOriginalBundle() {
	try {
		return loadTargetBundle().source;
	} catch {
		return null;
	}
}

let patchSeq = 0;

/** Re-import the patch table fresh so on-disk edits apply without a restart. */
function loadPatchTable() {
	const url = new URL(`../patches/conversation-fold.js?rev=${patchSeq++}`, import.meta.url).href;
	return import(url);
}

/**
 * Mount the plugin.
 * @param ctx - host plugin context carrying `webServer`.
 */
function apply(ctx) {
	let gateError = null;
	try {
		const { version, source } = loadTargetBundle();
		const result = applyPatch(source, version);
		if (result.skipped) gateError = new Error(`${TARGET_PACKAGE}@${version} is not in the supported set (${SUPPORTED.join(", ")}) — update dsh-chat-turn-fold for your dsh version`);
	} catch (error) {
		gateError = error instanceof Error ? error : new Error(String(error));
	}
	if (gateError !== null) {
		ctx.logger.warn(`dsh-chat-turn-fold: ${gateError.message} — serving the original bundle`);
		return;
	}
	ctx.logger.info(`dsh-chat-turn-fold: mounted at ${BUNDLE_PATH} (${REPLACEMENTS.length} replacements, re-applied per request)`);
	ctx.effect(() => ctx.webServer.register({
		kind: "exact",
		path: BUNDLE_PATH,
		handler: async (req, res) => {
			if (req.method !== "GET" && req.method !== "HEAD") {
				res.writeHead(405);
				res.end();
				return;
			}
			let body;
			try {
				const { version, source } = loadTargetBundle();
				const patch = await loadPatchTable();
				body = patch.applyPatch(source, version).text;
			} catch (error) {
				ctx.logger.warn(`dsh-chat-turn-fold: request-time patch failed, serving the original bundle: ${error instanceof Error ? error.message : String(error)}`);
				body = readOriginalBundle();
				if (body === null) {
					res.writeHead(404);
					res.end();
					return;
				}
			}
			res.writeHead(200, {
				"content-type": "text/javascript; charset=utf-8",
				"cache-control": "no-cache"
			});
			res.end(body);
		}
	}), "dsh-chat-turn-fold: patched bundle route");
}

export { apply, inject, name };
