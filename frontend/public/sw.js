// Inside your public/sw.js background operational service script thread ⚙️

self.addEventListener("notificationclick", (event) => {
  console.log("🎯 Native System Tray Notification Card clicked:", event.notification.tag);
  
  // Close the OS notification banner cleanly
  event.notification.close();

  // Extract your target redirect url parameter properties safely
  const targetUrlToOpen = event.notification.data?.clickUrl || self.location.origin + "/notifications";

  // Focus an existing VillageMart tab or launch a new window instance if none are open
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        if (client.url === targetUrlToOpen && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrlToOpen);
      }
    })
  );
});
