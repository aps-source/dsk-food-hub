/**
 * Sends a push notification to every device the owner has enabled notifications on,
 * whenever a new order arrives or an existing one is edited/cancelled by the customer.
 * Device tokens are registered by the client under /fcmTokens/{token} when the owner
 * taps "Enable notifications" in Manage hub — this function only ever reads that list
 * and sends to it, it never writes order data.
 */
const { onValueCreated, onValueUpdated } = require("firebase-functions/v2/database");
const admin = require("firebase-admin");
admin.initializeApp();

async function sendToAllDevices(title, body) {
  const tokensSnap = await admin.database().ref("fcmTokens").once("value");
  if (!tokensSnap.exists()) return;
  const tokens = Object.keys(tokensSnap.val());
  if (tokens.length === 0) return;

  const resp = await admin.messaging().sendEachForMulticast({
    notification: { title, body },
    tokens,
  });

  // Drop tokens the browser itself has invalidated (uninstalled PWA, permission revoked,
  // cleared site data) so the list doesn't grow stale forever.
  const stale = [];
  resp.responses.forEach((r, i) => {
    if (!r.success) {
      const code = r.error && r.error.code;
      if (
        code === "messaging/registration-token-not-registered" ||
        code === "messaging/invalid-registration-token"
      ) {
        stale.push(tokens[i]);
      }
    }
  });
  if (stale.length) {
    const updates = {};
    stale.forEach((t) => {
      updates[t] = null;
    });
    await admin.database().ref("fcmTokens").update(updates);
  }
}

exports.notifyNewOrder = onValueCreated("/orders/{orderId}", async (event) => {
  const order = event.data.val();
  if (!order || order.status !== "PENDING") return;
  const itemsText = (order.items || []).map((i) => i.qty + "x " + i.name).join(", ");
  await sendToAllDevices(
    "New order — " + (order.tokenDisplay || ""),
    itemsText + (order.fulfilment === "DELIVERY" ? " · Delivery" : " · Pickup")
  );
});

exports.notifyOrderAction = onValueUpdated("/orders/{orderId}", async (event) => {
  const before = event.data.before.val() || {};
  const after = event.data.after.val() || {};
  if (!after.customerActionAt || after.customerActionAt === before.customerActionAt) return;

  const cancelled = after.customerActionType === "CANCELLED";
  const title = (cancelled ? "Order cancelled — " : "Order updated — ") + (after.tokenDisplay || "");
  const body = cancelled
    ? "Cancelled by the customer."
    : (after.items || []).map((i) => i.qty + "x " + i.name).join(", ");
  await sendToAllDevices(title, body);
});
