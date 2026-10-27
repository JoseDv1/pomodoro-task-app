package audio

import (
	"bytes"
	"testing"

	"github.com/JoseDv1/pomodoro-task-app/internal/core"
)

func TestSynthesizeAudio(t *testing.T) {
	for _, snd := range core.AllAlarmSounds {
		wav := SynthesizeAlarm(snd.ID, 0.8)
		if len(wav) <= 44 || !bytes.Equal(wav[:4], []byte("RIFF")) || !bytes.Equal(wav[8:12], []byte("WAVE")) {
			t.Fatalf("invalid WAV generated for alarm %s", snd.ID)
		}
	}

	tick := SynthesizeTick(0.5)
	if len(tick) <= 44 || !bytes.Equal(tick[:4], []byte("RIFF")) {
		t.Fatalf("invalid WAV generated for tick")
	}

	for _, amb := range core.AllAmbientSounds {
		wav := SynthesizeAmbient(amb.ID, 0.5)
		if amb.ID == core.AmbientOff {
			if len(wav) != 0 {
				t.Fatalf("expected empty WAV for AmbientOff")
			}
			continue
		}
		if len(wav) <= 44 || !bytes.Equal(wav[:4], []byte("RIFF")) {
			t.Fatalf("invalid WAV generated for ambient %s", amb.ID)
		}
	}
}

func BenchmarkSynthesizeAlarmBell(b *testing.B) {
	b.ReportAllocs()
	for i := 0; i < b.N; i++ {
		_ = SynthesizeAlarm(core.AlarmBell, 0.7)
	}
}

func BenchmarkSynthesizeAlarmMarimba(b *testing.B) {
	b.ReportAllocs()
	for i := 0; i < b.N; i++ {
		_ = SynthesizeAlarm(core.AlarmMarimba, 0.7)
	}
}

func BenchmarkSynthesizeTick(b *testing.B) {
	b.ReportAllocs()
	for i := 0; i < b.N; i++ {
		_ = SynthesizeTick(0.12)
	}
}

func BenchmarkSynthesizeAmbientRain(b *testing.B) {
	b.ReportAllocs()
	for i := 0; i < b.N; i++ {
		_ = SynthesizeAmbient(core.AmbientRain, 0.5)
	}
}

func BenchmarkSynthesizeAmbientStream(b *testing.B) {
	b.ReportAllocs()
	for i := 0; i < b.N; i++ {
		_ = SynthesizeAmbient(core.AmbientStream, 0.5)
	}
}

