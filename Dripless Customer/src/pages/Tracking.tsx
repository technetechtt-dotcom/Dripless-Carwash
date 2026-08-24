import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  Loader2Icon,
  MapPinIcon,
  MessageCircleIcon,
  PhoneIcon,
  SendIcon,
  StarIcon,
  UserIcon
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { bookingProofApi, subscribePlatformEvents, trackingApi } from '@shared/api';
import { estimateDistanceKm, estimateEtaMinutes } from '@shared/maps';
import type { BookingTrackingSnapshot } from '@shared/types';
import RouteMapCard from '../components/RouteMapCard';
import { ROUTES } from '../utils/routes';

type Message = { id: string; senderRole: string; body: string; createdAt: string };

const statusLabel = (status?: string) =>
  status
    ? status.replace(/_/g, ' ').toLowerCase().replace(/^./, (value) => value.toUpperCase())
    : 'Loading';

const Tracking = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = location.state as { bookingId?: string; bookingDetails?: { id?: string } } | null;
  const bookingId = routeState?.bookingId || routeState?.bookingDetails?.id;
  const [snapshot, setSnapshot] = useState<BookingTrackingSnapshot | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    if (!bookingId) {
      setError('No booking was selected.');
      setLoading(false);
      return;
    }
    try {
      const [nextSnapshot, nextMessages] = await Promise.all([
        trackingApi.getBookingTracking(bookingId),
        bookingProofApi.messages(bookingId)
      ]);
      if (!nextSnapshot) throw new Error('Booking not found');
      setSnapshot(nextSnapshot);
      setMessages(
        nextMessages.map((entry) => ({
          id: String(entry.id),
          senderRole: String(entry.senderRole),
          body: String(entry.body),
          createdAt: String(entry.createdAt)
        }))
      );
      setError('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load tracking.');
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    void load();
    const stop = subscribePlatformEvents((event) => {
      if (!bookingId) return;
      const eventBookingId = String(event.payload.bookingId || '');
      if (
        event.type === 'driver.location' ||
        (eventBookingId === bookingId &&
          (event.type === 'booking.status' ||
            event.type === 'booking.assigned' ||
            event.type === 'booking.message'))
      ) {
        void load();
      }
    });
    const interval = window.setInterval(() => void load(), 60_000);
    return () => {
      stop();
      window.clearInterval(interval);
    };
  }, [load, bookingId]);

  const target = useMemo(() => {
    if (!snapshot) return null;
    if (snapshot.status === 'IN_PROGRESS' && snapshot.destinationCoordinates) {
      return snapshot.destinationCoordinates;
    }
    return snapshot.pickupCoordinates || snapshot.destinationCoordinates || null;
  }, [snapshot]);
  const driverPoint = snapshot?.driverLocation
    ? { lat: snapshot.driverLocation.lat, lng: snapshot.driverLocation.lng }
    : null;
  const distanceKm = driverPoint && target ? estimateDistanceKm(driverPoint, target) : null;
  const etaMinutes = distanceKm == null ? null : estimateEtaMinutes(distanceKm);

  const sendMessage = async () => {
    const body = draft.trim();
    if (!bookingId || !body || sending) return;
    setSending(true);
    try {
      await bookingProofApi.sendMessage(bookingId, body);
      setDraft('');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to send message.');
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="min-h-screen pb-24 bg-slate-50 dark:bg-slate-950">
      <header className="sticky top-0 z-20 glass-nav px-4 py-4 flex items-center">
        <button onClick={() => navigate(-1)} className="mr-4 p-2 rounded-full glass" aria-label="Go back">
          <ArrowLeftIcon size={20} />
        </button>
        <h1 className="text-xl font-bold dark:text-white">Live tracking</h1>
      </header>

      <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 max-w-xl mx-auto space-y-5">
        {loading ? (
          <div className="glass-card p-8 flex justify-center">
            <Loader2Icon className="animate-spin text-eco-600" />
          </div>
        ) : null}
        {error ? (
          <div className="rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-4 text-sm">
            {error}
          </div>
        ) : null}

        {snapshot ? (
          <>
            <article className="glass-card p-5 dark:bg-slate-800/90">
              <div className="flex items-start gap-4">
                {snapshot.driverAvatarUrl ? (
                  <img
                    src={snapshot.driverAvatarUrl}
                    alt="Assigned operator"
                    className="w-14 h-14 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-eco-100 dark:bg-eco-900/30 flex items-center justify-center">
                    <UserIcon className="text-eco-600" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-xs text-slate-500">Assigned operator</p>
                  <h2 className="font-bold text-slate-900 dark:text-white">
                    {snapshot.driverName || 'Assignment pending'}
                  </h2>
                  {snapshot.driverRating != null ? (
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                      <StarIcon size={12} className="text-amber-500 fill-amber-500" />
                      {snapshot.driverRating.toFixed(1)} · {snapshot.driverCompletedJobs || 0} completed jobs
                    </p>
                  ) : null}
                </div>
                {snapshot.driverPhone ? (
                  <a
                    href={`tel:${snapshot.driverPhone.replace(/\s/g, '')}`}
                    aria-label="Call operator"
                    className="p-2.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600"
                  >
                    <PhoneIcon size={18} />
                  </a>
                ) : null}
              </div>
            </article>

            <article className="glass-card p-5 dark:bg-slate-800/90">
              <div className="flex justify-between gap-3">
                <div>
                  <p className="text-xs text-slate-500">Status</p>
                  <h2 className="font-bold dark:text-white">{statusLabel(snapshot.status)}</h2>
                </div>
                <span className="h-fit rounded-full bg-eco-100 dark:bg-eco-900/30 text-eco-700 dark:text-eco-300 px-3 py-1 text-xs font-bold">
                  {snapshot.serviceType}
                </span>
              </div>
              <div className="flex gap-2 text-sm text-slate-600 dark:text-slate-300 mt-4">
                <MapPinIcon size={17} className="text-eco-600 shrink-0" />
                {snapshot.pickupLocation}
              </div>
              {etaMinutes != null ? (
                <p className="mt-3 text-sm text-slate-500">
                  Live estimate: {distanceKm?.toFixed(1)} km · {etaMinutes} min
                </p>
              ) : (
                <p className="mt-3 text-sm text-slate-500">
                  Live location will appear when the assigned operator starts sharing GPS.
                </p>
              )}
            </article>

            {driverPoint && target ? (
              <RouteMapCard
                pickup={driverPoint}
                destination={target}
                pickupLabel="Operator"
                destinationLabel={
                  snapshot.status === 'IN_PROGRESS'
                    ? snapshot.destinationLocation || snapshot.pickupLocation
                    : snapshot.pickupLocation
                }
                progress={0}
                showDriverMarker
                driverPoint={driverPoint}
              />
            ) : null}

            <article className="glass-card p-5 dark:bg-slate-800/90">
              <h3 className="font-bold dark:text-white flex items-center gap-2">
                <MessageCircleIcon size={18} />
                Booking messages
              </h3>
              <div className="mt-4 max-h-64 overflow-y-auto space-y-2">
                {messages.length === 0 ? (
                  <p className="text-sm text-slate-500">No messages yet.</p>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`rounded-xl p-3 text-sm ${
                        message.senderRole === 'customer'
                          ? 'bg-eco-600 text-white ml-8'
                          : 'bg-slate-100 dark:bg-slate-700 dark:text-white mr-8'
                      }`}
                    >
                      <p>{message.body}</p>
                      <p className="text-[10px] opacity-70 mt-1">{new Date(message.createdAt).toLocaleTimeString()}</p>
                    </div>
                  ))
                )}
              </div>
              <div className="flex gap-2 mt-4">
                <input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') void sendMessage();
                  }}
                  maxLength={2000}
                  placeholder="Message the assigned operator"
                  className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 dark:text-white"
                />
                <button
                  onClick={() => void sendMessage()}
                  disabled={!draft.trim() || sending || !snapshot.driverId}
                  className="btn-primary px-4 disabled:opacity-50"
                  aria-label="Send message"
                >
                  <SendIcon size={18} />
                </button>
              </div>
            </article>

            {snapshot.status === 'COMPLETED' ? (
              <button
                className="btn-primary w-full py-3 flex items-center justify-center gap-2"
                onClick={() =>
                  navigate(ROUTES.RATE_SERVICE, {
                    state: {
                      bookingId: snapshot.bookingId,
                      service: { name: snapshot.serviceType, date: 'Completed' }
                    }
                  })
                }
              >
                <CheckCircleIcon size={18} />
                Rate completed service
              </button>
            ) : null}
          </>
        ) : null}
      </motion.section>
    </main>
  );
};

export default Tracking;
