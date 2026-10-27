//go:build windows

package audio

import (
	"sync"
	"syscall"
	"unsafe"

	"github.com/JoseDv1/pomodoro-task-app/internal/core"
)

var (
	winmm       = syscall.NewLazyDLL("winmm.dll")
	procPlaySnd = winmm.NewProc("PlaySoundW")

	audioMu       sync.Mutex
	activeWAVBuf  []byte
	ambientWAVBuf []byte

	// Caché de buffers WAV sintetizados para evitar recalcular en cada pulso o alarma repetida
	cachedAlarmID    core.AlarmSoundID
	cachedAlarmVolQ  int
	cachedAlarmWAV   []byte
	cachedTickVolQ   int
	cachedTickWAV    []byte
	cachedAmbientID  core.AmbientSoundID
	cachedAmbVolQ    int
	cachedAmbientWAV []byte
)

const (
	sndAsync  = 0x0001
	sndNodef  = 0x0002
	sndMemory = 0x0004
	sndLoop   = 0x0008
)

func quantizeVol(v float64) int {
	return int(clampVolume(v)*1000 + 0.5)
}

// PlayAlarm reproduce de forma asíncrona una alarma sintetizada en Windows reutilizando caché si no cambió.
func PlayAlarm(id core.AlarmSoundID, volume float64) {
	volQ := quantizeVol(volume)

	audioMu.Lock()
	if cachedAlarmID != id || cachedAlarmVolQ != volQ || len(cachedAlarmWAV) == 0 {
		cachedAlarmWAV = SynthesizeAlarm(id, volume)
		cachedAlarmID = id
		cachedAlarmVolQ = volQ
	}
	activeWAVBuf = cachedAlarmWAV
	if len(activeWAVBuf) == 0 {
		audioMu.Unlock()
		return
	}
	ptr := uintptr(unsafe.Pointer(&activeWAVBuf[0]))
	audioMu.Unlock()

	_, _, _ = procPlaySnd.Call(ptr, 0, sndMemory|sndAsync|sndNodef)
}

// PlayTick reproduce un pulso corto de reloj (0 allocs tras el primer segundo).
func PlayTick(volume float64) {
	volQ := quantizeVol(volume)

	audioMu.Lock()
	if len(ambientWAVBuf) > 0 {
		audioMu.Unlock()
		return
	}
	if cachedTickVolQ != volQ || len(cachedTickWAV) == 0 {
		cachedTickWAV = SynthesizeTick(volume)
		cachedTickVolQ = volQ
	}
	activeWAVBuf = cachedTickWAV
	if len(activeWAVBuf) == 0 {
		audioMu.Unlock()
		return
	}
	ptr := uintptr(unsafe.Pointer(&activeWAVBuf[0]))
	audioMu.Unlock()

	_, _, _ = procPlaySnd.Call(ptr, 0, sndMemory|sndAsync|sndNodef)
}

// UpdateAmbient inicia o detiene el bucle de audio ambiental en Windows con caché en memoria.
func UpdateAmbient(id core.AmbientSoundID, volume float64, active bool) {
	volQ := quantizeVol(volume)
	if !active || id == core.AmbientOff || volQ <= 0 {
		audioMu.Lock()
		wasPlaying := len(ambientWAVBuf) > 0
		ambientWAVBuf = nil
		audioMu.Unlock()
		if wasPlaying {
			_, _, _ = procPlaySnd.Call(0, 0, 0)
		}
		return
	}

	audioMu.Lock()
	if cachedAmbientID != id || cachedAmbVolQ != volQ || len(cachedAmbientWAV) == 0 {
		cachedAmbientWAV = SynthesizeAmbient(id, volume)
		cachedAmbientID = id
		cachedAmbVolQ = volQ
	}
	ambientWAVBuf = cachedAmbientWAV
	if len(ambientWAVBuf) == 0 {
		audioMu.Unlock()
		return
	}
	ptr := uintptr(unsafe.Pointer(&ambientWAVBuf[0]))
	audioMu.Unlock()

	_, _, _ = procPlaySnd.Call(ptr, 0, sndMemory|sndAsync|sndLoop|sndNodef)
}
