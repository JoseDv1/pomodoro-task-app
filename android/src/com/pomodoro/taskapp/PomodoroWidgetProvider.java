package com.pomodoro.taskapp;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.SystemClock;
import android.view.View;
import android.widget.RemoteViews;

import java.util.Locale;

public final class PomodoroWidgetProvider extends AppWidgetProvider {
    public static final String ACTION_TOGGLE_TIMER = "com.pomodoro.taskapp.ACTION_TOGGLE_TIMER";
    public static final String ACTION_SKIP_TIMER = "com.pomodoro.taskapp.ACTION_SKIP_TIMER";
    public static final String ACTION_COMPLETE_TASK = "com.pomodoro.taskapp.ACTION_COMPLETE_TASK";
    public static final String ACTION_TIMER_EXPIRED = "com.pomodoro.taskapp.ACTION_TIMER_EXPIRED";

    public static void updateAllWidgets(Context context) {
        try {
            AppWidgetManager mgr = AppWidgetManager.getInstance(context);
            if (mgr == null) return;
            ComponentName cn = new ComponentName(context, PomodoroWidgetProvider.class);
            int[] ids = mgr.getAppWidgetIds(cn);
            if (ids == null || ids.length == 0) return;

            PomodoroEngine engine = PomodoroEngine.getInstance(context);
            PomodoroEngine.WidgetSnapshot snap = engine.getWidgetSnapshot();
            for (int id : ids) {
                mgr.updateAppWidget(id, buildRemoteViews(context, snap));
            }
        } catch (Exception ignored) {
        }
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        PomodoroEngine engine = PomodoroEngine.getInstance(context);
        PomodoroEngine.WidgetSnapshot snap = engine.getWidgetSnapshot();
        for (int appWidgetId : appWidgetIds) {
            appWidgetManager.updateAppWidget(appWidgetId, buildRemoteViews(context, snap));
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (intent == null || intent.getAction() == null) return;

        String action = intent.getAction();
        PomodoroEngine engine = PomodoroEngine.getInstance(context);

        switch (action) {
            case ACTION_TOGGLE_TIMER:
                engine.toggleTimerFromWidget();
                break;
            case ACTION_SKIP_TIMER:
                engine.skipTimerFromWidget();
                break;
            case ACTION_COMPLETE_TASK:
                engine.completeActiveTaskFromWidget();
                break;
            case ACTION_TIMER_EXPIRED:
                engine.onTimerExpired();
                break;
            default:
                break;
        }
    }

    private static RemoteViews buildRemoteViews(Context context, PomodoroEngine.WidgetSnapshot snap) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_pomodoro);
        PomodoroEngine.ThemePalette pal = snap.palette;

        // 1. Aplicar colores dinámicos del tema activo sobre las tarjetas y botones
        views.setInt(R.id.widget_bg_card, "setColorFilter", pal.bgPrimary);
        views.setInt(R.id.widget_mode_pill_bg, "setColorFilter", pal.accentColor);
        views.setInt(R.id.widget_stats_pill_bg, "setColorFilter", pal.bgSecondary);
        views.setInt(R.id.widget_task_box_bg, "setColorFilter", pal.bgSecondary);
        views.setInt(R.id.widget_btn_play_bg, "setColorFilter", pal.accentColor);
        views.setInt(R.id.widget_btn_skip_bg, "setColorFilter", pal.bgTertiary);
        views.setInt(R.id.widget_btn_done_bg, "setColorFilter", pal.bgTertiary);

        views.setTextColor(R.id.widget_chronometer, pal.textPrimary);
        views.setTextColor(R.id.widget_timer_static, pal.textPrimary);
        views.setTextColor(R.id.widget_stats_text, pal.textSecondary);
        views.setTextColor(R.id.widget_task_title, pal.textPrimary);
        views.setTextColor(R.id.widget_task_meta, pal.textSecondary);
        views.setTextColor(R.id.widget_btn_skip_text, pal.textPrimary);
        views.setTextColor(R.id.widget_btn_done_text, pal.textPrimary);

        // 2. Cabecera: Modo actual y Racha / Tomates del día
        String modeLabel;
        if ("shortBreak".equals(snap.mode)) {
            modeLabel = "☕ DESCANSO";
        } else if ("longBreak".equals(snap.mode)) {
            modeLabel = "🌙 DESCANSO LARGO";
        } else {
            modeLabel = "🍅 ENFOQUE";
        }
        views.setTextViewText(R.id.widget_mode_text, modeLabel);
        views.setTextViewText(
            R.id.widget_stats_text,
            String.format(Locale.US, "🍅 %d hoy • 🔥 %dd", snap.todayPomodoros, snap.currentStreak)
        );

        // 3. Reloj en vivo (Chronometer nativo cuando corre, TextView exacto cuando está en pausa)
        long now = System.currentTimeMillis();
        if (snap.isRunning && snap.endTimeMs > now) {
            long remainingMs = snap.endTimeMs - now;
            long baseElapsed = SystemClock.elapsedRealtime() + remainingMs;
            views.setViewVisibility(R.id.widget_chronometer, View.VISIBLE);
            views.setViewVisibility(R.id.widget_timer_static, View.GONE);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                views.setChronometerCountDown(R.id.widget_chronometer, true);
            }
            views.setChronometer(R.id.widget_chronometer, baseElapsed, null, true);
            views.setTextViewText(R.id.widget_btn_play_text, "⏸ Pausar");
        } else {
            views.setViewVisibility(R.id.widget_chronometer, View.GONE);
            views.setViewVisibility(R.id.widget_timer_static, View.VISIBLE);
            views.setChronometer(R.id.widget_chronometer, SystemClock.elapsedRealtime(), null, false);
            views.setTextViewText(R.id.widget_timer_static, formatSeconds(snap.timeLeft));
            views.setTextViewText(R.id.widget_btn_play_text, "▶ Iniciar");
        }

        // 4. Tarjeta de Tarea Activa
        if (snap.activeTaskName != null && !snap.activeTaskName.isEmpty()) {
            views.setTextViewText(R.id.widget_task_title, "🎯 " + snap.activeTaskName);
            views.setTextViewText(
                R.id.widget_task_meta,
                String.format(Locale.US, "Progreso: %d/%d 🍅", snap.activeTaskCompletedPomos, snap.activeTaskEstimatedPomos)
            );
            views.setTextViewText(R.id.widget_btn_done_text, "✓ Hecho");
        } else {
            views.setTextViewText(R.id.widget_task_title, "Sin tarea activa");
            views.setTextViewText(R.id.widget_task_meta, "Toca para abrir y elegir tarea");
            views.setTextViewText(R.id.widget_btn_done_text, "✓ Tarea");
        }

        // 5. PendingIntents de controles y apertura de app
        int piFlags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            piFlags |= PendingIntent.FLAG_IMMUTABLE;
        }

        Intent openAppIntent = new Intent(context, MainActivity.class);
        openAppIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
        PendingIntent openAppPi = PendingIntent.getActivity(context, 100, openAppIntent, piFlags);
        views.setOnClickPendingIntent(R.id.widget_header_area, openAppPi);
        views.setOnClickPendingIntent(R.id.widget_clock_container, openAppPi);
        views.setOnClickPendingIntent(R.id.widget_task_box, openAppPi);

        Intent toggleIntent = new Intent(context, PomodoroWidgetProvider.class);
        toggleIntent.setAction(ACTION_TOGGLE_TIMER);
        PendingIntent togglePi = PendingIntent.getBroadcast(context, 101, toggleIntent, piFlags);
        views.setOnClickPendingIntent(R.id.widget_btn_play_pause, togglePi);

        Intent skipIntent = new Intent(context, PomodoroWidgetProvider.class);
        skipIntent.setAction(ACTION_SKIP_TIMER);
        PendingIntent skipPi = PendingIntent.getBroadcast(context, 102, skipIntent, piFlags);
        views.setOnClickPendingIntent(R.id.widget_btn_skip, skipPi);

        Intent doneIntent = new Intent(context, PomodoroWidgetProvider.class);
        doneIntent.setAction(ACTION_COMPLETE_TASK);
        PendingIntent donePi = PendingIntent.getBroadcast(context, 103, doneIntent, piFlags);
        views.setOnClickPendingIntent(R.id.widget_btn_done, donePi);

        return views;
    }

    private static String formatSeconds(int totalSeconds) {
        int s = Math.max(0, totalSeconds);
        int hours = s / 3600;
        int minutes = (s % 3600) / 60;
        int secs = s % 60;
        if (hours > 0) {
            return String.format(Locale.US, "%d:%02d:%02d", hours, minutes, secs);
        }
        return String.format(Locale.US, "%02d:%02d", minutes, secs);
    }
}
