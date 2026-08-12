# Water savings methodology

Dripless estimates water impact for operational and customer reporting. These figures are **engineering estimates**, not laboratory measurements, and should be labelled as such in ESG materials.

- Traditional hose-wash baseline: **150 litres** per passenger vehicle wash.
- Dripless process water: **1.5 litres** per wash (default `WashPackage.waterLitresEstimate`).
- Water saved per wash: `traditionalLitres - waterLitresEstimate` (default **148.5 L**).

Totals are summed from completed bookings (`waterLitresUsed`, `waterLitresSaved`). Fleet and platform dashboards use the same ledger. Carbon-equivalent claims are not currently asserted unless a separate, cited factor is added.
