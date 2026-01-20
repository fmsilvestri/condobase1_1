import webpush from "web-push";
import { createStorage } from "./supabase-storage";
import type { PushSubscription } from "@shared/schema";

const storage = createStorage();

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@condobase.com";

let isConfigured = false;

export function initializePushNotifications() {
  if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    isConfigured = true;
    console.log("[Push] Web Push configured successfully");
  } else {
    console.log("[Push] VAPID keys not configured - push notifications disabled");
  }
}

export function isPushConfigured(): boolean {
  return isConfigured;
}

export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY;
}

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: {
    url?: string;
    notificationId?: string;
    type?: string;
  };
}

export async function sendPushNotification(
  subscription: PushSubscription,
  payload: PushPayload
): Promise<boolean> {
  if (!isConfigured) {
    console.log("[Push] Not configured, skipping push");
    return false;
  }

  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  };

  try {
    await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
    console.log(`[Push] Sent to ${subscription.userId}`);
    return true;
  } catch (error: any) {
    console.error(`[Push] Failed to send to ${subscription.userId}:`, error.message);
    if (error.statusCode === 410 || error.statusCode === 404) {
      console.log(`[Push] Subscription expired, removing: ${subscription.id}`);
      await storage.deletePushSubscription(subscription.id);
    }
    return false;
  }
}

export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<number> {
  const subscriptions = await storage.getPushSubscriptions(userId);
  let sentCount = 0;

  for (const sub of subscriptions) {
    if (sub.isEnabled) {
      const sent = await sendPushNotification(sub, payload);
      if (sent) sentCount++;
    }
  }

  return sentCount;
}

export async function sendPushToCondominium(
  condominiumId: string,
  payload: PushPayload,
  excludeUserId?: string
): Promise<number> {
  const subscriptions = await storage.getAllActivePushSubscriptions(condominiumId);
  let sentCount = 0;

  for (const sub of subscriptions) {
    if (excludeUserId && sub.userId === excludeUserId) continue;
    const sent = await sendPushNotification(sub, payload);
    if (sent) sentCount++;
  }

  return sentCount;
}

export async function notifyNewAnnouncement(
  announcement: { id: string; title: string; content: string; priority?: string | null },
  condominiumId: string,
  createdByUserId?: string
): Promise<void> {
  const payload: PushPayload = {
    title: announcement.priority === "urgent" ? "Comunicado Urgente" : "Novo Comunicado",
    body: announcement.title,
    icon: "/icon-192.png",
    badge: "/badge-72.png",
    tag: `announcement-${announcement.id}`,
    data: {
      url: "/comunicados",
      notificationId: announcement.id,
      type: "announcement_new",
    },
  };

  await sendPushToCondominium(condominiumId, payload, createdByUserId);
}

export async function notifyMaintenanceUpdate(
  request: { id: string; title: string; status: string },
  userId: string,
  condominiumId: string
): Promise<void> {
  const statusLabels: Record<string, string> = {
    pending: "Pendente",
    in_progress: "Em Andamento",
    completed: "Concluída",
    cancelled: "Cancelada",
  };

  const payload: PushPayload = {
    title: "Atualização de Manutenção",
    body: `${request.title} - Status: ${statusLabels[request.status] || request.status}`,
    icon: "/icon-192.png",
    badge: "/badge-72.png",
    tag: `maintenance-${request.id}`,
    data: {
      url: "/manutencao",
      notificationId: request.id,
      type: "maintenance_update",
    },
  };

  await sendPushToUser(userId, payload);
}

export async function notifyUrgentMessage(
  title: string,
  message: string,
  condominiumId: string
): Promise<void> {
  const payload: PushPayload = {
    title: `URGENTE: ${title}`,
    body: message,
    icon: "/icon-192.png",
    badge: "/badge-72.png",
    tag: `urgent-${Date.now()}`,
    data: {
      url: "/comunicados",
      type: "urgent",
    },
  };

  await sendPushToCondominium(condominiumId, payload);
}
