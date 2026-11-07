import { mkdir, readFile, writeFile, cp } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import esbuild from 'esbuild'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'lib')

await mkdir(outDir, { recursive: true })
await cp(join(root, 'src/index.js'), join(outDir, 'index.js'))

const require = createRequire(import.meta.url)

/** Resolve peer packages only when present; the host ModuleLoader supplies them at runtime. */
function externalPlugin() {
  return {
    name: 'dsh-external',
    setup(build) {
      build.onResolve({ filter: /.*/ }, (args) => {
        if (args.kind === 'entry-point') return null
        if (
          args.path === 'react' ||
          args.path === 'react/jsx-runtime' ||
          args.path === 'react-dom' ||
          args.path === 'react-dom/client' ||
          args.path.startsWith('@deepseek-ai/')
        ) {
          return { path: args.path, external: true }
        }
        return null
      })
    },
  }
}

const bundled = await esbuild.build({
  absWorkingDir: root,
  entryPoints: [join(root, 'src/client/index.js')],
  bundle: true,
  write: false,
  format: 'cjs',
  platform: 'browser',
  target: ['es2022'],
  jsx: 'transform',
  plugins: [externalPlugin()],
  logLevel: 'silent',
})

const code = bundled.outputFiles[0].text
const client = `window.__ModuleLoader__.load({
  id: '@ron777/dsh-printer',
  factory(require) {
    const module = { exports: {} };
    const exports = module.exports;
    const __require = require;
${indent(rewriteRequires(code), 4)}
    return module.exports;
  },
});
`

await writeFile(join(outDir, 'client.js'), client, 'utf8')
console.log('built lib/index.js and lib/client.js')

/**
 * esbuild CJS emit uses require("…"); ModuleLoader factory already names that parameter `require`.
 * Keep as-is. Rewrite only package subpath quirks if needed.
 * @param {string} source
 */
function rewriteRequires(source) {
  // Prefer the factory-provided require; leave identifiers unchanged.
  return source.replace(/\brequire\(/g, '__require(')
}

/** @param {string} text @param {number} spaces */
function indent(text, spaces) {
  const pad = ' '.repeat(spaces)
  return text
    .split('\n')
    .map((line) => (line.length ? pad + line : line))
    .join('\n')
}

// Touch package.json so accidental empty builds fail loudly if esbuild missing.
void readFile(join(root, 'package.json'), 'utf8')
void require
