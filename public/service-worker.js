// Service Worker para Pomodoro Task App v2
const CACHE_NAME = 'pomodoro-app-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/src/app.css',
  '/src/main.ts',
  '/imgs/icons/tomato.png',
  '/imgs/icons/maskable_icon.png',
  '/sounds/alarm.wav',
  '/imgs/focus.jpg',
  '/imgs/rest.jpg'
];

let timerInterval = null;
let timerEndTime = null;
let isTimerRunning = false;
let timerType = 'work'; // 'work' | 'shortBreak' | 'longBreak'
let lastKnownDuration = 1500;
let lastKnownTimeLeft = 1500;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache).catch((err) => {
        console.warn('Some cache assets failed to load:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((k) => {
          if (k !== CACHE_NAME) {
            return caches.delete(k);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const cloned = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
        return response;
      }).catch(() => cached);
    })
  );
});

// Format seconds into MM:SS
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// Update or display persistent timer notification with action controls
function updateTimerNotification(secondsLeft, isRunning, type) {
  const isWork = type === 'work';
  const modeText = isWork ? 'Enfoque' : 'Descanso';
  const timeFormatted = formatTime(secondsLeft);
  const title = `${isWork ? '🍅' : '☕'} ${timeFormatted} - ${modeText}`;
  const statusText = isRunning ? 'Sesión en curso...' : 'Temporizador en pausa';

  const actions = isRunning
    ? [
        { action: 'pause_timer', title: '⏸️ Pausar' },
        { action: 'skip_timer', title: '⏭️ Saltar' }
      ]
    : [
        { action: 'resume_timer', title: '▶️ Continuar' },
        { action: 'skip_timer', title: '⏭️ Saltar' }
      ];

  self.registration.showNotification(title, {
    body: `${statusText} • Pomodoro Task App`,
    icon: isWork ? '/imgs/focus.jpg' : '/imgs/rest.jpg',
    badge: '/imgs/icons/tomato.png',
    tag: 'pomodoro-timer-progress',
    silent: true,
    renotify: false,
    requireInteraction: false,
    actions
  }).catch(() => {});
}

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data) return;

  if (data.action === 'START_TIMER') {
    startBackgroundTimer(data.duration, data.type);
  } else if (data.action === 'STOP_TIMER') {
    stopBackgroundTimer();
  } else if (data.action === 'UPDATE_NOTIFICATION') {
    lastKnownTimeLeft = data.timeLeft;
    lastKnownDuration = data.duration;
    timerType = data.type || timerType;
    isTimerRunning = data.isRunning;
    updateTimerNotification(data.timeLeft, data.isRunning, data.type);
  } else if (data.action === 'CLEAR_PROGRESS_NOTIFICATION') {
    self.registration.getNotifications({ tag: 'pomodoro-timer-progress' }).then((notifs) => {
      notifs.forEach((n) => n.close());
    });
  } else if (data.action === 'GET_TIMER_STATE') {
    let timeLeft = 0;
    if (isTimerRunning && timerEndTime) {
      timeLeft = Math.max(0, Math.round((timerEndTime - Date.now()) / 1000));
      if (timeLeft === 0) stopBackgroundTimer();
    }
    if (event.source && event.source.postMessage) {
      event.source.postMessage({
        action: 'TIMER_STATE',
        isRunning: isTimerRunning,
        type: timerType,
        timeLeft,
        endTime: timerEndTime
      });
    }
  } else if (data.action === 'SHOW_NOTIFICATION') {
    self.registration.showNotification(data.title, data.options);
  }
});

// Handle interactive actions from phone notifications
self.addEventListener('notificationclick', (event) => {
  const action = event.action;
  const notification = event.notification;

  if (action === 'pause_timer') {
    stopBackgroundTimer();
    broadcastAction('ACTION_PAUSE');
    updateTimerNotification(lastKnownTimeLeft, false, timerType);
  } else if (action === 'resume_timer') {
    startBackgroundTimer(lastKnownTimeLeft, timerType);
    broadcastAction('ACTION_START');
  } else if (action === 'skip_timer') {
    stopBackgroundTimer();
    notification.close();
    broadcastAction('ACTION_SKIP');
  } else {
    // Clicked main body of notification -> open/focus app
    notification.close();
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow('/');
        }
      })
    );
  }
});

function broadcastAction(actionType, extraData = {}) {
  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage({
        action: actionType,
        ...extraData
      });
    });
  });
}

function startBackgroundTimer(durationSecs, type) {
  stopBackgroundTimer();
  isTimerRunning = true;
  timerType = type || 'work';
  lastKnownDuration = durationSecs;
  lastKnownTimeLeft = durationSecs;
  timerEndTime = Date.now() + durationSecs * 1000;

  // Show initial notification
  updateTimerNotification(durationSecs, true, timerType);

  timerInterval = setInterval(() => {
    const remainingSecs = Math.max(0, Math.round((timerEndTime - Date.now()) / 1000));
    lastKnownTimeLeft = remainingSecs;

    // Update progress notification every 5 seconds to be battery-friendly on mobile
    if (remainingSecs % 5 === 0 && remainingSecs > 0) {
      updateTimerNotification(remainingSecs, true, timerType);
    }

    if (remainingSecs <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      isTimerRunning = false;

      // Close persistent progress notification
      self.registration.getNotifications({ tag: 'pomodoro-timer-progress' }).then((notifs) => {
        notifs.forEach((n) => n.close());
      });

      // Show loud completion alert
      const isWork = timerType === 'work';
      const title = isWork ? '🎉 ¡Sesión de enfoque completada!' : '⏰ ¡Fin del descanso!';
      const body = isWork
        ? '¡Excelente trabajo! Tómate un respiro merecido.'
        : '¡Descanso finalizado! Es hora de volver a enfocarte.';

      self.registration.showNotification(title, {
        body,
        icon: isWork ? '/imgs/rest.jpg' : '/imgs/focus.jpg',
        badge: '/imgs/icons/tomato.png',
        vibrate: [200, 100, 200, 100, 300],
        tag: 'pomodoro-session-ended',
        renotify: true,
        actions: [
          { action: 'open_app', title: '🚀 Abrir App' }
        ]
      });

      broadcastAction('TIMER_ENDED', { type: timerType });
    }
  }, 1000);
}

function stopBackgroundTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  isTimerRunning = false;
  timerEndTime = null;
}
