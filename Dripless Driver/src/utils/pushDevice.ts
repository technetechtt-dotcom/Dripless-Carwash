import { Capacitor } from '@capacitor/core';
import { notificationApi } from '@shared/api';

export async function registerSessionDevice() {
  try {
    const native = Capacitor.isNativePlatform();
    const platform: 'android' | 'ios' | 'web' = native
      ? Capacitor.getPlatform() === 'ios'
        ? 'ios'
        : 'android'
      : 'web';
    let token = localStorage.getItem('dripless_device_token');
    if (!token) {
      token = `device_${crypto.randomUUID()}`;
      localStorage.setItem('dripless_device_token', token);
    }
    await notificationApi.registerDevice(token, platform);
  } catch {
    /* In-app notifications still work without FCM credentials. */
  }
}
