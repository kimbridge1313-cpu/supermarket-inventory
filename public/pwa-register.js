(() => {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none'
      });
      try {
        await registration.update();
      } catch (error) {
        console.warn('PWA update check failed', error);
      }
    } catch (error) {
      console.warn('PWA service worker registration failed', error);
    }
  });
})();
