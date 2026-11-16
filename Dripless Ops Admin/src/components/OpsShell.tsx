import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  dashboardTabs,
  filterTabsForPermissions,
  getDashboardTabPath,
  getTabMeta,
  navGroups,
  presetBlurb,
  presetLandingTab,
  presetLabel,
  type DashboardTab,
  type OpsPreset
} from '../pages/dashboard/navigation';
import { OpsIcon } from './OpsIcon';
import { passkeyApi } from '@shared/api';
import { startRegistration } from '@simplewebauthn/browser';
import type { PublicKeyCredentialCreationOptionsJSON } from '@simplewebauthn/browser';

export type NavBadgeMap = Partial<
  Record<'dispatch' | 'incidents' | 'inbox' | 'unassigned' | 'critical', { count: number; tone: 'warning' | 'danger' }>
>;

type OpsShellProps = {
  activeTab: DashboardTab;
  permissions: string[];
  badges: NavBadgeMap;
  adminEmail: string;
  adminName?: string;
  preset: OpsPreset;
  liveMode: boolean;
  onLiveModeChange: (value: boolean) => void;
  onLogout: () => void;
  onPresetSelect: (preset: OpsPreset) => void;
  globalSearch: string;
  onGlobalSearchChange: (value: string) => void;
  onGlobalSearchSubmit: () => void;
  onRefresh: () => void;
  lastSyncedAt?: string | null;
  isRefreshing?: boolean;
  children: ReactNode;
  breadcrumbs?: string[];
  feedback?: string;
  error?: string;
};

const STORAGE_COLLAPSE = 'dripless_ops_sidebar_collapsed';

export function OpsShell({
  activeTab,
  permissions,
  badges,
  adminEmail,
  adminName,
  preset,
  liveMode,
  onLiveModeChange,
  onLogout,
  onPresetSelect,
  globalSearch,
  onGlobalSearchChange,
  onGlobalSearchSubmit,
  onRefresh,
  children,
  breadcrumbs = [],
  feedback,
  error,
  lastSyncedAt,
  isRefreshing
}: OpsShellProps) {
  const [navOpen, setNavOpen] = useState(false);
  const [passkeyFeedback, setPasskeyFeedback] = useState('');
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_COLLAPSE) === '1';
    } catch {
      return false;
    }
  });

  const visibleItems = useMemo(() => filterTabsForPermissions(permissions), [permissions]);
  const visibleKeys = useMemo(() => new Set(visibleItems.map((item) => item.key)), [visibleItems]);
  const pageMeta = getTabMeta(activeTab);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_COLLAPSE, collapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  useEffect(() => {
    setNavOpen(false);
  }, [activeTab]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'b') {
        event.preventDefault();
        setCollapsed((value) => !value);
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        document.getElementById('ops-global-search')?.focus();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const registerPasskey = async () => {
    setPasskeyFeedback('Waiting for your authenticator…');
    try {
      const challenge = await passkeyApi.registrationOptions();
      const response = await startRegistration({
        optionsJSON: challenge.options as PublicKeyCredentialCreationOptionsJSON
      });
      await passkeyApi.verifyRegistration(challenge.challengeToken, response);
      setPasskeyFeedback('Passkey added');
    } catch (error) {
      setPasskeyFeedback(error instanceof Error ? error.message : 'Passkey setup failed');
    }
  };

  return (
    <div className="container">
      <a className="skip-link" href="#ops-main-content">
        Skip to content
      </a>
      {navOpen ? (
        <button
          type="button"
          className="nav-scrim"
          aria-label="Close navigation"
          onClick={() => setNavOpen(false)}
        />
      ) : null}
      <div className={`ops-shell ${collapsed ? 'is-collapsed' : ''} ${navOpen ? 'nav-open' : ''}`}>
        <aside className="ops-sidebar" aria-label="Ops navigation">
          <div className="ops-brand">
            <div className="ops-brand-mark" aria-hidden>
              D
            </div>
            <div className="ops-brand-text">
              <strong>Dripless Ops</strong>
              <span>Command centre</span>
            </div>
          </div>

          <nav aria-label="Dashboard pages">
            {navGroups.map((group) => {
              const items = dashboardTabs.filter(
                (item) => item.group === group.id && visibleKeys.has(item.key)
              );
              if (items.length === 0) return null;
              return (
                <div key={group.id} className="ops-nav-group">
                  <div className="ops-nav-group-label">{group.label}</div>
                  <ul className="ops-nav-list">
                    {items.map((item) => {
                      const badge = item.badgeKey ? badges[item.badgeKey] : undefined;
                      return (
                        <li key={item.key}>
                          <Link
                            to={getDashboardTabPath(item.key)}
                            className={`ops-nav-link ${activeTab === item.key ? 'is-active' : ''}`}
                            aria-current={activeTab === item.key ? 'page' : undefined}
                            title={item.label}>
                            <OpsIcon name={item.icon} />
                            <span className="ops-nav-label">{item.label}</span>
                            {badge && badge.count > 0 ? (
                              <span
                                className={`ops-nav-badge ops-nav-badge-${badge.tone}`}
                                aria-label={`${badge.count} pending in ${item.label}`}>
                                {badge.count}
                              </span>
                            ) : null}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </nav>

          <div className="ops-workspace">
            <label htmlFor="workspace-preset">Workspace layout</label>
            <select
              id="workspace-preset"
              value={preset}
              onChange={(event) => onPresetSelect(event.target.value as OpsPreset)}>
              {(Object.keys(presetLabel) as OpsPreset[]).map((key) => (
                <option key={key} value={key}>
                  {presetLabel[key]}
                </option>
              ))}
            </select>
            <p className="ops-workspace-help">{presetBlurb[preset]}</p>
          </div>

          <div className="ops-account">
            <div className="ops-account-meta">
              <strong>{adminName || adminEmail.split('@')[0] || 'Operator'}</strong>
              <span>{adminEmail}</span>
              <span className="muted">
                {permissions.includes('admin:bootstrap') ? 'Super admin' : 'Ops admin'}
              </span>
            </div>
            <button
              type="button"
              className="ghost"
              onClick={() => setCollapsed((value) => !value)}
              title="Collapse sidebar (Ctrl+B)">
              {collapsed ? 'Expand nav' : 'Collapse nav'}
            </button>
            <button type="button" className="ghost" onClick={() => void registerPasskey()}>
              Add passkey
            </button>
            {passkeyFeedback ? <span className="muted" role="status">{passkeyFeedback}</span> : null}
            <button type="button" className="danger" onClick={onLogout}>
              Log out
            </button>
          </div>
        </aside>

        <div className="ops-main" id="ops-main-content">
          <div className="mobile-top">
            <button type="button" className="secondary" onClick={() => setNavOpen(true)}>
              Menu
            </button>
            <strong>Dripless Ops</strong>
          </div>

          <div className="ops-topbar">
            <form
              className="ops-search"
              onSubmit={(event) => {
                event.preventDefault();
                onGlobalSearchSubmit();
              }}>
              <label className="sr-only" htmlFor="ops-global-search">
                Search bookings, customers, drivers or incidents
              </label>
              <input
                id="ops-global-search"
                value={globalSearch}
                onChange={(event) => onGlobalSearchChange(event.target.value)}
                placeholder="Search bookings, customers, drivers, phone, reg… (Ctrl+K)"
              />
              <button type="submit">Search</button>
            </form>
            <div className="ops-topbar-actions">
              <span className={`live-pill ${liveMode ? '' : 'is-off'}`}>
                <span className="live-dot" aria-hidden />
                {liveMode ? 'Live' : 'Paused'}
              </span>
              {lastSyncedAt ? (
                <span
                  className={`sync-pill ${isRefreshing ? 'is-stale' : ''}`}
                  title={new Date(lastSyncedAt).toLocaleString()}
                  aria-live="polite">
                  {isRefreshing ? 'Syncing…' : `Synced ${new Date(lastSyncedAt).toLocaleTimeString()}`}
                </span>
              ) : null}
              <button type="button" className="ghost" onClick={() => onLiveModeChange(!liveMode)}>
                {liveMode ? 'Pause refresh' : 'Resume live'}
              </button>
              <button type="button" className="secondary" onClick={onRefresh} disabled={isRefreshing}>
                {isRefreshing ? 'Refreshing…' : 'Refresh'}
              </button>
              {badges.critical && badges.critical.count > 0 ? (
                <span className="pill-danger" aria-live="polite">
                  {badges.critical.count} critical
                </span>
              ) : null}
            </div>
          </div>

          <header className="ops-page-header">
            {breadcrumbs.length > 0 ? (
              <p className="muted" aria-label="Breadcrumb">
                {breadcrumbs.join(' / ')}
              </p>
            ) : null}
            <h1>{pageMeta.label}</h1>
            <p>{pageMeta.subtitle}</p>
          </header>

          {error ? (
            <div className="card alert-danger" role="alert">
              {error}
            </div>
          ) : null}
          {feedback ? (
            <div className="card alert-success" role="status" aria-live="polite">
              {feedback}
            </div>
          ) : null}

          {children}
        </div>
      </div>
    </div>
  );
}

export function getPresetLandingTab(preset: OpsPreset): DashboardTab {
  return presetLandingTab[preset];
}
