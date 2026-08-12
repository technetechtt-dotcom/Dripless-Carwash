import type {
  BookingContract,
  CustomerProfile,
  DriverProfile,
  OpsActivityItem
} from '@shared/types';
import { formatActivityMessage, humanizeActivityType } from '../formatters';

type AuditSectionProps = {
  activity: OpsActivityItem[];
  activityTypeFilter: OpsActivityItem['type'] | 'ALL';
  activityQuery: string;
  activityTypeOptions: Array<OpsActivityItem['type'] | 'ALL'>;
  activityPage: number;
  activityTotalPages: number;
  canGoPrevious: boolean;
  canGoNext: boolean;
  customers: CustomerProfile[];
  drivers: DriverProfile[];
  bookings: BookingContract[];
  onTypeFilterChange: (value: OpsActivityItem['type'] | 'ALL') => void;
  onQueryChange: (value: string) => void;
  onPrevious: () => void;
  onNext: () => void;
};

export const AuditSection = ({
  activity,
  activityTypeFilter,
  activityQuery,
  activityTypeOptions,
  activityPage,
  activityTotalPages,
  canGoPrevious,
  canGoNext,
  customers,
  drivers,
  bookings,
  onTypeFilterChange,
  onQueryChange,
  onPrevious,
  onNext
}: AuditSectionProps) => (
  <section className="stack" aria-label="Audit log">
    <div className="card stack">
      <h2 style={{ margin: 0 }}>Administrative history</h2>
      <p className="muted" style={{ margin: 0 }}>
        Who changed what, when, and related objects — in operator-readable language.
      </p>
      <div className="row">
        <label style={{ flex: 1 }}>
          Search
          <input
            value={activityQuery}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Actor, target, message…"
          />
        </label>
        <label>
          Type
          <select
            value={activityTypeFilter}
            onChange={(e) =>
              onTypeFilterChange(e.target.value as OpsActivityItem['type'] | 'ALL')
            }>
            {activityTypeOptions.map((type) => (
              <option key={type} value={type}>
                {type === 'ALL' ? 'All types' : humanizeActivityType(type)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {activity.length === 0 ? (
        <p className="muted">No audit entries match.</p>
      ) : (
        <ul className="list">
          {activity.map((item) => (
            <li key={item.id}>
              <strong>
                {formatActivityMessage(item, { customers, drivers, bookings })}
              </strong>
              <div className="muted">
                {humanizeActivityType(item.type)} · {item.actorRole} ·{' '}
                {new Date(item.createdAt).toLocaleString()}
              </div>
              {item.message ? <div>{item.message}</div> : null}
            </li>
          ))}
        </ul>
      )}

      <div className="row">
        <button type="button" className="secondary" onClick={onPrevious} disabled={!canGoPrevious}>
          Previous
        </button>
        <span className="muted">
          Page {activityPage} / {activityTotalPages}
        </span>
        <button type="button" className="secondary" onClick={onNext} disabled={!canGoNext}>
          Next
        </button>
      </div>
    </div>
  </section>
);
