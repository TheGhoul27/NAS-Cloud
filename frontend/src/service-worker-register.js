// Register service worker for PWA functionality
export function registerServiceWorker() {
  const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  if (!window.isSecureContext && !isLocalhost) {
    console.warn('[PWA] Service Worker requires HTTPS (or localhost). Current origin is not secure:', window.location.origin);
    return;
  }

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then((registration) => {
          console.log('[PWA] Service Worker registered successfully:', registration);

          // Check for updates periodically
          setInterval(() => {
            registration.update();
          }, 60000); // Check every minute

          // Listen for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker available
                console.log('[PWA] New version available');
                // Optional: Show update notification to user
                showUpdateNotification();
              }
            });
          });
        })
        .catch((error) => {
          console.error('[PWA] Service Worker registration failed:', error);
        });
    });
  }
}

// Show update notification
function showUpdateNotification() {
  if (Notification.permission === 'granted') {
    new Notification('NAS Cloud Updated', {
      body: 'A new version is available. Refresh the page to update.',
      icon: '/manifest.json',
      badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect fill="%23ef4444" width="192" height="192"/></svg>',
    });
  }
}

// Request notification permission
export function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

// Check if app is installable (PWA)
export function isAppInstallable() {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

// Get install prompt
let deferredPrompt = null;

export function setupInstallPrompt(onPromptAvailable) {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log('[PWA] Install prompt available');
    if (onPromptAvailable) {
      onPromptAvailable(deferredPrompt);
    }
  });

  window.addEventListener('appinstalled', () => {
    console.log('[PWA] App installed successfully');
  });
}

// Trigger install prompt
export function triggerInstallPrompt() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    return deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('[PWA] User accepted install prompt');
      } else {
        console.log('[PWA] User dismissed install prompt');
      }
      deferredPrompt = null;
      return { shown: true, outcome: choiceResult.outcome };
    });
  }

  return Promise.resolve({ shown: false, outcome: 'unavailable' });
}

export function hasInstallPromptAvailable() {
  return !!deferredPrompt;
}

// Check if app is running as installed PWA
export function isInstalledPWA() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.navigator.standalone === true
  );
}

export function getInstallabilityStatus() {
  const hostname = window.location.hostname;
  const isLocalhost = ['localhost', '127.0.0.1'].includes(hostname);
  const secureContext = window.isSecureContext || isLocalhost;
  const supportsBeforeInstallPrompt = 'onbeforeinstallprompt' in window;

  return {
    secureContext,
    isLocalhost,
    supportsBeforeInstallPrompt,
    canInstallPrompt: secureContext && supportsBeforeInstallPrompt,
  };
}
