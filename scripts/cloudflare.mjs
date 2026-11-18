import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
process.chdir(root);
const [command, ...args] = process.argv.slice(2);
const local = args.length === 1 && args[0] === '--local';
if (!['build', 'deploy'].includes(command) || args.some(arg => arg !== '--local') || (command === 'deploy' && args.length)) {
  throw new Error('Use build [--local] or deploy. Local test builds cannot be deployed.');
}
const stateDir = new URL('../.cloudflare/', import.meta.url);
const metadataPath = new URL('build.json', stateDir);
const configPath = new URL('wrangler.json', stateDir);
const placeholder = '00000000-0000-4000-8000-000000000000';
function run(script, argv, env = process.env) {
  const result = spawnSync(process.execPath, [fileURLToPath(new URL(script, import.meta.url)), ...argv], { stdio: 'inherit', env });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
if (command === 'build') {
  const databaseId = local ? placeholder : process.env.CLOUDFLARE_D1_DATABASE_ID;
  if (!databaseId || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(databaseId) || (!local && /^0{8}-/.test(databaseId))) {
    throw new Error('Set CLOUDFLARE_D1_DATABASE_ID to the real existing D1 database UUID. Use --local only for disposable tests. No cloud resources will be created.');
  }
  const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME;
  if (bucket && !/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(bucket)) throw new Error('Invalid R2 bucket name.');
  const name = process.env.CLOUDFLARE_WORKER_NAME || 'samuriq-ai';
  if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(name)) throw new Error('Invalid Worker name.');
  const config = {
    name, main: '../worker/index.ts', compatibility_date: '2026-05-15',
    compatibility_flags: ['nodejs_compat'], workers_dev: true,
    vars: { SAMURIQ_HOSTING_MODE: 'cloudflare', PASSWORD_LOGIN_ONLY: '1' },
    d1_databases: [{ binding: 'DB', database_name: process.env.CLOUDFLARE_D1_DATABASE_NAME || 'samuriq-ai-db', database_id: databaseId, migrations_dir: '../drizzle' }],
    r2_buckets: local ? [{ binding: 'PRIVATE_FILES', bucket_name: 'samuriq-local-test-files' }] : bucket ? [{ binding: 'PRIVATE_FILES', bucket_name: bucket }] : [],
  };
  await mkdir(stateDir, { recursive: true });
  // Invalidate previous success before starting another build.
  await writeFile(metadataPath, JSON.stringify({ ready: false, local }));
  await writeFile(configPath, JSON.stringify(config, null, 2) + '\n');
  run('../node_modules/vite/bin/vite.js', ['build'], { ...process.env, SAMURIQ_DEPLOY_TARGET: 'cloudflare' });
  const built = JSON.parse(await readFile(new URL('../dist/server/wrangler.json', import.meta.url), 'utf8'));
  if (built.vars?.SAMURIQ_HOSTING_MODE !== 'cloudflare' || built.d1_databases?.[0]?.database_id !== databaseId) throw new Error('Build lost its production bindings or hosting mode.');
  // Public, non-secret release identity lets deployment checks verify the exact
  // GitHub update instead of mistaking an older HTTP 200 page for a new release.
  const commit = process.env.WORKERS_CI_COMMIT_SHA || '';
  await writeFile(new URL('../dist/client/deployment.json', import.meta.url), JSON.stringify({
    commit: /^[a-f0-9]{40}$/i.test(commit) ? commit : null,
    builtAt: new Date().toISOString(),
    local,
  }) + '\n');
  await writeFile(metadataPath, JSON.stringify({ ready: true, local, databaseId, name, privateFiles: Boolean(bucket) }, null, 2));
  console.log(local ? 'Disposable local Cloudflare build ready. Deployment is blocked for this artifact.' : 'Cloudflare build ready. Runtime secrets and database migrations must be verified before deployment.');
} else {
  const metadata = JSON.parse(await readFile(metadataPath, 'utf8'));
  const built = JSON.parse(await readFile(new URL('../dist/server/wrangler.json', import.meta.url), 'utf8'));
  if (!metadata.ready || metadata.local || built.vars?.SAMURIQ_HOSTING_MODE !== 'cloudflare' || built.d1_databases?.[0]?.database_id !== metadata.databaseId || built.name !== metadata.name) {
    throw new Error('Refusing to deploy an unverified or local artifact. Run a production build first.');
  }
  if (!metadata.privateFiles || !built.r2_buckets?.some(bucket => bucket.binding === 'PRIVATE_FILES')) {
    throw new Error('Private file storage is not configured. Link an existing approved bucket before deploying the complete app. This command does not subscribe to R2 or create billable resources.');
  }
  run('../node_modules/wrangler/bin/wrangler.js', ['deploy', '--config', 'dist/server/wrangler.json', '--keep-vars']);
}
