import { access, cp, mkdir, realpath } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const standalone = join(root, 'dist', 'standalone');
try {
  await access(join(standalone, 'server.js'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  // Cloudflare builds do not emit a Node server. Do not create a fake standalone
  // directory that a hosting platform could mistake for a deployable app.
  console.log('No standalone Node server emitted; retaining Cloudflare output.');
  process.exit(0);
}

const require = createRequire(join(root, 'package.json'));
const modules = join(standalone, 'node_modules');
await mkdir(modules, { recursive: true });
for (const name of ['react', 'react-dom', 'scheduler']) {
  const source = dirname(require.resolve(`${name}/package.json`));
  await cp(source, join(modules, name), { recursive: true, dereference: true, force: true });
}

const runtimeRequire = createRequire(join(standalone, 'server.js'));
const realModules = await realpath(modules);
for (const name of ['react', 'react-dom', 'scheduler']) {
  const resolved = await realpath(runtimeRequire.resolve(`${name}/package.json`));
  if (!resolved.startsWith(resolve(realModules) + sep)) {
    throw new Error(`${name} resolves outside the standalone artifact`);
  }
}
console.log('Standalone React runtime packages included and resolved inside the artifact.');
