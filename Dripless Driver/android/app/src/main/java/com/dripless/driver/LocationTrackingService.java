package com.dripless.driver;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.os.IBinder;
import android.os.Looper;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

/**
 * Foreground location service so GPS continues while the Driver app is
 * backgrounded or the screen is locked (Android 8+/14 location FGS type).
 */
public class LocationTrackingService extends Service implements LocationListener {
  public static final String ACTION_START = "com.dripless.driver.location.START";
  public static final String ACTION_STOP = "com.dripless.driver.location.STOP";
  public static final String EXTRA_TITLE = "title";
  public static final String EXTRA_BODY = "body";
  public static final String EXTRA_INTERVAL_MS = "intervalMs";

  private static final String CHANNEL_ID = "dripless_driver_location";
  private static final int NOTIFICATION_ID = 42001;

  private LocationManager locationManager;
  private long minIntervalMs = 5_000L;

  @Override
  public int onStartCommand(Intent intent, int flags, int startId) {
    if (intent == null) {
      stopSelf();
      return START_NOT_STICKY;
    }
    String action = intent.getAction();
    if (ACTION_STOP.equals(action)) {
      stopTracking();
      stopForeground(STOP_FOREGROUND_REMOVE);
      stopSelf();
      return START_NOT_STICKY;
    }

    String title = intent.getStringExtra(EXTRA_TITLE);
    String body = intent.getStringExtra(EXTRA_BODY);
    long interval = intent.getLongExtra(EXTRA_INTERVAL_MS, 5_000L);
    if (interval >= 1_000L) {
      minIntervalMs = interval;
    }
    if (title == null || title.isEmpty()) title = "Dripless Driver online";
    if (body == null || body.isEmpty()) body = "Sharing live location with customers and ops";

    startAsForeground(title, body);
    startTracking();
    return START_STICKY;
  }

  private void startAsForeground(String title, String body) {
    ensureChannel();
    Intent launch = getPackageManager().getLaunchIntentForPackage(getPackageName());
    PendingIntent contentIntent =
        PendingIntent.getActivity(
            this,
            0,
            launch != null ? launch : new Intent(this, MainActivity.class),
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

    Notification notification =
        new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(body)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setOngoing(true)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setContentIntent(contentIntent)
            .build();

    if (Build.VERSION.SDK_INT >= 34) {
      startForeground(
          NOTIFICATION_ID,
          notification,
          ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
    } else {
      startForeground(NOTIFICATION_ID, notification);
    }
  }

  private void ensureChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
    NotificationManager manager =
        (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
    if (manager == null) return;
    NotificationChannel channel =
        new NotificationChannel(
            CHANNEL_ID, "Live trip location", NotificationManager.IMPORTANCE_LOW);
    channel.setDescription("Keeps GPS active while you are online for jobs");
    channel.setShowBadge(false);
    manager.createNotificationChannel(channel);
  }

  private void startTracking() {
    if (locationManager == null) {
      locationManager = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
    }
    if (locationManager == null) return;
    try {
      locationManager.removeUpdates(this);
      boolean gps = locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER);
      boolean network = locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER);
      if (gps) {
        locationManager.requestLocationUpdates(
            LocationManager.GPS_PROVIDER, minIntervalMs, 3f, this, Looper.getMainLooper());
      }
      if (network) {
        locationManager.requestLocationUpdates(
            LocationManager.NETWORK_PROVIDER, minIntervalMs, 8f, this, Looper.getMainLooper());
      }
      Location last =
          gps
              ? locationManager.getLastKnownLocation(LocationManager.GPS_PROVIDER)
              : null;
      if (last == null && network) {
        last = locationManager.getLastKnownLocation(LocationManager.NETWORK_PROVIDER);
      }
      if (last != null) {
        emit(last);
      }
    } catch (SecurityException ignored) {
      // Permission must already be granted by the Capacitor bridge before start.
    }
  }

  private void stopTracking() {
    if (locationManager != null) {
      try {
        locationManager.removeUpdates(this);
      } catch (SecurityException ignored) {
      }
    }
  }

  private void emit(Location location) {
    BackgroundLocationPlugin.emitLocation(
        location.getLatitude(),
        location.getLongitude(),
        location.hasAccuracy() ? location.getAccuracy() : 999f,
        location.hasSpeed() ? location.getSpeed() : Float.NaN,
        location.hasBearing() ? location.getBearing() : Float.NaN,
        location.getTime());
  }

  @Override
  public void onLocationChanged(Location location) {
    if (location != null) emit(location);
  }

  @Override
  public void onStatusChanged(String provider, int status, Bundle extras) {}

  @Override
  public void onProviderEnabled(String provider) {}

  @Override
  public void onProviderDisabled(String provider) {}

  @Nullable
  @Override
  public IBinder onBind(Intent intent) {
    return null;
  }

  @Override
  public void onDestroy() {
    stopTracking();
    super.onDestroy();
  }
}
