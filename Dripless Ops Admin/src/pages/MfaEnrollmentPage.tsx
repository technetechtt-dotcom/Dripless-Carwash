import { useState } from 'react';
import { mfaApi } from '@shared/api';
import { useOpsAuth } from '../contexts/OpsAuthContext';

type Setup = { secret: string; otpauthUrl: string };

export function MfaEnrollmentPage() {
  const { enrollTotp, enrollPasskey, finishMfaEnrollment, logout } = useOpsAuth();
  const [setup, setSetup] = useState<Setup | null>(null);
  const [token, setToken] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const beginTotp = async () => {
    setBusy(true);
    setError('');
    try {
      setSetup(await mfaApi.beginSetup());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not begin MFA setup');
    } finally {
      setBusy(false);
    }
  };

  const verifyTotp = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      setBackupCodes(await enrollTotp(token));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Authenticator verification failed');
    } finally {
      setBusy(false);
    }
  };

  const beginPasskey = async () => {
    setBusy(true);
    setError('');
    try {
      await enrollPasskey();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Passkey enrollment failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="container login-shell">
      <section className="card login-card stack" aria-labelledby="mfa-title">
        <div className="ops-brand">
          <div className="ops-brand-mark" aria-hidden>D</div>
          <div className="ops-brand-text"><strong>Dripless Ops</strong><span>Account protection</span></div>
        </div>
        <h1 id="mfa-title" style={{ margin: 0, fontSize: 26 }}>Secure this admin account</h1>
        <p className="muted" style={{ margin: 0 }}>
          Multi-factor authentication is required before operational data can be accessed.
        </p>

        {backupCodes.length ? (
          <div className="stack">
            <h2 style={{ margin: 0, fontSize: 18 }}>Save your recovery codes</h2>
            <p className="muted">Each code works once. Store them in your password manager; they will not be shown again.</p>
            <pre className="card" style={{ whiteSpace: 'pre-wrap', userSelect: 'all' }}>{backupCodes.join('\n')}</pre>
            <button type="button" onClick={finishMfaEnrollment}>I have saved these codes</button>
          </div>
        ) : setup ? (
          <form className="stack" onSubmit={verifyTotp}>
            <p style={{ margin: 0 }}>Add this secret to your authenticator app:</p>
            <code className="card" style={{ overflowWrap: 'anywhere', userSelect: 'all' }}>{setup.secret}</code>
            <a href={setup.otpauthUrl}>Open in authenticator app</a>
            <label className="stack">
              <span>Six-digit code</span>
              <input value={token} onChange={(event) => setToken(event.target.value)} inputMode="numeric" autoComplete="one-time-code" required minLength={6} maxLength={12} />
            </label>
            <button disabled={busy} type="submit">{busy ? 'Verifying…' : 'Verify and enable'}</button>
          </form>
        ) : (
          <div className="stack">
            <button disabled={busy} type="button" onClick={() => void beginPasskey()}>
              {busy ? 'Waiting for authenticator…' : 'Set up a passkey'}
            </button>
            <button disabled={busy} className="secondary" type="button" onClick={() => void beginTotp()}>
              Use an authenticator app
            </button>
          </div>
        )}
        {error ? <p className="card alert-danger" role="alert" style={{ margin: 0 }}>{error}</p> : null}
        <button className="secondary" type="button" onClick={() => void logout()}>Sign out</button>
      </section>
    </main>
  );
}
