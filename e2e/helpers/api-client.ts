export const API = process.env.E2E_API_URL || process.env.SMOKE_BASE_URL || 'http://localhost:4000';

export async function api<T = unknown>(
  path: string,
  method = 'GET',
  body?: unknown,
  token?: string
): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const raw = await response.text();
  const payload = raw ? JSON.parse(raw) : null;
  if (!response.ok) {
    throw new Error(`${method} ${path} failed (${response.status}): ${raw}`);
  }
  return payload as T;
}

export async function loginCustomer(email: string, password: string) {
  const session = await api<{ session: { tokens: { accessToken: string } } }>(
    '/auth/customer/login',
    'POST',
    { email, password }
  );
  return session.session.tokens.accessToken;
}

export async function loginDriver(email: string, password: string) {
  const session = await api<{ session: { tokens: { accessToken: string } } }>(
    '/auth/driver/login',
    'POST',
    { email, password }
  );
  return session.session.tokens.accessToken;
}

export async function loginOps(email: string, password: string) {
  const session = await api<{ session: { tokens: { accessToken: string } } }>(
    '/auth/ops-admin/login',
    'POST',
    { email, password }
  );
  return session.session.tokens.accessToken;
}
