const { execFileSync } = require('node:child_process');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const binExt = process.platform === 'win32' ? '.cmd' : '';

const tasks = [
  {
    cwd: 'frontend',
    command: path.join(rootDir, 'frontend', 'node_modules', '.bin', `oxlint${binExt}`),
    args: [],
  },
  {
    cwd: 'frontend',
    command: path.join(rootDir, 'frontend', 'node_modules', '.bin', `vite${binExt}`),
    args: ['build', '--configLoader', 'native'],
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
  const command =
    process.platform === 'win32' && task.command.endsWith('.cmd')
      ? process.env.ComSpec
      : task.command;
  const args =
    process.platform === 'win32' && task.command.endsWith('.cmd')
      ? ['/d', '/s', '/c', task.command, ...task.args]
      : task.args;

  execFileSync(command, args, {
    cwd: path.join(rootDir, task.cwd),
    env: childEnv,
    stdio: 'inherit',
  });
}
