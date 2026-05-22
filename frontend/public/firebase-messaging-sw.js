// Firebase Messaging Service Worker
// รับ background push notifications จาก FCM
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyAqnN-_qbU6nMVhVsaYNybL2fcecQjWpPU",
  authDomain: "labboy-workload-app.firebaseapp.com",
  projectId: "labboy-workload-app",
  storageBucket: "labboy-workload-app.firebasestorage.app",
  messagingSenderId: "399593522960",
  appId: "1:399593522960:web:9037c9da4ef1604a414795",
});

const messaging = firebase.messaging();

// รับ background message และแสดง notification
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || payload.data?.title || "แจ้งเตือน";
  const body = payload.notification?.body || payload.data?.body || "";
  const icon = payload.notification?.icon || "/labboy-logo.png";

  self.registration.showNotification(title, {
    body,
    icon,
    badge: "/labboy-logo.png",
    data: payload.data || {},
    tag: payload.data?.tag || "labboy-notif",
  });
});

// คลิก notification → เปิดหรือ focus tab
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
