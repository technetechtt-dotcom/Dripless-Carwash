# Commercial wash operations validation

Software packages are seeded in `backend-api/src/config/pilot.ts`. Field-validate before public launch:

| Item | Target / note | Pass? |
|------|---------------|-------|
| Real wash packages | Express exterior / Full valet match ops kit | ☐ |
| Vehicle-size pricing | Sedan / SUV / Bakkie / Truck | ☐ |
| Heavy mud surcharge | `HEAVY_DIRT` R5.00 | ☐ |
| Chemicals / consumables | Stock usage logged per wash | ☐ |
| Actual service duration | vs seeded 35 / 55 min | ☐ |
| Operator kit checklist | Before start | ☐ |
| Stock usage | Soap / wax / microfiber counts | ☐ |
| Damage inspection | BEFORE photo + DAMAGE upload | ☐ |
| Quality checklist | Driver checklist + completion PIN | ☐ |
| Rewash policy | Complaints SLA + free rewash rules | ☐ |
| Complaints SLA | Time-to-first-response | ☐ |
| Actual water usage | Litres / wash (eco impact) | ☐ |
| Actual cost per wash | Labour + chemicals + fuel | ☐ |

Link outcomes into `docs/WASH_PILOT_LOG.md` and adjust `PILOT_CONFIG` / catalog prices only after Ops sign-off.
