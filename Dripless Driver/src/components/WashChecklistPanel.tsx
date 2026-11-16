import React, { useCallback, useEffect, useState } from 'react';
import { CheckSquare, Loader2, Square } from 'lucide-react';
import { bookingProofApi } from '@shared/api';
import {
  checklistItemLabels,
  type WashChecklistItemKey,
  type WashChecklistSnapshot
} from '@shared/wash-progress';
import type { JobType } from '../types';

type Props = {
  bookingId: string;
  jobType: JobType;
};

const EMPTY: WashChecklistSnapshot = {
  exteriorDone: false,
  interiorDone: false,
  wheelsDone: false,
  glassDone: false,
  matsDone: false,
  finalInspected: false,
  rewashRequested: false,
  damageAck: false
};

export function WashChecklistPanel({ bookingId, jobType }: Props) {
  const [checklist, setChecklist] = useState<WashChecklistSnapshot>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [pin, setPin] = useState('');
  const [pinMessage, setPinMessage] = useState('');
  const labels = checklistItemLabels(jobType === 'HOME_SERVICE' ? 'HOME_SERVICE' : 'WASH');

  const load = useCallback(async () => {
    try {
      const row = await bookingProofApi.checklist(bookingId);
      if (row) {
        setChecklist({
          exteriorDone: Boolean(row.exteriorDone),
          interiorDone: Boolean(row.interiorDone),
          wheelsDone: Boolean(row.wheelsDone),
          glassDone: Boolean(row.glassDone),
          matsDone: Boolean(row.matsDone),
          finalInspected: Boolean(row.finalInspected),
          rewashRequested: Boolean(row.rewashRequested),
          damageAck: Boolean(row.damageAck),
          notes: row.notes ?? null,
          updatedAt: row.updatedAt ?? null
        });
      }
      setError('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load checklist.');
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = async (key: WashChecklistItemKey) => {
    const next = !checklist[key];
    setSavingKey(key);
    setError('');
    try {
      const row = await bookingProofApi.updateChecklist(bookingId, { [key]: next });
      setChecklist((prev) => ({
        ...prev,
        ...row,
        [key]: Boolean(row[key] ?? next)
      }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to update checklist.');
    } finally {
      setSavingKey(null);
    }
  };

  const verifyPin = async () => {
    if (!/^\d{6}$/.test(pin)) {
      setPinMessage('Enter the 6-digit PIN from the customer.');
      return;
    }
    setSavingKey('pin');
    setPinMessage('');
    try {
      await bookingProofApi.verifyCompletionPin(bookingId, pin);
      setPinMessage('PIN verified — you can complete the job.');
      setPin('');
    } catch (caught) {
      setPinMessage(caught instanceof Error ? caught.message : 'Incorrect PIN.');
    } finally {
      setSavingKey(null);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex justify-center">
        <Loader2 className="animate-spin text-emerald-600" size={18} />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-4 bg-white/50 dark:bg-slate-900/40">
      <div>
        <h4 className="font-bold text-slate-900 dark:text-white text-sm">Cleaning checklist</h4>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Tick each step so the customer can track progress live.
        </p>
      </div>
      <ul className="space-y-2">
        {labels.map((item) => {
          const done = Boolean(checklist[item.key]);
          const saving = savingKey === item.key;
          return (
            <li key={item.key}>
              <button
                type="button"
                onClick={() => void toggle(item.key)}
                disabled={saving}
                className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                  done
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                    : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200'
                }`}>
                {saving ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : done ? (
                  <CheckSquare size={18} />
                ) : (
                  <Square size={18} />
                )}
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Completion PIN
        </p>
        <div className="flex gap-2">
          <input
            value={pin}
            onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            placeholder="6-digit PIN"
            className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm dark:text-white"
          />
          <button
            type="button"
            onClick={() => void verifyPin()}
            disabled={savingKey === 'pin'}
            className="px-3 py-2 rounded-xl bg-emerald-500 text-white text-sm font-bold disabled:opacity-50">
            Verify
          </button>
        </div>
        {pinMessage ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">{pinMessage}</p>
        ) : null}
      </div>

      {error ? <p className="text-xs text-red-600 dark:text-red-400">{error}</p> : null}
    </div>
  );
}
