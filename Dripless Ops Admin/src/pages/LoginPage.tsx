import { useState } from 'react';
import { apiRuntimeConfig } from '@shared/api';
import { useOpsAuth } from '../contexts/OpsAuthContext';

export const LoginPage = () => {
  const { login, isLoading } = useOpsAuth();
  const [email, setEmail] = useState('ops@demo.dripless.local');
  const [password, setPassword] = useState('DemoPass123!');
  const [apiBaseUrl, setApiBaseUrl] = useState(
    apiRuntimeConfig.getApiBaseUrl() || 'http://localhost:4000'
  );
  const [error, setError] = useState('');
  const [mfaToken, setMfaToken] = useState('');
  const [mfaCode, setMfaCode] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    try {
      if (apiBaseUrl.trim()) {
        apiRuntimeConfig.setApiBaseUrl(apiBaseUrl.trim());
      } else {
        apiRuntimeConfig.clearApiBaseUrl();
      }
      if (mfaToken) {
        await login(email, password, mfaCode, mfaToken);
      } else {
        await login(email, password);
      }
    } catch (authError) {
      const message =
        authError instanceof Error ? authError.message : 'Login failed';
      if (message === 'MFA_REQUIRED') {
        setMfaToken((authError as Error & { mfaToken?: string }).mfaToken || '');
        setError('Enter the authenticator code to continue.');
        return;
      }
      setError(message);
    }
  };

  return (
    <div className="container login-shell">
      <div className="card login-card stack">
        <div className="ops-brand">
          <div className="ops-brand-mark" aria-hidden>
            D
          </div>
          <div className="ops-brand-text">
            <strong>Dripless Ops</strong>
            <span>Command centre sign-in</span>
          </div>
        </div>
        <h1 style={{ margin: 0, fontSize: 26 }}>Sign in</h1>
        <p className="muted" style={{ margin: 0 }}>
          Dispatch, incidents, drivers and customer operations.
        </p>

        <form className="stack" onSubmit={handleSubmit}>
          <label className="stack">
            <span>Backend API URL (optional)</span>
            <input
              type="url"
              value={apiBaseUrl}
              onChange={(event) => setApiBaseUrl(event.target.value)}
              placeholder="https://api.driplesswash.com"
              autoComplete="url"
            />
          </label>
          <label className="stack">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="username"
            />
          </label>
          <label className="stack">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="current-password"
            />
          </label>
          {mfaToken ? (
            <label className="stack">
              <span>Authenticator code</span>
              <input
                type="text"
                inputMode="numeric"
                value={mfaCode}
                onChange={(event) => setMfaCode(event.target.value)}
                required
                autoComplete="one-time-code"
              />
            </label>
          ) : null}
          {error ? (
            <p className="card alert-danger" role="alert" style={{ margin: 0 }}>
              {error}
            </p>
          ) : null}
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="muted" style={{ margin: 0, fontSize: 12 }}>
          Demo: ops@demo.dripless.local / DemoPass123!
        </p>
      </div>
    </div>
  );
};
