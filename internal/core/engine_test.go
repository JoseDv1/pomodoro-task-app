package core

import (
	"path/filepath"
	"testing"
)

func TestEngineTimerAndCycles(t *testing.T) {
	tmp := filepath.Join(t.TempDir(), "state.json")
	eng := NewEngine(tmp)

	if eng.Mode != ModeWork || eng.TimeLeft != 25*60 {
		t.Fatalf("expected work mode 1500s, got %s %d", eng.Mode, eng.TimeLeft)
	}

	task := eng.AddTask("Escribir código Go", 3, PriorityHigh, "Dev")
	if task == nil || eng.ActiveTaskID != task.ID {
		t.Fatalf("expected active task to be set")
	}

	// Completar 1er Pomodoro
	eng.CompleteSession()
	if eng.PomodoroCount != 1 {
		t.Fatalf("expected PomodoroCount=1, got %d", eng.PomodoroCount)
	}
	if eng.Mode != ModeShortBreak {
		t.Fatalf("expected ModeShortBreak after 1st work session, got %s", eng.Mode)
	}
	if eng.Stats.TotalPomodoros != 1 || eng.Stats.TotalFocusMinutes != 25 {
		t.Fatalf("unexpected stats: %+v", eng.Stats)
	}
	if eng.ActiveTask().CompletedPomodoros != 1 {
		t.Fatalf("expected task completedPomodoros=1, got %d", eng.ActiveTask().CompletedPomodoros)
	}

	// Completar descanso corto -> vuelve a enfoque
	eng.CompleteSession()
	if eng.Mode != ModeWork {
		t.Fatalf("expected ModeWork after break, got %s", eng.Mode)
	}
}

func TestEngineTasksAndThemes(t *testing.T) {
	tmp := filepath.Join(t.TempDir(), "state.json")
	eng := NewEngine(tmp)

	t1 := eng.AddTask("Tarea 1", 2, PriorityMedium, "General")
	t2 := eng.AddTask("Tarea 2", 1, PriorityLow, "Personal")

	eng.ToggleTask(t1.ID)
	total, completed, active, pct := eng.TaskSummary()
	if total != 2 || completed != 1 || active != 1 || pct != 50 {
		t.Fatalf("unexpected summary: total=%d completed=%d active=%d pct=%d", total, completed, active, pct)
	}

	// Intentar desbloquear tema sin tomates suficientes
	ok, _ := eng.SelectOrUnlockTheme("forest-zen")
	if ok {
		t.Fatalf("expected unlock to fail with 0 tomatoes")
	}

	// Conceder tomates y desbloquear
	eng.PomodoroCount = 10
	ok, _ = eng.SelectOrUnlockTheme("forest-zen")
	if !ok || eng.ActiveThemeID != "forest-zen" || eng.PomodoroCount != 5 {
		t.Fatalf("expected forest-zen unlocked and 5 tomatoes left, got ok=%v count=%d", ok, eng.PomodoroCount)
	}

	// Verificar persistencia recargando desde disco
	eng2 := NewEngine(tmp)
	if eng2.ActiveThemeID != "forest-zen" || len(eng2.Tasks) != 2 {
		t.Fatalf("persistence failed: theme=%s tasks=%d", eng2.ActiveThemeID, len(eng2.Tasks))
	}

	eng2.ClearCompletedTasks()
	if len(eng2.Tasks) != 1 || eng2.Tasks[0].ID != t2.ID {
		t.Fatalf("expected only t2 remaining after ClearCompletedTasks")
	}
}

func BenchmarkTimerDisplay(b *testing.B) {
	eng := NewEngine(filepath.Join(b.TempDir(), "state.json"))
	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = eng.TimerDisplay()
	}
}

func BenchmarkFilteredTasksSearch(b *testing.B) {
	eng := NewEngine(filepath.Join(b.TempDir(), "state.json"))
	for i := 0; i < 50; i++ {
		eng.AddTask("Implementar módulo de optimización avanzada", 3, PriorityHigh, "Backend")
	}
	eng.SearchQuery = "optimización"
	var buf []Task
	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		buf = eng.FilteredTasksInto(buf)
	}
}

func BenchmarkWeeklyActivityAndAchievements(b *testing.B) {
	eng := NewEngine(filepath.Join(b.TempDir(), "state.json"))
	eng.CompleteSession()
	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = eng.WeeklyActivity()
		_ = eng.Achievements()
	}
}

