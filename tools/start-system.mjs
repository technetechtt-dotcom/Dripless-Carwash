import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const root = process.cwd();

const services = [
  {
    name: 'backend',
    cwd: resolve(root, 'backend-api'),
    command: 'npm',
    args: ['run', 'dev']
  },
  {
    name: 'customer',
    cwd: resolve(root, 'Dripless Customer'),
    command: 'npm',
    args: ['run', 'dev']
  },
  {
    name: 'driver',
    cwd: resolve(root, 'Dripless Driver'),
    command: 'npm',
    args: ['run', 'dev']
  },
  {
    name: 'ops-admin',
    cwd: resolve(root, 'Dripless Ops Admin'),
    command: 'npm',
    args: ['run', 'dev']
  }
];

const children = new Map();
let shuttingDown = false;

const log = (serviceName, message) => {
  const lines = String(message).split(/\r?\n/).filter(Boolean);
  for (const line of lines) {
    process.stdout.write(`[${serviceName}] ${line}\n`);
  }
};

const stopAll = (signal = 'SIGTERM') => {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children.values()) {
    if (!child.killed) {
      child.kill(signal);
    }
  }
};

for (const service of services) {
  const child = spawn(service.command, service.args, {
    cwd: service.cwd,
    shell: true,
    env: process.env
  });

  children.set(service.name, child);
  log(service.name, `started in ${service.cwd}`);

  child.stdout.on('data', (data) => log(service.name, data));
  child.stderr.on('data', (data) => log(service.name, data));

  child.on('exit', (code) => {
    log(service.name, `exited with code ${code ?? 'null'}`);
    children.delete(service.name);
    if (!shuttingDown && code !== 0) {
      process.exitCode = 1;
      stopAll();
    }
    if (children.size === 0) {
      process.exit(process.exitCode ?? 0);
    }
  });
}

process.on('SIGINT', () => stopAll('SIGINT'));
process.on('SIGTERM', () => stopAll('SIGTERM'));
