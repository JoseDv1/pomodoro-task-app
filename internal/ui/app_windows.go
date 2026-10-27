//go:build windows

package ui

import (
	"io/fs"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"sync/atomic"
	"syscall"
	"unicode/utf16"
	"unsafe"

	"github.com/JoseDv1/pomodoro-task-app/internal/audio"
	"github.com/JoseDv1/pomodoro-task-app/internal/core"
	"github.com/jchv/go-webview2"
)

var (
	user32   = syscall.NewLazyDLL("user32.dll")
	kernel32 = syscall.NewLazyDLL("kernel32.dll")
	dwmapi   = syscall.NewLazyDLL("dwmapi.dll")
	shell32  = syscall.NewLazyDLL("shell32.dll")

	procLoadIconW               = user32.NewProc("LoadIconW")
	procSetThreadExecutionState = kernel32.NewProc("SetThreadExecutionState")
	procDwmSetWindowAttribute   = dwmapi.NewProc("DwmSetWindowAttribute")
	procShellNotifyIconW        = shell32.NewProc("Shell_NotifyIconW")
)

const (
	idiApp = 32512

	esContinuous      = 0x80000000
	esSystemRequired  = 0x00000001
	esDisplayRequired = 0x00000002

	nimAdd    = 0x00000000
	nimModify = 0x00000001
	nimDelete = 0x00000002
	nifIcon   = 0x00000002
	nifTip    = 0x00000004
	nifInfo   = 0x00000010
	niifInfo  = 0x00000001
)

type notifyIconDataW struct {
	CbSize           uint32
	HWnd             uintptr
	UID              uint32
	UFlags           uint32
	UCallbackMessage uint32
	HIcon            uintptr
	SzTip            [128]uint16
	DwState          uint32
	DwStateMask      uint32
	SzInfo           [256]uint16
	UVersion         uint32
	SzInfoTitle      [64]uint16
	DwInfoFlags      uint32
}

// Run inicia el servidor híbrido en memoria y abre la ventana nativa WebView2 del sistema en Windows.
func Run(eng *core.Engine, distFS fs.FS) error {
	runtime.LockOSThread()

	var activeHwnd atomic.Uintptr

	hooks := NativeHooks{
		OnWindowTheme: func(bgColor core.ColorRGB, isDark bool) {
			if hwnd := activeHwnd.Load(); hwnd != 0 {
				applyWindowThemeColor(hwnd, bgColor, isDark)
			}
		},
		OnWakeLock: func(enabled bool) {
			setKeepScreenAwake(enabled)
		},
		OnNotify: func(title, body string) {
			if hwnd := activeHwnd.Load(); hwnd != 0 {
				showBalloonNotification(hwnd, title, body)
			}
		},
	}

	bridge := NewHybridBridge(eng, hooks)
	url, cleanupServer, err := StartHybridServerWithBridge(bridge, distFS)
	if err != nil {
		return err
	}
	defer cleanupServer()

	dataPath := filepath.Join(filepath.Dir(eng.StoragePath), "WebView2Data")

	w := webview2.NewWithOptions(webview2.WebViewOptions{
		Debug:     false,
		AutoFocus: true,
		DataPath:  dataPath,
		WindowOptions: webview2.WindowOptions{
			Title:  "Pomodoro Task App",
			Width:  1180,
			Height: 790,
			Center: true,
			IconId: 0,
		},
	})

	if w != nil {
		defer w.Destroy()

		hwnd := uintptr(w.Window())
		activeHwnd.Store(hwnd)

		// Bindings IPC directos en memoria (WebView2 postMessage -> Go sin pasar por socket TCP)
		_ = w.Bind("goNativeGetState", func() string {
			return bridge.StateJSON()
		})
		_ = w.Bind("goNativeSyncState", func(rawJSON string) {
			_ = bridge.ApplyStateJSON([]byte(rawJSON))
		})
		_ = w.Bind("goNativePlayAlarm", func(soundID string, volume float64) {
			bridge.PlayAlarm(soundID, volume)
		})
		_ = w.Bind("goNativePlayTick", func(volume float64) {
			bridge.PlayTick(volume)
		})
		_ = w.Bind("goNativeSetAmbient", func(soundID string, volume float64, active bool) {
			bridge.SetAmbient(soundID, volume, active)
		})
		_ = w.Bind("goNativeSetWindowTheme", func(bgHex string, isDark bool) {
			bridge.SetWindowTheme(bgHex, isDark)
		})
		_ = w.Bind("goNativeSetWakeLock", func(enabled bool) {
			bridge.SetWakeLock(enabled)
		})
		_ = w.Bind("goNativeNotify", func(title, body string) {
			bridge.Notify(title, body)
		})

		th := eng.ActiveTheme()
		applyWindowThemeColor(hwnd, th.BgPrimary, th.IsDark)

		w.SetSize(1180, 790, webview2.HintNone)
		w.Navigate(url)
		w.Run()

		removeTrayIcon(hwnd)
	} else {
		// Respaldo automático en modo ventana de aplicación si el runtime WebView2 no estuviera disponible
		_ = launchFallbackAppWindow(url)
	}

	setKeepScreenAwake(false)
	audio.UpdateAmbient(core.AmbientOff, 0, false)
	eng.Save()
	return nil
}

func applyWindowThemeColor(hwnd uintptr, bgPrimary core.ColorRGB, isDark bool) {
	dark := int32(0)
	if isDark {
		dark = 1
	}
	// DWMWA_USE_IMMERSIVE_DARK_MODE = 20
	_, _, _ = procDwmSetWindowAttribute.Call(hwnd, 20, uintptr(unsafe.Pointer(&dark)), 4)

	// DWMWA_CAPTION_COLOR = 35
	captionCol := bgPrimary.COLORREF()
	_, _, _ = procDwmSetWindowAttribute.Call(hwnd, 35, uintptr(unsafe.Pointer(&captionCol)), 4)
}

func setKeepScreenAwake(enable bool) {
	if enable {
		_, _, _ = procSetThreadExecutionState.Call(esContinuous | esSystemRequired | esDisplayRequired)
	} else {
		_, _, _ = procSetThreadExecutionState.Call(esContinuous)
	}
}

func showBalloonNotification(hwnd uintptr, title, body string) {
	var nid notifyIconDataW
	nid.CbSize = uint32(unsafe.Sizeof(nid))
	nid.HWnd = hwnd
	nid.UID = 1001
	nid.UFlags = nifIcon | nifTip | nifInfo
	nid.DwInfoFlags = niifInfo
	hIcon, _, _ := procLoadIconW.Call(0, idiApp)
	nid.HIcon = hIcon

	copyUTF16Fixed(nid.SzTip[:], "Pomodoro Task App")
	copyUTF16Fixed(nid.SzInfoTitle[:], title)
	copyUTF16Fixed(nid.SzInfo[:], body)

	_, _, _ = procShellNotifyIconW.Call(nimAdd, uintptr(unsafe.Pointer(&nid)))
	_, _, _ = procShellNotifyIconW.Call(nimModify, uintptr(unsafe.Pointer(&nid)))
}

func removeTrayIcon(hwnd uintptr) {
	var nid notifyIconDataW
	nid.CbSize = uint32(unsafe.Sizeof(nid))
	nid.HWnd = hwnd
	nid.UID = 1001
	_, _, _ = procShellNotifyIconW.Call(nimDelete, uintptr(unsafe.Pointer(&nid)))
}

func copyUTF16Fixed(dst []uint16, s string) {
	encoded := utf16.Encode([]rune(s))
	n := len(encoded)
	if n >= len(dst) {
		n = len(dst) - 1
	}
	copy(dst[:n], encoded[:n])
	dst[n] = 0
}

func launchFallbackAppWindow(url string) error {
	candidates := []string{
		filepath.Join(os.Getenv("ProgramFiles(x86)"), "Microsoft", "Edge", "Application", "msedge.exe"),
		filepath.Join(os.Getenv("ProgramFiles"), "Microsoft", "Edge", "Application", "msedge.exe"),
		filepath.Join(os.Getenv("ProgramFiles"), "Google", "Chrome", "Application", "chrome.exe"),
	}
	for _, bin := range candidates {
		if _, err := os.Stat(bin); err == nil {
			cmd := exec.Command(bin, "--app="+url, "--window-size=1180,790")
			if err := cmd.Start(); err == nil {
				_ = cmd.Wait()
				return nil
			}
		}
	}
	cmd := exec.Command("rundll32", "url.dll,FileProtocolHandler", url)
	return cmd.Run()
}
