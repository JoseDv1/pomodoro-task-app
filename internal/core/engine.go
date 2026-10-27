package core

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"
	"unicode"
	"unicode/utf8"
)

// PersistedData representa el estado serializado en disco.
type PersistedData struct {
	Settings       UserSettings    `json:"settings"`
	Tasks          []Task          `json:"tasks"`
	ActiveTaskID   string          `json:"activeTaskId"`
	PomodoroCount  int             `json:"pomodoroCount"`
	Stats          Stats           `json:"stats"`
	ActiveThemeID  string          `json:"activeThemeId"`
	UnlockedThemes map[string]bool `json:"unlockedThemes"`
}

// Engine gestiona todo el estado y la lógica de negocio de Pomodoro Task App.
type Engine struct {
	mu sync.Mutex

	// Estado del temporizador
	Mode       TimerMode
	Duration   int // segundos totales del modo actual
	TimeLeft   int // segundos restantes
	IsRunning  bool
	EndTime    time.Time
	CycleCount int // 1 .. LongBreakInterval

	// Moneda de tomates y temas
	PomodoroCount  int
	ActiveThemeID  string
	UnlockedThemes map[string]bool
	Themes         []Theme

	// Configuración, tareas y estadísticas
	Settings     UserSettings
	Tasks        []Task
	ActiveTaskID string
	Filter       TaskFilter
	SearchQuery  string
	Stats        Stats

	// Ruta de persistencia y callbacks de efectos secundarios
	StoragePath       string
	OnPlayAlarm       func(sound AlarmSoundID, volume float64)
	OnPlayTick        func(volume float64)
	OnUpdateAmbient   func(sound AmbientSoundID, volume float64, active bool)
	OnNotify          func(title, body string)
	OnKeepScreenAwake func(keepAwake bool)
}

// DefaultStoragePath devuelve la ruta de guardado en %APPDATA% o ~/.config.
func DefaultStoragePath() string {
	dir, err := os.UserConfigDir()
	if err != nil || dir == "" {
		dir = "."
	}
	return filepath.Join(dir, "PomodoroTaskApp", "state.json")
}

// NewEngine crea una instancia de Engine cargando el estado desde storagePath.
func NewEngine(storagePath string) *Engine {
	if storagePath == "" {
		storagePath = DefaultStoragePath()
	}
	e := &Engine{
		Mode:           ModeWork,
		CycleCount:     1,
		ActiveThemeID:  "default-dark",
		UnlockedThemes: map[string]bool{"default-dark": true, "default-light": true},
		Themes:         BuiltinThemes(),
		Settings:       DefaultSettings(),
		Tasks:          []Task{},
		Filter:         FilterAll,
		Stats:          DefaultStats(),
		StoragePath:    storagePath,
	}
	e.Load()
	e.Duration = e.ModeDurationSeconds(e.Mode)
	e.TimeLeft = e.Duration
	return e
}

func generateID() string {
	var b [8]byte
	if _, err := rand.Read(b[:]); err != nil {
		return fmt.Sprintf("task-%d", time.Now().UnixNano())
	}
	return hex.EncodeToString(b[:])
}

func writeDateKey(buf []byte, now time.Time) {
	y, m, d := now.Date()
	buf[0] = byte('0' + (y/1000)%10)
	buf[1] = byte('0' + (y/100)%10)
	buf[2] = byte('0' + (y/10)%10)
	buf[3] = byte('0' + y%10)
	buf[4] = '-'
	buf[5] = byte('0' + int(m)/10)
	buf[6] = byte('0' + int(m)%10)
	buf[7] = '-'
	buf[8] = byte('0' + d/10)
	buf[9] = byte('0' + d%10)
}

func todayKey(now time.Time) string {
	var buf [10]byte
	writeDateKey(buf[:], now)
	return string(buf[:])
}

func yesterdayKey(now time.Time) string {
	return todayKey(now.AddDate(0, 0, -1))
}

// Load carga el estado persistido si existe.
func (e *Engine) Load() {
	e.mu.Lock()
	defer e.mu.Unlock()

	raw, err := os.ReadFile(e.StoragePath)
	if err != nil {
		return
	}
	var data PersistedData
	if err := json.Unmarshal(raw, &data); err != nil {
		return
	}

	if data.Settings.WorkDuration > 0 {
		e.Settings = data.Settings
	}
	if data.Tasks != nil {
		e.Tasks = data.Tasks
	}
	e.ActiveTaskID = data.ActiveTaskID
	e.PomodoroCount = data.PomodoroCount
	if data.Stats.History != nil {
		e.Stats = data.Stats
		now := time.Now()
		tk := todayKey(now)
		yk := yesterdayKey(now)
		if e.Stats.LastActiveDate != "" && e.Stats.LastActiveDate != tk && e.Stats.LastActiveDate != yk {
			e.Stats.CurrentStreak = 0
		}
	}
	if data.UnlockedThemes != nil {
		for k, v := range data.UnlockedThemes {
			if v {
				e.UnlockedThemes[k] = true
			}
		}
	}
	if data.ActiveThemeID != "" && e.UnlockedThemes[data.ActiveThemeID] {
		e.ActiveThemeID = data.ActiveThemeID
	}
}

// Save guarda el estado actual en disco de forma atómica.
func (e *Engine) Save() {
	e.mu.Lock()
	data := PersistedData{
		Settings:       e.Settings,
		Tasks:          e.Tasks,
		ActiveTaskID:   e.ActiveTaskID,
		PomodoroCount:  e.PomodoroCount,
		Stats:          e.Stats,
		ActiveThemeID:  e.ActiveThemeID,
		UnlockedThemes: e.UnlockedThemes,
	}
	path := e.StoragePath
	e.mu.Unlock()

	if path == "" {
		return
	}
	_ = os.MkdirAll(filepath.Dir(path), 0o755)
	bytes, err := json.Marshal(data)
	if err != nil {
		return
	}
	tmpPath := path + ".tmp"
	if err := os.WriteFile(tmpPath, bytes, 0o644); err == nil {
		_ = os.Rename(tmpPath, path)
	}
}

// ModeDurationSeconds devuelve la duración en segundos para el modo indicado.
func (e *Engine) ModeDurationSeconds(m TimerMode) int {
	switch m {
	case ModeShortBreak:
		return max(1, e.Settings.ShortBreakDuration) * 60
	case ModeLongBreak:
		return max(1, e.Settings.LongBreakDuration) * 60
	default:
		return max(1, e.Settings.WorkDuration) * 60
	}
}

// ModeLabel devuelve la etiqueta en español del modo actual.
func (e *Engine) ModeLabel() string {
	switch e.Mode {
	case ModeShortBreak:
		return "Descanso Corto"
	case ModeLongBreak:
		return "Descanso Largo"
	default:
		return "Enfoque"
	}
}

// TimerDisplay formatea TimeLeft en MM:SS o H:MM:SS sin reflexión (evita fmt.Sprintf).
func (e *Engine) TimerDisplay() string {
	secs := max(0, e.TimeLeft)
	h := secs / 3600
	m := (secs % 3600) / 60
	s := secs % 60
	if h == 0 && m < 100 {
		var buf [5]byte
		buf[0] = byte('0' + m/10)
		buf[1] = byte('0' + m%10)
		buf[2] = ':'
		buf[3] = byte('0' + s/10)
		buf[4] = byte('0' + s%10)
		return string(buf[:])
	}
	var b [12]byte
	out := strconv.AppendInt(b[:0], int64(h), 10)
	out = append(out, ':', byte('0'+m/10), byte('0'+m%10), ':', byte('0'+s/10), byte('0'+s%10))
	return string(out)
}

// Progress devuelve el progreso entre 0.0 y 1.0.
func (e *Engine) Progress() float64 {
	if e.Duration <= 0 {
		return 0
	}
	elapsed := float64(e.Duration - e.TimeLeft)
	pct := elapsed / float64(e.Duration)
	if pct < 0 {
		return 0
	}
	if pct > 1 {
		return 1
	}
	return pct
}

// StartTimer inicia o reanuda la cuenta regresiva.
func (e *Engine) StartTimer() {
	e.mu.Lock()
	if e.TimeLeft <= 0 {
		e.Duration = e.ModeDurationSeconds(e.Mode)
		e.TimeLeft = e.Duration
	}
	e.EndTime = time.Now().Add(time.Duration(e.TimeLeft) * time.Second)
	e.IsRunning = true
	keepAwake := e.Settings.KeepScreenAwake
	ambient := e.Settings.AmbientSound
	ambientVol := e.Settings.AmbientVolume
	isWork := e.Mode == ModeWork
	e.mu.Unlock()

	if e.OnKeepScreenAwake != nil {
		e.OnKeepScreenAwake(keepAwake)
	}
	if e.OnUpdateAmbient != nil {
		e.OnUpdateAmbient(ambient, ambientVol, isWork && ambient != AmbientOff)
	}
}

// StopTimer pausa la cuenta regresiva.
func (e *Engine) StopTimer() {
	e.mu.Lock()
	e.IsRunning = false
	e.mu.Unlock()

	if e.OnKeepScreenAwake != nil {
		e.OnKeepScreenAwake(false)
	}
	if e.OnUpdateAmbient != nil {
		e.OnUpdateAmbient(AmbientOff, 0, false)
	}
}

// ToggleTimer alterna entre iniciar y pausar.
func (e *Engine) ToggleTimer() {
	if e.IsRunning {
		e.StopTimer()
	} else {
		e.StartTimer()
	}
}

// ResetTimer reinicia el temporizador al valor inicial del modo activo.
func (e *Engine) ResetTimer() {
	e.StopTimer()
	e.mu.Lock()
	e.Duration = e.ModeDurationSeconds(e.Mode)
	e.TimeLeft = e.Duration
	e.mu.Unlock()
}

// SwitchMode cambia de modo y opcionalmente inicia el temporizador.
func (e *Engine) SwitchMode(newMode TimerMode, autoStart bool) {
	e.StopTimer()
	e.mu.Lock()
	e.Mode = newMode
	e.Duration = e.ModeDurationSeconds(newMode)
	e.TimeLeft = e.Duration
	e.mu.Unlock()

	if autoStart {
		e.StartTimer()
	}
}

// SkipTimer salta a la siguiente sesión del ciclo.
func (e *Engine) SkipTimer() {
	e.mu.Lock()
	currMode := e.Mode
	currCycle := e.CycleCount
	intervalLimit := max(1, e.Settings.LongBreakInterval)
	e.mu.Unlock()

	if currMode == ModeWork {
		if currCycle >= intervalLimit {
			e.mu.Lock()
			e.CycleCount = 1
			e.mu.Unlock()
			e.SwitchMode(ModeLongBreak, false)
		} else {
			e.mu.Lock()
			e.CycleCount++
			e.mu.Unlock()
			e.SwitchMode(ModeShortBreak, false)
		}
	} else {
		e.SwitchMode(ModeWork, false)
	}
}

// AddSeconds suma o resta segundos al temporizador actual (mínimo 10s).
func (e *Engine) AddSeconds(delta int) {
	e.mu.Lock()
	newTime := max(10, e.TimeLeft+delta)
	e.TimeLeft = newTime
	if newTime > e.Duration {
		e.Duration = newTime
	}
	if e.IsRunning {
		e.EndTime = time.Now().Add(time.Duration(newTime) * time.Second)
	}
	e.mu.Unlock()
}

// Tick actualiza el temporizador cada segundo; devuelve true si hubo cambio visual.
func (e *Engine) Tick() bool {
	e.mu.Lock()
	if !e.IsRunning {
		e.mu.Unlock()
		return false
	}
	remaining := int(time.Until(e.EndTime).Seconds() + 0.999)
	if remaining < 0 {
		remaining = 0
	}
	changed := remaining != e.TimeLeft
	e.TimeLeft = remaining
	tickSound := e.Settings.TickingSound && e.Mode == ModeWork && remaining > 0
	e.mu.Unlock()

	if remaining <= 0 {
		e.CompleteSession()
		return true
	}
	if changed && tickSound && e.OnPlayTick != nil {
		e.OnPlayTick(0.12)
	}
	return changed
}

// CompleteSession procesa el final de una sesión de enfoque o descanso.
func (e *Engine) CompleteSession() {
	e.StopTimer()

	e.mu.Lock()
	completedMode := e.Mode
	settings := e.Settings
	now := time.Now()
	if completedMode == ModeWork {
		e.PomodoroCount++
		e.recordPomodoroLocked(settings.WorkDuration, now)
		for i := range e.Tasks {
			if e.Tasks[i].ID == e.ActiveTaskID {
				e.Tasks[i].CompletedPomodoros++
				break
			}
		}
	}
	currCycle := e.CycleCount
	intervalLimit := max(1, settings.LongBreakInterval)
	e.mu.Unlock()

	if e.OnPlayAlarm != nil {
		e.OnPlayAlarm(settings.AlarmSound, settings.AlarmVolume)
	}
	if settings.NotificationsEnabled && e.OnNotify != nil {
		if completedMode == ModeWork {
			e.OnNotify("¡Sesión de enfoque completada!", "Excelente trabajo. Es momento de relajar la mente y estirarte.")
		} else {
			e.OnNotify("¡Fin del descanso!", "Tu mente está lista y despejada. ¡A por tu siguiente objetivo!")
		}
	}

	if completedMode == ModeWork {
		if currCycle >= intervalLimit {
			e.mu.Lock()
			e.CycleCount = 1
			e.mu.Unlock()
			e.SwitchMode(ModeLongBreak, settings.AutoStartBreaks)
		} else {
			e.mu.Lock()
			e.CycleCount++
			e.mu.Unlock()
			e.SwitchMode(ModeShortBreak, settings.AutoStartBreaks)
		}
	} else {
		e.SwitchMode(ModeWork, settings.AutoStartPomodoros)
	}
	e.Save()
}

func (e *Engine) recordPomodoroLocked(minutes int, now time.Time) {
	tk := todayKey(now)
	yk := yesterdayKey(now)
	if e.Stats.History == nil {
		e.Stats.History = make(map[string]DayStats)
	}
	day := e.Stats.History[tk]
	day.Minutes += minutes
	day.Pomodoros++
	e.Stats.History[tk] = day

	switch e.Stats.LastActiveDate {
	case yk:
		e.Stats.CurrentStreak++
	case tk:
		if e.Stats.CurrentStreak == 0 {
			e.Stats.CurrentStreak = 1
		}
	default:
		e.Stats.CurrentStreak = 1
	}
	if e.Stats.CurrentStreak > e.Stats.BestStreak {
		e.Stats.BestStreak = e.Stats.CurrentStreak
	}
	e.Stats.LastActiveDate = tk
	e.Stats.TotalFocusMinutes += minutes
	e.Stats.TotalPomodoros++
}

// AddTask crea una nueva tarea al principio de la lista.
func (e *Engine) AddTask(name string, estimated int, priority TaskPriority, category string) *Task {
	trimmed := strings.TrimSpace(name)
	if trimmed == "" {
		return nil
	}
	if estimated < 1 {
		estimated = 1
	}
	if priority == "" {
		priority = PriorityMedium
	}

	t := Task{
		ID:                 generateID(),
		Name:               trimmed,
		Completed:          false,
		EstimatedPomodoros: estimated,
		CompletedPomodoros: 0,
		Priority:           priority,
		Category:           strings.TrimSpace(category),
		CreatedAt:          time.Now().Format(time.RFC3339),
	}

	e.mu.Lock()
	e.Tasks = append(e.Tasks, Task{})
	copy(e.Tasks[1:], e.Tasks[:len(e.Tasks)-1])
	e.Tasks[0] = t
	if e.ActiveTaskID == "" {
		e.ActiveTaskID = t.ID
	}
	e.mu.Unlock()
	e.Save()
	return &t
}

// ToggleTask marca o desmarca una tarea como completada.
func (e *Engine) ToggleTask(id string) {
	e.mu.Lock()
	now := time.Now()
	tk := todayKey(now)
	for i := range e.Tasks {
		if e.Tasks[i].ID == id {
			e.Tasks[i].Completed = !e.Tasks[i].Completed
			if e.Tasks[i].Completed {
				e.Tasks[i].CompletedAt = now.Format(time.RFC3339)
				if e.Stats.History == nil {
					e.Stats.History = make(map[string]DayStats)
				}
				d := e.Stats.History[tk]
				d.TasksCompleted++
				e.Stats.History[tk] = d
			} else {
				e.Tasks[i].CompletedAt = ""
			}
			break
		}
	}
	e.mu.Unlock()
	e.Save()
}

// UpdateTaskName actualiza el nombre de una tarea existente.
func (e *Engine) UpdateTaskName(id, newName string) {
	trimmed := strings.TrimSpace(newName)
	if trimmed == "" {
		return
	}
	e.mu.Lock()
	for i := range e.Tasks {
		if e.Tasks[i].ID == id {
			e.Tasks[i].Name = trimmed
			break
		}
	}
	e.mu.Unlock()
	e.Save()
}

// RemoveTask elimina una tarea por su ID reutilizando el arreglo subyacente.
func (e *Engine) RemoveTask(id string) {
	e.mu.Lock()
	filtered := e.Tasks[:0]
	for _, t := range e.Tasks {
		if t.ID != id {
			filtered = append(filtered, t)
		}
	}
	clear(e.Tasks[len(filtered):])
	e.Tasks = filtered
	if e.ActiveTaskID == id {
		e.ActiveTaskID = ""
		for _, t := range e.Tasks {
			if !t.Completed {
				e.ActiveTaskID = t.ID
				break
			}
		}
	}
	e.mu.Unlock()
	e.Save()
}

// ClearCompletedTasks elimina todas las tareas completadas en el sitio (0 allocs).
func (e *Engine) ClearCompletedTasks() {
	e.mu.Lock()
	filtered := e.Tasks[:0]
	for _, t := range e.Tasks {
		if !t.Completed {
			filtered = append(filtered, t)
		} else if t.ID == e.ActiveTaskID {
			e.ActiveTaskID = ""
		}
	}
	clear(e.Tasks[len(filtered):])
	e.Tasks = filtered
	e.mu.Unlock()
	e.Save()
}

// SetActiveTask selecciona la tarea activa actual.
func (e *Engine) SetActiveTask(id string) {
	e.mu.Lock()
	e.ActiveTaskID = id
	e.mu.Unlock()
	e.Save()
}

// ActiveTask devuelve un puntero a la tarea activa o nil.
func (e *Engine) ActiveTask() *Task {
	e.mu.Lock()
	defer e.mu.Unlock()
	for i := range e.Tasks {
		if e.Tasks[i].ID == e.ActiveTaskID {
			cp := e.Tasks[i]
			return &cp
		}
	}
	return nil
}

// containsFold busca substrLower (ya en minúsculas) dentro de s sin asignar memoria en el heap.
func containsFold(s, substrLower string) bool {
	n := len(substrLower)
	if n == 0 {
		return true
	}
	if len(s) < n {
		return false
	}

	// Vía rápida cuando el primer carácter del patrón es ASCII
	b0 := substrLower[0]
	if b0 < utf8.RuneSelf {
		restLower := substrLower[1:]
		limit := len(s) - n
		for i := 0; i <= limit; i++ {
			c := s[i]
			if c >= 'A' && c <= 'Z' {
				c += 'a' - 'A'
			}
			if c == b0 && hasPrefixFold(s[i+1:], restLower) {
				return true
			}
		}
		return false
	}

	firstRune, firstWidth := utf8.DecodeRuneInString(substrLower)
	restLower := substrLower[firstWidth:]
	for i := 0; i < len(s); {
		if s[i] < utf8.RuneSelf {
			i++
			continue
		}
		r, w := utf8.DecodeRuneInString(s[i:])
		if unicode.ToLower(r) == firstRune && hasPrefixFold(s[i+w:], restLower) {
			return true
		}
		i += w
	}
	return false
}

func hasPrefixFold(s, prefixLower string) bool {
	si := 0
	pi := 0
	for pi < len(prefixLower) {
		if si >= len(s) {
			return false
		}
		pb := prefixLower[pi]
		sb := s[si]
		if pb < utf8.RuneSelf && sb < utf8.RuneSelf {
			if sb >= 'A' && sb <= 'Z' {
				sb += 'a' - 'A'
			}
			if sb != pb {
				return false
			}
			si++
			pi++
			continue
		}
		sr, sw := utf8.DecodeRuneInString(s[si:])
		pr, pw := utf8.DecodeRuneInString(prefixLower[pi:])
		if sr < utf8.RuneSelf {
			if sr >= 'A' && sr <= 'Z' {
				sr += 'a' - 'A'
			}
		} else {
			sr = unicode.ToLower(sr)
		}
		if sr != pr {
			return false
		}
		si += sw
		pi += pw
	}
	return true
}

// FilteredTasks devuelve las tareas filtradas según Filter y SearchQuery.
func (e *Engine) FilteredTasks() []Task {
	return e.FilteredTasksInto(nil)
}

// FilteredTasksInto escribe las tareas filtradas en dst (reutilizando su capacidad para 0 allocs por frame).
func (e *Engine) FilteredTasksInto(dst []Task) []Task {
	e.mu.Lock()
	defer e.mu.Unlock()

	query := strings.TrimSpace(e.SearchQuery)
	if query != "" {
		query = strings.ToLower(query)
	}
	out := dst[:0]
	if cap(out) < len(e.Tasks) {
		out = make([]Task, 0, len(e.Tasks))
	}
	for _, t := range e.Tasks {
		if e.Filter == FilterActive && t.Completed {
			continue
		}
		if e.Filter == FilterCompleted && !t.Completed {
			continue
		}
		if query != "" {
			if !containsFold(t.Name, query) && !containsFold(t.Category, query) {
				continue
			}
		}
		out = append(out, t)
	}
	return out
}

// TaskSummary devuelve totales de tareas (total, completadas, activas, porcentaje).
func (e *Engine) TaskSummary() (total, completed, active, progressPct int) {
	e.mu.Lock()
	defer e.mu.Unlock()
	total = len(e.Tasks)
	for _, t := range e.Tasks {
		if t.Completed {
			completed++
		}
	}
	active = total - completed
	if total > 0 {
		progressPct = (completed * 100) / total
	}
	return
}

// ActiveTheme devuelve el tema visual activo.
func (e *Engine) ActiveTheme() Theme {
	e.mu.Lock()
	defer e.mu.Unlock()
	for _, th := range e.Themes {
		if th.ID == e.ActiveThemeID {
			return th
		}
	}
	return e.Themes[0]
}

// ToggleDarkLight alterna rápidamente entre el tema oscuro y claro base.
func (e *Engine) ToggleDarkLight() {
	curr := e.ActiveTheme()
	if curr.IsDark {
		e.SelectOrUnlockTheme("default-light")
	} else {
		e.SelectOrUnlockTheme("default-dark")
	}
}

// SelectOrUnlockTheme activa un tema desbloqueado o intenta comprarlo con tomates.
func (e *Engine) SelectOrUnlockTheme(themeID string) (ok bool, msg string) {
	e.mu.Lock()
	var target *Theme
	for i := range e.Themes {
		if e.Themes[i].ID == themeID {
			target = &e.Themes[i]
			break
		}
	}
	if target == nil {
		e.mu.Unlock()
		return false, "Tema no encontrado"
	}

	if e.UnlockedThemes[themeID] || target.Price == 0 {
		e.UnlockedThemes[themeID] = true
		e.ActiveThemeID = themeID
		e.mu.Unlock()
		e.Save()
		return true, fmt.Sprintf("Tema '%s' activado", target.Name)
	}

	if e.PomodoroCount < target.Price {
		need := target.Price - e.PomodoroCount
		e.mu.Unlock()
		return false, fmt.Sprintf("Necesitas %d 🍅 más para desbloquear '%s'", need, target.Name)
	}

	e.PomodoroCount -= target.Price
	e.UnlockedThemes[themeID] = true
	e.ActiveThemeID = themeID
	e.mu.Unlock()
	e.Save()
	return true, fmt.Sprintf("¡'%s' desbloqueado y activado!", target.Name)
}

// UpdateSettings aplica cambios a UserSettings y sincroniza duraciones si no está corriendo.
func (e *Engine) UpdateSettings(fn func(*UserSettings)) {
	e.mu.Lock()
	fn(&e.Settings)
	if e.Settings.WorkDuration < 1 {
		e.Settings.WorkDuration = 1
	}
	if e.Settings.WorkDuration > 120 {
		e.Settings.WorkDuration = 120
	}
	if e.Settings.ShortBreakDuration < 1 {
		e.Settings.ShortBreakDuration = 1
	}
	if e.Settings.ShortBreakDuration > 60 {
		e.Settings.ShortBreakDuration = 60
	}
	if e.Settings.LongBreakDuration < 1 {
		e.Settings.LongBreakDuration = 1
	}
	if e.Settings.LongBreakDuration > 90 {
		e.Settings.LongBreakDuration = 90
	}
	if e.Settings.LongBreakInterval < 1 {
		e.Settings.LongBreakInterval = 1
	}
	if e.Settings.LongBreakInterval > 12 {
		e.Settings.LongBreakInterval = 12
	}
	if !e.IsRunning {
		e.Duration = e.ModeDurationSeconds(e.Mode)
		e.TimeLeft = e.Duration
	}
	ambient := e.Settings.AmbientSound
	ambientVol := e.Settings.AmbientVolume
	activeAmbient := e.IsRunning && e.Mode == ModeWork && ambient != AmbientOff
	e.mu.Unlock()

	if e.OnUpdateAmbient != nil {
		e.OnUpdateAmbient(ambient, ambientVol, activeAmbient)
	}
	e.Save()
}

// ResetSettings restaura la configuración por defecto.
func (e *Engine) ResetSettings() {
	e.UpdateSettings(func(s *UserSettings) {
		*s = DefaultSettings()
	})
}

// TodayStats devuelve las estadísticas del día actual.
func (e *Engine) TodayStats() DayStats {
	e.mu.Lock()
	defer e.mu.Unlock()
	return e.Stats.History[todayKey(time.Now())]
}

var dayLabelsES = [...]string{"Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"}

// WeeklyActivity devuelve la actividad de los últimos 7 días empaquetando las fechas en un único bloque contiguo.
func (e *Engine) WeeklyActivity() []WeeklyDay {
	e.mu.Lock()
	defer e.mu.Unlock()

	now := time.Now()
	var dateBuf [70]byte
	var weekdays [7]int
	for idx := 0; idx < 7; idx++ {
		d := now.AddDate(0, 0, -(6 - idx))
		writeDateKey(dateBuf[idx*10:idx*10+10], d)
		weekdays[idx] = int(d.Weekday())
	}
	allDates := string(dateBuf[:])

	days := make([]WeeklyDay, 7)
	for idx := 0; idx < 7; idx++ {
		key := allDates[idx*10 : idx*10+10]
		st := e.Stats.History[key]
		days[idx] = WeeklyDay{
			Date:      key,
			Label:     dayLabelsES[weekdays[idx]],
			Minutes:   st.Minutes,
			Pomodoros: st.Pomodoros,
		}
	}
	return days
}

// Achievements devuelve la lista de logros y su estado de desbloqueo.
func (e *Engine) Achievements() []Achievement {
	e.mu.Lock()
	defer e.mu.Unlock()

	return []Achievement{
		{
			ID:          "first-pomodoro",
			Title:       "Primer Paso",
			Description: "Completa tu primera sesión Pomodoro",
			Unlocked:    e.Stats.TotalPomodoros >= 1,
		},
		{
			ID:          "streak-3",
			Title:       "En Racha",
			Description: "Alcanza una racha de 3 días seguidos",
			Unlocked:    e.Stats.BestStreak >= 3,
		},
		{
			ID:          "focus-10",
			Title:       "Enfoque Sólido",
			Description: "Completa 10 sesiones Pomodoro",
			Unlocked:    e.Stats.TotalPomodoros >= 10,
		},
		{
			ID:          "hours-5",
			Title:       "Maestro del Tiempo",
			Description: "Acumula 300 minutos (5 h) de enfoque",
			Unlocked:    e.Stats.TotalFocusMinutes >= 300,
		},
		{
			ID:          "streak-7",
			Title:       "Semana Imparable",
			Description: "Alcanza una racha de 7 días consecutivos",
			Unlocked:    e.Stats.BestStreak >= 7,
		},
		{
			ID:          "centurion",
			Title:       "Centurión",
			Description: "Completa 100 sesiones Pomodoro",
			Unlocked:    e.Stats.TotalPomodoros >= 100,
		},
	}
}
