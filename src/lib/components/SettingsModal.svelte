<script lang="ts">
	import { settings, updateSettings, resetSettingsToDefaults } from "../stores/settings";
	import { playAlarmSound } from "../utils/audioSynth";
	import type { AlarmSoundId } from "../types";

	let {
		isOpen,
		onClose,
	}: {
		isOpen: boolean;
		onClose: () => void;
	} = $props();

	let notificationStatus = $state(
		typeof window !== "undefined" && "Notification" in window
			? Notification.permission
			: "default"
	);

	function handleOverlayClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onClose();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === "Escape") {
			onClose();
		}
	}

	function testAlarm() {
		playAlarmSound($settings.alarmSound, $settings.alarmVolume);
	}

	async function requestNotification() {
		if (typeof window !== "undefined" && "Notification" in window) {
			const permission = await Notification.requestPermission();
			notificationStatus = permission;
			if (permission === "granted") {
				updateSettings({ notificationsEnabled: true });
				new Notification("🍅 ¡Notificaciones activadas!", {
					body: "Te avisaremos cuando tus sesiones de enfoque y descanso terminen.",
					icon: "/imgs/icons/tomato.png",
				});
			}
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		class="modal-overlay"
		onclick={handleOverlayClick}
		role="dialog"
		aria-modal="true"
		aria-labelledby="settings-modal-title"
		tabindex="-1"
	>
		<div class="modal-window">
			<div class="modal-header">
				<h2 id="settings-modal-title">
					<span>⚙️</span> Configuración
				</h2>
				<button class="modal-close-btn" onclick={onClose} aria-label="Cerrar modal">
					✕
				</button>
			</div>

			<div class="settings-sections">
				<!-- Section 1: Duraciones -->
				<div class="settings-group">
					<h3 class="group-title">⏱️ Duración de Sesiones (minutos)</h3>
					
					<div class="time-inputs-grid">
						<div class="field-box">
							<label for="work-dur">Enfoque</label>
							<input
								id="work-dur"
								type="number"
								min="1"
								max="120"
								value={$settings.workDuration}
								oninput={(e) =>
									updateSettings({
										workDuration: Math.max(
											1,
											parseInt(
												(e.target as HTMLInputElement).value || "25",
												10
											)
										),
									})}
							/>
						</div>

						<div class="field-box">
							<label for="short-dur">Descanso Corto</label>
							<input
								id="short-dur"
								type="number"
								min="1"
								max="30"
								value={$settings.shortBreakDuration}
								oninput={(e) =>
									updateSettings({
										shortBreakDuration: Math.max(
											1,
											parseInt(
												(e.target as HTMLInputElement).value || "5",
												10
											)
										),
									})}
							/>
						</div>

						<div class="field-box">
							<label for="long-dur">Descanso Largo</label>
							<input
								id="long-dur"
								type="number"
								min="1"
								max="60"
								value={$settings.longBreakDuration}
								oninput={(e) =>
									updateSettings({
										longBreakDuration: Math.max(
											1,
											parseInt(
												(e.target as HTMLInputElement).value || "15",
												10
											)
										),
									})}
							/>
						</div>

						<div class="field-box">
							<label for="cycle-interval">Ciclo (Pomodoros)</label>
							<input
								id="cycle-interval"
								type="number"
								min="2"
								max="12"
								value={$settings.longBreakInterval}
								oninput={(e) =>
									updateSettings({
										longBreakInterval: Math.max(
											2,
											parseInt(
												(e.target as HTMLInputElement).value || "4",
												10
											)
										),
									})}
							/>
						</div>
					</div>
				</div>

				<!-- Section 2: Sonidos y Alarmas -->
				<div class="settings-group">
					<h3 class="group-title">🔔 Sonidos y Alarmas</h3>

					<div class="setting-row">
						<label for="alarm-sound-select">Tono de Alarma:</label>
						<div class="sound-select-wrapper">
							<select
								id="alarm-sound-select"
								value={$settings.alarmSound}
								onchange={(e) =>
									updateSettings({
										alarmSound: (e.target as HTMLSelectElement)
											.value as AlarmSoundId,
									})}
							>
								<option value="bell">🔔 Campana de Cristal</option>
								<option value="chime">✨ Melodía Chime</option>
								<option value="digital">📟 Beep Digital</option>
								<option value="gong">🧘 Gong Zen</option>
								<option value="marimba">🪵 Marimba Alegre</option>
								<option value="retro">👾 8-Bit Retro</option>
								<option value="classic">⏰ Alarma Clásica</option>
							</select>

							<button
								type="button"
								class="test-sound-btn"
								onclick={testAlarm}
								title="Probar sonido seleccionado"
							>
								▶ Probar
							</button>
						</div>
					</div>

					<div class="setting-row">
						<label for="alarm-vol-slider">
							Volumen: {Math.round($settings.alarmVolume * 100)}%
						</label>
						<input
							id="alarm-vol-slider"
							type="range"
							min="0"
							max="1"
							step="0.05"
							value={$settings.alarmVolume}
							oninput={(e) =>
								updateSettings({
									alarmVolume: parseFloat(
										(e.target as HTMLInputElement).value
									),
								})}
							class="volume-range"
						/>
					</div>

					<div class="setting-toggle-row">
						<div>
							<span class="toggle-title">Tictac sutil de fondo</span>
							<p class="toggle-desc">
								Reproduce un pulso rítmico suave durante las sesiones de enfoque
							</p>
						</div>
						<input
							type="checkbox"
							checked={$settings.tickingSound}
							onchange={(e) =>
								updateSettings({
									tickingSound: (e.target as HTMLInputElement).checked,
								})}
							class="custom-toggle"
						/>
					</div>
				</div>

				<!-- Section 3: Automatización -->
				<div class="settings-group">
					<h3 class="group-title">⚡ Automatización de Flujo</h3>

					<div class="setting-toggle-row">
						<div>
							<span class="toggle-title">Iniciar descansos automáticamente</span>
							<p class="toggle-desc">
								Inicia la cuenta atrás del descanso al terminar un pomodoro
							</p>
						</div>
						<input
							type="checkbox"
							checked={$settings.autoStartBreaks}
							onchange={(e) =>
								updateSettings({
									autoStartBreaks: (e.target as HTMLInputElement).checked,
								})}
							class="custom-toggle"
						/>
					</div>

					<div class="setting-toggle-row">
						<div>
							<span class="toggle-title">Iniciar pomodoros automáticamente</span>
							<p class="toggle-desc">
								Inicia la siguiente sesión de enfoque al terminar el descanso
							</p>
						</div>
						<input
							type="checkbox"
							checked={$settings.autoStartPomodoros}
							onchange={(e) =>
								updateSettings({
									autoStartPomodoros: (e.target as HTMLInputElement).checked,
								})}
							class="custom-toggle"
						/>
					</div>

					<div class="setting-toggle-row">
						<div>
							<span class="toggle-title">Mantener pantalla encendida (Móvil)</span>
							<p class="toggle-desc">
								Evita que el teléfono bloquee la pantalla mientras el temporizador esté en marcha
							</p>
						</div>
						<input
							type="checkbox"
							checked={$settings.keepScreenAwake}
							onchange={(e) =>
								updateSettings({
									keepScreenAwake: (e.target as HTMLInputElement).checked,
								})}
							class="custom-toggle"
						/>
					</div>
				</div>

				<!-- Section 4: Notificaciones -->
				<div class="settings-group">
					<h3 class="group-title">📢 Notificaciones del Sistema</h3>

					<div class="notification-status-box">
						<div class="notif-info">
							<span class="notif-state-text">
								Estado:
								{#if notificationStatus === "granted"}
									<strong class="text-success">✅ Activadas</strong>
								{:else if notificationStatus === "denied"}
									<strong class="text-danger">🚫 Bloqueadas en navegador</strong>
								{:else}
									<strong>⚠️ No configuradas</strong>
								{/if}
							</span>
							<p class="toggle-desc">
								Recibe alertas en tu escritorio incluso cuando tengas otra pestaña activa.
							</p>
						</div>

						{#if notificationStatus !== "granted"}
							<button
								class="primary small"
								onclick={requestNotification}
							>
								Activar Permiso
							</button>
						{/if}
					</div>
				</div>
			</div>

			<div class="modal-footer">
				<button
					class="secondary danger"
					onclick={() => {
						if (confirm("¿Restaurar toda la configuración a valores de fábrica?")) {
							resetSettingsToDefaults();
						}
					}}
				>
					Restablecer
				</button>
				<button class="primary" onclick={onClose}>
					Guardar y Cerrar
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.settings-sections {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.settings-group {
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: 14px;
		padding: 1.2rem;
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
	}

	.group-title {
		font-size: 1rem;
		font-weight: 700;
		color: var(--text-primary);
		margin-bottom: 0.2rem;
	}

	.time-inputs-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
		gap: 0.75rem;
	}

	.field-box {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.field-box label {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--text-secondary);
	}

	.field-box input {
		font-size: 1rem;
		font-weight: 700;
		text-align: center;
		padding: 0.5rem;
	}

	.setting-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.setting-row label {
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--text-secondary);
	}

	.sound-select-wrapper {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.test-sound-btn {
		padding: 0.5rem 0.8rem;
		font-size: 0.82rem;
	}

	.volume-range {
		flex: 1;
		min-width: 150px;
		accent-color: var(--accent-color);
		cursor: pointer;
	}

	.setting-toggle-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.4rem 0;
	}

	.toggle-title {
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--text-primary);
		display: block;
	}

	.toggle-desc {
		font-size: 0.78rem;
		color: var(--text-secondary);
		margin-top: 0.15rem;
	}

	.custom-toggle {
		width: 22px;
		height: 22px;
		min-width: 22px;
		cursor: pointer;
		accent-color: var(--accent-color);
	}

	.notification-status-box {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.notif-state-text {
		font-size: 0.88rem;
		color: var(--text-primary);
	}

	.text-success {
		color: #22c55e;
	}

	.text-danger {
		color: #ef4444;
	}

	.modal-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 1.5rem;
		padding-top: 1rem;
		border-top: 1px solid var(--border-color);
	}
</style>
