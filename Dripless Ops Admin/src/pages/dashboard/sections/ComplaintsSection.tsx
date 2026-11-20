type ComplaintRow = {
  id: string;
  bookingId?: string | null;
  category: string;
  body: string;
  status: string;
  resolution?: string | null;
  createdAt: string;
};

type ComplaintsSectionProps = {
  complaints: ComplaintRow[];
  canManage: boolean;
  onRefresh: () => void;
  onUpdate: (complaintId: string, status: 'IN_REVIEW' | 'ESCALATED' | 'RESOLVED' | 'REJECTED', resolution?: string) => void;
  onOpenBooking: (bookingId: string) => void;
};

export const ComplaintsSection = ({
  complaints,
  canManage,
  onRefresh,
  onUpdate,
  onOpenBooking
}: ComplaintsSectionProps) => {
  const open = complaints.filter((c) => !['RESOLVED', 'REJECTED'].includes(c.status));

  return (
    <section className="stack" aria-label="Customer complaints" style={{ marginTop: '1.5rem' }}>
      <div className="card stack">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0 }}>Customer complaints ({open.length} open)</h2>
          <button type="button" className="secondary" onClick={onRefresh}>
            Refresh
          </button>
        </div>
        {complaints.length === 0 ? (
          <p className="muted">No customer complaints yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <caption className="sr-only">Customer service complaints</caption>
              <thead>
                <tr>
                  <th scope="col">Status</th>
                  <th scope="col">Category</th>
                  <th scope="col">Booking</th>
                  <th scope="col">Details</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {complaints.map((complaint) => (
                  <tr key={complaint.id}>
                    <td>{complaint.status}</td>
                    <td>{complaint.category}</td>
                    <td>
                      {complaint.bookingId ? (
                        <button type="button" className="linkish" onClick={() => onOpenBooking(complaint.bookingId!)}>
                          {complaint.bookingId.slice(0, 8)}
                        </button>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td style={{ maxWidth: 320 }}>
                      <div>{complaint.body}</div>
                      {complaint.resolution ? (
                        <div className="muted" style={{ marginTop: 4 }}>
                          Resolution: {complaint.resolution}
                        </div>
                      ) : null}
                    </td>
                    <td>
                      {canManage && !['RESOLVED', 'REJECTED'].includes(complaint.status) ? (
                        <div className="row">
                          <button
                            type="button"
                            className="secondary"
                            onClick={() => onUpdate(complaint.id, 'IN_REVIEW')}
                          >
                            Review
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const resolution = window.prompt(
                                'Resolution note (min 10 chars)',
                                'Issue reviewed and closed with customer follow-up.'
                              );
                              if (resolution && resolution.trim().length >= 10) {
                                onUpdate(complaint.id, 'RESOLVED', resolution.trim());
                              }
                            }}
                          >
                            Resolve
                          </button>
                        </div>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
};
