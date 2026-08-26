import React, { useEffect, useState } from 'react';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import { notificationApi, subscribePlatformEvents } from '@shared/api';
import type { NotificationContract } from '@shared/types';
import { useDriverAuth } from '../contexts/DriverAuthContext';
import { PageContainer } from '../components/ui/PageContainer';
import { GlassCard } from '../components/ui/GlassCard';
import { useToast } from '../contexts/ToastContext';

export function NotificationsPage({ onBack }: { onBack: () => void }) {
  const { driver } = useDriverAuth();
  const { showToast } = useToast();
  const [rows, setRows] = useState<NotificationContract[]>([]);

  const load = async () => {
    if (!driver) return;
    const notifications = await notificationApi.listNotifications('driver', driver.id);
    setRows(notifications);
  };

  useEffect(() => {
    void load().catch((error) =>
      showToast(error instanceof Error ? error.message : 'Could not load notifications', 'error')
    );
    return subscribePlatformEvents((event) => {
      if (event.type.startsWith('notification.') || event.type.startsWith('booking.') || event.type === 'payment.status') {
        void load();
      }
    });
  }, [driver?.id]);

  const markRead = async (id: string) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, read: true } : row)));
    try {
      await notificationApi.markRead(id);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not mark read', 'error');
    }
  };

  return (
    <PageContainer>
      <header className="flex items-center gap-3 mb-6">
        <button type="button" onClick={onBack} className="text-slate-500" aria-label="Back">
          ←
        </button>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex-1">Notifications</h1>
        {rows.some((row) => !row.read) ? (
          <button
            type="button"
            aria-label="Mark all as read"
            onClick={() =>
              void notificationApi
                .markAllRead()
                .then(() => setRows((current) => current.map((row) => ({ ...row, read: true }))))
                .catch((error) => showToast(error instanceof Error ? error.message : 'Could not mark all read', 'error'))
            }>
            <CheckCheck size={20} className="text-emerald-600" />
          </button>
        ) : null}
      </header>
      {rows.length === 0 ? (
        <GlassCard className="p-8 text-center">
          <Bell size={28} className="mx-auto mb-3 text-slate-400" />
          <p className="font-semibold dark:text-white">All caught up</p>
          <p className="text-sm text-slate-500">Job assignments, arrivals, and payouts will appear here.</p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <GlassCard
              key={row.id}
              className={`p-4 ${row.read ? '' : 'border-l-4 border-l-emerald-500'}`}
              onClick={() => {
                if (!row.read) void markRead(row.id);
              }}>
              <div className="flex gap-3">
                <div className="flex-1">
                  <div className="flex justify-between gap-2">
                    <h2 className="font-bold text-sm dark:text-white">{row.title}</h2>
                    <time className="text-[10px] text-slate-400">{new Date(row.createdAt).toLocaleString()}</time>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{row.message}</p>
                </div>
                <button
                  type="button"
                  aria-label="Remove notification"
                  onClick={(event) => {
                    event.stopPropagation();
                    void notificationApi
                      .remove(row.id)
                      .then(() => setRows((current) => current.filter((item) => item.id !== row.id)))
                      .catch((error) => showToast(error instanceof Error ? error.message : 'Could not remove', 'error'));
                  }}>
                  <Trash2 size={16} className="text-slate-400" />
                </button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
