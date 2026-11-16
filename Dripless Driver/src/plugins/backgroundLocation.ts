import { registerPlugin, type PluginListenerHandle } from '@capacitor/core';

export type BackgroundLocationSample = {
  lat: number;
  lng: number;
  accuracyM?: number;
  speed?: number;
  heading?: number;
  timestamp?: number;
};

type BackgroundLocationPlugin = {
  start(options: { title: string; body: string; intervalMs?: number }): Promise<void>;
  stop(): Promise<void>;
  addListener(
    eventName: 'location',
    listenerFunc: (sample: BackgroundLocationSample) => void
  ): Promise<PluginListenerHandle>;
};

/** Native Android plugin; only invoked from `nativeLocation` on Android. */
export const BackgroundLocation = registerPlugin<BackgroundLocationPlugin>('BackgroundLocation');
