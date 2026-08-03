import { NavLink } from 'react-router-dom';
import type { DashboardTab, OpsPreset } from '../pages/dashboard/navigation';
import { getDashboardTabPath } from '../pages/dashboard/navigation';

type TabItem = {
  key: DashboardTab;
  label: string;
  badgeCount?: number;
};

type OpsSidebarProps = {
  activeTab: DashboardTab;
  visibleTabs: TabItem[];
  preset: OpsPreset;
  onPresetChange: (preset: OpsPreset) => void;
  onLogout: () => void;
  adminName?: string;
};

const getNavBadgeClassName = (count: number) => {
  if (count >= 3) return 'ops-nav-badge ops-nav-badge-danger';
  return 'ops-nav-badge ops-nav-badge-warning';
};

export const OpsSidebar = ({
  activeTab,
  visibleTabs,
  preset,
  onPresetChange,
  onLogout,
  adminName
}: OpsSidebarProps) => (
  <aside className="card ops-sidebar stack">
    <h2 style={{ margin: 0 }}>Ops Console</h2>
    <p className="muted" style={{ margin: 0 }}>
      Signed in as {adminName ?? 'Ops Admin'}
    </p>
    <nav aria-label="Dashboard pages">
      <ul className="ops-nav-list">
        {visibleTabs.map((tab) => (
          <li key={tab.key}>
            <NavLink
              to={getDashboardTabPath(tab.key)}
              className={({ isActive }) =>
                `ops-nav-link ${isActive || activeTab === tab.key ? 'is-active' : ''}`
              }>
              <span>{tab.label}</span>
              {tab.badgeCount && tab.badgeCount > 0 ? (
                <span className={getNavBadgeClassName(tab.badgeCount)}>{tab.badgeCount}</span>
              ) : null}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
    <div className="stack">
      <span className="muted">Workspace preset</span>
      <button className={preset === 'super_admin' ? '' : 'secondary'} onClick={() => onPresetChange('super_admin')}>
        Super Admin
      </button>
      <button className={preset === 'dispatcher' ? '' : 'secondary'} onClick={() => onPresetChange('dispatcher')}>
        Dispatcher
      </button>
      <button className={preset === 'support' ? '' : 'secondary'} onClick={() => onPresetChange('support')}>
        Support
      </button>
      <button className={preset === 'compliance' ? '' : 'secondary'} onClick={() => onPresetChange('compliance')}>
        Compliance
      </button>
    </div>
    <button className="secondary" onClick={onLogout}>
      Logout
    </button>
  </aside>
);
