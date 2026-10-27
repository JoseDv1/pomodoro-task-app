package core

// TimerMode define los tres modos principales del temporizador Pomodoro.
type TimerMode string

const (
	ModeWork       TimerMode = "work"
	ModeShortBreak TimerMode = "shortBreak"
	ModeLongBreak  TimerMode = "longBreak"
)

// TaskPriority define la prioridad de una tarea.
type TaskPriority string

const (
	PriorityLow    TaskPriority = "low"
	PriorityMedium TaskPriority = "medium"
	PriorityHigh   TaskPriority = "high"
)

// TaskFilter define el filtro de estado de tareas.
type TaskFilter string

const (
	FilterAll       TaskFilter = "all"
	FilterActive    TaskFilter = "active"
	FilterCompleted TaskFilter = "completed"
)

// AlarmSoundID identifica el sonido de alarma al finalizar una sesión.
type AlarmSoundID string

const (
	AlarmBell    AlarmSoundID = "bell"
	AlarmChime   AlarmSoundID = "chime"
	AlarmDigital AlarmSoundID = "digital"
	AlarmGong    AlarmSoundID = "gong"
	AlarmMarimba AlarmSoundID = "marimba"
	AlarmRetro   AlarmSoundID = "retro"
	AlarmClassic AlarmSoundID = "classic"
)

var AllAlarmSounds = []struct {
	ID   AlarmSoundID
	Name string
}{
	{AlarmBell, "Campana Zen"},
	{AlarmChime, "Carrillón Suave"},
	{AlarmDigital, "Digital Clásico"},
	{AlarmGong, "Gong Tibetano"},
	{AlarmMarimba, "Marimba Cálida"},
	{AlarmRetro, "Arcade 8-bit"},
	{AlarmClassic, "Alarma Doble"},
}

// AmbientSoundID identifica el sonido de fondo durante el enfoque.
type AmbientSoundID string

const (
	AmbientOff        AmbientSoundID = "off"
	AmbientRain       AmbientSoundID = "rain"
	AmbientWhiteNoise AmbientSoundID = "whitenoise"
	AmbientBrownNoise AmbientSoundID = "brownnoise"
	AmbientStream     AmbientSoundID = "stream"
)

var AllAmbientSounds = []struct {
	ID          AmbientSoundID
	Name        string
	Description string
}{
	{AmbientOff, "Desactivado", "Silencio total para concentración pura"},
	{AmbientRain, "Lluvia Suave", "Gotas constantes para relajar la mente"},
	{AmbientWhiteNoise, "Ruido Blanco", "Bloquea distracciones externas"},
	{AmbientBrownNoise, "Ruido Marrón", "Frecuencias graves profundas y cálidas"},
	{AmbientStream, "Arroyo Natural", "Flujo de agua sereno y continuo"},
}

// Task representa una tarea individual en la lista.
type Task struct {
	ID                 string       `json:"id"`
	Name               string       `json:"name"`
	Completed          bool         `json:"completed"`
	EstimatedPomodoros int          `json:"estimatedPomodoros"`
	CompletedPomodoros int          `json:"completedPomodoros"`
	Priority           TaskPriority `json:"priority"`
	Category           string       `json:"category,omitempty"`
	CreatedAt          string       `json:"createdAt"`
	CompletedAt        string       `json:"completedAt,omitempty"`
}

// UserSettings almacena las preferencias configurables del usuario.
type UserSettings struct {
	WorkDuration         int            `json:"workDuration"`
	ShortBreakDuration   int            `json:"shortBreakDuration"`
	LongBreakDuration    int            `json:"longBreakDuration"`
	LongBreakInterval    int            `json:"longBreakInterval"`
	AutoStartBreaks      bool           `json:"autoStartBreaks"`
	AutoStartPomodoros   bool           `json:"autoStartPomodoros"`
	AlarmSound           AlarmSoundID   `json:"alarmSound"`
	AlarmVolume          float64        `json:"alarmVolume"`
	TickingSound         bool           `json:"tickingSound"`
	AmbientSound         AmbientSoundID `json:"ambientSound"`
	AmbientVolume        float64        `json:"ambientVolume"`
	NotificationsEnabled bool           `json:"notificationsEnabled"`
	KeepScreenAwake      bool           `json:"keepScreenAwake"`
}

// DefaultSettings devuelve la configuración por defecto.
func DefaultSettings() UserSettings {
	return UserSettings{
		WorkDuration:         25,
		ShortBreakDuration:   5,
		LongBreakDuration:    15,
		LongBreakInterval:    4,
		AutoStartBreaks:      false,
		AutoStartPomodoros:   false,
		AlarmSound:           AlarmBell,
		AlarmVolume:          0.7,
		TickingSound:         false,
		AmbientSound:         AmbientOff,
		AmbientVolume:        0.5,
		NotificationsEnabled: true,
		KeepScreenAwake:      true,
	}
}

// DayStats almacena las métricas de un día específico (YYYY-MM-DD).
type DayStats struct {
	Minutes        int `json:"minutes"`
	Pomodoros      int `json:"pomodoros"`
	TasksCompleted int `json:"tasksCompleted"`
}

// Stats almacena las estadísticas históricas e indicadores de racha.
type Stats struct {
	TotalFocusMinutes int                 `json:"totalFocusMinutes"`
	TotalPomodoros    int                 `json:"totalPomodoros"`
	CurrentStreak     int                 `json:"currentStreak"`
	BestStreak        int                 `json:"bestStreak"`
	LastActiveDate    string              `json:"lastActiveDate"`
	History           map[string]DayStats `json:"history"`
}

// DefaultStats devuelve estadísticas iniciales vacías.
func DefaultStats() Stats {
	return Stats{
		History: make(map[string]DayStats),
	}
}

// WeeklyDay representa la actividad de un día en los últimos 7 días.
type WeeklyDay struct {
	Date      string
	Label     string
	Minutes   int
	Pomodoros int
}

// Achievement representa un logro desbloqueable por uso.
type Achievement struct {
	ID          string
	Title       string
	Description string
	Unlocked    bool
}

// ColorRGB representa un color RGB de 24 bits.
type ColorRGB struct {
	R, G, B uint8
}

// ARGB convierte un ColorRGB en un entero 0xAARRGGBB para GDI+.
func (c ColorRGB) ARGB(alpha uint8) uint32 {
	return (uint32(alpha) << 24) | (uint32(c.R) << 16) | (uint32(c.G) << 8) | uint32(c.B)
}

// COLORREF convierte un ColorRGB en un entero 0x00BBGGRR para Win32/DWM.
func (c ColorRGB) COLORREF() uint32 {
	return (uint32(c.B) << 16) | (uint32(c.G) << 8) | uint32(c.R)
}

// Theme define un tema visual completo de la aplicación.
type Theme struct {
	ID            string   `json:"id"`
	Name          string   `json:"name"`
	Description   string   `json:"description"`
	Price         int      `json:"price"`
	IsDark        bool     `json:"isDark"`
	BgPrimary     ColorRGB `json:"-"`
	BgSecondary   ColorRGB `json:"-"`
	BgTertiary    ColorRGB `json:"-"`
	TextPrimary   ColorRGB `json:"-"`
	TextSecondary ColorRGB `json:"-"`
	Accent        ColorRGB `json:"-"`
	AccentHover   ColorRGB `json:"-"`
	Border        ColorRGB `json:"-"`
	RingTrack     ColorRGB `json:"-"`
}
