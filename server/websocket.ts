import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import type { Notification } from "@shared/schema";
import { supabase, isSupabaseConfigured } from "./supabase";
import { storage } from "./storage";

interface ConnectedClient {
  ws: WebSocket;
  userId: string;
}

const clients: Map<string, ConnectedClient[]> = new Map();

async function verifyTokenAndGetLocalUserId(token: string, claimedLocalUserId: string): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase) {
    console.log("[WebSocket] Supabase not configured, using claimed userId");
    return claimedLocalUserId;
  }
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error) {
      console.log("[WebSocket] Token verification error:", error.message);
      return null;
    }
    if (!user || !user.email) {
      console.log("[WebSocket] No user/email found for token");
      return null;
    }
    
    const localUser = await storage.getUserByEmail(user.email);
    if (!localUser) {
      console.log("[WebSocket] Local user not found for email:", user.email);
      return null;
    }
    
    if (localUser.id !== claimedLocalUserId) {
      console.log("[WebSocket] Claimed userId doesn't match local user for this email");
      return null;
    }
    
    return localUser.id;
  } catch (error) {
    console.error("[WebSocket] Token verification exception:", error);
    return null;
  }
}

export function setupWebSocket(httpServer: Server) {
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", async (ws, req) => {
    let authenticated = false;
    let userId: string | null = null;
    
    const authTimeout = setTimeout(() => {
      if (!authenticated) {
        console.log("[WebSocket] Authentication timeout");
        ws.close(1008, "Authentication timeout");
      }
    }, 10000);
    
    ws.once("message", async (data) => {
      try {
        const authMessage = JSON.parse(data.toString());
        
        if (authMessage.type !== "auth" || !authMessage.token || !authMessage.userId) {
          console.log("[WebSocket] Invalid auth message format");
          ws.close(1008, "Invalid auth message");
          return;
        }
        
        const verifiedUserId = await verifyTokenAndGetLocalUserId(authMessage.token, authMessage.userId);
        
        if (!verifiedUserId) {
          console.log("[WebSocket] Token verification failed");
          ws.close(1008, "Authentication failed");
          return;
        }
        
        clearTimeout(authTimeout);
        authenticated = true;
        userId = verifiedUserId;
        
        console.log(`[WebSocket] Client authenticated: ${userId}`);
        
        const clientList = clients.get(verifiedUserId) || [];
        clientList.push({ ws, userId: verifiedUserId });
        clients.set(verifiedUserId, clientList);
        
        ws.send(JSON.stringify({ type: "authenticated", userId: verifiedUserId }));
        
        ws.on("close", () => {
          console.log(`[WebSocket] Client disconnected: ${verifiedUserId}`);
          const clientList = clients.get(verifiedUserId) || [];
          const filteredList = clientList.filter((c) => c.ws !== ws);
          if (filteredList.length === 0) {
            clients.delete(verifiedUserId);
          } else {
            clients.set(verifiedUserId, filteredList);
          }
        });
        
      } catch (error) {
        console.error("[WebSocket] Auth error:", error);
        ws.close(1008, "Authentication error");
      }
    });

    ws.on("error", (error) => {
      console.error("[WebSocket] Connection error:", error);
    });
  });

  console.log("[WebSocket] Server initialized on /ws");
  return wss;
}

export function sendNotificationToUser(userId: string, notification: Notification) {
  const clientList = clients.get(userId);
  if (clientList) {
    const message = JSON.stringify({
      type: "notification",
      data: notification,
    });
    clientList.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
      }
    });
  }
}

export function broadcastNotification(notification: Notification, excludeUserId?: string) {
  const message = JSON.stringify({
    type: "notification",
    data: notification,
  });
  
  clients.forEach((clientList, userId) => {
    if (excludeUserId && userId === excludeUserId) return;
    clientList.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
      }
    });
  });
}
