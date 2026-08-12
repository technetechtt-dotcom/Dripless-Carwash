# POPIA and privacy

## Lawful basis

| Category | Basis | Retention |
|---|---|---|
| Account identity | Contract | Account life + 5 years |
| Bookings and invoices | Contract / legal obligation | 7 years |
| Live GPS | Legitimate interest (dispatch) | 90 days |
| GPS history | Legitimate interest | 12 months |
| Wash evidence photos | Contract | 24 months |
| Driver documents | Legal obligation | Engagement + 5 years |
| Marketing | Consent | Until withdrawn |

## Customer controls

- `POST /privacy/consents` records TERMS, POPIA_PROCESSING, MARKETING, LOCATION, EVIDENCE_PHOTOS
- `POST /privacy/requests` with `EXPORT` or `DELETE` queues a DSAR job
- Account deletion anonymises email and suspends the profile

## Breach response

1. Contain (revoke sessions, rotate secrets).
2. Assess (what data, how many data subjects, SA residents).
3. Notify the Information Regulator and affected persons when required.
4. Record the incident in Ops audit logs.
