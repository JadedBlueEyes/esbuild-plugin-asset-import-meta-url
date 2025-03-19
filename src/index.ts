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
import type { Plugin } from "esbuild";
import MagicString from "magic-string";

export default ({
	fileName: givenFileName,
	resolveDir: givenResolveDir,
}: { fileName?: string; resolveDir?: string } = {}) =>
	<Plugin>{
		name: "asset-import-meta-url",
		setup({ onLoad, resolve, initialOptions }) {
			const {
				absWorkingDir = process.cwd(),
				outdir,
				outfile,
				assetNames,
			} = initialOptions;
			const fileName = givenFileName ?? assetNames ?? "[name]-[hash]";
			const outDir = resolvePath(
				absWorkingDir,
				outdir ?? dirname(outfile || "."),
			);

			const resolveDir = givenResolveDir
				? resolvePath(absWorkingDir, givenResolveDir)
				: outDir;

			onLoad({ filter: /.*\.js$/, namespace: "file" }, async (args) => {
				const code = fs.readFileSync(args.path, "utf8");

				const assetImportMetaUrlRE =
					/\bnew\s+URL\s*\(\s*('[^']+'|"[^"]+"|`[^`]+`)\s*,\s*import\.meta\.url\s*(?:,\s*)?\)/g;

				let s: MagicString | undefined;
				const warnings = [];
				for (
					let match = assetImportMetaUrlRE.exec(code);
					match != null;
					match = assetImportMetaUrlRE.exec(code)
				) {
					const path = match[1].slice(1, -1);

					const resolved = await resolve(path, {
						importer: args.path,
						kind: "url-token",
						namespace: "file",
						resolveDir: dirname(args.path),
					});

					warnings.push(...resolved.warnings);
					if (resolved.errors.length) {
						warnings.push(...resolved.errors);
						continue;
					}

					if (!s) s = new MagicString(code);

					const buffer = await readFile(resolved.path);
					const hash = createHash("sha1")
						.update(buffer)
						.digest("hex")
						.slice(0, 16);
					const ext = extname(resolved.path);
					const dir = dirname(resolved.path);
					const name = basename(resolved.path, ext);
					const outFileName =
						fileName
							.replace("[dir]", dir)
							.replace("[name]", name)
							.replace("[hash]", hash)
							.replace("[ext]", ext.slice(1)) + ext;
					const outfile = joinPath(outDir, outFileName);
					copyFile(resolved.path, outfile);
					// We assume that all chunks are written to the root of the output directory, so we build the URL relative to the output directory
					s.update(
						match.index,
						assetImportMetaUrlRE.lastIndex,
						`new URL(${JSON.stringify(relative(resolveDir, outfile))}, import.meta.url)`,
					);
				}

				return {
					contents: s ? transformResult(s) : code,
					warnings,
				};
			});
		},
	};

function transformResult(s: MagicString): string {
	const code = s.toString();
	const map = s.generateMap();
	return `${code}\n//# sourceMappingURL=${map.toUrl()}`;
}
