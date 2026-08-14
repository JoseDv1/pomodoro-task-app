import { describe, beforeEach, afterEach, test, expect, vi, mock } from "bun:test";

// Provide minimal implementation of svelte stores using mock.module
mock.module('svelte/store', () => import('./mockSvelteStore'));
const { get } = await import('./mockSvelteStore');

// Mock localStorage
class LocalStorageMock {
  private store = new Map<string, string>();
  getItem(key: string) { return this.store.has(key) ? this.store.get(key)! : null; }
  setItem(key: string, value: string) { this.store.set(key, value); }
  removeItem(key: string) { this.store.delete(key); }
  clear() { this.store.clear(); }
}
const localStorageMock = new LocalStorageMock();

// Mock Audio & Web Audio API
class AudioMock {
  volume = 1;
  constructor(public src: string) {}
  play = vi.fn().mockResolvedValue(undefined);
}

class AudioContextMock {
  currentTime = 0;
  state = 'running';
  destination = {};
  createGain = () => ({
    gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn(),
    disconnect: vi.fn(),
  });
  createOscillator = () => ({
    type: 'sine',
    frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  });
  createBuffer = () => ({ getChannelData: () => new Float32Array(100) });
  createBufferSource = () => ({
    buffer: null,
    loop: false,
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    disconnect: vi.fn(),
  });
  createBiquadFilter = () => ({
    type: 'lowpass',
    frequency: { setValueAtTime: vi.fn() },
    Q: { setValueAtTime: vi.fn() },
    connect: vi.fn(),
  });
  resume = vi.fn();
}

const postMessage = vi.fn();

(globalThis as any).navigator = { serviceWorker: { controller: { postMessage } } };
(globalThis as any).window = {
  localStorage: localStorageMock,
  navigator: globalThis.navigator,
  AudioContext: AudioContextMock,
  matchMedia: () => ({ matches: false }),
} as any;
(globalThis as any).localStorage = localStorageMock;
(globalThis as any).Audio = AudioMock;
(globalThis as any).AudioContext = AudioContextMock;
(globalThis as any).Notification = class { static permission = "granted"; constructor(_: string, __?: any) {} };
(globalThis as any).document = {
  title: '',
  documentElement: {
    style: {
      setProperty: vi.fn(),
      colorScheme: 'dark',
    }
  }
};

const timerModule = await import("../src/lib/stores/timer");
const taskModule = await import("../src/lib/stores/task");
const statsModule = await import("../src/lib/stores/stats");
const themeModule = await import("../src/lib/stores/theme");
const settingsModule = await import("../src/lib/stores/settings");

beforeEach(() => {
  localStorageMock.clear();
  postMessage.mockClear();
});

afterEach(() => {
  timerModule.stopTimer(false);
});

describe("1. Timer Store Engine", () => {
  beforeEach(() => {
    timerModule.mode.set('work');
    timerModule.duration.set(1500);
    timerModule.timeLeft.set(1500);
    timerModule.isRunning.set(false);
    timerModule.cycleCount.set(1);
    timerModule.pomodoroCount.set(0);
    timerModule.interval.set(undefined);
  });

  test("startTimer starts countdown and notifies service worker", () => {
    timerModule.startTimer();
    expect(get(timerModule.isRunning)).toBe(true);
    expect(get(timerModule.interval)).not.toBeUndefined();
    expect(postMessage).toHaveBeenCalledWith(expect.objectContaining({ action: "START_TIMER" }));
  });

  test("stopTimer stops timer cleanly", () => {
    timerModule.startTimer();
    timerModule.stopTimer();
    expect(get(timerModule.isRunning)).toBe(false);
    expect(get(timerModule.interval)).toBeUndefined();
    expect(postMessage).toHaveBeenCalledWith({ action: "STOP_TIMER" });
  });

  test("toggleTimer switches between start and stop", () => {
    timerModule.toggleTimer();
    expect(get(timerModule.isRunning)).toBe(true);
    timerModule.toggleTimer();
    expect(get(timerModule.isRunning)).toBe(false);
  });

  test("switchMode updates mode and durations", () => {
    timerModule.switchMode('shortBreak');
    expect(get(timerModule.mode)).toBe('shortBreak');
    expect(get(timerModule.timeLeft)).toBe(300);

    timerModule.switchMode('longBreak');
    expect(get(timerModule.mode)).toBe('longBreak');
    expect(get(timerModule.timeLeft)).toBe(900);
  });

  test("addSeconds modifies remaining time correctly", () => {
    timerModule.timeLeft.set(300);
    timerModule.addSeconds(60);
    expect(get(timerModule.timeLeft)).toBe(360);

    timerModule.addSeconds(-120);
    expect(get(timerModule.timeLeft)).toBe(240);
  });

  test("resetTimer resets to current mode target duration", () => {
    timerModule.timeLeft.set(50);
    timerModule.resetTimer();
    expect(get(timerModule.timeLeft)).toBe(1500);
  });

  test("handleSessionComplete transitions from work to break and awards tomato", () => {
    timerModule.mode.set('work');
    timerModule.pomodoroCount.set(5);
    timerModule.cycleCount.set(1);

    timerModule.handleSessionComplete();

    expect(get(timerModule.pomodoroCount)).toBe(6);
    expect(get(timerModule.mode)).toBe('shortBreak');
    expect(get(timerModule.cycleCount)).toBe(2);
  });

  test("handleSessionComplete transitions to longBreak when cycle is reached", () => {
    timerModule.mode.set('work');
    timerModule.cycleCount.set(4);

    timerModule.handleSessionComplete();

    expect(get(timerModule.mode)).toBe('longBreak');
    expect(get(timerModule.cycleCount)).toBe(1);
  });
});

describe("2. Task Management Store", () => {
  beforeEach(() => {
    taskModule.clearAllTasks();
    taskModule.taskFilter.set('all');
    taskModule.taskSearch.set('');
  });

  test("addTask creates a new task with defaults and sets it as active if none set", () => {
    const task = taskModule.addTask({
      name: "Escribir documentación",
      estimatedPomodoros: 3,
      priority: "high",
      category: "Trabajo"
    });

    expect(task.name).toBe("Escribir documentación");
    expect(task.estimatedPomodoros).toBe(3);
    expect(task.priority).toBe("high");
    expect(task.category).toBe("Trabajo");
    expect(task.completed).toBe(false);
    expect(get(taskModule.tasks).length).toBe(1);
    expect(get(taskModule.activeTaskId)).toBe(task.id);
  });

  test("toggleTask flips completed state and updates completedAt", () => {
    const task = taskModule.addTask({ name: "Hacer ejercicio" });
    expect(task.completed).toBe(false);

    taskModule.toggleTask(task.id);
    const updated = get(taskModule.tasks).find(t => t.id === task.id);
    expect(updated?.completed).toBe(true);
    expect(updated?.completedAt).not.toBeNull();

    taskModule.toggleTask(task.id);
    const untoggled = get(taskModule.tasks).find(t => t.id === task.id);
    expect(untoggled?.completed).toBe(false);
  });

  test("updateTask modifies task properties", () => {
    const task = taskModule.addTask({ name: "Tarea antigua" });
    taskModule.updateTask(task.id, { name: "Tarea renombrada", priority: "low" });

    const updated = get(taskModule.tasks).find(t => t.id === task.id);
    expect(updated?.name).toBe("Tarea renombrada");
    expect(updated?.priority).toBe("low");
  });

  test("removeTask removes item and clears active task if it was active", () => {
    const task = taskModule.addTask({ name: "Por borrar" });
    expect(get(taskModule.activeTaskId)).toBe(task.id);

    taskModule.removeTask(task.id);
    expect(get(taskModule.tasks).length).toBe(0);
    expect(get(taskModule.activeTaskId)).toBeNull();
  });

  test("incrementActiveTaskPomodoro adds to completedPomodoros of active task", () => {
    const task = taskModule.addTask({ name: "Estudiar TypeScript", estimatedPomodoros: 4 });
    taskModule.setActiveTask(task.id);

    taskModule.incrementActiveTaskPomodoro();
    taskModule.incrementActiveTaskPomodoro();

    const current = get(taskModule.tasks).find(t => t.id === task.id);
    expect(current?.completedPomodoros).toBe(2);
  });

  test("filters tasks by status and search query", () => {
    const t1 = taskModule.addTask({ name: "Aprender Svelte 5", category: "Dev" });
    const t2 = taskModule.addTask({ name: "Limpiar escritorio", category: "Hogar" });
    taskModule.toggleTask(t2.id);

    taskModule.taskFilter.set('active');
    expect(get(taskModule.filteredTasks).length).toBe(1);
    expect(get(taskModule.filteredTasks)[0].id).toBe(t1.id);

    taskModule.taskFilter.set('completed');
    expect(get(taskModule.filteredTasks).length).toBe(1);
    expect(get(taskModule.filteredTasks)[0].id).toBe(t2.id);

    taskModule.taskFilter.set('all');
    taskModule.taskSearch.set('Svelte');
    expect(get(taskModule.filteredTasks).length).toBe(1);
    expect(get(taskModule.filteredTasks)[0].id).toBe(t1.id);
  });

  test("clearCompletedTasks removes only completed tasks", () => {
    const t1 = taskModule.addTask({ name: "Tarea 1" });
    const t2 = taskModule.addTask({ name: "Tarea 2" });
    taskModule.toggleTask(t1.id);

    taskModule.clearCompletedTasks();
    const remaining = get(taskModule.tasks);
    expect(remaining.length).toBe(1);
    expect(remaining[0].id).toBe(t2.id);
  });
});

describe("3. Stats and Streak Store", () => {
  beforeEach(() => {
    statsModule.stats.set({
      totalFocusMinutes: 0,
      totalPomodoros: 0,
      currentStreak: 0,
      bestStreak: 0,
      lastActiveDate: '',
      history: {},
    });
  });

  test("recordCompletedPomodoro increments total minutes and pomodoros", () => {
    statsModule.recordCompletedPomodoro(25);
    statsModule.recordCompletedPomodoro(25);

    const s = get(statsModule.stats);
    expect(s.totalFocusMinutes).toBe(50);
    expect(s.totalPomodoros).toBe(2);
    expect(s.currentStreak).toBe(1);
    expect(s.bestStreak).toBe(1);

    const today = get(statsModule.todayStats);
    expect(today.minutes).toBe(50);
    expect(today.pomodoros).toBe(2);
  });

  test("recordCompletedTask updates today's completed task count", () => {
    statsModule.recordCompletedTask();
    statsModule.recordCompletedTask();

    const today = get(statsModule.todayStats);
    expect(today.tasksCompleted).toBe(2);
  });
});

describe("4. Theme Store & Storefront", () => {
  test("loads default themes and sets initial theme", () => {
    const list = get(themeModule.themes);
    expect(list.length).toBeGreaterThanOrEqual(8);
    expect(get(themeModule.activeThemeId)).toBeDefined();
    expect(get(themeModule.activeTheme)).toBeDefined();
  });

  test("setTheme switches active theme if unlocked", () => {
    themeModule.setTheme('default-light');
    expect(get(themeModule.activeThemeId)).toBe('default-light');
  });

  test("unlockTheme fails if balance is insufficient", () => {
    const success = themeModule.unlockTheme('cyber-neon', 2);
    expect(success).toBe(false);
  });

  test("unlockTheme succeeds with enough tomatoes and activates theme", () => {
    const success = themeModule.unlockTheme('forest-zen', 20);
    expect(success).toBe(true);

    const updated = get(themeModule.themes).find(t => t.id === 'forest-zen');
    expect(updated?.unlocked).toBe(true);
    expect(get(themeModule.activeThemeId)).toBe('forest-zen');
  });
});

describe("5. User Settings Store", () => {
  test("updates settings partially and preserves other values", () => {
    settingsModule.updateSettings({ workDuration: 30, autoStartBreaks: true });
    const current = get(settingsModule.settings);
    expect(current.workDuration).toBe(30);
    expect(current.autoStartBreaks).toBe(true);
    expect(current.shortBreakDuration).toBe(5);
  });
});
