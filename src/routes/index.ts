import { Router } from "express";
import { createStorage } from "../../server/supabase-storage";
import { sendNotificationToUser } from "../../server/websocket";
import { optionalJWT, requireAuth } from "../../server/auth-middleware";
import jwt from "jsonwebtoken";
import { 
  condominiumContextMiddleware, 
  getCondominiumId, 
  getUserId, 
  isAdmin,
  requireCondominium,
  requireSindicoOrAdmin 
} from "../../server/condominium-context";
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
  insertSecurityDeviceSchema,
  insertSecurityEventSchema,
  insertPreventiveAssetSchema,
  insertMaintenancePlanSchema,
  insertPlanChecklistItemSchema,
  insertMaintenanceExecutionSchema,
  insertExecutionChecklistItemSchema,
  insertMaintenanceDocumentSchema,
} from "../../shared/schema";

import { z } from "zod";
import { supabase, isSupabaseConfigured } from "../../server/supabase";
import { identificarAdminPlataforma, permitirApenasAdminPlataforma } from "../../server/admin-middleware";

const router = Router();
const storage = createStorage();

export { storage };

const publicPaths = ["/supabase-config", "/supabase-status", "/login"];
const userScopedPaths = ["/condominiums", "/users", "/user-condominiums", "/admin", "/auth"];

router.use(optionalJWT);
router.use(condominiumContextMiddleware);

router.use((req, res, next) => {
  if (publicPaths.some(p => req.path === p || req.path.startsWith(p + "/"))) {
    return next();
  }
  return requireAuth(req, res, next);
});

router.use((req, res, next) => {
  const isPublic = publicPaths.some(p => req.path === p || req.path.startsWith(p + "/"));
  const isUserScoped = userScopedPaths.some(p => req.path === p || req.path.startsWith(p + "/"));
  if (isPublic || isUserScoped) {
    return next();
  }
  return requireCondominium(req, res, next);
});

router.post("/login", async (req, res) => {
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

router.get("/auth/me", async (req, res) => {
  const userId = req.condominiumContext?.userId;
  if (!userId) {
    return res.status(401).json({ error: "Não autenticado" });
  }
  
  try {
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }
    
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    });
  } catch (error: any) {
    console.error("[Auth/Me] Error:", error.message);
    res.status(500).json({ error: "Erro ao buscar usuário" });
  }
});

router.get("/supabase-config", (req, res) => {
  res.json({
    url: process.env.SUPABASE_URL || "",
    anonKey: process.env.SUPABASE_ANON_KEY || "",
  });
});

router.get("/supabase-status", async (req, res) => {
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

router.get("/condominiums", async (req, res) => {
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

router.get("/condominiums/:id", async (req, res) => {
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

router.post(
  "/condominiums",
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

router.patch(
  "/condominiums/:id",
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

router.delete(
  "/condominiums/:id",
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

router.post(
  "/admin/condominios",
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

router.get(
  "/admin/condominios",
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

router.patch(
  "/admin/condominios/:id",
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

router.delete(
  "/admin/condominios/:id",
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

router.get(
  "/admin/usuarios",
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

router.get("/users/:userId/condominiums", async (req, res) => {
  try {
    const userCondominiums = await storage.getUserCondominiums(req.params.userId);
    res.json(userCondominiums);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/condominiums/:condominiumId/users", async (req, res) => {
  try {
    const condominiumUsers = await storage.getCondominiumUsers(req.params.condominiumId);
    res.json(condominiumUsers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/user-condominiums", async (req, res) => {
  try {
    const validatedData = insertUserCondominiumSchema.parse(req.body);
    const userCondominium = await storage.addUserToCondominium(validatedData);
    res.status(201).json(userCondominium);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.patch("/user-condominiums/:id", async (req, res) => {
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

router.delete("/user-condominiums/:userId/:condominiumId", async (req, res) => {
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

router.get("/dashboard", async (req, res) => {
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

router.get("/users", async (req, res) => {
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

router.get("/users/by-email/:email", async (req, res) => {
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

router.get("/users/:id", async (req, res) => {
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

router.post("/users", async (req, res) => {
  try {
    const validatedData = insertUserSchema.parse(req.body);
    const user = await storage.createUser(validatedData);
    res.status(201).json(user);
  } catch (error: any) {
    res.status(400).json({ error: "Invalid user data", details: error.message });
  }
});

router.post("/users/sync", async (req, res) => {
  try {
    const { id, email, name, role } = req.body;
    if (!id || !email) {
      return res.status(400).json({ error: "id and email are required" });
    }
    
    let existingUser = await storage.getUser(id);
    if (existingUser) {
      res.json(existingUser);
      return;
    }
    
    existingUser = await storage.getUserByEmail(email);
    if (existingUser) {
      const updatedUser = await storage.updateUser(existingUser.id, { 
        name: name || existingUser.name 
      });
      res.json(updatedUser || existingUser);
      return;
    }
    
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

router.patch("/users/:id", async (req, res) => {
  try {
    const validatedData = updateUserSchema.parse(req.body);
    const user = await storage.updateUser(req.params.id, validatedData);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  } catch (error: any) {
    res.status(400).json({ error: "Failed to update user", details: error.message });
  }
});

router.delete("/users/:id", async (req, res) => {
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

router.get("/equipment", async (req, res) => {
  try {
    const condominiumId = req.condominiumContext?.condominiumId || undefined;
    const equipment = await storage.getEquipment(condominiumId);
    res.json(equipment);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch equipment" });
  }
});

router.get("/equipment/:id", async (req, res) => {
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

router.post("/equipment", async (req, res) => {
  try {
    const validatedData = insertEquipmentSchema.parse(req.body);
    const equipment = await storage.createEquipment(validatedData);
    res.status(201).json(equipment);
  } catch (error: any) {
    console.error("Equipment validation error:", error.message || error);
    res.status(400).json({ error: "Invalid equipment data", details: error.message });
  }
});

router.patch("/equipment/:id", async (req, res) => {
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

router.delete("/equipment/:id", async (req, res) => {
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

router.get("/maintenance", async (req, res) => {
  try {
    const condominiumId = req.condominiumContext?.condominiumId || undefined;
    const requests = await storage.getMaintenanceRequests(condominiumId);
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch maintenance requests" });
  }
});

router.get("/maintenance/:id", async (req, res) => {
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

router.post("/maintenance", async (req, res) => {
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

router.patch("/maintenance/:id", async (req, res) => {
  try {
    const allowedFields = ["status"];
    const updateData: Record<string, any> = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }
    
    if (updateData.status && !["pendente", "em andamento", "concluído"].includes(updateData.status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }
    
    const request = await storage.updateMaintenanceRequest(req.params.id, updateData);
    if (!request) {
      return res.status(404).json({ error: "Maintenance request not found" });
    }
    
    try {
      if (updateData.status && request.requestedBy) {
        const statusMessages: Record<string, string> = {
          "em andamento": "Sua solicitação está em andamento",
          "concluído": "Sua solicitação foi concluída"
        };
        
        if (statusMessages[updateData.status]) {
          const notification = await storage.createNotification({
            userId: request.requestedBy,
            condominiumId: request.condominiumId,
            type: "maintenance_update",
            title: "Atualização de Manutenção",
            message: statusMessages[updateData.status],
            relatedId: request.id,
            isRead: false,
          });
          
          sendNotificationToUser(request.requestedBy, notification);
        }
      }
    } catch (notifError) {
      console.error("Error creating maintenance notification:", notifError);
    }
    
    res.json(request);
  } catch (error) {
    res.status(400).json({ error: "Failed to update maintenance request" });
  }
});

router.delete("/maintenance/:id", async (req, res) => {
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

router.post("/maintenance/:id/complete", async (req, res) => {
  try {
    const validatedData = insertMaintenanceCompletionSchema.parse({
      ...req.body,
      maintenanceRequestId: req.params.id,
    });
    const completion = await storage.createMaintenanceCompletion(validatedData);
    
    await storage.updateMaintenanceRequest(req.params.id, { status: "concluído" });
    
    res.status(201).json(completion);
  } catch (error: any) {
    console.error("[maintenance] Error completing request:", error);
    res.status(400).json({ error: "Invalid completion data", details: error.message });
  }
});

router.get("/maintenance/:id/completion", async (req, res) => {
  try {
    const completions = await storage.getMaintenanceCompletionsByEquipmentId(req.params.id);
    const completion = completions[0];
    if (!completion) {
      return res.status(404).json({ error: "Completion not found" });
    }
    res.json(completion);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch completion" });
  }
});

router.get("/pool", async (req, res) => {
  try {
    const condominiumId = req.condominiumContext?.condominiumId || undefined;
    const readings = await storage.getPoolReadings(condominiumId);
    res.json(readings);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch pool readings" });
  }
});

router.get("/pool/:id", async (req, res) => {
  try {
    const readings = await storage.getPoolReadings();
    const reading = readings.find(r => r.id === req.params.id);
    if (!reading) {
      return res.status(404).json({ error: "Pool reading not found" });
    }
    res.json(reading);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch pool reading" });
  }
});

router.post("/pool", async (req, res) => {
  try {
    const validatedData = insertPoolReadingSchema.parse(req.body);
    const reading = await storage.createPoolReading(validatedData);
    res.status(201).json(reading);
  } catch (error) {
    res.status(400).json({ error: "Invalid pool reading data" });
  }
});


router.get("/reservoirs", async (req, res) => {
  try {
    const condominiumId = req.condominiumContext?.condominiumId || undefined;
    const reservoirs = await storage.getReservoirs(condominiumId);
    res.json(reservoirs);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch reservoirs" });
  }
});

router.get("/reservoirs/:id", async (req, res) => {
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

router.post("/reservoirs", async (req, res) => {
  try {
    const validatedData = insertReservoirSchema.parse(req.body);
    const reservoir = await storage.createReservoir(validatedData);
    res.status(201).json(reservoir);
  } catch (error: any) {
    console.error("Reservoir creation error:", error?.message || error);
    res.status(400).json({ error: "Invalid reservoir data", details: error?.message });
  }
});

router.patch("/reservoirs/:id", async (req, res) => {
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

router.delete("/reservoirs/:id", async (req, res) => {
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

router.get("/water", async (req, res) => {
  try {
    const condominiumId = req.condominiumContext?.condominiumId || undefined;
    const readings = await storage.getWaterReadings(condominiumId);
    res.json(readings);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch water readings" });
  }
});

router.post("/water", async (req, res) => {
  try {
    const validatedData = insertWaterReadingSchema.parse(req.body);
    const reading = await storage.createWaterReading(validatedData);
    res.status(201).json(reading);
  } catch (error) {
    res.status(400).json({ error: "Invalid water reading data" });
  }
});


router.get("/hydrometers", async (req, res) => {
  try {
    const condominiumId = req.condominiumContext?.condominiumId || undefined;
    const readings = await storage.getHydrometerReadings(condominiumId);
    res.json(readings);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch hydrometer readings" });
  }
});

router.post("/hydrometers", async (req, res) => {
  try {
    const validatedData = insertHydrometerReadingSchema.parse(req.body);
    const reading = await storage.createHydrometerReading(validatedData);
    res.status(201).json(reading);
  } catch (error: any) {
    res.status(400).json({ error: "Invalid hydrometer reading data", details: error?.message });
  }
});

router.patch("/hydrometers/:id", async (req, res) => {
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

router.delete("/hydrometers/:id", async (req, res) => {
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

router.get("/gas", async (req, res) => {
  try {
    const condominiumId = req.condominiumContext?.condominiumId || undefined;
    const readings = await storage.getGasReadings(condominiumId);
    res.json(readings);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch gas readings" });
  }
});

router.post("/gas", async (req, res) => {
  try {
    const validatedData = insertGasReadingSchema.parse(req.body);
    const reading = await storage.createGasReading(validatedData);
    res.status(201).json(reading);
  } catch (error) {
    res.status(400).json({ error: "Invalid gas reading data" });
  }
});


router.get("/energy", async (req, res) => {
  try {
    const condominiumId = req.condominiumContext?.condominiumId || undefined;
    const events = await storage.getEnergyEvents(condominiumId);
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch energy events" });
  }
});

router.post("/energy", async (req, res) => {
  try {
    const validatedData = insertEnergyEventSchema.parse(req.body);
    const event = await storage.createEnergyEvent(validatedData);
    res.status(201).json(event);
  } catch (error) {
    res.status(400).json({ error: "Invalid energy event data" });
  }
});

router.patch("/energy/:id", async (req, res) => {
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

router.get("/occupancy", async (req, res) => {
  try {
    const condominiumId = req.condominiumContext?.condominiumId || undefined;
    const data = await storage.getOccupancyData(condominiumId);
    res.json(data || {});
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch occupancy data" });
  }
});

router.put("/occupancy", async (req, res) => {
  try {
    const validatedData = insertOccupancyDataSchema.parse(req.body);
    const data = await storage.updateOccupancyData(validatedData);
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: "Invalid occupancy data" });
  }
});

router.get("/documents", async (req, res) => {
  try {
    const condominiumId = req.condominiumContext?.condominiumId || undefined;
    const documents = await storage.getDocuments(condominiumId);
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

router.get("/documents/:id", async (req, res) => {
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

router.post("/documents", async (req, res) => {
  try {
    const validatedData = insertDocumentSchema.parse(req.body);
    const document = await storage.createDocument(validatedData);
    res.status(201).json(document);
  } catch (error) {
    res.status(400).json({ error: "Invalid document data" });
  }
});

router.patch("/documents/:id", async (req, res) => {
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

router.delete("/documents/:id", async (req, res) => {
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

router.get("/suppliers", async (req, res) => {
  try {
    const condominiumId = req.condominiumContext?.condominiumId || undefined;
    const suppliers = await storage.getSuppliers(condominiumId);
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch suppliers" });
  }
});

router.get("/suppliers/:id", async (req, res) => {
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

router.post("/suppliers", async (req, res) => {
  try {
    const validatedData = insertSupplierSchema.parse(req.body);
    const supplier = await storage.createSupplier(validatedData);
    res.status(201).json(supplier);
  } catch (error) {
    res.status(400).json({ error: "Invalid supplier data" });
  }
});

router.patch("/suppliers/:id", async (req, res) => {
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

router.delete("/suppliers/:id", async (req, res) => {
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

router.get("/announcements", async (req, res) => {
  try {
    const condominiumId = req.condominiumContext?.condominiumId || undefined;
    const announcements = await storage.getAnnouncements(condominiumId);
    res.json(announcements);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch announcements" });
  }
});

router.get("/announcements/:id", async (req, res) => {
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

router.post("/announcements", async (req, res) => {
  try {
    const validatedData = insertAnnouncementSchema.parse(req.body);
    const announcement = await storage.createAnnouncement(validatedData);
    
    try {
      const notifications = await storage.createNotificationsForAllUsers({
        condominiumId: announcement.condominiumId,
        type: "announcement_new",
        title: "Novo Comunicado",
        message: announcement.title,
        relatedId: announcement.id,
        isRead: false,
      }, validatedData.createdBy || undefined);
      
      notifications.forEach((notif) => {
        sendNotificationToUser(notif.userId, notif);
      });
    } catch (notifError) {
      console.error("Error creating notifications:", notifError);
    }
    
    res.status(201).json(announcement);
  } catch (error) {
    res.status(400).json({ error: "Invalid announcement data" });
  }
});

router.patch("/announcements/:id", async (req, res) => {
  try {
    const announcement = await storage.updateAnnouncement(req.params.id, req.body);
    if (!announcement) {
      return res.status(404).json({ error: "Announcement not found" });
    }
    
    try {
      const notifications = await storage.createNotificationsForAllUsers({
        condominiumId: announcement.condominiumId,
        type: "announcement_updated",
        title: "Comunicado Atualizado",
        message: announcement.title,
        relatedId: announcement.id,
        isRead: false,
      });
      
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

router.delete("/announcements/:id", async (req, res) => {
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

router.get("/notifications/:userId", async (req, res) => {
  try {
    const notifications = await storage.getNotifications(req.params.userId);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

router.get("/notifications/:userId/unread", async (req, res) => {
  try {
    const notifications = await storage.getUnreadNotifications(req.params.userId);
    res.json(notifications);
  } catch (error) {
    console.error("Error fetching unread notifications:", error);
    res.status(500).json({ error: "Failed to fetch unread notifications" });
  }
});

router.patch("/notifications/:id/read", async (req, res) => {
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

router.patch("/notifications/:userId/read-all", async (req, res) => {
  try {
    await storage.markAllNotificationsAsRead(req.params.userId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to mark all notifications as read" });
  }
});

router.get("/module-permissions", async (req, res) => {
  try {
    const permissions = await storage.getModulePermissions();
    res.json(permissions);
  } catch (error) {
    console.error("Error fetching module permissions:", error);
    res.status(500).json({ error: "Failed to fetch module permissions" });
  }
});

router.patch("/module-permissions/:moduleKey", async (req, res) => {
  try {
    const { isEnabled, updatedBy, userEmail } = req.body;
    
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

router.get("/waste-config", async (req, res) => {
  try {
    const config = await storage.getWasteConfig();
    res.json(config || null);
  } catch (error) {
    console.error("Error fetching waste config:", error);
    res.status(500).json({ error: "Failed to fetch waste config" });
  }
});

router.patch("/waste-config", async (req, res) => {
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

router.get("/security-devices", async (req, res) => {
  try {
    const devices = await storage.getSecurityDevices();
    res.json(devices);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch security devices" });
  }
});

router.get("/security-devices/:id", async (req, res) => {
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

router.post("/security-devices", async (req, res) => {
  try {
    const validatedData = insertSecurityDeviceSchema.parse(req.body);
    const device = await storage.createSecurityDevice(validatedData);
    res.status(201).json(device);
  } catch (error) {
    res.status(400).json({ error: "Invalid security device data" });
  }
});

router.patch("/security-devices/:id", async (req, res) => {
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

router.delete("/security-devices/:id", async (req, res) => {
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

router.get("/security-events", async (req, res) => {
  try {
    const events = await storage.getSecurityEvents();
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch security events" });
  }
});

router.get("/security-events/device/:deviceId", async (req, res) => {
  try {
    const events = await storage.getSecurityEventsByDeviceId(req.params.deviceId);
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch security events" });
  }
});

router.post("/security-events", async (req, res) => {
  try {
    const validatedData = insertSecurityEventSchema.parse(req.body);
    const event = await storage.createSecurityEvent(validatedData);
    res.status(201).json(event);
  } catch (error) {
    res.status(400).json({ error: "Invalid security event data" });
  }
});

router.patch("/security-events/:id", async (req, res) => {
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

router.get("/preventive-assets", async (req, res) => {
  try {
    const assets = await storage.getPreventiveAssets();
    res.json(assets);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/preventive-assets/:id", async (req, res) => {
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

router.post("/preventive-assets", async (req, res) => {
  try {
    const validatedData = insertPreventiveAssetSchema.parse(req.body);
    const asset = await storage.createPreventiveAsset(validatedData);
    res.status(201).json(asset);
  } catch (error: any) {
    res.status(400).json({ error: "Dados inválidos", details: error.message });
  }
});

router.patch("/preventive-assets/:id", async (req, res) => {
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

router.delete("/preventive-assets/:id", async (req, res) => {
  try {
    await storage.deletePreventiveAsset(req.params.id);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/maintenance-plans", async (req, res) => {
  try {
    const plans = await storage.getMaintenancePlans();
    res.json(plans);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/maintenance-plans/:id", async (req, res) => {
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

router.get("/maintenance-plans/asset/:assetId", async (req, res) => {
  try {
    const plans = await storage.getMaintenancePlansByAssetId(req.params.assetId);
    res.json(plans);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/maintenance-plans", async (req, res) => {
  try {
    const validatedData = insertMaintenancePlanSchema.parse(req.body);
    const plan = await storage.createMaintenancePlan(validatedData);
    res.status(201).json(plan);
  } catch (error: any) {
    res.status(400).json({ error: "Dados inválidos", details: error.message });
  }
});

router.patch("/maintenance-plans/:id", async (req, res) => {
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

router.delete("/maintenance-plans/:id", async (req, res) => {
  try {
    await storage.deleteMaintenancePlan(req.params.id);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/plan-checklist/:planId", async (req, res) => {
  try {
    const items = await storage.getPlanChecklistItems(req.params.planId);
    res.json(items);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/plan-checklist", async (req, res) => {
  try {
    const validatedData = insertPlanChecklistItemSchema.parse(req.body);
    const item = await storage.createPlanChecklistItem(validatedData);
    res.status(201).json(item);
  } catch (error: any) {
    res.status(400).json({ error: "Dados inválidos", details: error.message });
  }
});

router.patch("/plan-checklist/:id", async (req, res) => {
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

router.delete("/plan-checklist/:id", async (req, res) => {
  try {
    await storage.deletePlanChecklistItem(req.params.id);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/maintenance-executions", async (req, res) => {
  try {
    const executions = await storage.getMaintenanceExecutions();
    res.json(executions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/maintenance-executions/:id", async (req, res) => {
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

router.get("/maintenance-executions/plan/:planId", async (req, res) => {
  try {
    const allExecutions = await storage.getMaintenanceExecutions();
    const executions = allExecutions.filter(e => e.planId === req.params.planId);
    res.json(executions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/maintenance-executions", async (req, res) => {
  try {
    const validatedData = insertMaintenanceExecutionSchema.parse(req.body);
    const execution = await storage.createMaintenanceExecution(validatedData);
    res.status(201).json(execution);
  } catch (error: any) {
    res.status(400).json({ error: "Dados inválidos", details: error.message });
  }
});

router.patch("/maintenance-executions/:id", async (req, res) => {
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

router.delete("/maintenance-executions/:id", async (req, res) => {
  try {
    await storage.deleteMaintenanceExecution(req.params.id);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/execution-checklist/:executionId", async (req, res) => {
  try {
    const items = await storage.getExecutionChecklistItems(req.params.executionId);
    res.json(items);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/execution-checklist", async (req, res) => {
  try {
    const validatedData = insertExecutionChecklistItemSchema.parse(req.body);
    const item = await storage.createExecutionChecklistItem(validatedData);
    res.status(201).json(item);
  } catch (error: any) {
    res.status(400).json({ error: "Dados inválidos", details: error.message });
  }
});

router.patch("/execution-checklist/:id", async (req, res) => {
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

router.get("/maintenance-documents/:assetId", async (req, res) => {
  try {
    const documents = await storage.getMaintenanceDocuments(req.params.assetId);
    res.json(documents);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/maintenance-documents", async (req, res) => {
  try {
    const validatedData = insertMaintenanceDocumentSchema.parse(req.body);
    const document = await storage.createMaintenanceDocument(validatedData);
    res.status(201).json(document);
  } catch (error: any) {
    res.status(400).json({ error: "Dados inválidos", details: error.message });
  }
});

router.delete("/maintenance-documents/:id", async (req, res) => {
  try {
    await storage.deleteMaintenanceDocument(req.params.id);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
