const checks = [
  {
    name: 'backend-api',
    url: 'http://localhost:4000/health',
    validate: (payload) => payload && payload.ok === true
  },
  {
    name: 'customer-app',
    url: 'http://localhost:5173',
    validate: () => true
  },
  {
    name: 'driver-app',
    url: 'http://localhost:5174',
    validate: () => true
  },
  {
    name: 'ops-admin-app',
    url: 'http://localhost:5175',
    validate: () => true
  }
];

const timeoutMs = 4000;

const safeJson = async (response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const runCheck = async (check) => {
  try {
    const response = await fetch(check.url, {
      signal: AbortSignal.timeout(timeoutMs)
    });
    if (!response.ok) {
      return {
        ...check,
        ok: false,
        detail: `HTTP ${response.status}`
      };
    }

    const payload = await safeJson(response);
    const valid = check.validate(payload);
    return {
      ...check,
      ok: valid,
      detail: valid ? 'OK' : 'Unexpected response payload'
    };
  } catch (error) {
    return {
      ...check,
      ok: false,
      detail: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

const results = await Promise.all(checks.map((check) => runCheck(check)));
let hasFailure = false;

for (const result of results) {
  if (result.ok) {
    console.log(`PASS ${result.name} -> ${result.url}`);
  } else {
    hasFailure = true;
    console.error(`FAIL ${result.name} -> ${result.url} (${result.detail})`);
  }
}

if (hasFailure) {
  process.exitCode = 1;
  console.error(
    'One or more services are unhealthy. Start the full stack with `npm run dev:all`.'
  );
} else {
  console.log('All services are healthy.');
}
