// Service Worker para la aplicación Pomodoro
const CACHE_NAME = 'pomodoro-app-v1';
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

// Variables para gestionar el temporizador en segundo plano
let timerInterval;
let timerEndTime;
let isTimerRunning = false;
let timerType = 'work'; // 'work' o 'break'
let currentTimerDuration = 0;

// Instalación del service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache abierto');
        return cache.addAll(urlsToCache);
      })
  );
  // Tomar el control inmediatamente
  self.skipWaiting();
});

// Activación del service worker
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Tomar el control de todas las páginas dentro del alcance
      return self.clients.claim();
    })
  );
});

// Interceptación de solicitudes de red
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - devuelve la respuesta desde el cache
        if (response) {
          return response;
        }
        
        return fetch(event.request).then(
          (response) => {
            // Verificar si recibimos una respuesta válida
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clonar la respuesta para poder guardarla en caché y devolverla
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
  );
});

// Manejo de mensajes desde la aplicación principal
self.addEventListener('message', (event) => {
  const data = event.data;
  
  if (data.action === 'START_TIMER') {
    // Iniciar temporizador en segundo plano
    startBackgroundTimer(data.duration, data.type);
    
    // Responder a la aplicación principal
    if (event.source && event.source.postMessage) {
      event.source.postMessage({
        action: 'TIMER_STARTED',
        timerType: timerType,
        endTime: timerEndTime,
        isRunning: isTimerRunning
      });
    }
  } 
  else if (data.action === 'STOP_TIMER') {
    // Detener temporizador
    stopBackgroundTimer();
    
    // Responder a la aplicación principal
    if (event.source && event.source.postMessage) {
      event.source.postMessage({
        action: 'TIMER_STOPPED'
      });
    }
  }
  else if (data.action === 'GET_TIMER_STATE') {
    // Calcular tiempo restante actual si el temporizador está en ejecución
    let timeLeft = 0;
    if (isTimerRunning && timerEndTime) {
      timeLeft = Math.max(0, Math.round((timerEndTime - Date.now()) / 1000));
      
      // Si el temporizador ha terminado mientras estábamos en segundo plano
      if (timeLeft === 0) {
        stopBackgroundTimer();
      }
    }
    
    // Responder con el estado actual
    if (event.source && event.source.postMessage) {
      event.source.postMessage({
        action: 'TIMER_STATE',
        isRunning: isTimerRunning,
        type: timerType,
        timeLeft: timeLeft,
        endTime: timerEndTime
      });
    }
  }
});

// Evento para mostrar notificaciones cuando la app está en segundo plano
self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  notification.close();
  
  // Al hacer clic en la notificación, abrimos/enfocamos la ventana de la app
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientsArr) => {
      // Si ya hay una ventana abierta, la enfocamos
      const hadWindowToFocus = clientsArr.some((windowClient) => {
        if (windowClient.url === '/' || windowClient.url.includes('/index.html')) {
          return windowClient.focus();
        }
        return false;
      });

      // Si no hay ventana, abrimos una nueva
      if (!hadWindowToFocus) {
        clients.openWindow('/');
      }
    })
  );
});

// Función para iniciar el temporizador en segundo plano
function startBackgroundTimer(duration, type) {
  stopBackgroundTimer(); // Detener cualquier temporizador existente
  
  isTimerRunning = true;
  timerType = type; // 'work' o 'break'
  currentTimerDuration = duration;
  timerEndTime = Date.now() + duration * 1000;
  
  // Configurar intervalo para verificar el estado del temporizador
  timerInterval = setInterval(() => {
    const timeLeft = Math.max(0, timerEndTime - Date.now());
    
    if (timeLeft <= 0) {
      // El temporizador ha terminado
      clearInterval(timerInterval);
      isTimerRunning = false;
      
      // Mostrar notificación
      const title = timerType === 'work' ? 
        '¡Hora de descansar!' : 
        '¡Hora de trabajar!';
      
      const options = {
        body: timerType === 'work' ? 
          'Has completado tu sesión de trabajo. ¡Tómate un descanso!' : 
          'Tu descanso ha terminado. ¡Es hora de volver a trabajar!',
        icon: timerType === 'work' ? '/imgs/rest.jpg' : '/imgs/focus.jpg',
        badge: '/imgs/icons/tomato.png',
        vibrate: [100, 50, 100],
        requireInteraction: true
      };
      
      self.registration.showNotification(title, options);
      
      // Informar a la aplicación principal que el temporizador ha terminado
      broadcastTimerEnd();
    }
  }, 1000);
}

// Función para detener el temporizador en segundo plano
function stopBackgroundTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  isTimerRunning = false;
}

// Función para informar a la aplicación principal que el temporizador ha terminado
function broadcastTimerEnd() {
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        action: 'TIMER_ENDED',
        type: timerType
      });
    });
  });
}

