import type { Plugin } from "esbuild";
import MagicString from "magic-string";
import * as fs from "node:fs";
import { dirname, relative } from "node:path";

export default () =>
	<Plugin>{
		name: "asset-import-meta-url",
		setup({ onLoad, resolve }) {
			onLoad({ filter: /.*\.js$/, namespace: "file" }, async (args) => {
				const code = fs.readFileSync(args.path, "utf8");

				const assetImportMetaUrlRE =
					/\bnew\s+URL\s*\(\s*('[^']+'|"[^"]+"|`[^`]+`)\s*,\s*import\.meta\.url\s*(?:,\s*)?\)/g;

				let s: MagicString | undefined;
				const warnings = [];
				const errors = [];
				for (
					let match = assetImportMetaUrlRE.exec(code);
					match != null;
					match = assetImportMetaUrlRE.exec(code)
				) {
					if (!s) s = new MagicString(code);
					const path = match[1].slice(1, -1);

					console.log(path, {
						importer: args.path,
						kind: "url-token",
						namespace: "import-meta-url-file",
						resolveDir: dirname(args.path),
					});
					console.log({ ...match, input: undefined });

					const resolved = await resolve(path, {
						importer: args.path,
						kind: "url-token",
						namespace: "file",
						resolveDir: args.path,
					});
					warnings.push(...resolved.warnings);
					if (resolved.errors.length) {
						errors.push(...resolved.errors);
						continue;
					}
					s.update(
						match.index,
						assetImportMetaUrlRE.lastIndex,
						`new URL(${JSON.stringify(relative(dirname(args.path), resolved.path))}, import.meta.url)`,
					);
				}

				return { contents: s ? transformResult(s) : code };
			});
		},
	};

function transformResult(s: MagicString): string {
	const code = s.toString();
	console.log(code);
	const map = s.generateMap();
	return `${code}\n//# sourceMappingURL=${map.toUrl()}`;
}
