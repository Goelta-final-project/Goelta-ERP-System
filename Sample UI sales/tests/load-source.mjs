import { buildSync } from 'esbuild';
import Module from 'node:module';
import path from 'node:path';
const cache = new Map();
export function loadSource(file) {
  if (cache.has(file)) return cache.get(file);
  const filename = path.resolve(file);
  const result = buildSync({ entryPoints: [filename], bundle: true, platform: 'node', format: 'cjs', packages: 'external', write: false, logLevel: 'silent' });
  const module = new Module(filename);
  module.filename = filename; module.paths = Module._nodeModulePaths(path.dirname(filename));
  module._compile(result.outputFiles[0].text, filename);
  cache.set(file, module.exports); return module.exports;
}
