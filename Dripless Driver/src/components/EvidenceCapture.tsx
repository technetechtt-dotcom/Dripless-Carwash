import React, { useState } from 'react';
import { Camera } from 'lucide-react';
import { bookingProofApi } from '@shared/api';
import { enqueueEvidence } from '../utils/offlineQueue';
import { GlassButton } from './ui/GlassButton';
import { useToast } from '../contexts/ToastContext';

type EvidenceKind = 'BEFORE' | 'AFTER' | 'DAMAGE';

export function EvidenceCapture({ bookingId }: { bookingId: string }) {
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);

  const pickAndUpload = async (kind: EvidenceKind) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setBusy(true);
      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ''));
          reader.onerror = () => reject(new Error('Could not read photo'));
          reader.readAsDataURL(file);
        });
        try {
          await bookingProofApi.uploadEvidence(bookingId, {
            kind,
            dataUrl,
            note: `${kind.toLowerCase()} wash evidence`,
            offlineQueued: false
          });
          showToast(`${kind} photo uploaded`, 'success');
        } catch {
          enqueueEvidence({ bookingId, kind, dataUrl, note: `${kind.toLowerCase()} wash evidence` });
          showToast(`${kind} photo queued offline — will upload when online`, 'info');
        }
      } catch (error) {
        showToast(error instanceof Error ? error.message : 'Evidence upload failed', 'error');
      } finally {
        setBusy(false);
      }
    };
    input.click();
  };

  return (
    <div className="rounded-xl border border-slate-200/70 dark:border-slate-700/60 p-3 space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
        <Camera size={16} />
        Wash evidence
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Capture before/after photos. Failed uploads are queued and retried automatically.
      </p>
      <div className="grid grid-cols-3 gap-2">
        <GlassButton disabled={busy} onClick={() => void pickAndUpload('BEFORE')} className="text-xs py-2">
          Before
        </GlassButton>
        <GlassButton disabled={busy} onClick={() => void pickAndUpload('AFTER')} className="text-xs py-2">
          After
        </GlassButton>
        <GlassButton disabled={busy} onClick={() => void pickAndUpload('DAMAGE')} className="text-xs py-2">
          Damage
        </GlassButton>
      </div>
    </div>
  );
}
