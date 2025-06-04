import { describe, beforeEach, afterEach, test, expect, vi, mock } from "bun:test";

// Provide a minimal implementation of svelte stores using mock.module
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

// Mock Audio
class AudioMock {
  volume = 1;
  constructor(public src: string) {}
  play = vi.fn();
}

// Mock service worker controller
const postMessage = vi.fn();

(globalThis as any).navigator = { serviceWorker: { controller: { postMessage } } };
(globalThis as any).window = {
  localStorage: localStorageMock,
  navigator: globalThis.navigator
} as any;
(globalThis as any).localStorage = localStorageMock;
(globalThis as any).Audio = AudioMock;
(globalThis as any).Notification = class { static permission = "granted"; constructor(_: string, __?: any) {} };

const timerModule = await import("../src/lib/stores/timer");
const { startTimer, stopTimer, nextTimer, timer, isRunning, isWorking, workingTime, breakTime, pomodoroCount, interval } = timerModule;

beforeEach(() => {
  localStorageMock.clear();
  timer.set(1800);
  workingTime.set(1800);
  breakTime.set(300);
  isWorking.set(true);
  isRunning.set(false);
  interval.set(undefined);
  pomodoroCount.set(0);
  postMessage.mockClear();
});

afterEach(() => {
  stopTimer();
});

describe("timer store", () => {
  test("startTimer starts the timer and posts message", () => {
    startTimer();
    expect(get(isRunning)).toBe(true);
    expect(get(interval)).not.toBeUndefined();
    expect(postMessage).toHaveBeenCalledWith(expect.objectContaining({ action: "START_TIMER" }));
  });

  test("stopTimer stops the timer and posts message", () => {
    startTimer();
    stopTimer();
    expect(get(isRunning)).toBe(false);
    expect(get(interval)).toBeUndefined();
    expect(postMessage).toHaveBeenCalledWith({ action: "STOP_TIMER" });
  });

  test("nextTimer switches from work to break", () => {
    isWorking.set(true);
    workingTime.set(100);
    breakTime.set(50);
    timer.set(100);
    nextTimer();
    expect(get(isWorking)).toBe(false);
    expect(get(timer)).toBe(50);
    expect(get(pomodoroCount)).toBe(1);
  });

  test("nextTimer switches from break to work", () => {
    isWorking.set(false);
    workingTime.set(100);
    breakTime.set(50);
    timer.set(50);
    nextTimer();
    expect(get(isWorking)).toBe(true);
    expect(get(timer)).toBe(100);
    expect(get(pomodoroCount)).toBe(0);
  });
});
