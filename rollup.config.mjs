import { isBuiltin } from "node:module";
import typescript from "@rollup/plugin-typescript";
import pkg from "./package.json" with { type: "json" };

const external = (id) =>
	isBuiltin(id) || pkg.dependencies[id] || pkg.peerDependencies[id];

export default [
	{
		input: "src/index.ts",
		
		output: [
			{ file: pkg.exports.require, format: "cjs" },
			{ file: pkg.exports.import, format: "es" },
		],
		plugins: [typescript({ declaration: true, declarationDir: "dist" })],
		external,
	}
];
