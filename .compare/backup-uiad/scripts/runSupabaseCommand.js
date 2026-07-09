const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const repoRoot = path.resolve(__dirname, '..');
const backendEnvPath = path.join(repoRoot, 'backend', '.env');
const cliCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';

const parseEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const entries = {};
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmedLine.indexOf('=');

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmedLine.slice(0, separatorIndex).trim();
    const value = trimmedLine.slice(separatorIndex + 1).trim();

    entries[key] = value;
  }

  return entries;
};

const resolveProjectRef = (env) => {
  if (env.SUPABASE_PROJECT_REF) {
    return env.SUPABASE_PROJECT_REF;
  }

  const supabaseUrl = env.SUPABASE_URL;

  if (!supabaseUrl) {
    return null;
  }

  try {
    const url = new URL(supabaseUrl);
    return url.hostname.split('.')[0] || null;
  } catch {
    return null;
  }
};

const runNodeScript = (relativeScriptPath) => {
  const result = spawnSync(
    process.execPath,
    [path.join(repoRoot, relativeScriptPath)],
    {
      cwd: repoRoot,
      stdio: 'inherit',
      env: process.env,
    },
  );

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const runSupabase = (args, extraEnv = process.env) => {
  const result = spawnSync(cliCommand, ['supabase', ...args], {
    cwd: repoRoot,
    stdio: 'inherit',
    env: extraEnv,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const backendEnv = parseEnvFile(backendEnvPath);
const mergedEnv = {
  ...backendEnv,
  ...process.env,
};

const projectRef = resolveProjectRef(mergedEnv);
const dbPassword = mergedEnv.SUPABASE_DB_PASSWORD;
const dbUrl = mergedEnv.SUPABASE_DB_URL;
const command = process.argv[2];

const ensureValue = (value, message) => {
  if (!value) {
    console.error(message);
    process.exit(1);
  }
};

if (!command) {
  console.error('Missing Supabase command. Use one of: sync, link, push, push:dry-run.');
  process.exit(1);
}

if (command === 'sync') {
  runNodeScript('scripts/syncSupabaseMigrations.js');
  process.exit(0);
}

runNodeScript('scripts/syncSupabaseMigrations.js');

if (command === 'link') {
  ensureValue(
    projectRef,
    'Missing SUPABASE_PROJECT_REF or SUPABASE_URL. Cannot resolve the Supabase project ref.',
  );
  ensureValue(
    dbPassword,
    'Missing SUPABASE_DB_PASSWORD. Set it in your shell before linking the remote project.',
  );

  runSupabase(['link', '--project-ref', projectRef, '--password', dbPassword]);
  process.exit(0);
}

if (command === 'push' || command === 'push:dry-run') {
  if (dbUrl) {
    const args = ['db', 'push', '--db-url', dbUrl, '--include-all'];

    if (command === 'push:dry-run') {
      args.push('--dry-run');
    }

    runSupabase(args);
    process.exit(0);
  }

  ensureValue(
    projectRef,
    'Missing SUPABASE_PROJECT_REF or SUPABASE_URL. Cannot resolve the Supabase project ref.',
  );
  ensureValue(
    dbPassword,
    'Missing SUPABASE_DB_PASSWORD. Set it in your shell or provide SUPABASE_DB_URL to push directly.',
  );

  runSupabase(['link', '--project-ref', projectRef, '--password', dbPassword]);

  const args = ['db', 'push', '--linked', '--include-all', '--password', dbPassword];

  if (command === 'push:dry-run') {
    args.push('--dry-run');
  }

  runSupabase(args);
  process.exit(0);
}

console.error(`Unsupported Supabase command: ${command}`);
process.exit(1);
