package ui

import (
	"bufio"
	"bytes"
	"encoding/json"
	"io"
	"io/fs"
	"net"
	"path"
	"strconv"
	"strings"
	"sync"

	"github.com/JoseDv1/pomodoro-task-app/internal/audio"
	"github.com/JoseDv1/pomodoro-task-app/internal/core"
)

// NativeHooks agrupa los callbacks de integración con el sistema operativo anfitrión.
type NativeHooks struct {
	OnWindowTheme func(bgColor core.ColorRGB, isDark bool)
	OnWakeLock    func(enabled bool)
	OnNotify      func(title, body string)
}

type statePayload struct {
	Settings       core.UserSettings `json:"settings"`
	Tasks          []core.Task       `json:"tasks"`
	ActiveTaskID   string            `json:"activeTaskId"`
	PomodoroCount  int               `json:"pomodoroCount"`
	Stats          core.Stats        `json:"stats"`
	ActiveThemeID  string            `json:"activeThemeId"`
	UnlockedThemes []string          `json:"unlockedThemes"`
}

type alarmReq struct {
	SoundID core.AlarmSoundID `json:"soundId"`
	Volume  float64           `json:"volume"`
}

type tickReq struct {
	Volume float64 `json:"volume"`
}

type ambientReq struct {
	SoundID core.AmbientSoundID `json:"soundId"`
	Volume  float64             `json:"volume"`
	Active  bool                `json:"active"`
}

type windowThemeReq struct {
	BgHex  string `json:"bgHex"`
	IsDark bool   `json:"isDark"`
}

type wakeReq struct {
	Enabled bool `json:"enabled"`
}

type notifyReq struct {
	Title string `json:"title"`
	Body  string `json:"body"`
}

var (
	resp204 = []byte("HTTP/1.1 204 No Content\r\nContent-Length: 0\r\nConnection: keep-alive\r\n\r\n")
	resp400 = []byte("HTTP/1.1 400 Bad Request\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Length: 11\r\nConnection: keep-alive\r\n\r\nbad request")
	resp404 = []byte("HTTP/1.1 404 Not Found\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Length: 9\r\nConnection: keep-alive\r\n\r\nnot found")
	resp405 = []byte("HTTP/1.1 405 Method Not Allowed\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Length: 18\r\nConnection: keep-alive\r\n\r\nmethod not allowed")

	bufioReaderPool = sync.Pool{
		New: func() any {
			return bufio.NewReaderSize(nil, 4096)
		},
	}
)

// HybridBridge gestiona la sincronización de estado en memoria (0 allocs en lecturas cacheadas)
// tanto para los bindings nativos de WebView2 (w.Bind) como para el servidor HTTP/1.1 ligero.
type HybridBridge struct {
	mu              sync.RWMutex
	eng             *core.Engine
	hooks           NativeHooks
	cachedStateJSON []byte
	cachedStateHTTP []byte
}

// NewHybridBridge crea un puente de estado pre-cacheado sobre el Engine en Go.
func NewHybridBridge(eng *core.Engine, hooks NativeHooks) *HybridBridge {
	b := &HybridBridge{
		eng:   eng,
		hooks: hooks,
	}
	b.mu.Lock()
	b.rebuildStateCacheLocked()
	b.mu.Unlock()
	return b
}

func (b *HybridBridge) rebuildStateCacheLocked() {
	unlocked := make([]string, 0, len(b.eng.UnlockedThemes))
	for id, ok := range b.eng.UnlockedThemes {
		if ok {
			unlocked = append(unlocked, id)
		}
	}
	tasks := b.eng.Tasks
	if tasks == nil {
		tasks = []core.Task{}
	}
	stats := b.eng.Stats
	if stats.History == nil {
		stats.History = make(map[string]core.DayStats)
	}
	resp := statePayload{
		Settings:       b.eng.Settings,
		Tasks:          tasks,
		ActiveTaskID:   b.eng.ActiveTaskID,
		PomodoroCount:  b.eng.PomodoroCount,
		Stats:          stats,
		ActiveThemeID:  b.eng.ActiveThemeID,
		UnlockedThemes: unlocked,
	}
	rawJSON, err := json.Marshal(resp)
	if err != nil {
		rawJSON = []byte("{}")
	}
	b.cachedStateJSON = rawJSON
	b.cachedStateHTTP = buildHTTPResponse("200 OK", "application/json; charset=utf-8", "no-store", rawJSON)
}

// StateJSON devuelve el JSON de estado actual desde la caché en memoria (0 allocs).
func (b *HybridBridge) StateJSON() string {
	b.mu.RLock()
	s := string(b.cachedStateJSON)
	b.mu.RUnlock()
	return s
}

// StateHTTPResponse devuelve la trama HTTP/1.1 200 OK pre-ensamblada para GET /api/state (0 allocs).
func (b *HybridBridge) StateHTTPResponse() []byte {
	b.mu.RLock()
	pkt := b.cachedStateHTTP
	b.mu.RUnlock()
	return pkt
}

// ApplyStateJSON decodifica el estado enviado por la UI, actualiza el Engine, guarda en disco y refresca la caché.
func (b *HybridBridge) ApplyStateJSON(raw []byte) error {
	var req statePayload
	if err := json.Unmarshal(raw, &req); err != nil {
		return err
	}
	b.mu.Lock()
	b.eng.Settings = req.Settings
	if req.Tasks == nil {
		req.Tasks = []core.Task{}
	}
	b.eng.Tasks = req.Tasks
	b.eng.ActiveTaskID = req.ActiveTaskID
	b.eng.PomodoroCount = req.PomodoroCount
	if req.Stats.History == nil {
		req.Stats.History = make(map[string]core.DayStats)
	}
	b.eng.Stats = req.Stats
	if req.ActiveThemeID != "" {
		b.eng.ActiveThemeID = req.ActiveThemeID
	}
	for _, id := range req.UnlockedThemes {
		b.eng.UnlockedThemes[id] = true
	}
	b.eng.Save()
	b.rebuildStateCacheLocked()
	b.mu.Unlock()
	return nil
}

// PlayAlarm dispara la síntesis/caché WAV nativa de alarma.
func (b *HybridBridge) PlayAlarm(soundID string, volume float64) {
	audio.PlayAlarm(core.AlarmSoundID(soundID), volume)
}

// PlayTick dispara el clic de reloj mecánico nativo (0 allocs con caché WAV).
func (b *HybridBridge) PlayTick(volume float64) {
	audio.PlayTick(volume)
}

// SetAmbient actualiza el generador DSP de sonido ambiental nativo.
func (b *HybridBridge) SetAmbient(soundID string, volume float64, active bool) {
	audio.UpdateAmbient(core.AmbientSoundID(soundID), volume, active)
}

// SetWindowTheme sincroniza el color de barra de título nativa del sistema operativo.
func (b *HybridBridge) SetWindowTheme(bgHex string, isDark bool) {
	if b.hooks.OnWindowTheme != nil {
		col := parseHexColor(bgHex, core.ColorRGB{R: 22, G: 22, B: 26})
		b.hooks.OnWindowTheme(col, isDark)
	}
}

// SetWakeLock activa o desactiva la prevención de suspensión de pantalla nativa.
func (b *HybridBridge) SetWakeLock(enabled bool) {
	if b.hooks.OnWakeLock != nil {
		b.hooks.OnWakeLock(enabled)
	}
}

// Notify muestra una notificación nativa del sistema operativo.
func (b *HybridBridge) Notify(title, body string) {
	if b.hooks.OnNotify != nil {
		b.hooks.OnNotify(title, body)
	}
}

// StartHybridServer inicia un servidor HTTP/1.1 Keep-Alive ultra-ligero sobre 127.0.0.1
// sin depender de net/http (ahorra ~4.5 MB de TLS/HTTP2 en el binario y sirve estáticos con 0 allocs).
func StartHybridServer(eng *core.Engine, distFS fs.FS, hooks NativeHooks) (string, func(), error) {
	bridge := NewHybridBridge(eng, hooks)
	return StartHybridServerWithBridge(bridge, distFS)
}

// StartHybridServerWithBridge inicia el servidor HTTP/1.1 compartiendo un HybridBridge existente.
func StartHybridServerWithBridge(bridge *HybridBridge, distFS fs.FS) (string, func(), error) {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return "", nil, err
	}

	staticResponses := preindexStaticFS(distFS)

	var wg sync.WaitGroup
	var activeConns sync.Map
	closed := make(chan struct{})

	wg.Add(1)
	go func() {
		defer wg.Done()
		for {
			conn, err := ln.Accept()
			if err != nil {
				select {
				case <-closed:
					return
				default:
					continue
				}
			}
			activeConns.Store(conn, struct{}{})
			wg.Add(1)
			go func(c net.Conn) {
				defer wg.Done()
				defer func() {
					activeConns.Delete(c)
					_ = c.Close()
				}()
				serveKeepAliveConn(c, bridge, staticResponses)
			}(conn)
		}
	}()

	url := "http://" + ln.Addr().String()
	var once sync.Once
	cleanup := func() {
		once.Do(func() {
			close(closed)
			_ = ln.Close()
			activeConns.Range(func(key, _ any) bool {
				if c, ok := key.(net.Conn); ok {
					_ = c.Close()
				}
				return true
			})
			wg.Wait()
		})
	}
	return url, cleanup, nil
}

func serveKeepAliveConn(conn net.Conn, bridge *HybridBridge, staticResponses map[string][]byte) {
	if tcpConn, ok := conn.(*net.TCPConn); ok {
		_ = tcpConn.SetNoDelay(true)
	}

	br := bufioReaderPool.Get().(*bufio.Reader)
	br.Reset(conn)
	defer func() {
		br.Reset(nil)
		bufioReaderPool.Put(br)
	}()

	var bodyBuf []byte

	for {
		reqLine, err := br.ReadSlice('\n')
		if err != nil {
			return
		}
		method, reqPath, ok := parseRequestLine(reqLine)
		if !ok {
			return
		}

		contentLength := 0
		closeAfter := false
		for {
			hdrLine, err := br.ReadSlice('\n')
			if err != nil {
				return
			}
			if len(hdrLine) <= 2 && (hdrLine[0] == '\r' || hdrLine[0] == '\n') {
				break
			}
			if n, matched := matchContentLength(hdrLine); matched {
				contentLength = n
			} else if matchConnectionClose(hdrLine) {
				closeAfter = true
			}
		}

		var body []byte
		if contentLength > 0 {
			if contentLength > 4*1024*1024 {
				return
			}
			if cap(bodyBuf) < contentLength {
				bodyBuf = make([]byte, contentLength)
			}
			body = bodyBuf[:contentLength]
			if _, err := io.ReadFull(br, body); err != nil {
				return
			}
		}

		if bytes.Equal(method, []byte("GET")) {
			if string(reqPath) == "/api/state" {
				if _, err := conn.Write(bridge.StateHTTPResponse()); err != nil {
					return
				}
			} else if pkt, found := staticResponses[string(reqPath)]; found {
				if _, err := conn.Write(pkt); err != nil {
					return
				}
			} else {
				if _, err := conn.Write(resp404); err != nil {
					return
				}
			}
		} else if bytes.Equal(method, []byte("POST")) {
			switch string(reqPath) {
			case "/api/state":
				if err := bridge.ApplyStateJSON(body); err != nil {
					if _, werr := conn.Write(resp400); werr != nil {
						return
					}
				} else {
					if _, werr := conn.Write(resp204); werr != nil {
						return
					}
				}
			case "/api/audio/alarm":
				var req alarmReq
				if json.Unmarshal(body, &req) == nil {
					bridge.PlayAlarm(string(req.SoundID), req.Volume)
				}
				if _, err := conn.Write(resp204); err != nil {
					return
				}
			case "/api/audio/tick":
				var req tickReq
				if json.Unmarshal(body, &req) == nil {
					bridge.PlayTick(req.Volume)
				}
				if _, err := conn.Write(resp204); err != nil {
					return
				}
			case "/api/audio/ambient":
				var req ambientReq
				if json.Unmarshal(body, &req) == nil {
					bridge.SetAmbient(string(req.SoundID), req.Volume, req.Active)
				}
				if _, err := conn.Write(resp204); err != nil {
					return
				}
			case "/api/window/theme":
				var req windowThemeReq
				if json.Unmarshal(body, &req) == nil {
					bridge.SetWindowTheme(req.BgHex, req.IsDark)
				}
				if _, err := conn.Write(resp204); err != nil {
					return
				}
			case "/api/window/awake":
				var req wakeReq
				if json.Unmarshal(body, &req) == nil {
					bridge.SetWakeLock(req.Enabled)
				}
				if _, err := conn.Write(resp204); err != nil {
					return
				}
			case "/api/notify":
				var req notifyReq
				if json.Unmarshal(body, &req) == nil {
					bridge.Notify(req.Title, req.Body)
				}
				if _, err := conn.Write(resp204); err != nil {
					return
				}
			default:
				if _, err := conn.Write(resp404); err != nil {
					return
				}
			}
		} else {
			if _, err := conn.Write(resp405); err != nil {
				return
			}
		}

		if closeAfter {
			return
		}
	}
}

func parseRequestLine(line []byte) (method, reqPath []byte, ok bool) {
	sp1 := bytes.IndexByte(line, ' ')
	if sp1 <= 0 {
		return nil, nil, false
	}
	method = line[:sp1]
	rest := line[sp1+1:]
	sp2 := bytes.IndexByte(rest, ' ')
	if sp2 <= 0 {
		return nil, nil, false
	}
	reqPath = rest[:sp2]
	if q := bytes.IndexByte(reqPath, '?'); q >= 0 {
		reqPath = reqPath[:q]
	}
	return method, reqPath, true
}

func matchContentLength(line []byte) (int, bool) {
	const prefix = "content-length:"
	if len(line) < len(prefix) {
		return 0, false
	}
	for i := 0; i < len(prefix); i++ {
		c := line[i]
		if c >= 'A' && c <= 'Z' {
			c += 'a' - 'A'
		}
		if c != prefix[i] {
			return 0, false
		}
	}
	val := line[len(prefix):]
	n := 0
	foundDigit := false
	for _, b := range val {
		if b == ' ' || b == '\t' {
			if !foundDigit {
				continue
			}
			break
		}
		if b >= '0' && b <= '9' {
			foundDigit = true
			n = n*10 + int(b-'0')
		} else {
			break
		}
	}
	return n, foundDigit
}

func matchConnectionClose(line []byte) bool {
	const prefix = "connection:"
	if len(line) < len(prefix) {
		return false
	}
	for i := 0; i < len(prefix); i++ {
		c := line[i]
		if c >= 'A' && c <= 'Z' {
			c += 'a' - 'A'
		}
		if c != prefix[i] {
			return false
		}
	}
	val := line[len(prefix):]
	for len(val) > 0 && (val[0] == ' ' || val[0] == '\t') {
		val = val[1:]
	}
	if len(val) < 5 {
		return false
	}
	const target = "close"
	for i := 0; i < 5; i++ {
		c := val[i]
		if c >= 'A' && c <= 'Z' {
			c += 'a' - 'A'
		}
		if c != target[i] {
			return false
		}
	}
	return true
}

func preindexStaticFS(distFS fs.FS) map[string][]byte {
	responses := make(map[string][]byte, 32)
	if distFS == nil {
		return responses
	}
	_ = fs.WalkDir(distFS, ".", func(filePath string, d fs.DirEntry, err error) error {
		if err != nil || d.IsDir() {
			return nil
		}
		data, rerr := fs.ReadFile(distFS, filePath)
		if rerr != nil {
			return nil
		}
		cleanPath := "/" + strings.TrimPrefix(path.Clean(filePath), "/")
		contentType := detectMimeType(cleanPath)
		cacheControl := "public, max-age=31536000, immutable"
		if cleanPath == "/index.html" || cleanPath == "/service-worker.js" || cleanPath == "/manifest.json" {
			cacheControl = "no-cache"
		}
		pkt := buildHTTPResponse("200 OK", contentType, cacheControl, data)
		responses[cleanPath] = pkt
		if cleanPath == "/index.html" {
			responses["/"] = pkt
		}
		return nil
	})
	return responses
}

func buildHTTPResponse(status, contentType, cacheControl string, body []byte) []byte {
	var hdr [256]byte
	b := append(hdr[:0], "HTTP/1.1 "...)
	b = append(b, status...)
	b = append(b, "\r\nContent-Type: "...)
	b = append(b, contentType...)
	b = append(b, "\r\nContent-Length: "...)
	b = strconv.AppendInt(b, int64(len(body)), 10)
	b = append(b, "\r\nCache-Control: "...)
	b = append(b, cacheControl...)
	b = append(b, "\r\nConnection: keep-alive\r\n\r\n"...)

	out := make([]byte, len(b)+len(body))
	copy(out, b)
	copy(out[len(b):], body)
	return out
}

func detectMimeType(filePath string) string {
	switch strings.ToLower(path.Ext(filePath)) {
	case ".html":
		return "text/html; charset=utf-8"
	case ".js", ".mjs":
		return "application/javascript; charset=utf-8"
	case ".css":
		return "text/css; charset=utf-8"
	case ".json":
		return "application/json; charset=utf-8"
	case ".svg":
		return "image/svg+xml"
	case ".png":
		return "image/png"
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".webp":
		return "image/webp"
	case ".ico":
		return "image/x-icon"
	case ".woff2":
		return "font/woff2"
	default:
		return "application/octet-stream"
	}
}

func parseHexColor(hex string, fallback core.ColorRGB) core.ColorRGB {
	s := strings.TrimSpace(strings.TrimPrefix(hex, "#"))
	if len(s) < 6 {
		return fallback
	}
	r, err1 := strconv.ParseUint(s[0:2], 16, 8)
	g, err2 := strconv.ParseUint(s[2:4], 16, 8)
	b, err3 := strconv.ParseUint(s[4:6], 16, 8)
	if err1 != nil || err2 != nil || err3 != nil {
		return fallback
	}
	return core.ColorRGB{R: uint8(r), G: uint8(g), B: uint8(b)}
}
