package com.pomodoro.taskapp;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.view.View;
import android.view.Window;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.InputStream;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

public final class MainActivity extends Activity implements PomodoroEngine.WebViewSyncListener {
    private static final String APP_HOST = "appassets.androidplatform.net";
    private static final String APP_ORIGIN = "https://" + APP_HOST + "/index.html";

    private WebView webView;
    private PowerManager.WakeLock cpuWakeLock;
    private PomodoroEngine engine;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        engine = PomodoroEngine.getInstance(this);
        engine.setWebViewSyncListener(this);
        requestNotificationPermissionIfNeeded();

        PomodoroEngine.WidgetSnapshot snap = engine.getWidgetSnapshot();
        Window window = getWindow();
        if (window != null) {
            window.setStatusBarColor(snap.palette.bgPrimary);
            window.setNavigationBarColor(snap.palette.bgPrimary);
        }

        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (pm != null) {
            cpuWakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "PomodoroTaskApp::FocusTimerWakeLock");
            cpuWakeLock.setReferenceCounted(false);
        }

        webView = new WebView(this);
        webView.setBackgroundColor(snap.palette.bgPrimary);
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        webView.addJavascriptInterface(new AndroidBridge(), "AndroidNative");
        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (uri == null || !APP_HOST.equalsIgnoreCase(uri.getHost())) {
                    return super.shouldInterceptRequest(view, request);
                }
                String path = uri.getPath();
                if (path == null || path.isEmpty() || "/".equals(path)) {
                    path = "/index.html";
                }
                String assetPath = "www" + path;
                try {
                    InputStream is = getAssets().open(assetPath);
                    String mime = detectMimeType(path);
                    Map<String, String> headers = new HashMap<>();
                    if ("/index.html".equals(path) || "/service-worker.js".equals(path) || "/manifest.json".equals(path)) {
                        headers.put("Cache-Control", "no-cache");
                    } else {
                        headers.put("Cache-Control", "public, max-age=31536000, immutable");
                    }
                    return new WebResourceResponse(mime, "UTF-8", 200, "OK", headers, is);
                } catch (Exception e) {
                    return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", null, null);
                }
            }
        });

        setContentView(webView);
        webView.loadUrl(APP_ORIGIN);
        PomodoroWidgetProvider.updateAllWidgets(this);
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (engine != null) {
            engine.setWebViewSyncListener(this);
        }
        onNativeStateChanged();
        PomodoroWidgetProvider.updateAllWidgets(this);
    }

    @Override
    public void onNativeStateChanged() {
        runOnUiThread(() -> {
            if (webView != null) {
                webView.evaluateJavascript(
                    "if(typeof window.__onAndroidNativeStateUpdated==='function'){window.__onAndroidNativeStateUpdated();}",
                    null
                );
            }
        });
    }

    @Override
    public void onBackPressed() {
        if (webView != null) {
            webView.evaluateJavascript(
                "(function(){var m=document.querySelector('.modal-backdrop');if(m){window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}));return true;}return false;})()",
                value -> {
                    if (!"true".equals(value)) {
                        if (webView.canGoBack()) {
                            webView.goBack();
                        } else {
                            moveTaskToBack(true);
                        }
                    }
                }
            );
            return;
        }
        super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        if (engine != null) {
            engine.setWebViewSyncListener(null);
        }
        releaseWakeLockInternal();
        if (webView != null) {
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }

    private void requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= 33) {
            if (checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 101);
            }
        }
    }

    private void applySystemBarColors(final String bgHex, final boolean isDark) {
        runOnUiThread(() -> {
            Window window = getWindow();
            if (window == null) {
                return;
            }
            int color = Color.parseColor("#16161A");
            try {
                if (bgHex != null && bgHex.startsWith("#") && bgHex.length() >= 7) {
                    color = Color.parseColor(bgHex.substring(0, 7));
                }
            } catch (Exception ignored) {
            }
            window.setStatusBarColor(color);
            window.setNavigationBarColor(color);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                WindowInsetsController controller = window.getInsetsController();
                if (controller != null) {
                    int appearance = isDark ? 0 : (WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
                        | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS);
                    controller.setSystemBarsAppearance(
                        appearance,
                        WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
                            | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS
                    );
                }
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                View decor = window.getDecorView();
                int flags = decor.getSystemUiVisibility();
                if (isDark) {
                    flags &= ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
                } else {
                    flags |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
                }
                decor.setSystemUiVisibility(flags);
            }
        });
    }

    private void updateWakeLock(final boolean enabled) {
        runOnUiThread(() -> {
            Window window = getWindow();
            if (window != null) {
                if (enabled) {
                    window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                } else {
                    window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                }
            }
        });
        try {
            if (cpuWakeLock != null) {
                if (enabled && !cpuWakeLock.isHeld()) {
                    cpuWakeLock.acquire(4 * 60 * 60 * 1000L);
                } else if (!enabled && cpuWakeLock.isHeld()) {
                    cpuWakeLock.release();
                }
            }
        } catch (Exception ignored) {
        }
    }

    private void releaseWakeLockInternal() {
        try {
            if (cpuWakeLock != null && cpuWakeLock.isHeld()) {
                cpuWakeLock.release();
            }
        } catch (Exception ignored) {
        }
    }

    private static String detectMimeType(String path) {
        String lower = path.toLowerCase(Locale.ROOT);
        if (lower.endsWith(".html")) return "text/html";
        if (lower.endsWith(".js") || lower.endsWith(".mjs")) return "application/javascript";
        if (lower.endsWith(".css")) return "text/css";
        if (lower.endsWith(".json")) return "application/json";
        if (lower.endsWith(".svg")) return "image/svg+xml";
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        if (lower.endsWith(".webp")) return "image/webp";
        if (lower.endsWith(".ico")) return "image/x-icon";
        if (lower.endsWith(".woff2")) return "font/woff2";
        return "application/octet-stream";
    }

    public final class AndroidBridge {
        @JavascriptInterface
        public String getState() {
            return engine.getStateJSON();
        }

        @JavascriptInterface
        public void syncState(String rawJSON) {
            engine.syncStateFromWebView(rawJSON);
        }

        @JavascriptInterface
        public void playAlarm(String soundId, double volume) {
            engine.playAlarm(soundId, volume);
        }

        @JavascriptInterface
        public void playTick(double volume) {
            engine.playTick(volume);
        }

        @JavascriptInterface
        public void setAmbient(String soundId, double volume, boolean active) {
            engine.updateAmbientTrack(soundId, volume, active);
        }

        @JavascriptInterface
        public void setWindowTheme(String bgHex, boolean isDark) {
            applySystemBarColors(bgHex, isDark);
            PomodoroWidgetProvider.updateAllWidgets(MainActivity.this);
        }

        @JavascriptInterface
        public void setWakeLock(boolean enabled) {
            updateWakeLock(enabled);
        }

        @JavascriptInterface
        public void notify(String title, String body) {
            engine.showNativeNotification(title != null ? title : "Pomodoro Focus", body != null ? body : "");
        }
    }
}
