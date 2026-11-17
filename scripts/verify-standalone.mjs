import { access, cp, mkdtemp, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';

const source = fileURLToPath(new URL('../dist/standalone/', import.meta.url));
await access(join(source, 'server.js')).catch(() => {
  throw new Error('No dist/standalone/server.js. A Cloudflare Worker build is not a Node deployment.');
});
const temp = await mkdtemp(join(tmpdir(), 'samuriq-standalone-'));
let child;
let exited;
let logs = '';
try {
  // Outside the checkout: missing packages must not resolve from its node_modules.
  await cp(source, temp, { recursive: true, dereference: true });
  const listener = createServer();
  listener.listen(0, '127.0.0.1');
  await once(listener, 'listening');
  const port = listener.address().port;
  await new Promise((resolve, reject) => listener.close(error => error ? reject(error) : resolve()));
  child = spawn(process.execPath, [join(temp, 'server.js')], {
    cwd: temp,
    env: { ...process.env, NODE_PATH: '', NODE_ENV: 'production', HOST: '127.0.0.1', PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  exited = once(child, 'exit');
  child.stdout.on('data', data => { logs = (logs + data).slice(-16000); });
  child.stderr.on('data', data => { logs = (logs + data).slice(-16000); });
  let response;
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline && child.exitCode === null) {
    try {
      response = await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(5000), redirect: 'manual' });
      break;
    } catch {
      await delay(100);
    }
  }
  if (!response) throw new Error(`Standalone server did not become reachable.\n${logs}`);
  const body = await response.text();
  if (response.status !== 200 || !body.includes('Your next project.')) {
    await delay(100);
    throw new Error(`Home page failed: HTTP ${response.status}; expected real Samuriq page content.\n${logs}`);
  }
  console.log('Isolated standalone runtime: home page returned HTTP 200 and real Samuriq content.');
} finally {
  if (child && child.exitCode === null && child.signalCode === null) {
    child.kill('SIGTERM');
    await Promise.race([exited, delay(3000)]);
    if (child.exitCode === null && child.signalCode === null) {
      child.kill('SIGKILL');
      await exited;
    }
  }
  await rm(temp, { recursive: true, force: true });
}
