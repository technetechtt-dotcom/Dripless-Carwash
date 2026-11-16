import React, { useState } from 'react';
import {
  CameraIcon,
  CheckCircle2Icon,
  CircleIcon,
  KeyRoundIcon,
  Loader2Icon,
  SparklesIcon
} from 'lucide-react';
import { motion } from 'framer-motion';
import { bookingProofApi } from '@shared/api';
import {
  checklistItemLabels,
  type WashProgressSnapshot
} from '@shared/wash-progress';

type Props = {
  bookingId: string;
  progress: WashProgressSnapshot;
  onUpdated?: () => void;
};

const WashProgressTracker = ({ bookingId, progress, onUpdated }: Props) => {
  const [pin, setPin] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const itemLabels = checklistItemLabels(progress.serviceType);

  const issuePin = async () => {
    setBusy(true);
    setError('');
    try {
      const result = await bookingProofApi.issueCompletionPin(bookingId);
      setPin(result.pin);
      onUpdated?.();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to issue completion PIN.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="glass-card p-5 dark:bg-slate-800/90 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Cleaning progress</p>
          <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <SparklesIcon size={18} className="text-eco-600" />
            {progress.currentStageLabel}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {progress.serviceName} · {progress.percentComplete}% complete
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-eco-600 dark:text-eco-400">
            {progress.percentComplete}%
          </p>
          <p className="text-[10px] uppercase tracking-wide text-slate-400">
            {progress.checklistDone}/{progress.checklistTotal} tasks
          </p>
        </div>
      </div>

      <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-eco-400 to-teal-500"
          initial={{ width: 0 }}
          animate={{ width: `${progress.percentComplete}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        />
      </div>

      <ol className="space-y-3" aria-label="Cleaning process stages">
        {progress.stages.map((stage) => (
          <li key={stage.id} className="flex gap-3">
            <div className="mt-0.5">
              {stage.done ? (
                <CheckCircle2Icon size={18} className="text-eco-600" />
              ) : stage.current ? (
                <Loader2Icon size={18} className="text-amber-500 animate-spin" />
              ) : (
                <CircleIcon size={18} className="text-slate-300 dark:text-slate-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm font-semibold ${
                  stage.current
                    ? 'text-eco-700 dark:text-eco-300'
                    : stage.done
                      ? 'text-slate-700 dark:text-slate-200'
                      : 'text-slate-400 dark:text-slate-500'
                }`}>
                {stage.label}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{stage.description}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-700/60 p-4 space-y-3">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
          Worker checklist
        </p>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {itemLabels.map((item) => {
            const done = Boolean(progress.checklist?.[item.key]);
            return (
              <li
                key={item.key}
                className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${
                  done
                    ? 'bg-eco-50 dark:bg-eco-900/20 text-eco-700 dark:text-eco-300'
                    : 'bg-white/70 dark:bg-slate-800/70 text-slate-500'
                }`}>
                {done ? <CheckCircle2Icon size={16} /> : <CircleIcon size={16} />}
                {item.label}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-3">
          <p className="text-xs text-slate-500 flex items-center gap-1">
            <CameraIcon size={14} /> Before photos
          </p>
          <p className="text-lg font-bold dark:text-white mt-1">{progress.beforePhotos}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-3">
          <p className="text-xs text-slate-500 flex items-center gap-1">
            <CameraIcon size={14} /> After photos
          </p>
          <p className="text-lg font-bold dark:text-white mt-1">{progress.afterPhotos}</p>
        </div>
      </div>

      {progress.pinVerified ? (
        <div className="rounded-xl bg-eco-50 dark:bg-eco-900/20 text-eco-700 dark:text-eco-300 px-4 py-3 text-sm font-medium flex items-center gap-2">
          <KeyRoundIcon size={16} />
          Completion PIN verified by the operator
        </div>
      ) : (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => void issuePin()}
            disabled={busy}
            className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50">
            {busy ? <Loader2Icon size={18} className="animate-spin" /> : <KeyRoundIcon size={18} />}
            {progress.pinIssued || pin ? 'Refresh completion PIN' : 'Show completion PIN'}
          </button>
          {pin ? (
            <div className="rounded-2xl bg-slate-900 text-white text-center py-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Give this PIN to your worker</p>
              <p className="text-3xl font-bold tracking-[0.35em] mt-2">{pin}</p>
            </div>
          ) : null}
          {error ? (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          ) : null}
        </div>
      )}
    </article>
  );
};

export default WashProgressTracker;
