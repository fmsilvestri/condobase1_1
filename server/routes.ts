import type { Express } from "express";
import { createServer, type Server } from "http";
import { createStorage } from "./supabase-storage";
import { sendNotificationToUser, broadcastNotification } from "./websocket";
import { optionalJWT, requireAuth } from "./auth-middleware";
import { 
  initializePushNotifications, 
  isPushConfigured, 
  getVapidPublicKey,
  notifyNewAnnouncement,
  notifyMaintenanceUpdate
} from "./push-notifications";
import jwt from "jsonwebtoken";
import { 
  condominiumContextMiddleware, 
  getCondominiumId, 
  getUserId, 
  isAdmin,
  requireCondominium,
  requireSindicoOrAdmin 
} from "./condominium-context";
import {
  insertCondominiumSchema,
  insertUserCondominiumSchema,
  insertEquipmentSchema,
  insertMaintenanceRequestSchema,
  insertMaintenanceCompletionSchema,
  insertPoolReadingSchema,
  insertReservoirSchema,
  insertWaterReadingSchema,
  insertHydrometerReadingSchema,
  insertGasReadingSchema,
  insertEnergyEventSchema,
  insertOccupancyDataSchema,
  insertDocumentSchema,
  insertSupplierSchema,
  insertAnnouncementSchema,
  insertUserSchema,
  updateUserSchema,
  insertPushSubscriptionSchema,
  insertNotificationPreferenceSchema,
  insertSecurityDeviceSchema,
  insertSecurityEventSchema,
  insertPreventiveAssetSchema,
  insertMaintenancePlanSchema,
  insertPlanChecklistItemSchema,
  insertMaintenanceExecutionSchema,
  insertExecutionChecklistItemSchema,
  insertMaintenanceDocumentSchema,
} from "@shared/schema";

import { z } from "zod";
import { supabase, isSupabaseConfigured } from "./supabase";
import { identificarAdminPlataforma, permitirApenasAdminPlataforma } from "./admin-middleware";

const storage = createStorage();

export { storage };

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.use(optionalJWT);
  app.use(condominiumContextMiddleware);

  const publicPaths = ["/supabase-config", "/supabase-status", "/login"];
  const userScopedPaths = ["/condominiums", "/users", "/user-condominiums", "/admin"];
  
  app.use("/api", (req, res, next) => {
    if (publicPaths.some(p => req.path === p || req.path.startsWith(p + "/"))) {
      return next();
    }
    return requireAuth(req, res, next);
  });

  app.use("/api", (req, res, next) => {
    const isPublic = publicPaths.some(p => req.path === p || req.path.startsWith(p + "/"));
    const isUserScoped = userScopedPaths.some(p => req.path === p || req.path.startsWith(p + "/"));
    if (isPublic || isUserScoped) {
      return next();
    }
    return requireCondominium(req, res, next);
  });

  // Login endpoint - authenticates via Supabase and returns custom JWT
  app.post("/api/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: "Email e senha são obrigatórios" });
      }
      
      if (!isSupabaseConfigured || !supabase) {
        return res.status(503).json({ error: "Supabase não configurado" });
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        return res.status(401).json({ error: "Credenciais inválidas" });
      }
      
      let user = await storage.getUser(data.user.id);
      if (!user) {
        user = await storage.getUserByEmail(email);
      }
      
      if (!user) {
        return res.status(403).json({ 
          error: "Usuário não cadastrado no sistema",
          hint: "Entre em contato com o administrador para liberar seu acesso"
        });
      }
      
      const role = user.role;
      
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        console.error("[Login] JWT_SECRET não configurado");
        return res.status(500).json({ error: "Erro de configuração do servidor" });
      }
      
      const token = jwt.sign(
        { 
          sub: user.id,
          email: user.email,
          role: role
        },
        jwtSecret,
        { expiresIn: "8h" }
      );
      
      res.json({ 
        token, 
        user: {
          id: user.id,
          email: user.email,
          role: role,
          name: user.name
        }
      });
    } catch (error: any) {
      console.error("[Login] Error:", error.message);
      res.status(500).json({ error: "Erro ao processar login" });
    }
  });

  app.get("/api/supabase-config", (req, res) => {
    res.json({
      url: process.env.SUPABASE_URL || "",
      anonKey: process.env.SUPABASE_ANON_KEY || "",
    });
  });

  app.get("/api/supabase-status", async (req, res) => {
    if (!isSupabaseConfigured || !supabase) {
      return res.json({ 
        configured: false, 
        message: "Supabase não configurado. Usando armazenamento em memória." 
      });
    }
    
    try {
      const { data, error } = await supabase.from("equipment").select("id").limit(1);
      if (error) {
        console.log("Supabase test error:", error.message);
        return res.json({ 
          configured: true, 
          connected: false, 
          error: error.message,
          hint: "Execute o arquivo supabase/schema.sql no SQL Editor do Supabase para criar as tabelas."
        });
      }
      return res.json({ 
        configured: true, 
        connected: true, 
        message: "Conectado ao Supabase com sucesso!" 
      });
    } catch (err: any) {
      return res.json({ 
        configured: true, 
        connected: false, 
        error: err.message 
      });
    }
  });

  // Condominium routes
  app.get("/api/condominiums", async (req, res) => {
    try {
      const userId = getUserId(req);
      const isPlatformAdmin = isAdmin(req);
      
      if (isPlatformAdmin) {
        const condominiums = await storage.getCondominiums();
        return res.json(condominiums);
      }
      
      if (userId) {
        const userCondos = await storage.getUserCondominiums(userId);
        const condoIds = userCondos.map(uc => uc.condominiumId);
        const allCondos = await storage.getCondominiums();
        const userCondominiums = allCondos.filter(c => condoIds.includes(c.id));
        return res.json(userCondominiums);
      }
      
      res.json([]);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/condominiums/:id", async (req, res) => {
    try {
      const condominium = await storage.getCondominiumById(req.params.id);
      if (!condominium) {
        return res.status(404).json({ error: "Condomínio não encontrado" });
      }
      res.json(condominium);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post(
    "/api/condominiums",
    identificarAdminPlataforma,
    permitirApenasAdminPlataforma,
    async (req, res) => {
      try {
        const validatedData = insertCondominiumSchema.parse(req.body);
        const condominium = await storage.createCondominium(validatedData);
        res.status(201).json(condominium);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    }
  );

  app.patch(
    "/api/condominiums/:id",
    identificarAdminPlataforma,
    permitirApenasAdminPlataforma,
    async (req, res) => {
      try {
        const partialCondominiumSchema = insertCondominiumSchema.partial();
        const validatedData = partialCondominiumSchema.parse(req.body);
        const condominium = await storage.updateCondominium(req.params.id, validatedData);
        if (!condominium) {
          return res.status(404).json({ error: "Condomínio não encontrado" });
        }
        res.json(condominium);
      } catch (error: any) {
        if (error.name === "ZodError") {
          return res.status(400).json({ error: "Dados inválidos", details: error.errors });
        }
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.delete(
    "/api/condominiums/:id",
    identificarAdminPlataforma,
    permitirApenasAdminPlataforma,
    async (req, res) => {
      try {
        const deleted = await storage.deleteCondominium(req.params.id);
        if (!deleted) {
          return res.status(404).json({ error: "Condomínio não encontrado" });
        }
        res.json({ success: true });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // Admin routes - require platform admin
  app.post(
    "/api/admin/condominios",
    identificarAdminPlataforma,
    permitirApenasAdminPlataforma,
    async (req, res) => {
      try {
        const validatedData = insertCondominiumSchema.parse(req.body);
        const condominium = await storage.createCondominium(validatedData);
        res.status(201).json(condominium);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    }
  );

  app.get(
    "/api/admin/condominios",
    identificarAdminPlataforma,
    permitirApenasAdminPlataforma,
    async (req, res) => {
      try {
        const condominiums = await storage.getCondominiums();
        res.json(condominiums);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.patch(
    "/api/admin/condominios/:id",
    identificarAdminPlataforma,
    permitirApenasAdminPlataforma,
    async (req, res) => {
      try {
        const partialCondominiumSchema = insertCondominiumSchema.partial();
        const validatedData = partialCondominiumSchema.parse(req.body);
        const condominium = await storage.updateCondominium(req.params.id, validatedData);
        if (!condominium) {
          return res.status(404).json({ error: "Condomínio não encontrado" });
        }
        res.json(condominium);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.delete(
    "/api/admin/condominios/:id",
    identificarAdminPlataforma,
    permitirApenasAdminPlataforma,
    async (req, res) => {
      try {
        const deleted = await storage.deleteCondominium(req.params.id);
        if (!deleted) {
          return res.status(404).json({ error: "Condomínio não encontrado" });
        }
        res.json({ success: true });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.get(
    "/api/admin/usuarios",
    identificarAdminPlataforma,
    permitirApenasAdminPlataforma,
    async (req, res) => {
      try {
        const users = await storage.getUsers();
        res.json(users);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // User-Condominium relationship routes
  app.get("/api/users/:userId/condominiums", async (req, res) => {
    try {
      const userCondominiums = await storage.getUserCondominiums(req.params.userId);
      res.json(userCondominiums);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/condominiums/:condominiumId/users", async (req, res) => {
    try {
      const condominiumUsers = await storage.getCondominiumUsers(req.params.condominiumId);
      res.json(condominiumUsers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/user-condominiums", async (req, res) => {
    try {
      const validatedData = insertUserCondominiumSchema.parse(req.body);
      const userCondominium = await storage.addUserToCondominium(validatedData);
      res.status(201).json(userCondominium);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/user-condominiums/:id", async (req, res) => {
    try {
      const partialUserCondominiumSchema = insertUserCondominiumSchema.partial();
      const validatedData = partialUserCondominiumSchema.parse(req.body);
      const userCondominium = await storage.updateUserCondominium(req.params.id, validatedData);
      if (!userCondominium) {
        return res.status(404).json({ error: "Vínculo não encontrado" });
      }
      res.json(userCondominium);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Dados inválidos", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/user-condominiums/:userId/:condominiumId", async (req, res) => {
    try {
      const removed = await storage.removeUserFromCondominium(
        req.params.userId,
        req.params.condominiumId
      );
      if (!removed) {
        return res.status(404).json({ error: "Vínculo não encontrado" });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.get("/api/dashboard", async (req, res) => {
    try {
      const condominiumId = getCondominiumId(req) || (req.query.condominiumId as string) || undefined;
      
      const [equipment, requests, poolReadings, waterReadings, gasReadings, energyEvents, occupancy, documents, announcements] = await Promise.all([
        storage.getEquipment(condominiumId),
        storage.getMaintenanceRequests(condominiumId),
        storage.getPoolReadings(condominiumId),
        storage.getWaterReadings(condominiumId),
        storage.getGasReadings(condominiumId),
        storage.getEnergyEvents(condominiumId),
        storage.getOccupancyData(condominiumId),
        storage.getDocuments(condominiumId),
        storage.getAnnouncements(condominiumId),
      ]);

      const openRequests = requests.filter(r => r.status !== "concluído").length;
      const latestPoolReading = poolReadings[0];
      const latestWaterReading = waterReadings[0];
      const latestGasReading = gasReadings[0];
      const latestEnergyEvent = energyEvents[0];
      
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const expiringDocuments = documents.filter(d => 
        d.expirationDate && new Date(d.expirationDate) <= thirtyDaysFromNow
      ).length;

      res.json({
        openRequests,
        totalEquipment: equipment.length,
        latestPoolReading,
        latestWaterReading,
        latestGasReading,
        currentEnergyStatus: latestEnergyEvent?.status || "ok",
        occupancy,
        expiringDocuments,
        recentAnnouncements: announcements.slice(0, 5),
      });
    } catch (error: any) {
      console.error("Dashboard error:", error?.message || error);
      res.status(500).json({ error: "Failed to fetch dashboard data", details: error?.message });
    }
  });

  // Users/Admin routes
  app.get("/api/users", async (req, res) => {
    try {
      const isPlatformAdmin = isAdmin(req);
      
      if (!isPlatformAdmin) {
        return res.status(403).json({ error: "Acesso negado: requer permissão de administrador" });
      }
      
      const users = await storage.getUsers();
      res.json(users);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch users", details: error.message });
    }
  });

  app.get("/api/users/by-email/:email", async (req, res) => {
    try {
      const user = await storage.getUserByEmail(decodeURIComponent(req.params.email));
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(validatedData);
      res.status(201).json(user);
    } catch (error: any) {
      res.status(400).json({ error: "Invalid user data", details: error.message });
    }
  });

  app.post("/api/users/sync", async (req, res) => {
    try {
      const { id, email, name, role } = req.body;
      if (!id || !email) {
        return res.status(400).json({ error: "id and email are required" });
      }
      
      // Check if user already exists by ID - preserve their existing role from database
      let existingUser = await storage.getUser(id);
      if (existingUser) {
        // User exists - return their data with the role from database (not from Supabase Auth)
        res.json(existingUser);
        return;
      }
      
      // Check by email as well (user might have different ID in database)
      existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        // Update the user ID to match Supabase Auth ID, but keep the role
        const updatedUser = await storage.updateUser(existingUser.id, { 
          name: name || existingUser.name 
        });
        res.json(updatedUser || existingUser);
        return;
      }
      
      // New user - create with role from Supabase Auth or default to condômino
      const user = await storage.upsertUser({
        id,
        email,
        name: name || email.split("@")[0],
        role: role || "condômino",
        unit: null,
        isActive: true,
      });
      res.json(user);
    } catch (error: any) {
      console.error("User sync error:", error);
      res.status(500).json({ error: "Failed to sync user", details: error.message });
    }
  });

  app.patch("/api/users/:id", async (req, res) => {
    try {
      const { password, ...userData } = req.body;
      const validatedData = updateUserSchema.parse(userData);
      
      // Update user data in local database
      const user = await storage.updateUser(req.params.id, validatedData);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // If password is provided, update in Supabase Auth
      if (password && password.length >= 6) {
        const { supabaseAdmin, isSupabaseAdminConfigured } = await import("./supabase");
        if (isSupabaseAdminConfigured && supabaseAdmin) {
          try {
            // First try to create user in Supabase Auth (will fail if exists)
            const { data: newAuthUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
              email: user.email,
              password,
              email_confirm: true,
            });
            
            if (createError && createError.message.includes("already been registered")) {
              // User exists, need to update password - get user list with filter
              const { data: { users: authUsers }, error: listError } = await supabaseAdmin.auth.admin.listUsers({
                filter: { email: user.email },
                page: 1,
                perPage: 1
              } as any);
              
              if (!listError && authUsers && authUsers.length > 0) {
                const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
                  authUsers[0].id,
                  { password }
                );
                if (updateError) {
                  console.error("Failed to update password in Supabase Auth:", updateError.message);
                }
              }
            } else if (createError) {
              console.error("Failed to create user in Supabase Auth:", createError.message);
            }
          } catch (authError: any) {
            console.error("Supabase Auth error:", authError.message);
          }
        }
      }
      
      res.json(user);
    } catch (error: any) {
      res.status(400).json({ error: "Failed to update user", details: error.message });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteUser(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "User not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  app.get("/api/equipment", async (req, res) => {
    try {
      const condominiumId = req.condominiumContext?.condominiumId || undefined;
      const equipment = await storage.getEquipment(condominiumId);
      res.json(equipment);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch equipment" });
    }
  });

  app.get("/api/equipment/:id", async (req, res) => {
    try {
      const equipment = await storage.getEquipmentById(req.params.id);
      if (!equipment) {
        return res.status(404).json({ error: "Equipment not found" });
      }
      res.json(equipment);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch equipment" });
    }
  });

  app.post("/api/equipment", async (req, res) => {
    try {
      const validatedData = insertEquipmentSchema.parse(req.body);
      const equipment = await storage.createEquipment(validatedData);
      res.status(201).json(equipment);
    } catch (error: any) {
      console.error("Equipment validation error:", error.message || error);
      res.status(400).json({ error: "Invalid equipment data", details: error.message });
    }
  });

  app.patch("/api/equipment/:id", async (req, res) => {
    try {
      console.log("[equipment] Updating equipment:", req.params.id, JSON.stringify(req.body));
      const equipment = await storage.updateEquipment(req.params.id, req.body);
      if (!equipment) {
        return res.status(404).json({ error: "Equipment not found" });
      }
      res.json(equipment);
    } catch (error: any) {
      console.error("[equipment] Failed to update:", error.message || error);
      res.status(400).json({ error: error.message || "Failed to update equipment" });
    }
  });

  app.delete("/api/equipment/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteEquipment(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Equipment not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete equipment" });
    }
  });

  app.get("/api/maintenance", async (req, res) => {
    try {
      const condominiumId = req.condominiumContext?.condominiumId || undefined;
      const requests = await storage.getMaintenanceRequests(condominiumId);
      res.json(requests);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch maintenance requests" });
    }
  });

  app.get("/api/maintenance/:id", async (req, res) => {
    try {
      const request = await storage.getMaintenanceRequestById(req.params.id);
      if (!request) {
        return res.status(404).json({ error: "Maintenance request not found" });
      }
      res.json(request);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch maintenance request" });
    }
  });

  app.post("/api/maintenance", async (req, res) => {
    try {
      console.log("[maintenance] Creating request with data:", JSON.stringify(req.body));
      const validatedData = insertMaintenanceRequestSchema.parse(req.body);
      console.log("[maintenance] Validated data:", JSON.stringify(validatedData));
      const request = await storage.createMaintenanceRequest(validatedData);
      console.log("[maintenance] Created request:", JSON.stringify(request));
      res.status(201).json(request);
    } catch (error) {
      console.error("[maintenance] Error creating request:", error);
      res.status(400).json({ error: "Invalid maintenance request data", details: String(error) });
    }
  });

  app.patch("/api/maintenance/:id", async (req, res) => {
    try {
      // Validate that only allowed fields are updated (status only for now)
      const allowedFields = ["status"];
      const updateData: Record<string, any> = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      }
      
      // Validate status value if provided
      if (updateData.status && !["aberto", "em andamento", "concluído"].includes(updateData.status)) {
        return res.status(400).json({ error: "Invalid status value" });
      }
      
      // Get existing request to check if status is changing
      const existingRequest = await storage.getMaintenanceRequestById(req.params.id);
      if (!existingRequest) {
        return res.status(404).json({ error: "Maintenance request not found" });
      }
      
      const oldStatus = existingRequest.status;
      const request = await storage.updateMaintenanceRequest(req.params.id, updateData);
      if (!request) {
        return res.status(404).json({ error: "Maintenance request not found" });
      }
      
      // If status changed and there's a requester, notify them
      if (updateData.status && updateData.status !== oldStatus && request.requestedBy) {
        const statusLabels: Record<string, string> = {
          "aberto": "Chamado Aberto",
          "em andamento": "Em Andamento",
          "concluído": "Concluído"
        };
        const statusLabel = statusLabels[updateData.status] || updateData.status;
        
        const notification = await storage.createNotification({
          userId: request.requestedBy,
          condominiumId: request.condominiumId,
          type: "maintenance_update",
          title: `Chamado Atualizado: ${statusLabel}`,
          message: `Seu chamado "${request.title}" foi atualizado para "${statusLabel}".`,
          relatedId: request.id,
          isRead: false,
        });
        
        // Send via WebSocket
        if (notification) {
          sendNotificationToUser(request.requestedBy, notification);
        }
      }
      
      res.json(request);
    } catch (error) {
      console.error("Error updating maintenance request:", error);
      res.status(400).json({ error: "Failed to update maintenance request" });
    }
  });

  app.delete("/api/maintenance/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteMaintenanceRequest(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Maintenance request not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete maintenance request" });
    }
  });

  app.get("/api/maintenance-completions", async (req, res) => {
    try {
      const condominiumId = req.condominiumContext?.condominiumId || undefined;
      const completions = await storage.getMaintenanceCompletions(condominiumId);
      res.json(completions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch maintenance completions" });
    }
  });

  app.get("/api/maintenance-completions/equipment/:equipmentId", async (req, res) => {
    try {
      const completions = await storage.getMaintenanceCompletionsByEquipmentId(req.params.equipmentId);
      res.json(completions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch maintenance completions" });
    }
  });

  app.post("/api/maintenance-completions", async (req, res) => {
    try {
      const validatedData = insertMaintenanceCompletionSchema.parse(req.body);
      const dataWithDate = {
        ...validatedData,
        completedAt: validatedData.completedAt instanceof Date 
          ? validatedData.completedAt 
          : new Date(validatedData.completedAt as any),
      };
      const completion = await storage.createMaintenanceCompletion(dataWithDate);
      res.status(201).json(completion);
    } catch (error) {
      console.error("Error creating maintenance completion:", error);
      res.status(400).json({ error: "Invalid maintenance completion data" });
    }
  });

  app.delete("/api/maintenance-completions/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteMaintenanceCompletion(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Maintenance completion not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete maintenance completion" });
    }
  });

  app.get("/api/pool", async (req, res) => {
    try {
      const condominiumId = req.condominiumContext?.condominiumId || undefined;
      const readings = await storage.getPoolReadings(condominiumId);
      res.json(readings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch pool readings" });
    }
  });

  app.post("/api/pool", async (req, res) => {
    try {
      console.log("Pool reading request body:", JSON.stringify(req.body));
      const validatedData = insertPoolReadingSchema.parse(req.body);
      console.log("Validated pool data:", JSON.stringify(validatedData));
      const reading = await storage.createPoolReading(validatedData);
      res.status(201).json(reading);
    } catch (error: any) {
      console.error("Error creating pool reading:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid pool reading data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create pool reading", details: error?.message || String(error) });
    }
  });

  app.get("/api/reservoirs", async (req, res) => {
    try {
      const condominiumId = req.condominiumContext?.condominiumId || undefined;
      const reservoirs = await storage.getReservoirs(condominiumId);
      res.json(reservoirs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reservoirs" });
    }
  });

  app.get("/api/reservoirs/:id", async (req, res) => {
    try {
      const reservoir = await storage.getReservoirById(req.params.id);
      if (!reservoir) {
        return res.status(404).json({ error: "Reservoir not found" });
      }
      res.json(reservoir);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reservoir" });
    }
  });

  app.post("/api/reservoirs", async (req, res) => {
    try {
      const validatedData = insertReservoirSchema.parse(req.body);
      const reservoir = await storage.createReservoir(validatedData);
      res.status(201).json(reservoir);
    } catch (error: any) {
      res.status(400).json({ error: "Invalid reservoir data", details: error.message });
    }
  });

  app.patch("/api/reservoirs/:id", async (req, res) => {
    try {
      const reservoir = await storage.updateReservoir(req.params.id, req.body);
      if (!reservoir) {
        return res.status(404).json({ error: "Reservoir not found" });
      }
      res.json(reservoir);
    } catch (error) {
      res.status(400).json({ error: "Failed to update reservoir" });
    }
  });

  app.delete("/api/reservoirs/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteReservoir(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Reservoir not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete reservoir" });
    }
  });

  app.get("/api/water", async (req, res) => {
    try {
      const condominiumId = req.condominiumContext?.condominiumId || undefined;
      const readings = await storage.getWaterReadings(condominiumId);
      res.json(readings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch water readings" });
    }
  });

  app.post("/api/water", async (req, res) => {
    try {
      console.log("Water reading request body:", JSON.stringify(req.body));
      const validatedData = insertWaterReadingSchema.parse(req.body);
      const reading = await storage.createWaterReading(validatedData);
      res.status(201).json(reading);
    } catch (error: any) {
      console.error("Water reading validation error:", error?.message || error);
      res.status(400).json({ error: "Invalid water reading data", details: error?.message });
    }
  });

  // Hydrometer readings routes
  app.get("/api/hydrometer", async (req, res) => {
    try {
      const condominiumId = req.condominiumContext?.condominiumId || undefined;
      const readings = await storage.getHydrometerReadings(condominiumId);
      res.json(readings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch hydrometer readings" });
    }
  });

  app.post("/api/hydrometer", async (req, res) => {
    try {
      const validatedData = insertHydrometerReadingSchema.parse(req.body);
      const reading = await storage.createHydrometerReading(validatedData);
      res.status(201).json(reading);
    } catch (error: any) {
      console.error("Hydrometer reading validation error:", error?.message || error);
      res.status(400).json({ error: "Invalid hydrometer reading data", details: error?.message });
    }
  });

  app.patch("/api/hydrometer/:id", async (req, res) => {
    try {
      const reading = await storage.updateHydrometerReading(req.params.id, req.body);
      if (!reading) {
        return res.status(404).json({ error: "Hydrometer reading not found" });
      }
      res.json(reading);
    } catch (error) {
      res.status(400).json({ error: "Failed to update hydrometer reading" });
    }
  });

  app.delete("/api/hydrometer/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteHydrometerReading(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Hydrometer reading not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete hydrometer reading" });
    }
  });

  app.get("/api/gas", async (req, res) => {
    try {
      const condominiumId = req.condominiumContext?.condominiumId || undefined;
      const readings = await storage.getGasReadings(condominiumId);
      res.json(readings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch gas readings" });
    }
  });

  app.post("/api/gas", async (req, res) => {
    try {
      console.log("Gas reading request body:", JSON.stringify(req.body));
      const validatedData = insertGasReadingSchema.parse(req.body);
      const reading = await storage.createGasReading(validatedData);
      res.status(201).json(reading);
    } catch (error) {
      console.error("Gas reading validation error:", error);
      res.status(400).json({ error: "Invalid gas reading data", details: String(error) });
    }
  });

  app.get("/api/energy", async (req, res) => {
    try {
      const condominiumId = req.condominiumContext?.condominiumId || undefined;
      const events = await storage.getEnergyEvents(condominiumId);
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch energy events" });
    }
  });

  app.post("/api/energy", async (req, res) => {
    try {
      const validatedData = insertEnergyEventSchema.parse(req.body);
      const event = await storage.createEnergyEvent(validatedData);
      res.status(201).json(event);
    } catch (error) {
      res.status(400).json({ error: "Invalid energy event data" });
    }
  });

  app.patch("/api/energy/:id", async (req, res) => {
    try {
      const event = await storage.updateEnergyEvent(req.params.id, req.body);
      if (!event) {
        return res.status(404).json({ error: "Energy event not found" });
      }
      res.json(event);
    } catch (error) {
      res.status(400).json({ error: "Failed to update energy event" });
    }
  });

  app.get("/api/occupancy", async (req, res) => {
    try {
      const condominiumId = req.condominiumContext?.condominiumId || undefined;
      const data = await storage.getOccupancyData(condominiumId);
      res.json(data || {});
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch occupancy data" });
    }
  });

  app.put("/api/occupancy", async (req, res) => {
    try {
      const validatedData = insertOccupancyDataSchema.parse(req.body);
      const data = await storage.updateOccupancyData(validatedData);
      res.json(data);
    } catch (error) {
      res.status(400).json({ error: "Invalid occupancy data" });
    }
  });

  app.get("/api/documents", async (req, res) => {
    try {
      const condominiumId = req.condominiumContext?.condominiumId || undefined;
      const documents = await storage.getDocuments(condominiumId);
      res.json(documents);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  app.get("/api/documents/:id", async (req, res) => {
    try {
      const document = await storage.getDocumentById(req.params.id);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }
      res.json(document);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch document" });
    }
  });

  app.post("/api/documents", async (req, res) => {
    try {
      const validatedData = insertDocumentSchema.parse(req.body);
      const document = await storage.createDocument(validatedData);
      res.status(201).json(document);
    } catch (error) {
      res.status(400).json({ error: "Invalid document data" });
    }
  });

  app.patch("/api/documents/:id", async (req, res) => {
    try {
      const document = await storage.updateDocument(req.params.id, req.body);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }
      res.json(document);
    } catch (error) {
      res.status(400).json({ error: "Failed to update document" });
    }
  });

  app.delete("/api/documents/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteDocument(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Document not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete document" });
    }
  });

  app.get("/api/suppliers", async (req, res) => {
    try {
      const condominiumId = req.condominiumContext?.condominiumId || undefined;
      const suppliers = await storage.getSuppliers(condominiumId);
      res.json(suppliers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch suppliers" });
    }
  });

  app.get("/api/suppliers/:id", async (req, res) => {
    try {
      const supplier = await storage.getSupplierById(req.params.id);
      if (!supplier) {
        return res.status(404).json({ error: "Supplier not found" });
      }
      res.json(supplier);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch supplier" });
    }
  });

  app.post("/api/suppliers", async (req, res) => {
    try {
      console.log("[SUPPLIER_CREATE_V2] Body received:", JSON.stringify(req.body));
      const { name, category, condominiumId, icon, phone, whatsapp, email, address, notes } = req.body;
      
      // Basic validation - only name and category are required
      if (!name || typeof name !== 'string' || name.trim() === '') {
        console.log("[SUPPLIER_CREATE_V2] Missing name");
        return res.status(400).json({ error: "Nome é obrigatório" });
      }
      if (!category || typeof category !== 'string' || category.trim() === '') {
        console.log("[SUPPLIER_CREATE_V2] Missing category");
        return res.status(400).json({ error: "Categoria é obrigatória" });
      }
      if (!condominiumId || typeof condominiumId !== 'string') {
        console.log("[SUPPLIER_CREATE_V2] Missing condominiumId");
        return res.status(400).json({ error: "Condomínio é obrigatório" });
      }
      
      // Build data object, converting empty strings to null
      const supplierData = {
        name: name.trim(),
        category: category.trim(),
        condominiumId,
        icon: icon && icon.trim() !== '' ? icon.trim() : null,
        phone: phone && phone.trim() !== '' ? phone.trim() : null,
        whatsapp: whatsapp && whatsapp.trim() !== '' ? whatsapp.trim() : null,
        email: email && email.trim() !== '' ? email.trim() : null,
        address: address && address.trim() !== '' ? address.trim() : null,
        notes: notes && notes.trim() !== '' ? notes.trim() : null,
      };
      
      const supplier = await storage.createSupplier(supplierData);
      res.status(201).json(supplier);
    } catch (error: any) {
      console.error("[Supplier POST] Error:", error.message);
      res.status(500).json({ error: "Erro ao criar fornecedor", details: error.message });
    }
  });

  app.patch("/api/suppliers/:id", async (req, res) => {
    try {
      const supplier = await storage.updateSupplier(req.params.id, req.body);
      if (!supplier) {
        return res.status(404).json({ error: "Supplier not found" });
      }
      res.json(supplier);
    } catch (error) {
      res.status(400).json({ error: "Failed to update supplier" });
    }
  });

  app.delete("/api/suppliers/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteSupplier(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Supplier not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete supplier" });
    }
  });

  app.get("/api/announcements", async (req, res) => {
    try {
      const condominiumId = req.condominiumContext?.condominiumId || undefined;
      const announcements = await storage.getAnnouncements(condominiumId);
      res.json(announcements);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch announcements" });
    }
  });

  app.get("/api/announcements/:id", async (req, res) => {
    try {
      const announcement = await storage.getAnnouncementById(req.params.id);
      if (!announcement) {
        return res.status(404).json({ error: "Announcement not found" });
      }
      res.json(announcement);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch announcement" });
    }
  });

  app.post("/api/announcements", async (req, res) => {
    try {
      const validatedData = insertAnnouncementSchema.parse(req.body);
      const announcement = await storage.createAnnouncement(validatedData);
      
      // Create notifications for all users about the new announcement
      try {
        const notifications = await storage.createNotificationsForAllUsers({
          condominiumId: announcement.condominiumId,
          type: "announcement_new",
          title: "Novo Comunicado",
          message: announcement.title,
          relatedId: announcement.id,
          isRead: false,
        }, validatedData.createdBy || undefined);
        
        // Broadcast via WebSocket
        notifications.forEach((notif) => {
          sendNotificationToUser(notif.userId, notif);
        });
        
        // Send push notifications
        notifyNewAnnouncement(
          { id: announcement.id, title: announcement.title, content: announcement.content, priority: announcement.priority },
          announcement.condominiumId,
          validatedData.createdBy || undefined
        ).catch(e => console.error("Push notification error:", e));
      } catch (notifError) {
        console.error("Error creating notifications:", notifError);
      }
      
      res.status(201).json(announcement);
    } catch (error) {
      res.status(400).json({ error: "Invalid announcement data" });
    }
  });

  app.patch("/api/announcements/:id", async (req, res) => {
    try {
      const announcement = await storage.updateAnnouncement(req.params.id, req.body);
      if (!announcement) {
        return res.status(404).json({ error: "Announcement not found" });
      }
      
      // Create notifications for all users about the updated announcement
      try {
        const notifications = await storage.createNotificationsForAllUsers({
          condominiumId: announcement.condominiumId,
          type: "announcement_updated",
          title: "Comunicado Atualizado",
          message: announcement.title,
          relatedId: announcement.id,
          isRead: false,
        });
        
        // Broadcast via WebSocket
        notifications.forEach((notif) => {
          sendNotificationToUser(notif.userId, notif);
        });
      } catch (notifError) {
        console.error("Error creating notifications:", notifError);
      }
      
      res.json(announcement);
    } catch (error) {
      res.status(400).json({ error: "Failed to update announcement" });
    }
  });

  app.delete("/api/announcements/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteAnnouncement(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Announcement not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete announcement" });
    }
  });

  // Notifications routes
  app.get("/api/notifications/:userId", async (req, res) => {
    try {
      const notifications = await storage.getNotifications(req.params.userId);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.get("/api/notifications/:userId/unread", async (req, res) => {
    try {
      const notifications = await storage.getUnreadNotifications(req.params.userId);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching unread notifications:", error);
      res.status(500).json({ error: "Failed to fetch unread notifications" });
    }
  });

  app.patch("/api/notifications/:id/read", async (req, res) => {
    try {
      const success = await storage.markNotificationAsRead(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Notification not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });

  app.patch("/api/notifications/:userId/read-all", async (req, res) => {
    try {
      await storage.markAllNotificationsAsRead(req.params.userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to mark all notifications as read" });
    }
  });

  // Push notification routes
  initializePushNotifications();

  app.get("/api/push/vapid-public-key", (req, res) => {
    if (!isPushConfigured()) {
      return res.status(503).json({ error: "Push notifications not configured" });
    }
    res.json({ publicKey: getVapidPublicKey() });
  });

  app.get("/api/push/subscriptions", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const subscriptions = await storage.getPushSubscriptions(userId);
      res.json(subscriptions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch push subscriptions" });
    }
  });

  app.post("/api/push/subscribe", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { subscription, condominiumId } = req.body;
      if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
        return res.status(400).json({ error: "Invalid subscription data" });
      }

      const existing = await storage.getPushSubscriptionByEndpoint(subscription.endpoint);
      if (existing) {
        const updated = await storage.updatePushSubscription(existing.id, {
          userId,
          condominiumId: condominiumId || null,
          isEnabled: true,
        });
        return res.json(updated);
      }

      const newSubscription = await storage.createPushSubscription({
        userId,
        condominiumId: condominiumId || null,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent: req.headers["user-agent"] || null,
        isEnabled: true,
      });
      res.status(201).json(newSubscription);
    } catch (error) {
      console.error("Error creating push subscription:", error);
      res.status(500).json({ error: "Failed to create push subscription" });
    }
  });

  app.delete("/api/push/unsubscribe", async (req, res) => {
    try {
      const { endpoint } = req.body;
      if (!endpoint) {
        return res.status(400).json({ error: "Endpoint is required" });
      }
      await storage.deletePushSubscriptionByEndpoint(endpoint);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete push subscription" });
    }
  });

  // Notification preferences routes
  app.get("/api/notification-preferences", async (req, res) => {
    try {
      const userId = getUserId(req);
      const condominiumId = getCondominiumId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const preferences = await storage.getNotificationPreferences(userId, condominiumId);
      if (!preferences) {
        return res.json({
          announcements: true,
          maintenanceUpdates: true,
          urgentMessages: true,
          quietHoursStart: null,
          quietHoursEnd: null,
        });
      }
      res.json(preferences);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch notification preferences" });
    }
  });

  app.put("/api/notification-preferences", async (req, res) => {
    try {
      const userId = getUserId(req);
      const condominiumId = getCondominiumId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const preferences = await storage.upsertNotificationPreference(userId, condominiumId, req.body);
      res.json(preferences);
    } catch (error) {
      console.error("Error updating notification preferences:", error);
      res.status(500).json({ error: "Failed to update notification preferences" });
    }
  });

  // Module Permissions routes
  app.get("/api/module-permissions", async (req, res) => {
    try {
      const permissions = await storage.getModulePermissions();
      res.json(permissions);
    } catch (error) {
      console.error("Error fetching module permissions:", error);
      res.status(500).json({ error: "Failed to fetch module permissions" });
    }
  });

  // SECURITY NOTE: This endpoint validates user role but relies on client-provided userId.
  // For production, implement JWT token verification middleware using Supabase auth.
  // The frontend guard in FeatureAccess page provides additional protection.
  app.patch("/api/module-permissions/:moduleKey", async (req, res) => {
    try {
      const { isEnabled, updatedBy, userEmail } = req.body;
      
      if (!updatedBy && !userEmail) {
        return res.status(401).json({ error: "User ID or email required" });
      }
      
      // Verify user exists and has admin/síndico role
      // Try by ID first, then by email (IDs may differ between Supabase Auth and DB)
      let user = await storage.getUser(updatedBy);
      if (!user && userEmail) {
        user = await storage.getUserByEmail(userEmail);
      }
      
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      if (user.role !== "síndico" && user.role !== "admin") {
        return res.status(403).json({ error: "Only síndico or admin can update module permissions" });
      }
      
      if (typeof isEnabled !== "boolean") {
        return res.status(400).json({ error: "isEnabled must be a boolean" });
      }
      const permission = await storage.updateModulePermission(
        req.params.moduleKey,
        isEnabled,
        user.id
      );
      if (!permission) {
        return res.status(404).json({ error: "Module permission not found" });
      }
      res.json(permission);
    } catch (error) {
      console.error("Error updating module permission:", error);
      res.status(500).json({ error: "Failed to update module permission" });
    }
  });

  // Waste Config routes
  app.get("/api/waste-config", async (req, res) => {
    try {
      const config = await storage.getWasteConfig();
      res.json(config || null);
    } catch (error) {
      console.error("Error fetching waste config:", error);
      res.status(500).json({ error: "Failed to fetch waste config" });
    }
  });

  app.patch("/api/waste-config", async (req, res) => {
    try {
      const { updatedBy, userEmail, schedule, organicItems, recyclableCategories, notRecyclable, collectionTime } = req.body;
      
      if (!updatedBy && !userEmail) {
        return res.status(401).json({ error: "User ID or email required" });
      }
      
      let user = await storage.getUser(updatedBy);
      if (!user && userEmail) {
        user = await storage.getUserByEmail(userEmail);
      }
      
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      if (user.role !== "síndico" && user.role !== "admin") {
        return res.status(403).json({ error: "Only síndico or admin can update waste config" });
      }
      
      const configUpdate: Record<string, string | null> = { updatedBy: user.id };
      
      if (schedule !== undefined) {
        try {
          const parsed = JSON.parse(schedule);
          if (!Array.isArray(parsed)) throw new Error("Schedule must be an array");
          configUpdate.schedule = schedule;
        } catch {
          return res.status(400).json({ error: "Invalid schedule format" });
        }
      }
      
      if (organicItems !== undefined) {
        try {
          const parsed = JSON.parse(organicItems);
          if (!Array.isArray(parsed)) throw new Error("Organic items must be an array");
          configUpdate.organicItems = organicItems;
        } catch {
          return res.status(400).json({ error: "Invalid organic items format" });
        }
      }
      
      if (recyclableCategories !== undefined) {
        try {
          const parsed = JSON.parse(recyclableCategories);
          if (!Array.isArray(parsed)) throw new Error("Recyclable categories must be an array");
          configUpdate.recyclableCategories = recyclableCategories;
        } catch {
          return res.status(400).json({ error: "Invalid recyclable categories format" });
        }
      }
      
      if (notRecyclable !== undefined) {
        try {
          const parsed = JSON.parse(notRecyclable);
          if (!Array.isArray(parsed)) throw new Error("Not recyclable must be an array");
          configUpdate.notRecyclable = notRecyclable;
        } catch {
          return res.status(400).json({ error: "Invalid not recyclable format" });
        }
      }
      
      if (collectionTime !== undefined) {
        configUpdate.collectionTime = collectionTime;
      }
      
      const config = await storage.updateWasteConfig(configUpdate as any);
      res.json(config);
    } catch (error) {
      console.error("Error updating waste config:", error);
      res.status(500).json({ error: "Failed to update waste config" });
    }
  });

  app.get("/api/security-devices", async (req, res) => {
    try {
      const devices = await storage.getSecurityDevices();
      res.json(devices);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch security devices" });
    }
  });

  app.get("/api/security-devices/:id", async (req, res) => {
    try {
      const device = await storage.getSecurityDeviceById(req.params.id);
      if (!device) {
        return res.status(404).json({ error: "Security device not found" });
      }
      res.json(device);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch security device" });
    }
  });

  app.post("/api/security-devices", async (req, res) => {
    try {
      const validatedData = insertSecurityDeviceSchema.parse(req.body);
      const device = await storage.createSecurityDevice(validatedData);
      res.status(201).json(device);
    } catch (error) {
      res.status(400).json({ error: "Invalid security device data" });
    }
  });

  app.patch("/api/security-devices/:id", async (req, res) => {
    try {
      const device = await storage.updateSecurityDevice(req.params.id, req.body);
      if (!device) {
        return res.status(404).json({ error: "Security device not found" });
      }
      res.json(device);
    } catch (error) {
      res.status(400).json({ error: "Failed to update security device" });
    }
  });

  app.delete("/api/security-devices/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteSecurityDevice(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Security device not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete security device" });
    }
  });

  app.get("/api/security-events", async (req, res) => {
    try {
      const events = await storage.getSecurityEvents();
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch security events" });
    }
  });

  app.get("/api/security-events/device/:deviceId", async (req, res) => {
    try {
      const events = await storage.getSecurityEventsByDeviceId(req.params.deviceId);
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch security events" });
    }
  });

  app.post("/api/security-events", async (req, res) => {
    try {
      const validatedData = insertSecurityEventSchema.parse(req.body);
      const event = await storage.createSecurityEvent(validatedData);
      res.status(201).json(event);
    } catch (error) {
      res.status(400).json({ error: "Invalid security event data" });
    }
  });

  app.patch("/api/security-events/:id", async (req, res) => {
    try {
      const event = await storage.updateSecurityEvent(req.params.id, req.body);
      if (!event) {
        return res.status(404).json({ error: "Security event not found" });
      }
      res.json(event);
    } catch (error) {
      res.status(400).json({ error: "Failed to update security event" });
    }
  });

  // ===========================
  // PREVENTIVE MAINTENANCE - ASSETS
  // ===========================
  app.get("/api/preventive-assets", async (req, res) => {
    try {
      const assets = await storage.getPreventiveAssets();
      res.json(assets);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/preventive-assets/:id", async (req, res) => {
    try {
      const asset = await storage.getPreventiveAssetById(req.params.id);
      if (!asset) {
        return res.status(404).json({ error: "Ativo não encontrado" });
      }
      res.json(asset);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/preventive-assets", async (req, res) => {
    try {
      const validatedData = insertPreventiveAssetSchema.parse(req.body);
      const asset = await storage.createPreventiveAsset(validatedData);
      res.status(201).json(asset);
    } catch (error: any) {
      res.status(400).json({ error: "Dados inválidos", details: error.message });
    }
  });

  app.patch("/api/preventive-assets/:id", async (req, res) => {
    try {
      const asset = await storage.updatePreventiveAsset(req.params.id, req.body);
      if (!asset) {
        return res.status(404).json({ error: "Ativo não encontrado" });
      }
      res.json(asset);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/preventive-assets/:id", async (req, res) => {
    try {
      await storage.deletePreventiveAsset(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===========================
  // PREVENTIVE MAINTENANCE - PLANS
  // ===========================
  app.get("/api/maintenance-plans", async (req, res) => {
    try {
      const plans = await storage.getMaintenancePlans();
      res.json(plans);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/maintenance-plans/:id", async (req, res) => {
    try {
      const plan = await storage.getMaintenancePlanById(req.params.id);
      if (!plan) {
        return res.status(404).json({ error: "Plano não encontrado" });
      }
      res.json(plan);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/maintenance-plans/asset/:assetId", async (req, res) => {
    try {
      const plans = await storage.getMaintenancePlansByAssetId(req.params.assetId);
      res.json(plans);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/maintenance-plans", async (req, res) => {
    try {
      const validatedData = insertMaintenancePlanSchema.parse(req.body);
      const plan = await storage.createMaintenancePlan(validatedData);
      res.status(201).json(plan);
    } catch (error: any) {
      res.status(400).json({ error: "Dados inválidos", details: error.message });
    }
  });

  app.patch("/api/maintenance-plans/:id", async (req, res) => {
    try {
      const plan = await storage.updateMaintenancePlan(req.params.id, req.body);
      if (!plan) {
        return res.status(404).json({ error: "Plano não encontrado" });
      }
      res.json(plan);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/maintenance-plans/:id", async (req, res) => {
    try {
      await storage.deleteMaintenancePlan(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===========================
  // PREVENTIVE MAINTENANCE - PLAN CHECKLIST ITEMS
  // ===========================
  app.get("/api/plan-checklist/:planId", async (req, res) => {
    try {
      const items = await storage.getPlanChecklistItems(req.params.planId);
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/plan-checklist", async (req, res) => {
    try {
      const validatedData = insertPlanChecklistItemSchema.parse(req.body);
      const item = await storage.createPlanChecklistItem(validatedData);
      res.status(201).json(item);
    } catch (error: any) {
      res.status(400).json({ error: "Dados inválidos", details: error.message });
    }
  });

  app.patch("/api/plan-checklist/:id", async (req, res) => {
    try {
      const item = await storage.updatePlanChecklistItem(req.params.id, req.body);
      if (!item) {
        return res.status(404).json({ error: "Item não encontrado" });
      }
      res.json(item);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/plan-checklist/:id", async (req, res) => {
    try {
      await storage.deletePlanChecklistItem(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===========================
  // PREVENTIVE MAINTENANCE - EXECUTIONS
  // ===========================
  app.get("/api/maintenance-executions", async (req, res) => {
    try {
      const executions = await storage.getMaintenanceExecutions();
      res.json(executions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/maintenance-executions/:id", async (req, res) => {
    try {
      const execution = await storage.getMaintenanceExecutionById(req.params.id);
      if (!execution) {
        return res.status(404).json({ error: "Execução não encontrada" });
      }
      res.json(execution);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/maintenance-executions/asset/:assetId", async (req, res) => {
    try {
      const executions = await storage.getMaintenanceExecutionsByAssetId(req.params.assetId);
      res.json(executions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/maintenance-executions", async (req, res) => {
    try {
      const validatedData = insertMaintenanceExecutionSchema.parse(req.body);
      const execution = await storage.createMaintenanceExecution(validatedData);
      res.status(201).json(execution);
    } catch (error: any) {
      res.status(400).json({ error: "Dados inválidos", details: error.message });
    }
  });

  app.patch("/api/maintenance-executions/:id", async (req, res) => {
    try {
      const execution = await storage.updateMaintenanceExecution(req.params.id, req.body);
      if (!execution) {
        return res.status(404).json({ error: "Execução não encontrada" });
      }
      res.json(execution);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/maintenance-executions/:id", async (req, res) => {
    try {
      await storage.deleteMaintenanceExecution(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===========================
  // PREVENTIVE MAINTENANCE - EXECUTION CHECKLIST ITEMS
  // ===========================
  app.get("/api/execution-checklist/:executionId", async (req, res) => {
    try {
      const items = await storage.getExecutionChecklistItems(req.params.executionId);
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/execution-checklist", async (req, res) => {
    try {
      const validatedData = insertExecutionChecklistItemSchema.parse(req.body);
      const item = await storage.createExecutionChecklistItem(validatedData);
      res.status(201).json(item);
    } catch (error: any) {
      res.status(400).json({ error: "Dados inválidos", details: error.message });
    }
  });

  app.patch("/api/execution-checklist/:id", async (req, res) => {
    try {
      const item = await storage.updateExecutionChecklistItem(req.params.id, req.body);
      if (!item) {
        return res.status(404).json({ error: "Item não encontrado" });
      }
      res.json(item);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/execution-checklist/:id", async (req, res) => {
    try {
      await storage.deleteExecutionChecklistItem(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===========================
  // PREVENTIVE MAINTENANCE - DOCUMENTS
  // ===========================
  app.get("/api/maintenance-documents/:executionId", async (req, res) => {
    try {
      const docs = await storage.getMaintenanceDocuments(req.params.executionId);
      res.json(docs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/maintenance-documents", async (req, res) => {
    try {
      const validatedData = insertMaintenanceDocumentSchema.parse(req.body);
      const doc = await storage.createMaintenanceDocument(validatedData);
      res.status(201).json(doc);
    } catch (error: any) {
      res.status(400).json({ error: "Dados inválidos", details: error.message });
    }
  });

  app.delete("/api/maintenance-documents/:id", async (req, res) => {
    try {
      await storage.deleteMaintenanceDocument(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===========================
  // IOT DEVICES - EWELINK INTEGRATION
  // ===========================
  
  // Login to eWeLink and get session
  app.post("/api/ewelink/login", async (req, res) => {
    try {
      const { email, password, region = "us" } = req.body;
      console.log(`[eWeLink Route] Login attempt: email=${email}, region=${region}`);
      
      if (!email || !password) {
        return res.status(400).json({ 
          success: false, 
          message: "Email e senha são obrigatórios" 
        });
      }

      const { ewelinkLogin } = await import("./ewelink.service.js");
      const result = await ewelinkLogin(email, password, region);
      console.log(`[eWeLink Route] Login result:`, JSON.stringify(result));
      
      if (result.success && result.sessionKey) {
        const condominiumId = req.condominiumContext?.condominiumId;
        const userId = req.condominiumContext?.userId;
        
        if (condominiumId && userId) {
          try {
            await storage.createIotSession({
              userId,
              condominiumId,
              sessionKey: result.sessionKey,
              platform: "ewelink",
              email,
              region,
              isActive: true,
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            });
          } catch (dbError) {
            console.error("[eWeLink] Error saving session:", dbError);
          }
        }
      }
      
      res.json(result);
    } catch (error: any) {
      console.error("[eWeLink] Login error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Erro interno do servidor" 
      });
    }
  });

  // List eWeLink devices
  app.get("/api/ewelink/devices", async (req, res) => {
    try {
      const sessionKey = req.headers["x-ewelink-session"] as string;
      
      if (!sessionKey) {
        return res.status(401).json({ 
          success: false, 
          message: "Sessão eWeLink não fornecida" 
        });
      }

      const { ewelinkGetDevices } = await import("./ewelink.service.js");
      const result = await ewelinkGetDevices(sessionKey);
      res.json(result);
    } catch (error: any) {
      console.error("[eWeLink] Get devices error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Erro ao listar dispositivos" 
      });
    }
  });

  // Turn device ON
  app.post("/api/ewelink/device/on", async (req, res) => {
    try {
      const sessionKey = req.headers["x-ewelink-session"] as string;
      const { deviceid } = req.body;
      
      if (!sessionKey) {
        return res.status(401).json({ 
          success: false, 
          message: "Sessão eWeLink não fornecida" 
        });
      }
      
      if (!deviceid) {
        return res.status(400).json({ 
          success: false, 
          message: "ID do dispositivo é obrigatório" 
        });
      }

      const { ewelinkControlDevice } = await import("./ewelink.service.js");
      const result = await ewelinkControlDevice(sessionKey, deviceid, "on");
      res.json(result);
    } catch (error: any) {
      console.error("[eWeLink] Device on error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Erro ao ligar dispositivo" 
      });
    }
  });

  // Turn device OFF
  app.post("/api/ewelink/device/off", async (req, res) => {
    try {
      const sessionKey = req.headers["x-ewelink-session"] as string;
      const { deviceid } = req.body;
      
      if (!sessionKey) {
        return res.status(401).json({ 
          success: false, 
          message: "Sessão eWeLink não fornecida" 
        });
      }
      
      if (!deviceid) {
        return res.status(400).json({ 
          success: false, 
          message: "ID do dispositivo é obrigatório" 
        });
      }

      const { ewelinkControlDevice } = await import("./ewelink.service.js");
      const result = await ewelinkControlDevice(sessionKey, deviceid, "off");
      res.json(result);
    } catch (error: any) {
      console.error("[eWeLink] Device off error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Erro ao desligar dispositivo" 
      });
    }
  });

  // Logout from eWeLink
  app.post("/api/ewelink/logout", async (req, res) => {
    try {
      const sessionKey = req.headers["x-ewelink-session"] as string;
      
      if (!sessionKey) {
        return res.json({ success: true, message: "Nenhuma sessão ativa" });
      }

      const { ewelinkLogout } = await import("./ewelink.service.js");
      const result = ewelinkLogout(sessionKey);
      
      const condominiumId = req.condominiumContext?.condominiumId;
      const userId = req.condominiumContext?.userId;
      
      if (condominiumId && userId) {
        try {
          await storage.deleteIotSession(userId, condominiumId, "ewelink");
        } catch (dbError) {
          console.error("[eWeLink] Error removing session:", dbError);
        }
      }
      
      res.json(result);
    } catch (error: any) {
      console.error("[eWeLink] Logout error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Erro ao fazer logout" 
      });
    }
  });

  // Check eWeLink session status
  app.get("/api/ewelink/session", async (req, res) => {
    try {
      const sessionKey = req.headers["x-ewelink-session"] as string;
      
      if (!sessionKey) {
        return res.json({ valid: false });
      }

      const { ewelinkCheckSession } = await import("./ewelink.service.js");
      const valid = ewelinkCheckSession(sessionKey);
      res.json({ valid });
    } catch (error: any) {
      res.json({ valid: false });
    }
  });

  // Get saved IoT sessions for current user/condominium
  app.get("/api/iot/sessions", async (req, res) => {
    try {
      const condominiumId = req.condominiumContext?.condominiumId;
      const userId = req.condominiumContext?.userId;
      
      if (!condominiumId || !userId) {
        return res.status(401).json({ error: "Autenticação necessária" });
      }

      const sessions = await storage.getIotSessions(userId, condominiumId);
      res.json(sessions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get registered IoT devices for condominium
  app.get("/api/iot/devices", async (req, res) => {
    try {
      const condominiumId = req.condominiumContext?.condominiumId;
      
      if (!condominiumId) {
        return res.status(401).json({ error: "Condomínio não selecionado" });
      }

      const devices = await storage.getIotDevices(condominiumId);
      res.json(devices);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Register/save a device to condominium
  app.post("/api/iot/devices", async (req, res) => {
    try {
      const condominiumId = req.condominiumContext?.condominiumId;
      const userId = req.condominiumContext?.userId;
      
      if (!condominiumId) {
        return res.status(401).json({ error: "Condomínio não selecionado" });
      }

      const device = await storage.createIotDevice({
        ...req.body,
        condominiumId,
        createdBy: userId,
      });
      res.status(201).json(device);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Update registered device
  app.patch("/api/iot/devices/:id", async (req, res) => {
    try {
      const device = await storage.updateIotDevice(req.params.id, req.body);
      res.json(device);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Delete registered device
  app.delete("/api/iot/devices/:id", async (req, res) => {
    try {
      await storage.deleteIotDevice(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return httpServer;
}
