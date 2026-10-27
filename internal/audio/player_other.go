//go:build !windows

package audio

import "github.com/JoseDv1/pomodoro-task-app/internal/core"

func PlayAlarm(id core.AlarmSoundID, volume float64) {
	_ = SynthesizeAlarm(id, volume)
}

func PlayTick(volume float64) {
	_ = SynthesizeTick(volume)
}

func UpdateAmbient(id core.AmbientSoundID, volume float64, active bool) {
	_ = SynthesizeAmbient(id, volume)
}
