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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    try {
      if (apiBaseUrl.trim()) {
        apiRuntimeConfig.setApiBaseUrl(apiBaseUrl.trim());
      } else {
        apiRuntimeConfig.clearApiBaseUrl();
      }
      await login(email, password);
    } catch (authError) {
      const message =
        authError instanceof Error ? authError.message : 'Login failed';
      setError(message);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 520, marginTop: 80 }}>
      <div className="card stack">
        <h1 style={{ margin: 0 }}>Dripless Ops Admin</h1>
        <p className="muted" style={{ margin: 0 }}>
          Manage customers, drivers, and live booking operations.
        </p>

        <form className="stack" onSubmit={handleSubmit}>
          <label className="stack">
            <span>Backend API URL (optional)</span>
            <input
              type="url"
              value={apiBaseUrl}
              onChange={(event) => setApiBaseUrl(event.target.value)}
              placeholder="https://api.driplesswash.com"
            />
          </label>
          <label className="stack">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className="stack">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          {error ? <p style={{ color: '#b91c1c', margin: 0 }}>{error}</p> : null}
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
};
