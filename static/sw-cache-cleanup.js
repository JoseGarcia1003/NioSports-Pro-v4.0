// Workbox no longer caches API/data responses. Remove copies left by older
// workers on activation so a shared browser cannot retain another account's data.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(
      names
        .filter((name) => name === 'predictions' || name === 'nba-data')
        .map((name) => caches.delete(name))
    ))
  );
});
