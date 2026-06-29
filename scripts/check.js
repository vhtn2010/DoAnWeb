const { execFileSync } = require('node:child_process');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');

const tasks = [
  {
    cwd: 'frontend',
    command: process.execPath,
    args: [path.join(rootDir, 'node_modules', 'oxlint', 'bin', 'oxlint')],
  },
  {
    cwd: 'frontend',
    command: process.execPath,
    args: [path.join(rootDir, 'node_modules', 'vite', 'bin', 'vite.js'), 'build', '--configLoader', 'native'],
  },
  {
    cwd: 'backend',
    command: process.execPath,
    args: ['--test', 'src/tests/*.test.js'],
  },
];

const childEnv = Object.fromEntries(
  Object.entries(process.env).filter(([key]) => !key.toLowerCase().startsWith('npm_')),
);

for (const task of tasks) {
  execFileSync(task.command, task.args, {
    cwd: path.join(rootDir, task.cwd),
    env: childEnv,
    stdio: 'inherit',
  });
}
