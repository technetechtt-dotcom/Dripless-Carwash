import type {
  OpsSpecial,
  SpecialAudience,
  SpecialDiscountType,
  SpecialServiceScope
} from '@shared/types';

type SpecialsSectionProps = {
  specials: OpsSpecial[];
  canManageSpecials: boolean;
  specialTitle: string;
  specialDescription: string;
  specialPromoCode: string;
  specialAudience: SpecialAudience;
  specialScope: SpecialServiceScope;
  specialDiscountType: SpecialDiscountType;
  specialDiscountValue: number;
  specialStartsAt: string;
  specialEndsAt: string;
  specialTerms: string;
  onSpecialTitleChange: (value: string) => void;
  onSpecialDescriptionChange: (value: string) => void;
  onSpecialPromoCodeChange: (value: string) => void;
  onSpecialAudienceChange: (value: SpecialAudience) => void;
  onSpecialScopeChange: (value: SpecialServiceScope) => void;
  onSpecialDiscountTypeChange: (value: SpecialDiscountType) => void;
  onSpecialDiscountValueChange: (value: number) => void;
  onSpecialStartsAtChange: (value: string) => void;
  onSpecialEndsAtChange: (value: string) => void;
  onSpecialTermsChange: (value: string) => void;
  onCreateSpecial: () => void;
  onExportSpecials: () => void;
  onExportSpecialRedemptions: () => void;
  onCancelEdit: () => void;
  editingSpecialId: string | null;
  onApproveSpecial: (specialId: string) => void;
  onSetActivation: (specialId: string, isActive: boolean) => void;
  onLoadSpecialForEdit: (special: OpsSpecial) => void;
  onDeleteSpecial: (specialId: string) => void;
  specialsRedemptionsInRange: number;
  topSpecialsByRange: Array<{ specialId: string; title: string; promoCode: string; count: number }>;
  audienceBreakdownInRange: Array<{ audience: string; count: number }>;
  serviceScopeBreakdownInRange: Array<{ serviceScope: string; count: number }>;
};

const formatDiscount = (special: OpsSpecial) =>
  special.discountType === 'PERCENT'
    ? `${special.discountValue}%`
    : `$${special.discountValue.toFixed(2)}`;

export const SpecialsSection = ({
  specials,
  canManageSpecials,
  specialTitle,
  specialDescription,
  specialPromoCode,
  specialAudience,
  specialScope,
  specialDiscountType,
  specialDiscountValue,
  specialStartsAt,
  specialEndsAt,
  specialTerms,
  onSpecialTitleChange,
  onSpecialDescriptionChange,
  onSpecialPromoCodeChange,
  onSpecialAudienceChange,
  onSpecialScopeChange,
  onSpecialDiscountTypeChange,
  onSpecialDiscountValueChange,
  onSpecialStartsAtChange,
  onSpecialEndsAtChange,
  onSpecialTermsChange,
  onCreateSpecial,
  onExportSpecials,
  onExportSpecialRedemptions,
  onCancelEdit,
  editingSpecialId,
  onApproveSpecial,
  onSetActivation,
  onLoadSpecialForEdit,
  onDeleteSpecial,
  specialsRedemptionsInRange,
  topSpecialsByRange,
  audienceBreakdownInRange,
  serviceScopeBreakdownInRange
}: SpecialsSectionProps) => {
  const now = Date.now();
  const liveCount = specials.filter((special) => {
    if (!special.approved || !special.isActive) return false;
    const starts = Date.parse(special.startsAt);
    const ends = Date.parse(special.endsAt);
    if (!Number.isNaN(starts) && starts > now) return false;
    if (!Number.isNaN(ends) && ends < now) return false;
    return true;
  }).length;
  const pendingApprovalCount = specials.filter((special) => !special.approved).length;
  const approvedInactiveCount = specials.filter(
    (special) => special.approved && !special.isActive
  ).length;
  const totalRedemptions = specials.reduce(
    (total, special) => total + (special.redemptionCount ?? 0),
    0
  );

  return (
  <div className="stack">
    <div className="grid">
      <div className="card">
        <div className="muted">Total specials</div>
        <div style={{ fontSize: 24, fontWeight: 700 }}>{specials.length}</div>
      </div>
      <div className="card">
        <div className="muted">Live now</div>
        <div style={{ fontSize: 24, fontWeight: 700 }}>{liveCount}</div>
      </div>
      <div className="card">
        <div className="muted">Pending approval</div>
        <div style={{ fontSize: 24, fontWeight: 700 }}>{pendingApprovalCount}</div>
      </div>
      <div className="card">
        <div className="muted">Approved not active</div>
        <div style={{ fontSize: 24, fontWeight: 700 }}>{approvedInactiveCount}</div>
      </div>
      <div className="card">
        <div className="muted">Total redemptions</div>
        <div style={{ fontSize: 24, fontWeight: 700 }}>{totalRedemptions}</div>
      </div>
      <div className="card">
        <div className="muted">Redemptions in selected range</div>
        <div style={{ fontSize: 24, fontWeight: 700 }}>{specialsRedemptionsInRange}</div>
      </div>
    </div>
    <div className="row" style={{ alignItems: 'start' }}>
      <div className="card stack" style={{ flex: 1 }}>
        <h2 style={{ margin: 0 }}>Top specials (selected range)</h2>
        {topSpecialsByRange.length === 0 ? (
          <p className="muted">No redemptions recorded in selected analytics range.</p>
        ) : (
          <ul className="list">
            {topSpecialsByRange.slice(0, 5).map((item) => (
              <li key={item.specialId}>
                <strong>{item.title}</strong> ({item.promoCode}) - {item.count} redemption(s)
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="card stack" style={{ flex: 1 }}>
        <h2 style={{ margin: 0 }}>Audience and scope breakdown</h2>
        <h3 style={{ margin: '0 0 4px 0' }}>By audience</h3>
        {audienceBreakdownInRange.length === 0 ? (
          <p className="muted">No audience redemption data in selected range.</p>
        ) : (
          <ul className="list">
            {audienceBreakdownInRange.map((item) => (
              <li key={item.audience}>
                <strong>{item.audience}</strong> - {item.count}
              </li>
            ))}
          </ul>
        )}
        <h3 style={{ margin: '8px 0 4px 0' }}>By service scope</h3>
        {serviceScopeBreakdownInRange.length === 0 ? (
          <p className="muted">No scope redemption data in selected range.</p>
        ) : (
          <ul className="list">
            {serviceScopeBreakdownInRange.map((item) => (
              <li key={item.serviceScope}>
                <strong>{item.serviceScope}</strong> - {item.count}
              </li>
            ))}
          </ul>
        )}
        <button className="secondary" onClick={onExportSpecialRedemptions}>
          Export redemption activity CSV
        </button>
      </div>
    </div>
    <div className="row" style={{ alignItems: 'start' }}>
    <div className="card stack" style={{ flex: 1 }}>
      <h2 style={{ margin: 0 }}>Create special campaign</h2>
      <input
        value={specialTitle}
        onChange={(event) => onSpecialTitleChange(event.target.value)}
        placeholder="Campaign title"
      />
      <textarea
        rows={3}
        value={specialDescription}
        onChange={(event) => onSpecialDescriptionChange(event.target.value)}
        placeholder="Campaign description"
      />
      <div className="row">
        <input
          value={specialPromoCode}
          onChange={(event) => onSpecialPromoCodeChange(event.target.value)}
          placeholder="Promo code"
        />
        <select
          value={specialAudience}
          onChange={(event) => onSpecialAudienceChange(event.target.value as SpecialAudience)}>
          <option value="customer">Customers only</option>
          <option value="driver">Drivers only</option>
          <option value="all">Customers and drivers</option>
        </select>
      </div>
      <div className="row">
        <select
          value={specialScope}
          onChange={(event) => onSpecialScopeChange(event.target.value as SpecialServiceScope)}>
          <option value="ALL">All services</option>
          <option value="CAR_WASH">Car wash</option>
          <option value="WINDOW_SOLAR">Window and solar</option>
          <option value="MATTRESS">Mattress cleaning</option>
          <option value="COUCH">Couch cleaning</option>
          <option value="CARPET">Carpet cleaning</option>
          <option value="RIDE">Ride</option>
          <option value="DELIVERY">Delivery</option>
        </select>
        <select
          value={specialDiscountType}
          onChange={(event) =>
            onSpecialDiscountTypeChange(event.target.value as SpecialDiscountType)
          }>
          <option value="PERCENT">Percent discount</option>
          <option value="FIXED">Fixed amount discount</option>
        </select>
        <input
          type="number"
          min={0.01}
          step={0.01}
          value={specialDiscountValue}
          onChange={(event) => onSpecialDiscountValueChange(Number(event.target.value) || 0)}
          placeholder="Discount value"
        />
      </div>
      <div className="row">
        <label className="row">
          <span className="muted">Starts</span>
          <input
            type="datetime-local"
            value={specialStartsAt}
            onChange={(event) => onSpecialStartsAtChange(event.target.value)}
          />
        </label>
        <label className="row">
          <span className="muted">Ends</span>
          <input
            type="datetime-local"
            value={specialEndsAt}
            onChange={(event) => onSpecialEndsAtChange(event.target.value)}
          />
        </label>
      </div>
      <textarea
        rows={3}
        value={specialTerms}
        onChange={(event) => onSpecialTermsChange(event.target.value)}
        placeholder="Terms and conditions"
      />
      <button onClick={onCreateSpecial} disabled={!canManageSpecials}>
        {editingSpecialId ? 'Update special' : 'Save as draft'}
      </button>
      <button className="secondary" onClick={onExportSpecials}>
        Export specials CSV
      </button>
      {editingSpecialId ? (
        <button className="secondary" onClick={onCancelEdit}>
          Cancel edit
        </button>
      ) : null}
    </div>

    <div className="card stack" style={{ flex: 1 }}>
      <h2 style={{ margin: 0 }}>Special approval and activation</h2>
      {specials.length === 0 ? (
        <p className="muted">No specials yet. Create one to begin workflow.</p>
      ) : (
        <ul className="list">
          {specials.map((special) => (
            <li key={special.id}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <strong>{special.title}</strong>
                <span className={special.isActive ? 'pill-ok' : 'pill'}>
                  {special.isActive ? 'LIVE' : 'INACTIVE'}
                </span>
              </div>
              <div className="muted">
                {special.promoCode} - {formatDiscount(special)} - {special.audience} -{' '}
                {special.serviceScope}
              </div>
              <div className="muted">{special.description}</div>
              <div className="muted">
                {new Date(special.startsAt).toLocaleString()} to{' '}
                {new Date(special.endsAt).toLocaleString()}
              </div>
              <div className="muted">
                Redemptions: {special.redemptionCount ?? 0}
                {special.lastRedeemedAt ?
                  ` - Last redeemed ${new Date(special.lastRedeemedAt).toLocaleString()}` :
                  ''}
              </div>
              <div className="row">
                <button
                  className="secondary"
                  onClick={() => onLoadSpecialForEdit(special)}
                  disabled={!canManageSpecials}>
                  Edit
                </button>
                <button
                  className="secondary"
                  onClick={() => onApproveSpecial(special.id)}
                  disabled={!canManageSpecials || special.approved}>
                  {special.approved ? 'Approved' : 'Approve'}
                </button>
                <button
                  className="warning"
                  onClick={() => onSetActivation(special.id, true)}
                  disabled={!canManageSpecials || !special.approved || special.isActive}>
                  Activate
                </button>
                <button
                  className="secondary"
                  onClick={() => onSetActivation(special.id, false)}
                  disabled={!canManageSpecials || !special.isActive}>
                  Deactivate
                </button>
                <button
                  className="warning"
                  onClick={() => onDeleteSpecial(special.id)}
                  disabled={!canManageSpecials}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  </div>
  </div>
  );
};
