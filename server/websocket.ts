import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import type { Notification } from "@shared/schema";
import { supabase, isSupabaseConfigured } from "./supabase";

interface ConnectedClient {
  ws: WebSocket;
  userId: string;
}

const clients: Map<string, ConnectedClient[]> = new Map();

async function verifyToken(token: string): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase) {
    console.log("[WebSocket] Supabase not configured, skipping token verification");
    return null;
  }
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error) {
      console.log("[WebSocket] Token verification error:", error.message);
      return null;
    }
    if (!user) {
      console.log("[WebSocket] No user found for token");
      return null;
    }
    return user.id;
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
        
        const verifiedUserId = await verifyToken(authMessage.token);
        
        if (!verifiedUserId) {
          console.log("[WebSocket] Token verification failed");
          ws.close(1008, "Authentication failed");
          return;
        }
        
        if (verifiedUserId !== authMessage.userId) {
          console.log("[WebSocket] User ID mismatch");
          ws.close(1008, "Authentication failed");
          return;
        }
        
        clearTimeout(authTimeout);
        authenticated = true;
        userId = authMessage.userId;
        
        console.log(`[WebSocket] Client authenticated: ${userId}`);
        
        const clientList = clients.get(userId) || [];
        clientList.push({ ws, userId });
        clients.set(userId, clientList);
        
        ws.send(JSON.stringify({ type: "authenticated", userId }));
        
        ws.on("close", () => {
          console.log(`[WebSocket] Client disconnected: ${userId}`);
          const clientList = clients.get(userId!) || [];
          const filteredList = clientList.filter((c) => c.ws !== ws);
          if (filteredList.length === 0) {
            clients.delete(userId!);
          } else {
            clients.set(userId!, filteredList);
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
