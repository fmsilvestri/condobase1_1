self.addEventListener("push", function(event) {
  if (!event.data) {
    console.log("[SW] Push event without data");
    return;
  }

  try {
    const data = event.data.json();
    const options = {
      body: data.body || "",
      icon: data.icon || "/icon-192.png",
      badge: data.badge || "/badge-72.png",
      tag: data.tag || "notification",
      data: data.data || {},
      requireInteraction: data.data?.type === "urgent",
      vibrate: [200, 100, 200],
    };

    event.waitUntil(
      self.registration.showNotification(data.title || "Notificação", options)
    );
  } catch (error) {
    console.error("[SW] Error handling push:", error);
  }
});

self.addEventListener("notificationclick", function(event) {
  event.notification.close();

  const url = event.notification.data?.url || "/";
  
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function(clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

self.addEventListener("install", function(event) {
  console.log("[SW] Service Worker installed");
  self.skipWaiting();
});

self.addEventListener("activate", function(event) {
  console.log("[SW] Service Worker activated");
  event.waitUntil(clients.claim());
});
