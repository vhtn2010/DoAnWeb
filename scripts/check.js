const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');

const resolveNodeTool = (workspace, toolSegments) => {
  const candidates = [
    path.join(rootDir, 'node_modules', ...toolSegments),
    path.join(rootDir, workspace, 'node_modules', ...toolSegments),
  ];
  const toolPath = candidates.find((candidate) => fs.existsSync(candidate));

  if (!toolPath) {
    throw new Error(
      `Cannot find ${toolSegments.join('/')} in root or ${workspace} node_modules. Run npm ci first.`,
    );
  }

  return toolPath;
};

const tasks = [
  {
    cwd: 'frontend',
    command: process.execPath,
    args: [
      resolveNodeTool('frontend', ['oxlint', 'bin', 'oxlint']),
      '--ignore-pattern',
      'build-check/**',
    ],
  },
  {
    cwd: 'frontend',
    command: process.execPath,
    args: [
      resolveNodeTool('frontend', ['vite', 'bin', 'vite.js']),
      'build',
      '--configLoader',
      'native',
    ],
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
