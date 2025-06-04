# Pomodoro Task App

Esta aplicación combina un temporizador basado en la técnica Pomodoro con una lista de tareas sencilla. Está desarrollada con **Svelte**, **TypeScript** y **Vite**, y puede instalarse como una PWA para funcionar sin conexión.

## Características principales

- Temporizador configurable para sesiones de trabajo y descanso.
- Notificaciones y sonido cuando termina cada periodo.
- Lista de tareas con persistencia en `localStorage`.
- Contador de Pomodoros completados para desbloquear temas visuales.
- Varios temas de color y cambio rápido desde la interfaz.
- Ajustes de volumen de la alarma.
- Funciona offline gracias a un *service worker* y puede instalarse en el escritorio o móvil.

## Instalación

```bash
npm install
```

Para entornos que utilicen **Bun** también puedes ejecutar `bun install`.

## Uso en desarrollo

Ejecuta Vite en modo desarrollo con recarga automática:

```bash
npm run dev
```

Abre `http://localhost:5173` en tu navegador para ver la aplicación.

## Crear una versión de producción

```bash
npm run build
```

Para previsualizar la build localmente puedes usar:

```bash
npm run preview
```

## Pruebas

Las pruebas unitarias utilizan el runtime de **Bun**. Para ejecutarlas:

```bash
bun test
```

## Estructura del proyecto

- `src/` – Componentes Svelte y stores de la aplicación.
- `public/` – Archivos estáticos, service worker y manifest de la PWA.
- `tests/` – Conjunto de pruebas automatizadas.

¡Disfruta mejorando tu productividad con Pomodoro Task App!
