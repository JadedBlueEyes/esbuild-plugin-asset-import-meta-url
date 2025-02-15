import type { Plugin } from "esbuild";
import MagicString from "magic-string";
import { createHash } from "node:crypto";
import * as fs from "node:fs";
import { copyFile, readFile } from "node:fs/promises";
import {
	basename,
	dirname,
	extname,
	join as joinPath,
	relative,
	resolve as resolvePath,
} from "node:path";

export default ({ fileName = "[name].[hash][extname]" } = {}) =>
	<Plugin>{
		name: "asset-import-meta-url",
		setup({ onLoad, resolve, initialOptions }) {
			const { absWorkingDir = process.cwd(), outdir, outfile } = initialOptions;
			const outDir = resolvePath(
				absWorkingDir,
				outdir || dirname(outfile || "."),
			);

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

					const resolved = await resolve(path, {
						importer: args.path,
						kind: "url-token",
						namespace: "file",
						resolveDir: dirname(args.path),
					});

					warnings.push(...resolved.warnings);
					if (resolved.errors.length) {
						errors.push(...resolved.errors);
						continue;
					}
					const buffer = await readFile(resolved.path);
					const hash = createHash("sha1")
						.update(buffer)
						.digest("hex")
						.slice(0, 16);
					const ext = extname(resolved.path);
					const name = basename(resolved.path, ext);
					const outFileName = fileName
						.replace("[name]", name)
						.replace("[hash]", hash)
						.replace("[extname]", ext);

					s.update(
						match.index,
						assetImportMetaUrlRE.lastIndex,
						`new URL(${JSON.stringify(relative(dirname(args.path), resolved.path))}, import.meta.url)`,
					);
					copyFile(resolved.path, joinPath(outDir, outFileName));
				}

				return { contents: s ? transformResult(s) : code, warnings, errors };
			});
		},
	};

function transformResult(s: MagicString): string {
	const code = s.toString();
	const map = s.generateMap();
	return `${code}\n//# sourceMappingURL=${map.toUrl()}`;
}
