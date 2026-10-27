//go:build !windows

package ui

import (
	"bufio"
	"fmt"
	"io/fs"
	"os"
	"os/exec"
	"strconv"
	"strings"

	"github.com/JoseDv1/pomodoro-task-app/internal/audio"
	"github.com/JoseDv1/pomodoro-task-app/internal/core"
)

// Run inicia el servidor híbrido local y abre la vista WebView/App del sistema o la consola interactiva.
func Run(eng *core.Engine, distFS fs.FS) error {
	eng.OnPlayAlarm = audio.PlayAlarm
	eng.OnPlayTick = audio.PlayTick
	eng.OnUpdateAmbient = audio.UpdateAmbient

	hooks := NativeHooks{
		OnNotify: func(title, body string) {
			fmt.Printf("\n🔔 %s — %s\n", title, body)
		},
	}

	url, cleanupServer, err := StartHybridServer(eng, distFS, hooks)
	if err != nil {
		return err
	}
	defer cleanupServer()

	fmt.Println("╔══════════════════════════════════════════════════════════════╗")
	fmt.Println("║      🍅 POMODORO TASK APP — ARQUITECTURA HÍBRIDA (GO)        ║")
	fmt.Printf("║  Servidor UI + Core Go activo en: %-26s ║\n", url)
	fmt.Println("║  Comandos: [s] start/stop [r] reset [n] skip [a] add [q] Fin ║")
	fmt.Println("╚══════════════════════════════════════════════════════════════╝")

	if os.Getenv("DISPLAY") != "" || os.Getenv("WAYLAND_DISPLAY") != "" {
		go tryOpenLinuxAppWindow(url)
	}

	printStatus(eng)

	scanner := bufio.NewScanner(os.Stdin)
	for {
		fmt.Print("\npomodoro> ")
		if !scanner.Scan() {
			break
		}
		line := strings.TrimSpace(scanner.Text())
		parts := strings.Fields(line)
		if len(parts) == 0 {
			printStatus(eng)
			continue
		}

		switch strings.ToLower(parts[0]) {
		case "s", "start", "stop":
			eng.ToggleTimer()
			printStatus(eng)
		case "r", "reset":
			eng.ResetTimer()
			printStatus(eng)
		case "n", "skip":
			eng.SkipTimer()
			printStatus(eng)
		case "a", "add":
			if len(parts) > 1 {
				title := strings.Join(parts[1:], " ")
				eng.AddTask(title, 1, core.PriorityMedium, "General")
				fmt.Printf("✓ Tarea agregada: %s\n", title)
			}
			printStatus(eng)
		case "d", "done":
			if len(parts) > 1 {
				if idx, err := strconv.Atoi(parts[1]); err == nil && idx >= 1 && idx <= len(eng.Tasks) {
					eng.ToggleTask(eng.Tasks[idx-1].ID)
				}
			}
			printStatus(eng)
		case "q", "quit", "exit":
			eng.Save()
			fmt.Println("¡Hasta pronto!")
			return nil
		default:
			printStatus(eng)
		}
	}
	return nil
}

func tryOpenLinuxAppWindow(url string) {
	browsers := []string{"google-chrome", "chromium", "chromium-browser", "microsoft-edge", "brave-browser"}
	for _, b := range browsers {
		if path, err := exec.LookPath(b); err == nil {
			_ = exec.Command(path, "--app="+url, "--window-size=1180,790").Start()
			return
		}
	}
	if path, err := exec.LookPath("xdg-open"); err == nil {
		_ = exec.Command(path, url).Start()
	}
}

func printStatus(eng *core.Engine) {
	state := "PAUSADO"
	if eng.IsRunning {
		state = "EN CURSO"
	}
	fmt.Printf("\n[%s | %s] Tiempo: %s | Ciclo: #%d | 🍅 Saldo: %d | Tema: %s\n",
		eng.ModeLabel(), state, eng.TimerDisplay(), eng.CycleCount, eng.PomodoroCount, eng.ActiveTheme().Name)
	if len(eng.Tasks) == 0 {
		fmt.Println("  (Sin tareas registradas)")
		return
	}
	for i, t := range eng.Tasks {
		mark := "[ ]"
		if t.Completed {
			mark = "[✓]"
		}
		fmt.Printf("  %d. %s %s (%d/%d 🍅) [%s]\n",
			i+1, mark, t.Name, t.CompletedPomodoros, t.EstimatedPomodoros, t.Priority)
	}
}
