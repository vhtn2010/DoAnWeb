const fs = require('node:fs');
const path = require('node:path');

const repoRoot = __dirname ? path.resolve(__dirname, '..') : process.cwd();
const backendMigrationsDir = path.join(
  repoRoot,
  'backend',
  'src',
  'database',
  'migrations',
);
const supabaseMigrationsDir = path.join(repoRoot, 'supabase', 'migrations');

const migrationMap = [
  {
    source: '001_initial_schema.up.sql',
    target: '20260628181000_initial_schema.sql',
  },
];

fs.mkdirSync(supabaseMigrationsDir, { recursive: true });

for (const migration of migrationMap) {
  const sourcePath = path.join(backendMigrationsDir, migration.source);
  const targetPath = path.join(supabaseMigrationsDir, migration.target);
  const sql = fs.readFileSync(sourcePath, 'utf8');

  fs.writeFileSync(targetPath, sql, 'utf8');
  console.log(`Synced ${migration.source} -> supabase/migrations/${migration.target}`);
}
