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

    // Calculate breakdown by type
    const breakdown = {
      RIDE: completedBookings.
      filter((b) => b.type === 'RIDE').
      reduce((sum, b) => sum + b.earnings, 0),
      WASH: completedBookings.
      filter((b) => b.type === 'WASH').
      reduce((sum, b) => sum + b.earnings, 0),
      PARCEL: completedBookings.
      filter((b) => b.type === 'PARCEL').
      reduce((sum, b) => sum + b.earnings, 0)
    };

    return {
      todayEarnings,
      todayJobs: todayJobs.length,
      todayHours: 5.2, // Mock data for now
      totalEarnings,
      totalJobs,
      breakdown
    };
  }, [completedBookings]);

  return stats;
}