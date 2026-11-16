package com.dripless.driver;

import android.content.Intent;
import android.os.Build;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "BackgroundLocation")
public class BackgroundLocationPlugin extends Plugin {
  private static BackgroundLocationPlugin instance;

  @Override
  public void load() {
    instance = this;
  }

  static void emitLocation(
      double lat, double lng, float accuracyM, float speedMps, float bearing, long timestampMs) {
    BackgroundLocationPlugin plugin = instance;
    if (plugin == null) return;
    JSObject data = new JSObject();
    data.put("lat", lat);
    data.put("lng", lng);
    data.put("accuracyM", accuracyM);
    if (!Float.isNaN(speedMps)) data.put("speed", speedMps);
    if (!Float.isNaN(bearing)) data.put("heading", bearing);
    data.put("timestamp", timestampMs);
    plugin.notifyListeners("location", data);
  }

  @PluginMethod
  public void start(PluginCall call) {
    String title = call.getString("title", "Dripless Driver online");
    String body = call.getString("body", "Sharing live location with customers and ops");
    Integer intervalMs = call.getInt("intervalMs", 5000);

    Intent intent = new Intent(getContext(), LocationTrackingService.class);
    intent.setAction(LocationTrackingService.ACTION_START);
    intent.putExtra(LocationTrackingService.EXTRA_TITLE, title);
    intent.putExtra(LocationTrackingService.EXTRA_BODY, body);
    intent.putExtra(
        LocationTrackingService.EXTRA_INTERVAL_MS, intervalMs != null ? intervalMs.longValue() : 5000L);

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      getContext().startForegroundService(intent);
    } else {
      getContext().startService(intent);
    }
    call.resolve();
  }

  @PluginMethod
  public void stop(PluginCall call) {
    Intent intent = new Intent(getContext(), LocationTrackingService.class);
    intent.setAction(LocationTrackingService.ACTION_STOP);
    getContext().startService(intent);
    call.resolve();
  }
}
