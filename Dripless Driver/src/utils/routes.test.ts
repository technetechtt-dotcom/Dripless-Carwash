import { describe, expect, it } from 'vitest';
import { DRIVER_PROFILE_VIEWS, DRIVER_TABS } from './routes';

describe('driver route constants', () => {
  it('exposes expected tabs', () => {
    expect(DRIVER_TABS.HOME).toBe('home');
    expect(DRIVER_TABS.PROFILE).toBe('profile');
  });

  it('exposes expected profile views', () => {
    expect(DRIVER_PROFILE_VIEWS.MAIN).toBe('main');
    expect(DRIVER_PROFILE_VIEWS.SETTINGS).toBe('settings');
  });
});
