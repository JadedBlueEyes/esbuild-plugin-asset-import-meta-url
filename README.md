# esbuild-plugin-asset-import-meta-url

An esbuild plugin that adds support for the `new URL(path, import.meta.url)` syntax, allowing you to reference assets with proper hashing and path resolution.

## Installation

```bash
npm install --save-dev esbuild-plugin-asset-import-meta-url
# or
yarn add -D esbuild-plugin-asset-import-meta-url
# or
pnpm add -D esbuild-plugin-asset-import-meta-url
```

## Usage

```js
import esbuild from 'esbuild'
import assetImportMetaUrl from 'esbuild-plugin-asset-import-meta-url'
await esbuild.build({
  entryPoints: ['src/index.js'],
  bundle: true,
  outdir: 'dist',
  plugins: [
    assetImportMetaUrl()
  ]
})
```
in your code:

```js
import { readFile } from 'node:fs/promises'
const imageUrl = new URL('./assets/image.png', import.meta.url)
const imageBuffer = await readFile(imageUrl)
```


## Configuration

The plugin accepts an options object with the following properties:

```ts
interface Options {
fileName?: string; // Accepts the same options as output.assetNames. Default: "[name]-[hash]"
}
```

### fileName

You can customize the output filename pattern using the following tokens:

- `[name]` - The original file name without extension
- `[hash]` - A unique hash of the file content (16 characters)
- `[extname]` - The original file extension (including the dot)

Example:

```js
assetImportMetaUrl({ fileName: 'media/[hash].js' })
```


## Features

- ✨ Supports `new URL(path, import.meta.url)` syntax
- 🔄 Automatically copies referenced assets to the output directory
- 🔒 Content-based hashing for cache busting
- 🗺 Source map support
- 🔍 Proper path resolution relative to the importing file

## How it Works

The plugin:

1. Scans JavaScript files for `new URL()` declarations with `import.meta.url`
2. Resolves the referenced asset paths
3. Generates a content hash for each asset
4. Copies the assets to the output directory with the configured naming pattern
5. Updates the URL constructor calls with the correct relative paths

## License

MIT - See [LICENSE](LICENSE) for details.
