import { useMemo } from 'react';
import { Booking } from '../types';

export function useDriverStats(completedBookings: Booking[]) {
  const stats = useMemo(() => {
    const today = new Date().toDateString();

    // Calculate today's stats
    const todayJobs = completedBookings.filter(
      (b) => new Date(b.timestamp).toDateString() === today
    );

    const todayEarnings = todayJobs.reduce((sum, job) => sum + job.earnings, 0);

    // Calculate total stats
    const totalEarnings = completedBookings.reduce(
      (sum, job) => sum + job.earnings,
      0
    );
    const totalJobs = completedBookings.length;

    // Calculate breakdown by type (launch-aligned)
    const breakdown = {
      WASH: completedBookings.
      filter((b) => b.type === 'WASH').
      reduce((sum, b) => sum + b.earnings, 0),
      HOME_SERVICE: completedBookings.
      filter((b) => b.type === 'HOME_SERVICE').
      reduce((sum, b) => sum + b.earnings, 0),
      PARCEL: completedBookings.
      filter((b) => b.type === 'PARCEL').
      reduce((sum, b) => sum + b.earnings, 0)
    };

    const todayHours = todayJobs.reduce((sum, job) => {
      const minutes = Number.parseFloat(job.duration);
      return sum + (Number.isFinite(minutes) ? minutes / 60 : 0);
    }, 0);

    return {
      todayEarnings,
      todayJobs: todayJobs.length,
      todayHours,
      totalEarnings,
      totalJobs,
      breakdown
    };
  }, [completedBookings]);

  return stats;
}
