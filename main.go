package main

import (
	"embed"
	"io/fs"
	"log"
	"os"

	"github.com/JoseDv1/pomodoro-task-app/internal/core"
	"github.com/JoseDv1/pomodoro-task-app/internal/ui"
)

//go:embed all:dist
var embeddedDist embed.FS

func main() {
	eng := core.NewEngine("")
	distFS, err := fs.Sub(embeddedDist, "dist")
	if err != nil {
		log.Fatalf("error cargando assets embebidos: %v", err)
	}
	if err := ui.Run(eng, distFS); err != nil {
		log.Printf("error: %v", err)
		os.Exit(1)
	}
}
