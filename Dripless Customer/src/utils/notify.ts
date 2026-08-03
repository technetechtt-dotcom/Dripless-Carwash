/**
 * Consolidated toast notification helpers.
 * Use notify.success() instead of toast.success() for consistent durations and styling.
 */

import { toast } from 'sonner';

export const notify = {
  success: (msg: string, description?: string) =>
  toast.success(msg, { duration: 4000, description }),

  error: (msg: string, description?: string) =>
  toast.error(msg, { duration: 6000, description }),

  info: (msg: string, description?: string) =>
  toast.info(msg, { duration: 4000, description }),

  warning: (msg: string, description?: string) =>
  toast.warning(msg, { duration: 5000, description }),

  promise: toast.promise
};