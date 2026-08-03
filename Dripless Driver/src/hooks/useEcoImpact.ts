import { useMemo } from 'react';
import { Booking } from '../types';

export function useEcoImpact(completedBookings: Booking[]) {
  const stats = useMemo(() => {
    // Mock calculations based on completed bookings
    // In a real app, these would be precise calculations based on distance/type

    const totalEcoPoints =
    completedBookings.reduce((sum, b) => sum + (b.ecoPoints || 0), 0) + 1250; // + base points

    // Approx: 10 points = 1kg CO2 saved
    const co2Saved = Math.round(totalEcoPoints / 10);

    // Approx: 100 points = 1 tree
    const treesSaved = Math.floor(totalEcoPoints / 100);

    // Approx: Waterless wash saves ~150L
    const waterSaved =
    completedBookings.filter((b) => b.type === 'WASH').length * 150 + 850; // + base amount

    return {
      totalEcoPoints,
      co2Saved,
      treesSaved,
      waterSaved
    };
  }, [completedBookings]);

  return stats;
}