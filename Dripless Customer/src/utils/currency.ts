/**
 * Centralized currency and points formatting (ZAR).
 * Use formatCurrency() everywhere instead of `$` literals.
 */
import { formatZar, formatZarSigned } from '@shared/currency';

export const formatZAR = formatZar;
export const formatCurrency = formatZar;
export const formatSignedCurrency = formatZarSigned;

// Format eco points: "1,250"
export const formatPoints = (points: number): string =>
points.toLocaleString('en-ZA');