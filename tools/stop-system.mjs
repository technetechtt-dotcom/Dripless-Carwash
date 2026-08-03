import { execSync } from 'node:child_process';

const ports = [4000, 5173, 5174, 5175];

const getPidsForPortWindows = (port) => {
  try {
    const output = execSync(`netstat -ano -p tcp | findstr :${port}`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    });
    return Array.from(
      new Set(
        output
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => line.split(/\s+/).pop())
          .filter(Boolean)
      )
    );
  } catch {
    return [];
  }
};

const getPidsForPortUnix = (port) => {
  try {
    const output = execSync(`lsof -ti tcp:${port}`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    });
    return Array.from(
      new Set(output.split(/\r?\n/).map((item) => item.trim()).filter(Boolean))
    );
  } catch {
    return [];
  }
};

const killPid = (pid) => {
  if (process.platform === 'win32') {
    execSync(`taskkill /PID ${pid} /T /F`, {
      stdio: ['ignore', 'pipe', 'pipe']
    });
  } else {
    execSync(`kill -9 ${pid}`, {
      stdio: ['ignore', 'pipe', 'pipe']
    });
  }
};

const allKilled = [];

for (const port of ports) {
  const pids =
    process.platform === 'win32' ?
    getPidsForPortWindows(port) :
    getPidsForPortUnix(port);

  if (pids.length === 0) {
    console.log(`No process found on port ${port}.`);
    continue;
  }

  for (const pid of pids) {
    try {
      killPid(pid);
      console.log(`Stopped PID ${pid} on port ${port}.`);
      allKilled.push(pid);
    } catch (error) {
      console.error(
        `Failed to stop PID ${pid} on port ${port}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`
      );
      process.exitCode = 1;
    }
  }
}

if (allKilled.length === 0) {
  console.log('No running stack services found.');
} else {
  console.log(`Stopped ${allKilled.length} process(es).`);
}
