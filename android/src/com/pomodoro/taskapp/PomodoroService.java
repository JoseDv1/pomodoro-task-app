package com.pomodoro.taskapp;

import android.app.Notification;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;

public final class PomodoroService extends Service {
    private static final int SERVICE_NOTIF_ID = 1002;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private PowerManager.WakeLock wakeLock;

    private final Runnable checkTimerRunnable = new Runnable() {
        @Override
        public void run() {
            PomodoroEngine engine = PomodoroEngine.getInstance(PomodoroService.this);
            PomodoroEngine.WidgetSnapshot snap = engine.getWidgetSnapshot();
            if (!snap.isRunning) {
                stopForegroundSafe();
                stopSelf();
                return;
            }
            long now = System.currentTimeMillis();
            long remainingMs = snap.endTimeMs - now;
            if (remainingMs <= 0L) {
                engine.onTimerExpired();
                return;
            }
            long nextCheckMs = Math.min(remainingMs, 15000L);
            handler.postDelayed(this, Math.max(100L, nextCheckMs));
        }
    };

    public static void startOrUpdate(Context context) {
        try {
            Intent intent = new Intent(context, PomodoroService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent);
            } else {
                context.startService(intent);
            }
        } catch (Exception ignored) {
            try {
                context.startService(new Intent(context, PomodoroService.class));
            } catch (Exception ignored2) {
            }
        }
    }

    public static void stop(Context context) {
        try {
            context.stopService(new Intent(context, PomodoroService.class));
        } catch (Exception ignored) {
        }
    }

    @Override
    public void onCreate() {
        super.onCreate();
        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (pm != null) {
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "PomodoroTaskApp::BackgroundTimerService");
            wakeLock.setReferenceCounted(false);
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        PomodoroEngine engine = PomodoroEngine.getInstance(this);
        PomodoroEngine.WidgetSnapshot snap = engine.getWidgetSnapshot();
        if (!snap.isRunning) {
            stopForegroundSafe();
            stopSelf();
            return START_NOT_STICKY;
        }

        try {
            if (wakeLock != null && !wakeLock.isHeld()) {
                long durMs = Math.max(60000L, (snap.endTimeMs - System.currentTimeMillis()) + 15000L);
                wakeLock.acquire(durMs);
            }
        } catch (Exception ignored) {
        }

        try {
            startForeground(SERVICE_NOTIF_ID, buildOngoingNotification(snap));
        } catch (Exception ignored) {
        }

        handler.removeCallbacks(checkTimerRunnable);
        long remainingMs = Math.max(100L, snap.endTimeMs - System.currentTimeMillis());
        handler.postDelayed(checkTimerRunnable, Math.min(remainingMs, 15000L));
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        handler.removeCallbacks(checkTimerRunnable);
        try {
            if (wakeLock != null && wakeLock.isHeld()) {
                wakeLock.release();
            }
        } catch (Exception ignored) {
        }
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void stopForegroundSafe() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                stopForeground(STOP_FOREGROUND_REMOVE);
            } else {
                stopForeground(true);
            }
        } catch (Exception ignored) {
        }
    }

    private Notification buildOngoingNotification(PomodoroEngine.WidgetSnapshot snap) {
        Intent openIntent = new Intent(this, MainActivity.class);
        openIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        int piFlags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            piFlags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent contentPi = PendingIntent.getActivity(this, 10, openIntent, piFlags);

        Intent toggleIntent = new Intent(this, PomodoroWidgetProvider.class);
        toggleIntent.setAction(PomodoroWidgetProvider.ACTION_TOGGLE_TIMER);
        PendingIntent togglePi = PendingIntent.getBroadcast(this, 11, toggleIntent, piFlags);

        Intent skipIntent = new Intent(this, PomodoroWidgetProvider.class);
        skipIntent.setAction(PomodoroWidgetProvider.ACTION_SKIP_TIMER);
        PendingIntent skipPi = PendingIntent.getBroadcast(this, 12, skipIntent, piFlags);

        boolean isWork = "work".equals(snap.mode);
        String modeLabel = isWork ? "🍅 Enfoque en curso" : "☕ Descanso en curso";
        String subtitle = (snap.activeTaskName != null && !snap.activeTaskName.isEmpty())
            ? "Tarea: " + snap.activeTaskName
            : "Sesión activa • Pomodoro Focus";

        Notification.Builder builder;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            builder = new Notification.Builder(this, PomodoroEngine.CHANNEL_SERVICE_ID);
        } else {
            builder = new Notification.Builder(this);
        }

        builder.setSmallIcon(R.drawable.ic_stat_tomato)
            .setContentTitle(modeLabel)
            .setContentText(subtitle)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setShowWhen(true)
            .setWhen(snap.endTimeMs)
            .setUsesChronometer(true)
            .setContentIntent(contentPi)
            .addAction(new Notification.Action.Builder(0, "⏸ Pausar", togglePi).build())
            .addAction(new Notification.Action.Builder(0, "⏭ Saltar", skipPi).build());

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            builder.setChronometerCountDown(true);
        }
        return builder.build();
    }
}
