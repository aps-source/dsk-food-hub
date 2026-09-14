// Runs in the background, even when no tab of the site is open, and turns an incoming
// FCM push message into an actual OS-level notification. Kept as a separate top-level
// file (not inlined in index.html) because a service worker must be served from its own
// URL for the browser to register it.
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyC-rjzReNuth3LV3Pl9-dTzgqfcUtwyYqc",
  authDomain: "dsk-food-hub.firebaseapp.com",
  databaseURL: "https://dsk-food-hub-default-rtdb.firebaseio.com",
  projectId: "dsk-food-hub",
  storageBucket: "dsk-food-hub.firebasestorage.app",
  messagingSenderId: "354315309281",
  appId: "1:354315309281:web:e81d217a548291e92367a0"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload){
  var title = (payload.notification && payload.notification.title) || "DSK Food Hub";
  var body = (payload.notification && payload.notification.body) || "";
  self.registration.showNotification(title, {
    body: body,
    icon: "icon-192.png",
    badge: "icon-192.png",
    tag: "dsk-food-hub-order"
  });
});

// Tapping the notification brings an already-open tab to the front, or opens a new one.
self.addEventListener("notificationclick", function(event){
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function(clientList){
      for(var i=0; i<clientList.length; i++){
        if("focus" in clientList[i]) return clientList[i].focus();
      }
      if(self.clients.openWindow) return self.clients.openWindow("./");
    })
  );
});
