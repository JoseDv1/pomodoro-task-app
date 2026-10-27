package ui

import (
	"bufio"
	"bytes"
	"encoding/json"
	"io"
	"net"
	"net/http"
	"path/filepath"
	"strings"
	"testing"
	"testing/fstest"

	"github.com/JoseDv1/pomodoro-task-app/internal/core"
)

func TestHybridServerStateAndHooks(t *testing.T) {
	tmpFile := filepath.Join(t.TempDir(), "state.json")
	eng := core.NewEngine(tmpFile)

	mockFS := fstest.MapFS{
		"index.html": &fstest.MapFile{Data: []byte("<!doctype html><html><body>Pomodoro</body></html>")},
	}

	var themeCalled, wakeCalled, notifyCalled bool
	hooks := NativeHooks{
		OnWindowTheme: func(bgColor core.ColorRGB, isDark bool) {
			themeCalled = true
		},
		OnWakeLock: func(enabled bool) {
			wakeCalled = enabled
		},
		OnNotify: func(title, body string) {
			notifyCalled = title != ""
		},
	}

	url, cleanup, err := StartHybridServer(eng, mockFS, hooks)
	if err != nil {
		t.Fatalf("StartHybridServer failed: %v", err)
	}
	defer cleanup()

	// 1. Verificar GET /api/state
	res, err := http.Get(url + "/api/state")
	if err != nil {
		t.Fatalf("GET /api/state failed: %v", err)
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d", res.StatusCode)
	}

	var state statePayload
	if err := json.NewDecoder(res.Body).Decode(&state); err != nil {
		t.Fatalf("decode state failed: %v", err)
	}
	if state.Settings.WorkDuration != 25 {
		t.Fatalf("expected default WorkDuration 25, got %d", state.Settings.WorkDuration)
	}

	// 2. Verificar POST /api/state y persistencia en Engine
	state.PomodoroCount = 7
	state.ActiveThemeID = "forest-zen"
	state.UnlockedThemes = []string{"default-dark", "default-light", "forest-zen"}
	bodyBytes, _ := json.Marshal(state)
	postRes, err := http.Post(url+"/api/state", "application/json", bytes.NewReader(bodyBytes))
	if err != nil {
		t.Fatalf("POST /api/state failed: %v", err)
	}
	postRes.Body.Close()
	if postRes.StatusCode != http.StatusNoContent {
		t.Fatalf("expected 204 No Content, got %d", postRes.StatusCode)
	}
	if eng.PomodoroCount != 7 || eng.ActiveThemeID != "forest-zen" {
		t.Fatalf("engine state not updated: count=%d theme=%s", eng.PomodoroCount, eng.ActiveThemeID)
	}

	// 3. Verificar hooks nativos (/api/window/theme, /api/window/awake, /api/notify)
	_, _ = http.Post(url+"/api/window/theme", "application/json", bytes.NewReader([]byte(`{"bgHex":"#142219","isDark":true}`)))
	_, _ = http.Post(url+"/api/window/awake", "application/json", bytes.NewReader([]byte(`{"enabled":true}`)))
	_, _ = http.Post(url+"/api/notify", "application/json", bytes.NewReader([]byte(`{"title":"Listo","body":"Pomodoro terminado"}`)))

	if !themeCalled || !wakeCalled || !notifyCalled {
		t.Fatalf("native hooks not triggered: theme=%v wake=%v notify=%v", themeCalled, wakeCalled, notifyCalled)
	}
}

func BenchmarkHybridServerStaticAsset(b *testing.B) {
	tmpFile := filepath.Join(b.TempDir(), "state.json")
	eng := core.NewEngine(tmpFile)
	mockFS := fstest.MapFS{
		"index.html": &fstest.MapFile{Data: bytes.Repeat([]byte("a"), 1574)},
	}
	url, cleanup, err := StartHybridServer(eng, mockFS, NativeHooks{})
	if err != nil {
		b.Fatal(err)
	}
	defer cleanup()

	conn, err := net.Dial("tcp", strings.TrimPrefix(url, "http://"))
	if err != nil {
		b.Fatal(err)
	}
	defer conn.Close()

	reqBytes := []byte("GET /index.html HTTP/1.1\r\nHost: 127.0.0.1\r\n\r\n")
	br := bufio.NewReaderSize(conn, 4096)
	var discardBuf [2048]byte

	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		if _, err := conn.Write(reqBytes); err != nil {
			b.Fatal(err)
		}
		contentLen := 0
		for {
			line, err := br.ReadSlice('\n')
			if err != nil {
				b.Fatal(err)
			}
			if len(line) <= 2 && (line[0] == '\r' || line[0] == '\n') {
				break
			}
			if n, ok := matchContentLength(line); ok {
				contentLen = n
			}
		}
		if _, err := io.ReadFull(br, discardBuf[:contentLen]); err != nil {
			b.Fatal(err)
		}
	}
}

func BenchmarkHybridServerGetState(b *testing.B) {
	tmpFile := filepath.Join(b.TempDir(), "state.json")
	eng := core.NewEngine(tmpFile)
	eng.AddTask("Optimizar servidor híbrido", 4, core.PriorityHigh, "Desarrollo")
	mockFS := fstest.MapFS{
		"index.html": &fstest.MapFile{Data: []byte("ok")},
	}
	url, cleanup, err := StartHybridServer(eng, mockFS, NativeHooks{})
	if err != nil {
		b.Fatal(err)
	}
	defer cleanup()

	conn, err := net.Dial("tcp", strings.TrimPrefix(url, "http://"))
	if err != nil {
		b.Fatal(err)
	}
	defer conn.Close()

	reqBytes := []byte("GET /api/state HTTP/1.1\r\nHost: 127.0.0.1\r\n\r\n")
	br := bufio.NewReaderSize(conn, 4096)
	var discardBuf [2048]byte

	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		if _, err := conn.Write(reqBytes); err != nil {
			b.Fatal(err)
		}
		contentLen := 0
		for {
			line, err := br.ReadSlice('\n')
			if err != nil {
				b.Fatal(err)
			}
			if len(line) <= 2 && (line[0] == '\r' || line[0] == '\n') {
				break
			}
			if n, ok := matchContentLength(line); ok {
				contentLen = n
			}
		}
		if _, err := io.ReadFull(br, discardBuf[:contentLen]); err != nil {
			b.Fatal(err)
		}
	}
}

func BenchmarkHybridBridgeDirectState(b *testing.B) {
	tmpFile := filepath.Join(b.TempDir(), "state.json")
	eng := core.NewEngine(tmpFile)
	eng.AddTask("Optimizar servidor híbrido", 4, core.PriorityHigh, "Desarrollo")
	bridge := NewHybridBridge(eng, NativeHooks{})

	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		pkt := bridge.StateHTTPResponse()
		if len(pkt) == 0 {
			b.Fatal("empty response")
		}
	}
}

