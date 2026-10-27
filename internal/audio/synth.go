package audio

import (
	"encoding/binary"
	"math"

	"github.com/JoseDv1/pomodoro-task-app/internal/core"
)

const (
	sampleRate     = 44100
	invSampleRate  = 1.0 / 44100.0
	wavHeaderBytes = 44
)

// newWAVBuffer reserva un único buffer RIFF WAV PCM 16-bit mono con su cabecera de 44 bytes lista.
func newWAVBuffer(numSamples int) []byte {
	dataSize := numSamples * 2
	buf := make([]byte, wavHeaderBytes+dataSize)

	copy(buf[0:4], "RIFF")
	binary.LittleEndian.PutUint32(buf[4:8], uint32(36+dataSize))
	copy(buf[8:12], "WAVE")
	copy(buf[12:16], "fmt ")
	binary.LittleEndian.PutUint32(buf[16:20], 16) // PCM chunk size
	binary.LittleEndian.PutUint16(buf[20:22], 1)  // PCM format
	binary.LittleEndian.PutUint16(buf[22:24], 1)  // 1 channel (mono)
	binary.LittleEndian.PutUint32(buf[24:28], sampleRate)
	binary.LittleEndian.PutUint32(buf[28:32], sampleRate*2)
	binary.LittleEndian.PutUint16(buf[32:34], 2)
	binary.LittleEndian.PutUint16(buf[34:36], 16)
	copy(buf[36:40], "data")
	binary.LittleEndian.PutUint32(buf[40:44], uint32(dataSize))
	return buf
}

func clampVolume(volume float64) float64 {
	if volume < 0 {
		return 0
	}
	if volume > 1 {
		return 1
	}
	return volume
}

func clampPCM(v int32) int16 {
	if v > 32760 {
		return 32760
	}
	if v < -32760 {
		return -32760
	}
	return int16(v)
}

type synthNote struct {
	freq  float64
	start float64
	dur   float64
	wave  uint8 // 0: sine, 1: square, 2: triangle
}

const (
	waveSine uint8 = iota
	waveSquare
	waveTriangle
)

var (
	notesChime = [...]synthNote{
		{523.25, 0.0, 0.45, waveSine},
		{659.25, 0.18, 0.45, waveSine},
		{783.99, 0.36, 0.55, waveSine},
		{1046.50, 0.55, 0.75, waveSine},
	}
	notesDigital = [...]synthNote{
		{880, 0.0, 0.12, waveSquare},
		{880, 0.16, 0.12, waveSquare},
		{880, 0.32, 0.12, waveSquare},
		{1174.66, 0.50, 0.35, waveSquare},
	}
	notesGong = [...]synthNote{
		{196.0, 0.0, 1.5, waveSine},
		{293.66, 0.0, 1.3, waveSine},
		{392.0, 0.0, 1.1, waveTriangle},
	}
	notesMarimba = [...]synthNote{
		{440.0, 0.0, 0.22, waveTriangle},
		{554.37, 0.14, 0.22, waveTriangle},
		{659.25, 0.28, 0.25, waveTriangle},
		{880.0, 0.42, 0.45, waveTriangle},
	}
	notesRetro = [...]synthNote{
		{587.33, 0.0, 0.10, waveSquare},
		{783.99, 0.10, 0.10, waveSquare},
		{987.77, 0.20, 0.10, waveSquare},
		{1174.66, 0.30, 0.35, waveSquare},
	}
	notesClassic = [...]synthNote{
		{740.0, 0.0, 0.18, waveSquare},
		{987.77, 0.20, 0.18, waveSquare},
		{740.0, 0.42, 0.18, waveSquare},
		{987.77, 0.62, 0.32, waveSquare},
	}
	notesBell = [...]synthNote{
		{587.33, 0.0, 0.9, waveSine},
		{1174.66, 0.0, 0.6, waveSine},
		{880.0, 0.32, 0.9, waveSine},
	}
)

// SynthesizeAlarm genera en memoria el WAV para el sonido de alarma elegido en una sola asignación.
func SynthesizeAlarm(id core.AlarmSoundID, volume float64) []byte {
	vol := clampVolume(volume)
	var notes []synthNote
	totalDur := 1.4

	switch id {
	case core.AlarmChime:
		notes = notesChime[:]
	case core.AlarmDigital:
		notes = notesDigital[:]
		totalDur = 1.0
	case core.AlarmGong:
		notes = notesGong[:]
		totalDur = 1.6
	case core.AlarmMarimba:
		notes = notesMarimba[:]
		totalDur = 1.0
	case core.AlarmRetro:
		notes = notesRetro[:]
		totalDur = 0.8
	case core.AlarmClassic:
		notes = notesClassic[:]
		totalDur = 1.0
	default:
		notes = notesBell[:]
	}

	numSamples := int(totalDur * sampleRate)
	buf := newWAVBuffer(numSamples)
	scale := vol * 32760.0
	attackSamples := int(0.01 * sampleRate)
	invAttack := 1.0 / float64(attackSamples)

	for _, n := range notes {
		startIdx := int(n.start * sampleRate)
		endIdx := int((n.start + n.dur) * sampleRate)
		if endIdx > numSamples {
			endIdx = numSamples
		}
		if startIdx >= endIdx {
			continue
		}

		// Progresión geométrica para el decaimiento exponencial (evita math.Exp por muestra)
		decayStep := math.Exp(-3.8 / (n.dur * sampleRate))
		env := 1.0

		// Oscilador fasorial incremental (evita math.Sin / math.Asin por muestra)
		omega := 2.0 * math.Pi * n.freq * invSampleRate
		sinStep, cosStep := math.Sin(omega), math.Cos(omega)
		sinVal, cosVal := 0.0, 1.0

		phase := 0.0
		phaseStep := n.freq * invSampleRate

		count := endIdx - startIdx
		offset := wavHeaderBytes + startIdx*2

		for k := 0; k < count; k++ {
			curEnv := env
			if k < attackSamples {
				curEnv *= float64(k) * invAttack
			}
			env *= decayStep

			var val float64
			switch n.wave {
			case waveSquare:
				if phase < 0.5 {
					val = 0.35
				} else {
					val = -0.35
				}
				phase += phaseStep
				if phase >= 1.0 {
					phase -= 1.0
				}
			case waveTriangle:
				// Onda triangular pura desde fase normalizada [0, 1)
				var tri float64
				if phase < 0.25 {
					tri = 4.0 * phase
				} else if phase < 0.75 {
					tri = 2.0 - 4.0*phase
				} else {
					tri = 4.0*phase - 4.0
				}
				val = tri * 0.6
				phase += phaseStep
				if phase >= 1.0 {
					phase -= 1.0
				}
			default: // waveSine
				val = sinVal * 0.55
				nextSin := sinVal*cosStep + cosVal*sinStep
				cosVal = cosVal*cosStep - sinVal*sinStep
				sinVal = nextSin
			}

			delta := int32(val * curEnv * scale)
			existing := int32(int16(binary.LittleEndian.Uint16(buf[offset : offset+2])))
			binary.LittleEndian.PutUint16(buf[offset:offset+2], uint16(clampPCM(existing+delta)))
			offset += 2
		}
	}
	return buf
}

// SynthesizeTick genera un clic suave de reloj mecánico sin asignaciones intermedias.
func SynthesizeTick(volume float64) []byte {
	vol := clampVolume(volume)
	const numSamples = 1103 // round(0.025 * 44100)
	buf := newWAVBuffer(numSamples)

	decayStep := math.Exp(-180.0 * invSampleRate)
	env := 1.0
	omega := 2.0 * math.Pi * 1200.0 * invSampleRate
	sinStep, cosStep := math.Sin(omega), math.Cos(omega)
	sinVal, cosVal := 0.0, 1.0
	scale := vol * 0.4 * 32760.0

	offset := wavHeaderBytes
	for i := 0; i < numSamples; i++ {
		pcm := clampPCM(int32(sinVal * env * scale))
		binary.LittleEndian.PutUint16(buf[offset:offset+2], uint16(pcm))
		offset += 2

		env *= decayStep
		nextSin := sinVal*cosStep + cosVal*sinStep
		cosVal = cosVal*cosStep - sinVal*sinStep
		sinVal = nextSin
	}
	return buf
}

// SynthesizeAmbient genera un bucle de 3 segundos de sonido ambiental directamente sobre el buffer WAV.
func SynthesizeAmbient(id core.AmbientSoundID, volume float64) []byte {
	vol := clampVolume(volume)
	if id == core.AmbientOff || vol <= 0 {
		return nil
	}

	const numSamples = 3 * sampleRate
	buf := newWAVBuffer(numSamples)
	scale := vol * 32760.0

	// PRNG XorShift64* en registros (0 allocs en heap)
	rngState := uint64(0x9E3779B97F4A7C15)
	const invMaxUint64 = 1.0 / float64(1<<53)

	// Fasor para modulación lenta de AmbientStream (0.67 Hz)
	omega := 2.0 * math.Pi * 0.67 * invSampleRate
	sinStep, cosStep := math.Sin(omega), math.Cos(omega)
	sinVal, cosVal := 0.0, 1.0

	var last float64
	offset := wavHeaderBytes

	for i := 0; i < numSamples; i++ {
		rngState ^= rngState >> 12
		rngState ^= rngState << 25
		rngState ^= rngState >> 27
		rnd := rngState * 0x2545F4914F6CDD1D
		u := float64(rnd>>11) * invMaxUint64 // [0.0, 1.0)
		white := u*2.0 - 1.0

		var s float64
		switch id {
		case core.AmbientWhiteNoise:
			s = white * 0.18
		case core.AmbientBrownNoise:
			last = (last + 0.02*white) * (1.0 / 1.02)
			s = last * 0.65
		case core.AmbientRain:
			last = 0.85*last + 0.15*white
			drop := 1.0
			if (rnd & 0x1FF) == 0 { // ~1/512 probabilidad (~0.00195)
				drop = 2.2
			}
			s = last * 0.25 * drop
		case core.AmbientStream:
			mod := 0.75 + 0.25*sinVal
			nextSin := sinVal*cosStep + cosVal*sinStep
			cosVal = cosVal*cosStep - sinVal*sinStep
			sinVal = nextSin

			last = 0.92*last + 0.08*white
			s = last * 0.32 * mod
		}

		pcm := clampPCM(int32(s * scale))
		binary.LittleEndian.PutUint16(buf[offset:offset+2], uint16(pcm))
		offset += 2
	}
	return buf
}
