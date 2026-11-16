import { useEffect, useState } from 'react';
import { impactApi } from '@shared/api';
import type { ImpactSummary } from '@shared/api';

export function useEcoImpact() {
  const [summary, setSummary] = useState<ImpactSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await impactApi.summary();
        if (!cancelled) setSummary(data);
      } catch {
        if (!cancelled) setSummary(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    loading,
    totalEcoPoints: summary?.ecoPoints ?? 0,
    co2Saved: summary?.co2KgSaved ?? 0,
    treesSaved: Math.floor((summary?.co2KgSaved ?? 0) / 21),
    waterSaved: summary?.waterSavedLitres ?? 0,
    washes: summary?.washes ?? 0,
    ecoStreakDays: summary?.ecoStreakDays ?? 0
  };
}
