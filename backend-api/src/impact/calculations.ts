/** Operational eco estimates — not laboratory measurements. */
export const CO2_KG_PER_LITRE_WATER_SAVED = 0.036;
export const PLASTIC_KG_PER_WASH = 0.42;

export function estimateCo2KgSaved(waterSavedLitres: number) {
  return Number((waterSavedLitres * CO2_KG_PER_LITRE_WATER_SAVED).toFixed(1));
}

export function estimatePlasticKgReduced(washes: number) {
  return Number((washes * PLASTIC_KG_PER_WASH).toFixed(1));
}

export function estimateProjectedCo2KgYear(completedDates: Date[], co2KgSaved: number) {
  if (completedDates.length === 0 || co2KgSaved <= 0) return 0;
  const months = new Set(
    completedDates.map((date) => `${date.getFullYear()}-${date.getMonth()}`)
  );
  const monthsActive = Math.max(1, months.size);
  return Number(((co2KgSaved / monthsActive) * 12).toFixed(1));
}

export function computeEcoStreakDays(completedDates: Date[]) {
  if (completedDates.length === 0) return 0;
  const days = new Set(
    completedDates.map((date) => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    })
  );
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  while (days.has(cursor.getTime())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
