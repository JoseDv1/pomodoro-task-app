package com.pomodoro.taskapp;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.media.AudioAttributes;
import android.media.AudioFormat;
import android.media.AudioTrack;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class PomodoroEngine {
    public static final String CHANNEL_ALERT_ID = "pomodoro_focus_alerts";
    public static final String CHANNEL_SERVICE_ID = "pomodoro_active_timer";
    private static final int SAMPLE_RATE = 44100;
    private static final double INV_SAMPLE_RATE = 1.0 / 44100.0;

    public interface WebViewSyncListener {
        void onNativeStateChanged();
    }

    public static final class ThemePalette {
        public final int bgPrimary;
        public final int bgSecondary;
        public final int bgTertiary;
        public final int textPrimary;
        public final int textSecondary;
        public final int accentColor;
        public final boolean isDark;

        public ThemePalette(String bg1, String bg2, String bg3, String txt1, String txt2, String acc, boolean dark) {
            this.bgPrimary = Color.parseColor(bg1);
            this.bgSecondary = Color.parseColor(bg2);
            this.bgTertiary = Color.parseColor(bg3);
            this.textPrimary = Color.parseColor(txt1);
            this.textSecondary = Color.parseColor(txt2);
            this.accentColor = Color.parseColor(acc);
            this.isDark = dark;
        }
    }

    public static final class WidgetSnapshot {
        public String mode = "work";
        public int duration = 25 * 60;
        public int timeLeft = 25 * 60;
        public boolean isRunning = false;
        public long endTimeMs = 0L;
        public int cycleCount = 1;
        public int todayPomodoros = 0;
        public int currentStreak = 0;
        public String activeTaskId = "";
        public String activeTaskName = "";
        public int activeTaskCompletedPomos = 0;
        public int activeTaskEstimatedPomos = 1;
        public String activeThemeId = "default-dark";
        public ThemePalette palette = resolveThemePalette("default-dark");
    }

    private static PomodoroEngine instance;

    public static synchronized PomodoroEngine getInstance(Context context) {
        if (instance == null) {
            instance = new PomodoroEngine(context.getApplicationContext());
        }
        return instance;
    }

    private final Context appContext;
    private final Object stateLock = new Object();
    private final ExecutorService ioExecutor = Executors.newSingleThreadExecutor();
    private final ExecutorService audioExecutor = Executors.newSingleThreadExecutor();

    private JSONObject stateRoot;
    private String cachedStateJSON = "";
    private volatile WebViewSyncListener webViewListener;

    private final Object audioLock = new Object();
    private AudioTrack activeAmbientTrack;
    private String cachedAmbientId = "";
    private int cachedAmbientVolQ = -1;
    private short[] cachedTickPCM;
    private int cachedTickVolQ = -1;

    private PomodoroEngine(Context appContext) {
        this.appContext = appContext;
        setupNotificationChannels();
        loadFromDisk();
    }

    public void setWebViewSyncListener(WebViewSyncListener listener) {
        this.webViewListener = listener;
    }

    public static ThemePalette resolveThemePalette(String themeId) {
        if (themeId == null) themeId = "default-dark";
        switch (themeId) {
            case "default-light":
                return new ThemePalette("#F4F6F9", "#FFFFFF", "#E9ECEF", "#212529", "#6C757D", "#E63946", false);
            case "forest-zen":
                return new ThemePalette("#142219", "#1E3326", "#2A4735", "#E8F5E9", "#A5D6A7", "#66BB6A", true);
            case "ocean-blue":
                return new ThemePalette("#0A0F1D", "#131E36", "#1E2D4E", "#F0F6FC", "#93B4D7", "#38BDF8", true);
            case "cyber-neon":
                return new ThemePalette("#0A0914", "#16132B", "#241F45", "#F8F9FA", "#C4B5FD", "#06B6D4", true);
            case "golden-sunset":
                return new ThemePalette("#1D120A", "#2E1C12", "#442A1B", "#FFF3E0", "#FFCC80", "#F59E0B", true);
            case "sakura-pink":
                return new ThemePalette("#FFF5F7", "#FFFFFF", "#FFE3E8", "#592938", "#8C485E", "#E64980", false);
            case "midnight-amethyst":
                return new ThemePalette("#110A20", "#1D1235", "#2D1C52", "#F3E8FF", "#C084FC", "#A855F7", true);
            case "cozy-coffee":
                return new ThemePalette("#1C150F", "#2C221A", "#403227", "#F7F1EB", "#D0BCAD", "#D97706", true);
            case "matcha-tea":
                return new ThemePalette("#F3F6F1", "#FFFFFF", "#E2EBDC", "#2A3B26", "#577350", "#4D7C0F", false);
            default:
                return new ThemePalette("#16161A", "#242629", "#34383D", "#FFFFFE", "#94A1B2", "#FF6347", true);
        }
    }

    private File getStateFile() {
        return new File(appContext.getFilesDir(), "state.json");
    }

    private static JSONObject createDefaultState() {
        JSONObject root = new JSONObject();
        try {
            JSONObject settings = new JSONObject();
            settings.put("workDuration", 25);
            settings.put("shortBreakDuration", 5);
            settings.put("longBreakDuration", 15);
            settings.put("longBreakInterval", 4);
            settings.put("autoStartBreaks", false);
            settings.put("autoStartPomodoros", false);
            settings.put("alarmSound", "bell");
            settings.put("alarmVolume", 0.7);
            settings.put("tickingSound", false);
            settings.put("ambientSound", "off");
            settings.put("ambientVolume", 0.5);
            settings.put("notificationsEnabled", true);
            settings.put("keepScreenAwake", true);
            root.put("settings", settings);

            root.put("tasks", new JSONArray());
            root.put("activeTaskId", "");
            root.put("pomodoroCount", 0);

            JSONObject stats = new JSONObject();
            stats.put("totalFocusMinutes", 0);
            stats.put("totalPomodoros", 0);
            stats.put("currentStreak", 0);
            stats.put("bestStreak", 0);
            stats.put("lastActiveDate", "");
            stats.put("history", new JSONObject());
            root.put("stats", stats);

            root.put("activeThemeId", "default-dark");
            JSONArray unlocked = new JSONArray();
            unlocked.put("default-dark");
            unlocked.put("default-light");
            root.put("unlockedThemes", unlocked);

            JSONObject timer = new JSONObject();
            timer.put("mode", "work");
            timer.put("duration", 25 * 60);
            timer.put("timeLeft", 25 * 60);
            timer.put("isRunning", false);
            timer.put("cycleCount", 1);
            timer.put("endTime", JSONObject.NULL);
            root.put("timer", timer);
        } catch (Exception ignored) {
        }
        return root;
    }

    private void loadFromDisk() {
        synchronized (stateLock) {
            File file = getStateFile();
            if (file.exists()) {
                try (FileInputStream fis = new FileInputStream(file);
                     ByteArrayOutputStream bos = new ByteArrayOutputStream((int) Math.max(256, file.length()))) {
                    byte[] buf = new byte[4096];
                    int n;
                    while ((n = fis.read(buf)) != -1) {
                        bos.write(buf, 0, n);
                    }
                    String raw = new String(bos.toByteArray(), StandardCharsets.UTF_8);
                    stateRoot = new JSONObject(raw);
                    ensureTimerObjectLocked();
                    cachedStateJSON = stateRoot.toString();
                    return;
                } catch (Exception ignored) {
                }
            }
            stateRoot = createDefaultState();
            cachedStateJSON = stateRoot.toString();
        }
    }

    private void ensureTimerObjectLocked() {
        try {
            JSONObject settings = stateRoot.optJSONObject("settings");
            if (settings == null) {
                settings = createDefaultState().getJSONObject("settings");
                stateRoot.put("settings", settings);
            }
            JSONObject timer = stateRoot.optJSONObject("timer");
            if (timer == null) {
                int workSecs = Math.max(1, settings.optInt("workDuration", 25)) * 60;
                timer = new JSONObject();
                timer.put("mode", "work");
                timer.put("duration", workSecs);
                timer.put("timeLeft", workSecs);
                timer.put("isRunning", false);
                timer.put("cycleCount", 1);
                timer.put("endTime", JSONObject.NULL);
                stateRoot.put("timer", timer);
            } else if (timer.optBoolean("isRunning", false)) {
                long endMs = timer.optLong("endTime", 0L);
                long now = System.currentTimeMillis();
                if (endMs > now) {
                    int rem = Math.max(0, (int) Math.ceil((endMs - now) / 1000.0));
                    timer.put("timeLeft", rem);
                } else if (endMs > 0L) {
                    timer.put("timeLeft", 0);
                    timer.put("isRunning", false);
                    timer.put("endTime", JSONObject.NULL);
                }
            }
        } catch (Exception ignored) {
        }
    }

    private void persistLocked() {
        cachedStateJSON = stateRoot.toString();
        final String snapshot = cachedStateJSON;
        ioExecutor.execute(() -> {
            File target = getStateFile();
            File tmp = new File(appContext.getFilesDir(), "state.json.tmp");
            try (FileOutputStream fos = new FileOutputStream(tmp)) {
                fos.write(snapshot.getBytes(StandardCharsets.UTF_8));
                fos.getFD().sync();
            } catch (Exception e) {
                return;
            }
            //noinspection ResultOfMethodCallIgnored
            tmp.renameTo(target);
        });
    }

    public String getStateJSON() {
        synchronized (stateLock) {
            ensureTimerObjectLocked();
            cachedStateJSON = stateRoot.toString();
            return cachedStateJSON;
        }
    }

    public void syncStateFromWebView(String rawJSON) {
        if (rawJSON == null || rawJSON.isEmpty()) return;
        boolean runningNow = false;
        synchronized (stateLock) {
            try {
                JSONObject incoming = new JSONObject(rawJSON);
                JSONObject prevTimer = stateRoot.optJSONObject("timer");
                stateRoot = incoming;
                JSONObject timer = stateRoot.optJSONObject("timer");
                if (timer == null && prevTimer != null) {
                    stateRoot.put("timer", prevTimer);
                    timer = prevTimer;
                }
                ensureTimerObjectLocked();
                if (timer != null) {
                    runningNow = timer.optBoolean("isRunning", false);
                    if (runningNow && timer.optLong("endTime", 0L) <= 0L) {
                        int tl = Math.max(1, timer.optInt("timeLeft", 1500));
                        timer.put("endTime", System.currentTimeMillis() + tl * 1000L);
                    }
                }
                persistLocked();
            } catch (Exception e) {
                return;
            }
        }
        syncBackgroundServiceAndWidgets(runningNow);
    }

    private void syncBackgroundServiceAndWidgets(boolean runningNow) {
        if (runningNow) {
            PomodoroService.startOrUpdate(appContext);
        } else {
            PomodoroService.stop(appContext);
        }
        PomodoroWidgetProvider.updateAllWidgets(appContext);
    }

    private void notifyWebViewIfActive() {
        WebViewSyncListener listener = this.webViewListener;
        if (listener != null) {
            listener.onNativeStateChanged();
        }
    }

    public WidgetSnapshot getWidgetSnapshot() {
        WidgetSnapshot snap = new WidgetSnapshot();
        synchronized (stateLock) {
            ensureTimerObjectLocked();
            snap.activeThemeId = stateRoot.optString("activeThemeId", "default-dark");
            snap.palette = resolveThemePalette(snap.activeThemeId);

            JSONObject timer = stateRoot.optJSONObject("timer");
            if (timer != null) {
                snap.mode = timer.optString("mode", "work");
                snap.duration = Math.max(60, timer.optInt("duration", 1500));
                snap.timeLeft = Math.max(0, timer.optInt("timeLeft", snap.duration));
                snap.isRunning = timer.optBoolean("isRunning", false);
                snap.endTimeMs = timer.optLong("endTime", 0L);
                snap.cycleCount = Math.max(1, timer.optInt("cycleCount", 1));
            }

            JSONObject stats = stateRoot.optJSONObject("stats");
            if (stats != null) {
                snap.currentStreak = Math.max(0, stats.optInt("currentStreak", 0));
                JSONObject history = stats.optJSONObject("history");
                if (history != null) {
                    JSONObject todayObj = history.optJSONObject(getTodayKey());
                    if (todayObj != null) {
                        snap.todayPomodoros = Math.max(0, todayObj.optInt("pomodoros", 0));
                    }
                }
            }

            String activeId = stateRoot.optString("activeTaskId", "");
            snap.activeTaskId = activeId;
            JSONArray tasks = stateRoot.optJSONArray("tasks");
            if (tasks != null && tasks.length() > 0) {
                JSONObject chosen = null;
                if (!activeId.isEmpty()) {
                    for (int i = 0; i < tasks.length(); i++) {
                        JSONObject t = tasks.optJSONObject(i);
                        if (t != null && activeId.equals(t.optString("id"))) {
                            chosen = t;
                            break;
                        }
                    }
                }
                if (chosen == null) {
                    for (int i = 0; i < tasks.length(); i++) {
                        JSONObject t = tasks.optJSONObject(i);
                        if (t != null && !t.optBoolean("completed", false)) {
                            chosen = t;
                            snap.activeTaskId = t.optString("id", "");
                            break;
                        }
                    }
                }
                if (chosen != null) {
                    snap.activeTaskName = chosen.optString("name", "");
                    snap.activeTaskCompletedPomos = Math.max(0, chosen.optInt("completedPomodoros", 0));
                    snap.activeTaskEstimatedPomos = Math.max(1, chosen.optInt("estimatedPomodoros", 1));
                }
            }
        }
        return snap;
    }

    // =========================================================================
    // Autonomous Widget / Background Timer Actions
    // =========================================================================

    public void toggleTimerFromWidget() {
        boolean nowRunning = false;
        String ambientSound = "off";
        double ambientVol = 0.5;
        boolean isWorkMode = true;

        synchronized (stateLock) {
            try {
                ensureTimerObjectLocked();
                JSONObject timer = stateRoot.getJSONObject("timer");
                JSONObject settings = stateRoot.getJSONObject("settings");
                boolean wasRunning = timer.optBoolean("isRunning", false);
                long now = System.currentTimeMillis();

                if (wasRunning) {
                    long endMs = timer.optLong("endTime", 0L);
                    int rem = endMs > now
                        ? Math.max(0, (int) Math.ceil((endMs - now) / 1000.0))
                        : Math.max(0, timer.optInt("timeLeft", 0));
                    timer.put("timeLeft", rem);
                    timer.put("isRunning", false);
                    timer.put("endTime", JSONObject.NULL);
                    nowRunning = false;
                } else {
                    int rem = timer.optInt("timeLeft", 0);
                    if (rem <= 0) {
                        rem = modeDurationSecondsLocked(timer.optString("mode", "work"));
                        timer.put("duration", rem);
                        timer.put("timeLeft", rem);
                    }
                    timer.put("isRunning", true);
                    timer.put("endTime", now + rem * 1000L);
                    nowRunning = true;
                }

                ambientSound = settings.optString("ambientSound", "off");
                ambientVol = settings.optDouble("ambientVolume", 0.5);
                isWorkMode = "work".equals(timer.optString("mode", "work"));
                persistLocked();
            } catch (Exception ignored) {
            }
        }

        updateAmbientTrack(ambientSound, ambientVol, nowRunning && isWorkMode && !"off".equals(ambientSound));
        syncBackgroundServiceAndWidgets(nowRunning);
        notifyWebViewIfActive();
    }

    public void skipTimerFromWidget() {
        synchronized (stateLock) {
            try {
                ensureTimerObjectLocked();
                JSONObject timer = stateRoot.getJSONObject("timer");
                JSONObject settings = stateRoot.getJSONObject("settings");
                String currMode = timer.optString("mode", "work");
                int cycle = Math.max(1, timer.optInt("cycleCount", 1));
                int intervalLimit = Math.max(1, settings.optInt("longBreakInterval", 4));

                String nextMode;
                if ("work".equals(currMode)) {
                    if (cycle >= intervalLimit) {
                        cycle = 1;
                        nextMode = "longBreak";
                    } else {
                        cycle += 1;
                        nextMode = "shortBreak";
                    }
                } else {
                    nextMode = "work";
                }

                int nextDur = modeDurationSecondsLocked(nextMode);
                timer.put("mode", nextMode);
                timer.put("cycleCount", cycle);
                timer.put("duration", nextDur);
                timer.put("timeLeft", nextDur);
                timer.put("isRunning", false);
                timer.put("endTime", JSONObject.NULL);
                persistLocked();
            } catch (Exception ignored) {
            }
        }

        stopAmbientTrack();
        syncBackgroundServiceAndWidgets(false);
        notifyWebViewIfActive();
    }

    public void completeActiveTaskFromWidget() {
        boolean completedAny = false;
        synchronized (stateLock) {
            try {
                JSONArray tasks = stateRoot.optJSONArray("tasks");
                if (tasks == null || tasks.length() == 0) return;
                String activeId = stateRoot.optString("activeTaskId", "");
                int targetIdx = -1;

                if (!activeId.isEmpty()) {
                    for (int i = 0; i < tasks.length(); i++) {
                        JSONObject t = tasks.optJSONObject(i);
                        if (t != null && activeId.equals(t.optString("id")) && !t.optBoolean("completed", false)) {
                            targetIdx = i;
                            break;
                        }
                    }
                }
                if (targetIdx == -1) {
                    for (int i = 0; i < tasks.length(); i++) {
                        JSONObject t = tasks.optJSONObject(i);
                        if (t != null && !t.optBoolean("completed", false)) {
                            targetIdx = i;
                            break;
                        }
                    }
                }
                if (targetIdx == -1) return;

                JSONObject target = tasks.getJSONObject(targetIdx);
                target.put("completed", true);
                SimpleDateFormat iso = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
                iso.setTimeZone(TimeZone.getTimeZone("UTC"));
                target.put("completedAt", iso.format(new Date()));

                // Increment today's tasksCompleted
                JSONObject stats = stateRoot.optJSONObject("stats");
                if (stats == null) {
                    stats = new JSONObject();
                    stateRoot.put("stats", stats);
                }
                JSONObject history = stats.optJSONObject("history");
                if (history == null) {
                    history = new JSONObject();
                    stats.put("history", history);
                }
                String today = getTodayKey();
                JSONObject day = history.optJSONObject(today);
                if (day == null) {
                    day = new JSONObject();
                    day.put("minutes", 0);
                    day.put("pomodoros", 0);
                    day.put("tasksCompleted", 0);
                    history.put(today, day);
                }
                day.put("tasksCompleted", day.optInt("tasksCompleted", 0) + 1);

                // Select next active task
                String nextActiveId = "";
                for (int i = 0; i < tasks.length(); i++) {
                    JSONObject t = tasks.optJSONObject(i);
                    if (t != null && !t.optBoolean("completed", false)) {
                        nextActiveId = t.optString("id", "");
                        break;
                    }
                }
                stateRoot.put("activeTaskId", nextActiveId);
                completedAny = true;
                persistLocked();
            } catch (Exception ignored) {
            }
        }

        if (completedAny) {
            playTick(0.25);
            PomodoroWidgetProvider.updateAllWidgets(appContext);
            notifyWebViewIfActive();
        }
    }

    public void onTimerExpired() {
        String alarmSound = "bell";
        double alarmVolume = 0.7;
        String completedMode = "work";
        boolean autoStartNext = false;
        String ambientSound = "off";
        double ambientVolume = 0.5;
        String nextMode = "shortBreak";

        synchronized (stateLock) {
            try {
                ensureTimerObjectLocked();
                JSONObject timer = stateRoot.getJSONObject("timer");
                JSONObject settings = stateRoot.getJSONObject("settings");

                completedMode = timer.optString("mode", "work");
                alarmSound = settings.optString("alarmSound", "bell");
                alarmVolume = settings.optDouble("alarmVolume", 0.7);
                ambientSound = settings.optString("ambientSound", "off");
                ambientVolume = settings.optDouble("ambientVolume", 0.5);

                int cycle = Math.max(1, timer.optInt("cycleCount", 1));
                int intervalLimit = Math.max(1, settings.optInt("longBreakInterval", 4));

                if ("work".equals(completedMode)) {
                    int workMins = Math.max(1, settings.optInt("workDuration", 25));
                    stateRoot.put("pomodoroCount", stateRoot.optInt("pomodoroCount", 0) + 1);
                    recordPomodoroStatsLocked(workMins);
                    incrementActiveTaskPomodoroLocked();

                    if (cycle >= intervalLimit) {
                        cycle = 1;
                        nextMode = "longBreak";
                    } else {
                        cycle += 1;
                        nextMode = "shortBreak";
                    }
                    autoStartNext = settings.optBoolean("autoStartBreaks", false);
                } else {
                    nextMode = "work";
                    autoStartNext = settings.optBoolean("autoStartPomodoros", false);
                }

                int nextDur = modeDurationSecondsLocked(nextMode);
                timer.put("mode", nextMode);
                timer.put("cycleCount", cycle);
                timer.put("duration", nextDur);
                timer.put("timeLeft", nextDur);
                if (autoStartNext) {
                    timer.put("isRunning", true);
                    timer.put("endTime", System.currentTimeMillis() + nextDur * 1000L);
                } else {
                    timer.put("isRunning", false);
                    timer.put("endTime", JSONObject.NULL);
                }
                persistLocked();
            } catch (Exception ignored) {
            }
        }

        playAlarm(alarmSound, alarmVolume);
        boolean isWork = "work".equals(completedMode);
        String title = isWork ? "🎉 ¡Sesión de enfoque completada!" : "⏰ ¡Fin del descanso!";
        String body = isWork
            ? "Excelente trabajo. Es momento de relajar la mente y estirarte."
            : "Tu mente está lista y despejada. ¡A por tu siguiente objetivo!";
        showNativeNotification(title, body);

        updateAmbientTrack(ambientSound, ambientVolume, autoStartNext && "work".equals(nextMode) && !"off".equals(ambientSound));
        syncBackgroundServiceAndWidgets(autoStartNext);
        notifyWebViewIfActive();
    }

    private int modeDurationSecondsLocked(String mode) {
        JSONObject settings = stateRoot.optJSONObject("settings");
        if (settings == null) return 25 * 60;
        if ("shortBreak".equals(mode)) {
            return Math.max(1, settings.optInt("shortBreakDuration", 5)) * 60;
        }
        if ("longBreak".equals(mode)) {
            return Math.max(1, settings.optInt("longBreakDuration", 15)) * 60;
        }
        return Math.max(1, settings.optInt("workDuration", 25)) * 60;
    }

    private void recordPomodoroStatsLocked(int minutes) {
        try {
            JSONObject stats = stateRoot.optJSONObject("stats");
            if (stats == null) {
                stats = new JSONObject();
                stateRoot.put("stats", stats);
            }
            JSONObject history = stats.optJSONObject("history");
            if (history == null) {
                history = new JSONObject();
                stats.put("history", history);
            }
            String today = getTodayKey();
            String yesterday = getYesterdayKey();

            JSONObject day = history.optJSONObject(today);
            if (day == null) {
                day = new JSONObject();
                day.put("minutes", 0);
                day.put("pomodoros", 0);
                day.put("tasksCompleted", 0);
                history.put(today, day);
            }
            day.put("minutes", day.optInt("minutes", 0) + minutes);
            day.put("pomodoros", day.optInt("pomodoros", 0) + 1);

            String lastActive = stats.optString("lastActiveDate", "");
            int streak = stats.optInt("currentStreak", 0);
            if (yesterday.equals(lastActive)) {
                streak += 1;
            } else if (!today.equals(lastActive)) {
                streak = 1;
            }
            int best = Math.max(stats.optInt("bestStreak", 0), streak);

            stats.put("totalFocusMinutes", stats.optInt("totalFocusMinutes", 0) + minutes);
            stats.put("totalPomodoros", stats.optInt("totalPomodoros", 0) + 1);
            stats.put("currentStreak", streak);
            stats.put("bestStreak", best);
            stats.put("lastActiveDate", today);
        } catch (Exception ignored) {
        }
    }

    private void incrementActiveTaskPomodoroLocked() {
        try {
            String activeId = stateRoot.optString("activeTaskId", "");
            if (activeId.isEmpty()) return;
            JSONArray tasks = stateRoot.optJSONArray("tasks");
            if (tasks == null) return;
            for (int i = 0; i < tasks.length(); i++) {
                JSONObject t = tasks.optJSONObject(i);
                if (t != null && activeId.equals(t.optString("id"))) {
                    t.put("completedPomodoros", t.optInt("completedPomodoros", 0) + 1);
                    break;
                }
            }
        } catch (Exception ignored) {
        }
    }

    private static String getTodayKey() {
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
        return sdf.format(new Date());
    }

    private static String getYesterdayKey() {
        Calendar cal = Calendar.getInstance();
        cal.add(Calendar.DAY_OF_YEAR, -1);
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
        return sdf.format(cal.getTime());
    }

    // =========================================================================
    // Notifications
    // =========================================================================

    private void setupNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = (NotificationManager) appContext.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                NotificationChannel alerts = new NotificationChannel(
                    CHANNEL_ALERT_ID,
                    "Sesiones de Pomodoro",
                    NotificationManager.IMPORTANCE_HIGH
                );
                alerts.setDescription("Alertas al finalizar sesiones de enfoque y descanso");
                alerts.enableVibration(true);
                nm.createNotificationChannel(alerts);

                NotificationChannel serviceChannel = new NotificationChannel(
                    CHANNEL_SERVICE_ID,
                    "Temporizador en curso",
                    NotificationManager.IMPORTANCE_LOW
                );
                serviceChannel.setDescription("Mantiene activo el temporizador Pomodoro en segundo plano");
                serviceChannel.setShowBadge(false);
                nm.createNotificationChannel(serviceChannel);
            }
        }
    }

    public void showNativeNotification(String title, String body) {
        NotificationManager nm = (NotificationManager) appContext.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;

        Intent intent = new Intent(appContext, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent pi = PendingIntent.getActivity(appContext, 0, intent, flags);

        Notification.Builder builder;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            builder = new Notification.Builder(appContext, CHANNEL_ALERT_ID);
        } else {
            builder = new Notification.Builder(appContext)
                .setPriority(Notification.PRIORITY_HIGH)
                .setDefaults(Notification.DEFAULT_ALL);
        }

        builder.setSmallIcon(R.drawable.ic_stat_tomato)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(new Notification.BigTextStyle().bigText(body))
            .setAutoCancel(true)
            .setContentIntent(pi);

        nm.notify(1001, builder.build());
    }

    // =========================================================================
    // Native PCM 16-bit 44.1 kHz Audio Synthesizer (Alarms, Tick, Ambient Loops)
    // =========================================================================

    private static double clampVol(double v) {
        return v < 0.0 ? 0.0 : (v > 1.0 ? 1.0 : v);
    }

    private static short clampPCM(int v) {
        if (v > 32760) return 32760;
        if (v < -32760) return -32760;
        return (short) v;
    }

    private static AudioTrack createStaticTrack(short[] pcm, boolean loop) {
        int byteCount = pcm.length * 2;
        AudioTrack track = new AudioTrack.Builder()
            .setAudioAttributes(new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_MEDIA)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build())
            .setAudioFormat(new AudioFormat.Builder()
                .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                .setSampleRate(SAMPLE_RATE)
                .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                .build())
            .setBufferSizeInBytes(Math.max(byteCount, AudioTrack.getMinBufferSize(
                SAMPLE_RATE, AudioFormat.CHANNEL_OUT_MONO, AudioFormat.ENCODING_PCM_16BIT)))
            .setTransferMode(AudioTrack.MODE_STATIC)
            .build();
        track.write(pcm, 0, pcm.length);
        if (loop) {
            track.setLoopPoints(0, pcm.length, -1);
        }
        return track;
    }

    public void playAlarm(String soundId, double volume) {
        short[] pcm = synthesizeAlarmPCM(soundId, volume);
        int durMs = (int) ((pcm.length * 1000L) / SAMPLE_RATE) + 80;
        playOneShotPCM(pcm, durMs);
    }

    public void playTick(double volume) {
        int volQ = (int) (clampVol(volume) * 1000.0 + 0.5);
        short[] pcm;
        synchronized (audioLock) {
            if (cachedTickPCM == null || cachedTickVolQ != volQ) {
                cachedTickPCM = synthesizeTickPCM(volume);
                cachedTickVolQ = volQ;
            }
            pcm = cachedTickPCM;
        }
        playOneShotPCM(pcm, 40);
    }

    private void playOneShotPCM(final short[] pcm, final int durationMs) {
        if (pcm == null || pcm.length == 0) return;
        audioExecutor.execute(() -> {
            try {
                final AudioTrack track = createStaticTrack(pcm, false);
                track.play();
                Thread.sleep(Math.max(50, durationMs));
                track.stop();
                track.release();
            } catch (Exception ignored) {
            }
        });
    }

    public void stopAmbientTrack() {
        synchronized (audioLock) {
            if (activeAmbientTrack != null) {
                try {
                    activeAmbientTrack.stop();
                } catch (Exception ignored) {
                }
                try {
                    activeAmbientTrack.release();
                } catch (Exception ignored) {
                }
                activeAmbientTrack = null;
            }
            cachedAmbientId = "";
            cachedAmbientVolQ = -1;
        }
    }

    public void updateAmbientTrack(final String soundId, final double volume, final boolean active) {
        final int volQ = (int) (clampVol(volume) * 1000.0 + 0.5);
        if (!active || soundId == null || "off".equals(soundId) || volQ <= 0) {
            stopAmbientTrack();
            return;
        }
        audioExecutor.execute(() -> {
            synchronized (audioLock) {
                if (activeAmbientTrack != null && soundId.equals(cachedAmbientId) && volQ == cachedAmbientVolQ) {
                    return;
                }
            }
            short[] pcm = synthesizeAmbientPCM(soundId, volume);
            synchronized (audioLock) {
                if (activeAmbientTrack != null) {
                    try {
                        activeAmbientTrack.stop();
                        activeAmbientTrack.release();
                    } catch (Exception ignored) {
                    }
                }
                try {
                    activeAmbientTrack = createStaticTrack(pcm, true);
                    activeAmbientTrack.play();
                    cachedAmbientId = soundId;
                    cachedAmbientVolQ = volQ;
                } catch (Exception ignored) {
                }
            }
        });
    }

    private static short[] synthesizeTickPCM(double volume) {
        double vol = clampVol(volume);
        int numSamples = 1103;
        short[] out = new short[numSamples];
        double decayStep = Math.exp(-180.0 * INV_SAMPLE_RATE);
        double env = 1.0;
        double omega = 2.0 * Math.PI * 1200.0 * INV_SAMPLE_RATE;
        double sinStep = Math.sin(omega);
        double cosStep = Math.cos(omega);
        double sinVal = 0.0;
        double cosVal = 1.0;
        double scale = vol * 0.4 * 32760.0;

        for (int i = 0; i < numSamples; i++) {
            out[i] = clampPCM((int) (sinVal * env * scale));
            env *= decayStep;
            double nextSin = sinVal * cosStep + cosVal * sinStep;
            cosVal = cosVal * cosStep - sinVal * sinStep;
            sinVal = nextSin;
        }
        return out;
    }

    private static short[] synthesizeAlarmPCM(String id, double volume) {
        double vol = clampVol(volume);
        double[][] notes;
        double totalDur = 1.4;
        if ("chime".equals(id)) {
            notes = new double[][]{{523.25, 0.0, 0.45, 0}, {659.25, 0.18, 0.45, 0}, {783.99, 0.36, 0.55, 0}, {1046.50, 0.55, 0.75, 0}};
        } else if ("digital".equals(id)) {
            notes = new double[][]{{880, 0.0, 0.12, 1}, {880, 0.16, 0.12, 1}, {880, 0.32, 0.12, 1}, {1174.66, 0.50, 0.35, 1}};
            totalDur = 1.0;
        } else if ("gong".equals(id)) {
            notes = new double[][]{{196.0, 0.0, 1.5, 0}, {293.66, 0.0, 1.3, 0}, {392.0, 0.0, 1.1, 2}};
            totalDur = 1.6;
        } else if ("marimba".equals(id)) {
            notes = new double[][]{{440.0, 0.0, 0.22, 2}, {554.37, 0.14, 0.22, 2}, {659.25, 0.28, 0.25, 2}, {880.0, 0.42, 0.45, 2}};
            totalDur = 1.0;
        } else if ("retro".equals(id)) {
            notes = new double[][]{{587.33, 0.0, 0.10, 1}, {783.99, 0.10, 0.10, 1}, {987.77, 0.20, 0.10, 1}, {1174.66, 0.30, 0.35, 1}};
            totalDur = 0.8;
        } else if ("classic".equals(id)) {
            notes = new double[][]{{740.0, 0.0, 0.18, 1}, {987.77, 0.20, 0.18, 1}, {740.0, 0.42, 0.18, 1}, {987.77, 0.62, 0.32, 1}};
            totalDur = 1.0;
        } else {
            notes = new double[][]{{587.33, 0.0, 0.9, 0}, {1174.66, 0.0, 0.6, 0}, {880.0, 0.32, 0.9, 0}};
        }

        int numSamples = (int) (totalDur * SAMPLE_RATE);
        short[] buf = new short[numSamples];
        double scale = vol * 32760.0;
        int attackSamples = (int) (0.01 * SAMPLE_RATE);
        double invAttack = 1.0 / attackSamples;

        for (double[] n : notes) {
            double freq = n[0];
            int startIdx = (int) (n[1] * SAMPLE_RATE);
            int endIdx = Math.min(numSamples, (int) ((n[1] + n[2]) * SAMPLE_RATE));
            int wave = (int) n[3];
            if (startIdx >= endIdx) continue;

            double decayStep = Math.exp(-3.8 / (n[2] * SAMPLE_RATE));
            double env = 1.0;
            double omega = 2.0 * Math.PI * freq * INV_SAMPLE_RATE;
            double sinStep = Math.sin(omega);
            double cosStep = Math.cos(omega);
            double sinVal = 0.0;
            double cosVal = 1.0;
            double phase = 0.0;
            double phaseStep = freq * INV_SAMPLE_RATE;

            int count = endIdx - startIdx;
            for (int k = 0; k < count; k++) {
                double curEnv = env;
                if (k < attackSamples) {
                    curEnv *= k * invAttack;
                }
                env *= decayStep;

                double val;
                if (wave == 1) {
                    val = phase < 0.5 ? 0.35 : -0.35;
                    phase += phaseStep;
                    if (phase >= 1.0) phase -= 1.0;
                } else if (wave == 2) {
                    double tri;
                    if (phase < 0.25) tri = 4.0 * phase;
                    else if (phase < 0.75) tri = 2.0 - 4.0 * phase;
                    else tri = 4.0 * phase - 4.0;
                    val = tri * 0.6;
                    phase += phaseStep;
                    if (phase >= 1.0) phase -= 1.0;
                } else {
                    val = sinVal * 0.55;
                    double nextSin = sinVal * cosStep + cosVal * sinStep;
                    cosVal = cosVal * cosStep - sinVal * sinStep;
                    sinVal = nextSin;
                }
                int idx = startIdx + k;
                int mixed = buf[idx] + (int) (val * curEnv * scale);
                buf[idx] = clampPCM(mixed);
            }
        }
        return buf;
    }

    private static short[] synthesizeAmbientPCM(String id, double volume) {
        double vol = clampVol(volume);
        int numSamples = 3 * SAMPLE_RATE;
        short[] buf = new short[numSamples];
        double scale = vol * 32760.0;

        long rngState = 0x9E3779B97F4A7C15L;
        double invMax = 1.0 / (double) (1L << 53);

        double omega = 2.0 * Math.PI * 0.67 * INV_SAMPLE_RATE;
        double sinStep = Math.sin(omega);
        double cosStep = Math.cos(omega);
        double sinVal = 0.0;
        double cosVal = 1.0;
        double last = 0.0;

        for (int i = 0; i < numSamples; i++) {
            rngState ^= (rngState >>> 12);
            rngState ^= (rngState << 25);
            rngState ^= (rngState >>> 27);
            long rnd = rngState * 0x2545F4914F6CDD1DL;
            double u = (double) (rnd >>> 11) * invMax;
            double white = u * 2.0 - 1.0;

            double s = 0.0;
            if ("white-noise".equals(id)) {
                s = white * 0.18;
            } else if ("brown-noise".equals(id)) {
                last = (last + 0.02 * white) * (1.0 / 1.02);
                s = last * 0.65;
            } else if ("rain".equals(id)) {
                last = 0.85 * last + 0.15 * white;
                double drop = ((rnd & 0x1FFL) == 0L) ? 2.2 : 1.0;
                s = last * 0.25 * drop;
            } else if ("stream".equals(id)) {
                double mod = 0.75 + 0.25 * sinVal;
                double nextSin = sinVal * cosStep + cosVal * sinStep;
                cosVal = cosVal * cosStep - sinVal * sinStep;
                sinVal = nextSin;
                last = 0.92 * last + 0.08 * white;
                s = last * 0.32 * mod;
            }
            buf[i] = clampPCM((int) (s * scale));
        }
        return buf;
    }
}
