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
  requireSindicoOrAdmin,
  requireGestao
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
  insertFaqSchema,
  faqCategories,
  insertInsurancePolicySchema,
  insertLegalChecklistSchema,
  insertParcelSchema,
  insertMoradorSchema,
  insertHospedagemSchema,
  insertConfiguracoesLocacaoSchema,
  insertMarketplaceCategoriaSchema,
  insertMarketplaceFornecedorSchema,
  insertMarketplaceServicoSchema,
  insertMarketplaceOfertaSchema,
  insertMarketplaceContratacaoSchema,
  insertMarketplaceAvaliacaoSchema,
  insertMarketplaceComissaoSchema,
} from "../../shared/schema";

import { z } from "zod";
import { supabase, isSupabaseConfigured } from "../../server/supabase";
import { identificarAdminPlataforma, permitirApenasAdminPlataforma } from "../../server/admin-middleware";

const router = Router();
const storage = createStorage();

export { storage };

const publicPaths = ["/supabase-config", "/supabase-status", "/login", "/auth/debug", "/auth/fix-association"];
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
    
    // Always lookup by email first to get the correct database user ID
    let user = await storage.getUserByEmail(email);
    
    if (!user) {
      return res.status(403).json({ 
        error: "Usuário não cadastrado no sistema",
        hint: "Entre em contato com o administrador para liberar seu acesso"
      });
    }
    
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error("[Login] JWT_SECRET não configurado");
      return res.status(500).json({ error: "Erro de configuração do servidor" });
    }
    
    // Use the database user ID (not Supabase Auth ID) in the JWT
    const token = jwt.sign(
      { 
        sub: user.id,
        email: user.email,
        role: user.role
      },
      jwtSecret,
      { expiresIn: "8h" }
    );
    
    console.log(`[Login] User ${user.email} logged in with DB ID: ${user.id}`);
    
    res.json({ 
      token, 
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
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
    
    // Get user's condominiums and auto-select first one if none selected
    const userCondos = await storage.getUserCondominiums(userId);
    
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      condominiums: userCondos
    });
  } catch (error: any) {
    console.error("[Auth/Me] Error:", error.message);
    res.status(500).json({ error: "Erro ao buscar usuário" });
  }
});

// Debug endpoint to check user data
router.get("/auth/debug", async (req, res) => {
  try {
    const users = await storage.getUsers();
    const condos = await storage.getCondominiums();
    const allUserCondos = await Promise.all(
      users.map(async u => ({
        userId: u.id,
        email: u.email,
        condos: await storage.getUserCondominiums(u.id)
      }))
    );
    
    res.json({ users, condos, userCondos: allUserCondos });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Fix user-condominium association using direct DB insert
router.post("/auth/fix-association", async (req, res) => {
  try {
    const { userId, condominiumId, role } = req.body;
    
    if (!userId || !condominiumId) {
      return res.status(400).json({ error: "userId and condominiumId required" });
    }
    
    // First check if the user exists
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found", userId });
    }
    
    // Check if condominium exists
    const condo = await storage.getCondominiumById(condominiumId);
    if (!condo) {
      return res.status(404).json({ error: "Condominium not found", condominiumId });
    }
    
    // Check if association already exists
    const existingCondos = await storage.getUserCondominiums(userId);
    const alreadyAssociated = existingCondos.some(uc => uc.condominiumId === condominiumId);
    
    if (alreadyAssociated) {
      return res.json({ success: true, message: "Already associated", existingCondos });
    }
    
    // Add the association
    const association = await storage.addUserToCondominium({
      userId,
      condominiumId,
      role: role || "síndico",
      isActive: true
    });
    
    res.json({ success: true, association });
  } catch (error: any) {
    console.error("[Fix Association] Error:", error);
    res.status(500).json({ error: error.message, stack: error.stack });
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

// Criar usuário síndico inicial para um condomínio
router.post(
  "/admin/condominios/:condominiumId/sindico",
  identificarAdminPlataforma,
  permitirApenasAdminPlataforma,
  async (req, res) => {
    try {
      const { condominiumId } = req.params;
      const { email, name, password } = req.body;

      if (!email || !name) {
        return res.status(400).json({ error: "Email e nome são obrigatórios" });
      }

      // Verificar se o condomínio existe
      const condominium = await storage.getCondominiumById(condominiumId);
      if (!condominium) {
        return res.status(404).json({ error: "Condomínio não encontrado" });
      }

      // Verificar se já existe um usuário com esse email
      let user = await storage.getUserByEmail(email);
      
      if (!user) {
        // Criar usuário no banco local
        user = await storage.createUser({
          email,
          name,
          role: "síndico",
          isActive: true
        });

        // Se tiver password, criar no Supabase Auth também
        if (password && isSupabaseConfigured && supabase) {
          try {
            const { error: authError } = await supabase.auth.admin.createUser({
              email,
              password,
              email_confirm: true
            });
            if (authError) {
              console.warn("[Admin] Erro ao criar usuário no Supabase Auth:", authError.message);
            }
          } catch (authErr) {
            console.warn("[Admin] Supabase Auth não disponível para criar usuário");
          }
        }
      }

      // Verificar se já está associado ao condomínio
      const existingAssociations = await storage.getUserCondominiums(user.id);
      const alreadyAssociated = existingAssociations.some(
        uc => uc.condominiumId === condominiumId
      );

      if (alreadyAssociated) {
        return res.status(409).json({ 
          error: "Usuário já está associado a este condomínio",
          user,
          association: existingAssociations.find(uc => uc.condominiumId === condominiumId)
        });
      }

      // Associar usuário ao condomínio como síndico
      const userCondominium = await storage.addUserToCondominium({
        userId: user.id,
        condominiumId,
        role: "síndico",
        isActive: true
      });

      res.status(201).json({
        success: true,
        user,
        association: userCondominium,
        condominium
      });
    } catch (error: any) {
      console.error("[Admin] Erro ao criar síndico:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Criar usuário para a plataforma (admin pode criar qualquer tipo de usuário)
router.post(
  "/admin/usuarios",
  identificarAdminPlataforma,
  permitirApenasAdminPlataforma,
  async (req, res) => {
    try {
      const { email, name, role, password, condominiumId } = req.body;

      if (!email || !name) {
        return res.status(400).json({ error: "Email e nome são obrigatórios" });
      }

      // Verificar se já existe
      const existing = await storage.getUserByEmail(email);
      if (existing) {
        return res.status(409).json({ error: "Usuário já existe com este email" });
      }

      // Criar usuário no banco local
      const user = await storage.createUser({
        email,
        name,
        role: role || "condômino",
        isActive: true
      });

      // Se tiver password, criar no Supabase Auth
      if (password && isSupabaseConfigured && supabase) {
        try {
          const { error: authError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true
          });
          if (authError) {
            console.warn("[Admin] Erro ao criar usuário no Supabase Auth:", authError.message);
          }
        } catch (authErr) {
          console.warn("[Admin] Supabase Auth não disponível");
        }
      }

      // Se informou condominiumId, associar
      let association = null;
      if (condominiumId) {
        association = await storage.addUserToCondominium({
          userId: user.id,
          condominiumId,
          role: role === "síndico" ? "síndico" : "condômino",
          isActive: true
        });
      }

      res.status(201).json({
        success: true,
        user,
        association
      });
    } catch (error: any) {
      console.error("[Admin] Erro ao criar usuário:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Ativar/desativar usuário
router.patch(
  "/admin/usuarios/:userId/status",
  identificarAdminPlataforma,
  permitirApenasAdminPlataforma,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { isActive } = req.body;

      const user = await storage.updateUser(userId, { isActive });
      if (!user) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      res.json({ success: true, user });
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
    const condominiumId = req.condominiumContext?.condominiumId;
    if (!condominiumId) {
      return res.status(400).json({ error: "Condomínio não selecionado" });
    }
    const dataWithCondominium = {
      ...req.body,
      condominiumId,
    };
    const validatedData = insertEnergyEventSchema.parse(dataWithCondominium);
    const event = await storage.createEnergyEvent(validatedData);
    res.status(201).json(event);
  } catch (error: any) {
    console.error("[Energy POST] Error:", error?.message || error);
    res.status(400).json({ error: "Invalid energy event data", details: error?.message });
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
    const condominiumId = req.condominiumContext?.condominiumId;
    if (!condominiumId) {
      return res.status(400).json({ error: "Condomínio não selecionado" });
    }
    
    const dataWithCondominium = {
      ...req.body,
      condominiumId,
    };
    
    const validatedData = insertOccupancyDataSchema.parse(dataWithCondominium);
    const data = await storage.updateOccupancyData(validatedData);
    res.json(data);
  } catch (error: any) {
    console.error("[Occupancy PUT] Error:", error?.message || error);
    res.status(400).json({ error: "Invalid occupancy data", details: error?.message });
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
    const condominiumId = req.condominiumContext?.condominiumId;
    if (!condominiumId) {
      return res.status(400).json({ error: "Condomínio não selecionado" });
    }
    const dataWithCondominium = {
      ...req.body,
      condominiumId,
    };
    const validatedData = insertDocumentSchema.parse(dataWithCondominium);
    const document = await storage.createDocument(validatedData);
    res.status(201).json(document);
  } catch (error: any) {
    console.error("[Documents POST] Error:", error?.message || error);
    res.status(400).json({ error: "Invalid document data", details: error?.message });
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
    const { name, category, condominiumId, phone, whatsapp, email, address, notes } = req.body;
    
    // Basic validation - only name and category are required
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: "Nome é obrigatório" });
    }
    if (!category || typeof category !== 'string' || category.trim() === '') {
      return res.status(400).json({ error: "Categoria é obrigatória" });
    }
    if (!condominiumId || typeof condominiumId !== 'string') {
      return res.status(400).json({ error: "Condomínio é obrigatório" });
    }
    
    // Build data object, converting empty strings to null (no icon field - not in Supabase)
    const supplierData = {
      name: name.trim(),
      category: category.trim(),
      condominiumId,
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
    const condominiumId = req.condominiumContext?.condominiumId;
    console.log("[Announcements POST] condominiumId:", condominiumId);
    console.log("[Announcements POST] body:", JSON.stringify(req.body, null, 2));
    
    if (!condominiumId) {
      return res.status(400).json({ error: "Condomínio não selecionado" });
    }
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { photos, ...bodyWithoutPhotos } = req.body;
    const dataWithCondominium: any = {
      ...bodyWithoutPhotos,
      condominiumId,
      expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : null,
    };
    
    console.log("[Announcements POST] dataWithCondominium:", JSON.stringify(dataWithCondominium, null, 2));
    
    const validatedData = insertAnnouncementSchema.parse(dataWithCondominium);
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
  } catch (error: any) {
    console.error("[Announcements POST] Error:", error?.message || error);
    if (error?.errors) {
      console.error("[Announcements POST] Zod errors:", JSON.stringify(error.errors, null, 2));
    }
    res.status(400).json({ error: "Invalid announcement data", details: error?.message });
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
    const condominiumId = req.condominiumContext?.condominiumId;
    const devices = await storage.getSecurityDevices(condominiumId);
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
    const condominiumId = req.condominiumContext?.condominiumId;
    if (!condominiumId) {
      return res.status(400).json({ error: "Condomínio não selecionado" });
    }
    const dataWithCondominium = {
      ...req.body,
      condominiumId,
    };
    const validatedData = insertSecurityDeviceSchema.parse(dataWithCondominium);
    const device = await storage.createSecurityDevice(validatedData);
    res.status(201).json(device);
  } catch (error: any) {
    console.error("[Security Devices POST] Error:", error?.message || error);
    res.status(400).json({ error: "Invalid security device data", details: error?.message });
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
    const condominiumId = req.condominiumContext?.condominiumId;
    const events = await storage.getSecurityEvents(condominiumId);
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
    const condominiumId = req.condominiumContext?.condominiumId;
    if (!condominiumId) {
      return res.status(400).json({ error: "Condomínio não selecionado" });
    }
    const dataWithCondominium = {
      ...req.body,
      condominiumId,
    };
    const validatedData = insertSecurityEventSchema.parse(dataWithCondominium);
    const event = await storage.createSecurityEvent(validatedData);
    res.status(201).json(event);
  } catch (error: any) {
    console.error("[Security Events POST] Error:", error?.message || error);
    res.status(400).json({ error: "Invalid security event data", details: error?.message });
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

// ===========================
// FAQ / KNOWLEDGE BASE
// ===========================
router.get("/faqs", async (req, res) => {
  try {
    const condominiumId = req.condominiumContext?.condominiumId || undefined;
    const userRole = req.condominiumContext?.role;
    const isAdminOrSindico = userRole === "admin" || userRole === "síndico";
    
    let faqs = await storage.getFaqs(condominiumId);
    
    if (!isAdminOrSindico) {
      faqs = faqs.filter((faq: any) => faq.isPublished === true);
    }
    
    res.json(faqs);
  } catch (error: any) {
    res.status(500).json({ error: "Erro ao buscar FAQs" });
  }
});

router.get("/faqs/categories", async (req, res) => {
  res.json(faqCategories);
});

router.get("/faqs/:id", async (req, res) => {
  try {
    const faq = await storage.getFaqById(req.params.id);
    if (!faq) {
      return res.status(404).json({ error: "FAQ não encontrada" });
    }
    
    const userRole = req.condominiumContext?.role;
    const isAdminOrSindico = userRole === "admin" || userRole === "síndico";
    
    if (!faq.isPublished && !isAdminOrSindico) {
      return res.status(404).json({ error: "FAQ não encontrada" });
    }
    
    await storage.incrementFaqViewCount(req.params.id);
    res.json(faq);
  } catch (error: any) {
    res.status(500).json({ error: "Erro ao buscar FAQ" });
  }
});

router.post("/faqs", requireSindicoOrAdmin, async (req, res) => {
  try {
    const validatedData = insertFaqSchema.parse(req.body);
    const faq = await storage.createFaq(validatedData);
    res.status(201).json(faq);
  } catch (error: any) {
    if (error.name === "ZodError") {
      return res.status(400).json({ error: "Dados inválidos", details: error.errors });
    }
    console.error("[FAQ POST] Error:", error.message);
    res.status(500).json({ error: "Erro ao criar FAQ", details: error.message });
  }
});

const updateFaqSchema = insertFaqSchema.partial();

router.patch("/faqs/:id", requireSindicoOrAdmin, async (req, res) => {
  try {
    const validatedData = updateFaqSchema.parse(req.body);
    const faq = await storage.updateFaq(req.params.id, validatedData);
    if (!faq) {
      return res.status(404).json({ error: "FAQ não encontrada" });
    }
    res.json(faq);
  } catch (error: any) {
    if (error.name === "ZodError") {
      return res.status(400).json({ error: "Dados inválidos", details: error.errors });
    }
    res.status(400).json({ error: "Erro ao atualizar FAQ" });
  }
});

router.delete("/faqs/:id", requireSindicoOrAdmin, async (req, res) => {
  try {
    const deleted = await storage.deleteFaq(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "FAQ não encontrada" });
    }
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: "Erro ao remover FAQ" });
  }
});

// ===========================
// INSURANCE POLICIES (SEGUROS)
// ===========================

router.get("/insurance/policies", requireGestao, async (req, res) => {
  try {
    const condominiumId = getCondominiumId(req);
    const policies = await storage.getInsurancePolicies(condominiumId);
    res.json(policies);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch policies", details: error?.message });
  }
});

router.post("/insurance/policies", requireSindicoOrAdmin, async (req, res) => {
  try {
    const condominiumId = getCondominiumId(req);
    console.log("[insurance] Creating policy, condominiumId:", condominiumId);
    console.log("[insurance] Request body:", JSON.stringify(req.body));
    if (!condominiumId) {
      return res.status(400).json({ error: "Condominium ID is required" });
    }
    const validation = insertInsurancePolicySchema.safeParse({
      ...req.body,
      condominiumId,
      createdBy: getUserId(req),
    });
    if (!validation.success) {
      console.log("[insurance] Validation failed:", JSON.stringify(validation.error.errors));
      return res.status(400).json({ error: "Validation failed", details: validation.error.errors });
    }
    console.log("[insurance] Validated data:", JSON.stringify(validation.data));
    const policy = await storage.createInsurancePolicy(validation.data);
    console.log("[insurance] Created policy:", JSON.stringify(policy));
    res.status(201).json(policy);
  } catch (error: any) {
    console.error("[insurance] Error creating policy:", error);
    res.status(500).json({ error: "Failed to create policy", details: error?.message });
  }
});

router.patch("/insurance/policies/:id", requireSindicoOrAdmin, async (req, res) => {
  try {
    const validation = insertInsurancePolicySchema.partial().safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: "Validation failed", details: validation.error.errors });
    }
    const policy = await storage.updateInsurancePolicy(req.params.id, validation.data);
    if (!policy) {
      return res.status(404).json({ error: "Policy not found" });
    }
    res.json(policy);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to update policy", details: error?.message });
  }
});

router.delete("/insurance/policies/:id", requireSindicoOrAdmin, async (req, res) => {
  try {
    const deleted = await storage.deleteInsurancePolicy(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Policy not found" });
    }
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: "Failed to delete policy", details: error?.message });
  }
});

// Legal Checklist Routes
router.get("/legal-checklist", requireGestao, async (req, res) => {
  try {
    const condominiumId = getCondominiumId(req);
    const items = await storage.getLegalChecklist(condominiumId);
    res.json(items);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch legal checklist", details: error?.message });
  }
});

router.post("/legal-checklist", requireSindicoOrAdmin, async (req, res) => {
  try {
    const condominiumId = getCondominiumId(req);
    if (!condominiumId) {
      return res.status(400).json({ error: "Condominium ID required" });
    }
    const validation = insertLegalChecklistSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: "Validation failed", details: validation.error.errors });
    }
    const userId = (req as any).userId;
    const data = { ...validation.data, condominiumId, createdBy: userId };
    const item = await storage.createLegalChecklistItem(data);
    res.status(201).json(item);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to create checklist item", details: error?.message });
  }
});

router.patch("/legal-checklist/:id", requireSindicoOrAdmin, async (req, res) => {
  try {
    const validation = insertLegalChecklistSchema.partial().safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: "Validation failed", details: validation.error.errors });
    }
    const item = await storage.updateLegalChecklistItem(req.params.id, validation.data);
    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }
    res.json(item);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to update checklist item", details: error?.message });
  }
});

router.delete("/legal-checklist/:id", requireSindicoOrAdmin, async (req, res) => {
  try {
    const deleted = await storage.deleteLegalChecklistItem(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Item not found" });
    }
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: "Failed to delete checklist item", details: error?.message });
  }
});

// Parcel Tracking Routes
router.get("/parcels", requireGestao, async (req, res) => {
  try {
    const condominiumId = getCondominiumId(req);
    const parcels = await storage.getParcels(condominiumId || undefined);
    res.json(parcels);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch parcels", details: error?.message });
  }
});

router.get("/parcels/:id", requireGestao, async (req, res) => {
  try {
    const parcel = await storage.getParcelById(req.params.id);
    if (!parcel) {
      return res.status(404).json({ error: "Parcel not found" });
    }
    res.json(parcel);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch parcel", details: error?.message });
  }
});

router.post("/parcels", requireGestao, async (req, res) => {
  try {
    const condominiumId = getCondominiumId(req);
    if (!condominiumId) {
      return res.status(400).json({ error: "Condominium ID required" });
    }
    const validation = insertParcelSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: "Validation failed", details: validation.error.errors });
    }
    const data = { ...validation.data, condominiumId };
    const parcel = await storage.createParcel(data);
    res.status(201).json(parcel);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to create parcel", details: error?.message });
  }
});

router.patch("/parcels/:id", requireGestao, async (req, res) => {
  try {
    const validation = insertParcelSchema.partial().safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: "Validation failed", details: validation.error.errors });
    }
    const parcel = await storage.updateParcel(req.params.id, validation.data);
    if (!parcel) {
      return res.status(404).json({ error: "Parcel not found" });
    }
    res.json(parcel);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to update parcel", details: error?.message });
  }
});

router.delete("/parcels/:id", requireSindicoOrAdmin, async (req, res) => {
  try {
    const deleted = await storage.deleteParcel(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Parcel not found" });
    }
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: "Failed to delete parcel", details: error?.message });
  }
});

// ========== MARKETPLACE CAMPANHAS ROUTES ==========

const campanhaEnviarSchema = z.object({
  moradorIds: z.array(z.string().uuid()).min(1, "Selecione pelo menos um morador"),
  titulo: z.string().min(3, "Titulo deve ter pelo menos 3 caracteres"),
  mensagem: z.string().min(10, "Mensagem deve ter pelo menos 10 caracteres"),
  mediaUrl: z.string().url().optional().or(z.literal("")),
});

router.post("/marketplace/campanhas/enviar", requireSindicoOrAdmin, async (req, res) => {
  try {
    const condominiumId = getCondominiumId(req);
    if (!condominiumId) {
      return res.status(401).json({ error: "Condominio nao selecionado" });
    }
    
    const validation = campanhaEnviarSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: "Dados invalidos", 
        details: validation.error.errors 
      });
    }
    
    const { moradorIds, titulo, mensagem, mediaUrl } = validation.data;
    
    const moradores = await Promise.all(
      moradorIds.map(id => storage.getMoradorById(id))
    );
    
    const validMoradores = moradores.filter(m => 
      m && 
      m.telefone && 
      m.condominiumId === condominiumId
    );
    
    if (validMoradores.length === 0) {
      return res.status(400).json({ 
        error: "Nenhum morador valido selecionado. Verifique se os moradores pertencem ao condominio atual e possuem telefone cadastrado." 
      });
    }
    
    let sendBulkWhatsAppMessages;
    try {
      const twilioModule = await import("../../server/twilio-client");
      sendBulkWhatsAppMessages = twilioModule.sendBulkWhatsAppMessages;
    } catch (error: any) {
      console.error("[Campanhas] Twilio not configured:", error?.message);
      return res.status(503).json({ 
        error: "Servico de WhatsApp nao configurado. Verifique a integracao com Twilio." 
      });
    }
    
    const messages = validMoradores.map(m => ({
      to: m!.telefone!,
      body: `*${titulo}*\n\n${mensagem}`,
      mediaUrl: mediaUrl ? [mediaUrl] : undefined,
    }));
    
    const results = await sendBulkWhatsAppMessages(messages);
    
    const resultsWithNames = results.map((r, i) => ({
      ...r,
      nome: validMoradores[i]?.nomeCompleto,
    }));
    
    res.json({ 
      success: true, 
      total: moradorIds.length,
      enviados: results.filter(r => r.success).length,
      falhas: results.filter(r => !r.success).length,
      results: resultsWithNames 
    });
  } catch (error: any) {
    console.error("[Campanhas] Error:", error?.message || error);
    if (error?.message?.includes("Twilio not connected")) {
      return res.status(503).json({ 
        error: "Twilio nao configurado. Configure a integracao com Twilio para enviar mensagens." 
      });
    }
    res.status(500).json({ 
      error: "Falha ao enviar campanha", 
      details: error?.message || "Erro desconhecido"
    });
  }
});

// ========== MORADORES ROUTES ==========

router.get("/moradores", requireGestao, async (req, res) => {
  try {
    const condominiumId = getCondominiumId(req);
    const moradores = await storage.getMoradores(condominiumId || undefined);
    res.json(moradores);
  } catch (error: any) {
    res.status(500).json({ error: "Falha ao buscar moradores", details: error?.message });
  }
});

router.get("/moradores/:id", requireGestao, async (req, res) => {
  try {
    const morador = await storage.getMoradorById(req.params.id);
    if (!morador) {
      return res.status(404).json({ error: "Morador não encontrado" });
    }
    res.json(morador);
  } catch (error: any) {
    res.status(500).json({ error: "Falha ao buscar morador", details: error?.message });
  }
});

router.post("/moradores", requireSindicoOrAdmin, async (req, res) => {
  try {
    const condominiumId = getCondominiumId(req);
    if (!condominiumId) {
      return res.status(401).json({ error: "Condomínio não selecionado" });
    }
    
    const dataToValidate = {
      ...req.body,
      condominiumId,
    };
    
    const validation = insertMoradorSchema.safeParse(dataToValidate);
    if (!validation.success) {
      return res.status(400).json({ 
        error: "Dados inválidos", 
        details: validation.error.errors 
      });
    }
    
    // Check for duplicate CPF
    const existingMorador = await storage.getMoradorByCpf(condominiumId, validation.data.cpf);
    if (existingMorador) {
      return res.status(400).json({ error: "CPF já cadastrado neste condomínio" });
    }
    
    const morador = await storage.createMorador(validation.data);
    res.status(201).json(morador);
  } catch (error: any) {
    console.error("[Moradores POST] error:", error?.message || error);
    res.status(500).json({ 
      error: "Falha ao criar morador", 
      details: error?.message || "Erro desconhecido"
    });
  }
});

router.patch("/moradores/:id", requireSindicoOrAdmin, async (req, res) => {
  try {
    const condominiumId = getCondominiumId(req);
    // Check if CPF is being updated and if it's unique
    if (req.body.cpf && condominiumId) {
      const existingMorador = await storage.getMoradorByCpf(condominiumId, req.body.cpf);
      if (existingMorador && existingMorador.id !== req.params.id) {
        return res.status(400).json({ error: "CPF já cadastrado neste condomínio" });
      }
    }
    const morador = await storage.updateMorador(req.params.id, req.body);
    if (!morador) {
      return res.status(404).json({ error: "Morador não encontrado" });
    }
    res.json(morador);
  } catch (error: any) {
    res.status(500).json({ error: "Falha ao atualizar morador", details: error?.message });
  }
});

router.delete("/moradores/:id", requireSindicoOrAdmin, async (req, res) => {
  try {
    const deleted = await storage.deleteMorador(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Morador não encontrado" });
    }
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: "Falha ao excluir morador", details: error?.message });
  }
});

// ========================================
// PAYMENT GATEWAY - TAXAS DE CONDOMÍNIO
// ========================================

// Taxas Condominio - Fee templates (admin only)
router.get("/taxas-condominio", requireGestao, async (req, res) => {
  try {
    const condominiumId = getCondominiumId(req);
    const taxas = await storage.getTaxasCondominio(condominiumId || undefined);
    res.json(taxas);
  } catch (error: any) {
    res.status(500).json({ error: "Falha ao buscar taxas", details: error?.message });
  }
});

router.get("/taxas-condominio/:id", requireGestao, async (req, res) => {
  try {
    const taxa = await storage.getTaxaCondominioById(req.params.id);
    if (!taxa) {
      return res.status(404).json({ error: "Taxa não encontrada" });
    }
    res.json(taxa);
  } catch (error: any) {
    res.status(500).json({ error: "Falha ao buscar taxa", details: error?.message });
  }
});

router.post("/taxas-condominio", requireSindicoOrAdmin, async (req, res) => {
  try {
    const condominiumId = getCondominiumId(req);
    if (!condominiumId) {
      return res.status(400).json({ error: "Condomínio não identificado" });
    }
    const taxa = await storage.createTaxaCondominio({
      ...req.body,
      condominiumId
    });
    res.status(201).json(taxa);
  } catch (error: any) {
    res.status(500).json({ error: "Falha ao criar taxa", details: error?.message });
  }
});

router.patch("/taxas-condominio/:id", requireSindicoOrAdmin, async (req, res) => {
  try {
    const taxa = await storage.updateTaxaCondominio(req.params.id, req.body);
    res.json(taxa);
  } catch (error: any) {
    res.status(500).json({ error: "Falha ao atualizar taxa", details: error?.message });
  }
});

router.delete("/taxas-condominio/:id", requireSindicoOrAdmin, async (req, res) => {
  try {
    await storage.deleteTaxaCondominio(req.params.id);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: "Falha ao excluir taxa", details: error?.message });
  }
});

// Cobrancas - Charges to residents (admin for create/update, residents for viewing)
router.get("/cobrancas", requireGestao, async (req, res) => {
  try {
    const condominiumId = getCondominiumId(req);
    const cobrancas = await storage.getCobrancas(condominiumId || undefined);
    res.json(cobrancas);
  } catch (error: any) {
    res.status(500).json({ error: "Falha ao buscar cobranças", details: error?.message });
  }
});

router.get("/cobrancas/minhas", requireAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    const condominiumId = getCondominiumId(req);
    if (!userId || !condominiumId) {
      return res.status(400).json({ error: "Usuário ou condomínio não identificado" });
    }
    const cobrancas = await storage.getCobrancasByUser(userId, condominiumId);
    res.json(cobrancas);
  } catch (error: any) {
    res.status(500).json({ error: "Falha ao buscar suas cobranças", details: error?.message });
  }
});

router.get("/cobrancas/:id", requireAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    const condominiumId = getCondominiumId(req);
    const userRole = req.condominiumContext?.role;
    
    const cobranca = await storage.getCobrancaById(req.params.id);
    if (!cobranca) {
      return res.status(404).json({ error: "Cobrança não encontrada" });
    }
    
    const isAdmin = userRole === 'admin' || userRole === 'sindico';
    if (!isAdmin) {
      if (cobranca.condominiumId !== condominiumId || cobranca.moradorId !== userId) {
        return res.status(403).json({ error: "Acesso negado a esta cobrança" });
      }
    }
    
    res.json(cobranca);
  } catch (error: any) {
    res.status(500).json({ error: "Falha ao buscar cobrança", details: error?.message });
  }
});

router.post("/cobrancas", requireSindicoOrAdmin, async (req, res) => {
  try {
    const condominiumId = getCondominiumId(req);
    if (!condominiumId) {
      return res.status(400).json({ error: "Condomínio não identificado" });
    }
    const cobranca = await storage.createCobranca({
      ...req.body,
      condominiumId
    });
    res.status(201).json(cobranca);
  } catch (error: any) {
    res.status(500).json({ error: "Falha ao criar cobrança", details: error?.message });
  }
});

router.post("/cobrancas/gerar-lote", requireSindicoOrAdmin, async (req, res) => {
  try {
    const condominiumId = getCondominiumId(req);
    if (!condominiumId) {
      return res.status(400).json({ error: "Condomínio não identificado" });
    }
    
    const { taxaId, competencia, moradorIds, dataVencimento } = req.body;
    
    // Get the fee template
    const taxa = await storage.getTaxaCondominioById(taxaId);
    if (!taxa) {
      return res.status(404).json({ error: "Taxa não encontrada" });
    }
    
    // Get moradores
    let moradores;
    if (moradorIds && moradorIds.length > 0) {
      moradores = await Promise.all(
        moradorIds.map((id: string) => storage.getMoradorById(id))
      );
      moradores = moradores.filter(m => m && m.condominiumId === condominiumId);
    } else {
      moradores = await storage.getMoradores(condominiumId);
      moradores = moradores.filter(m => m.status === 'ativo');
    }
    
    // Create charges for each morador
    const cobrancas = await Promise.all(
      moradores.map(async (morador: any) => {
        return storage.createCobranca({
          condominiumId,
          taxaId,
          moradorId: morador.id,
          unidade: morador.unidadeId,
          bloco: morador.bloco,
          descricao: `${taxa.nome} - ${competencia}`,
          valor: taxa.valorPadrao,
          dataVencimento: new Date(dataVencimento),
          competencia,
          status: 'pendente'
        });
      })
    );
    
    res.status(201).json({ 
      message: `${cobrancas.length} cobranças geradas com sucesso`,
      cobrancas 
    });
  } catch (error: any) {
    res.status(500).json({ error: "Falha ao gerar cobranças em lote", details: error?.message });
  }
});

router.patch("/cobrancas/:id", requireSindicoOrAdmin, async (req, res) => {
  try {
    const cobranca = await storage.updateCobranca(req.params.id, req.body);
    res.json(cobranca);
  } catch (error: any) {
    res.status(500).json({ error: "Falha ao atualizar cobrança", details: error?.message });
  }
});

router.delete("/cobrancas/:id", requireSindicoOrAdmin, async (req, res) => {
  try {
    await storage.deleteCobranca(req.params.id);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: "Falha ao excluir cobrança", details: error?.message });
  }
});

// Pagamentos - Payment records
router.get("/pagamentos", requireGestao, async (req, res) => {
  try {
    const condominiumId = getCondominiumId(req);
    const pagamentos = await storage.getPagamentos(condominiumId || undefined);
    res.json(pagamentos);
  } catch (error: any) {
    res.status(500).json({ error: "Falha ao buscar pagamentos", details: error?.message });
  }
});

router.get("/pagamentos/meus", requireAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(400).json({ error: "Usuário não identificado" });
    }
    const pagamentos = await storage.getPagamentosByUser(userId);
    res.json(pagamentos);
  } catch (error: any) {
    res.status(500).json({ error: "Falha ao buscar seus pagamentos", details: error?.message });
  }
});

router.get("/pagamentos/:id", requireAuth, async (req, res) => {
  try {
    const pagamento = await storage.getPagamentoById(req.params.id);
    if (!pagamento) {
      return res.status(404).json({ error: "Pagamento não encontrado" });
    }
    res.json(pagamento);
  } catch (error: any) {
    res.status(500).json({ error: "Falha ao buscar pagamento", details: error?.message });
  }
});

// ========== HOSPEDAGENS (RENTAL MANAGEMENT - AIRBNB) ==========

router.get("/hospedagens", requireGestao, async (req, res) => {
  try {
    const condominiumId = getCondominiumId(req);
    const hospedagens = await storage.getHospedagens(condominiumId || undefined);
    res.json(hospedagens);
  } catch (error: any) {
    res.status(500).json({ error: "Falha ao buscar hospedagens", details: error?.message });
  }
});

router.get("/hospedagens/ativas", requireGestao, async (req, res) => {
  try {
    const condominiumId = getCondominiumId(req);
    if (!condominiumId) {
      return res.status(400).json({ error: "Condomínio não identificado" });
    }
    const hospedagens = await storage.getHospedagensAtivas(condominiumId);
    res.json(hospedagens);
  } catch (error: any) {
    res.status(500).json({ error: "Falha ao buscar hospedagens ativas", details: error?.message });
  }
});

router.get("/hospedagens/:id", requireGestao, async (req, res) => {
  try {
    const hospedagem = await storage.getHospedagemById(req.params.id);
    if (!hospedagem) {
      return res.status(404).json({ error: "Hospedagem não encontrada" });
    }
    res.json(hospedagem);
  } catch (error: any) {
    res.status(500).json({ error: "Falha ao buscar hospedagem", details: error?.message });
  }
});

router.post("/hospedagens", requireSindicoOrAdmin, async (req, res) => {
  try {
    const condominiumId = getCondominiumId(req);
    if (!condominiumId) {
      return res.status(400).json({ error: "Condomínio não identificado" });
    }
    const parsed = insertHospedagemSchema.safeParse({ ...req.body, condominiumId });
    if (!parsed.success) {
      return res.status(400).json({ error: "Dados inválidos", details: parsed.error.errors });
    }
    const hospedagem = await storage.createHospedagem(parsed.data);
    res.status(201).json(hospedagem);
  } catch (error: any) {
    res.status(500).json({ error: "Falha ao criar hospedagem", details: error?.message });
  }
});

router.patch("/hospedagens/:id", requireSindicoOrAdmin, async (req, res) => {
  try {
    const hospedagem = await storage.updateHospedagem(req.params.id, req.body);
    res.json(hospedagem);
  } catch (error: any) {
    res.status(500).json({ error: "Falha ao atualizar hospedagem", details: error?.message });
  }
});

router.delete("/hospedagens/:id", requireSindicoOrAdmin, async (req, res) => {
  try {
    await storage.deleteHospedagem(req.params.id);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: "Falha ao excluir hospedagem", details: error?.message });
  }
});

router.post("/hospedagens/:id/enviar-boas-vindas", requireSindicoOrAdmin, async (req, res) => {
  try {
    const { sendWhatsAppMessage } = await import("../server/twilio-client");
    
    const hospedagem = await storage.getHospedagemById(req.params.id);
    if (!hospedagem) {
      return res.status(404).json({ error: "Hospedagem não encontrada" });
    }
    
    if (!hospedagem.telefoneHospede) {
      return res.status(400).json({ error: "Telefone do hóspede não cadastrado" });
    }
    
    const { mensagem, urlVideo, urlRegimento } = req.body;
    
    let finalMessage = mensagem || "";
    
    if (urlRegimento) {
      finalMessage += `\n\nRegimento Interno Completo:\n${urlRegimento}`;
    }
    
    if (urlVideo) {
      finalMessage += `\n\nVideo com Tour e Regras do Condominio:\n${urlVideo}`;
    }
    
    finalMessage += "\n\n---\nDesejamos uma excelente estadia!";
    
    const mediaUrls: string[] = [];
    if (urlRegimento && urlRegimento.includes('.pdf')) {
      mediaUrls.push(urlRegimento);
    }
    
    await sendWhatsAppMessage({
      to: hospedagem.telefoneHospede,
      body: finalMessage,
      mediaUrl: mediaUrls.length > 0 ? mediaUrls : undefined,
    });
    
    const updatedHospedagem = await storage.marcarBoasVindasEnviadas(req.params.id);
    
    if (urlVideo) {
      await storage.updateHospedagem(req.params.id, { urlVideoExplicativo: urlVideo });
    }
    if (urlRegimento) {
      await storage.updateHospedagem(req.params.id, { urlRegimentoInterno: urlRegimento });
    }
    
    res.json({ 
      success: true, 
      message: "Mensagem de boas-vindas enviada com sucesso!",
      hospedagem: updatedHospedagem
    });
  } catch (error: any) {
    console.error("[enviar-boas-vindas] Error:", error);
    res.status(500).json({ 
      error: "Falha ao enviar mensagem de boas-vindas", 
      details: error?.message 
    });
  }
});

// Configurações de Locação
router.get("/configuracoes-locacao", requireSindicoOrAdmin, async (req, res) => {
  try {
    const condominiumId = getCondominiumId(req);
    if (!condominiumId) {
      return res.status(400).json({ error: "Condomínio não identificado" });
    }
    const config = await storage.getConfiguracoesLocacao(condominiumId);
    res.json(config || {});
  } catch (error: any) {
    res.status(500).json({ error: "Falha ao buscar configurações", details: error?.message });
  }
});

router.put("/configuracoes-locacao", requireSindicoOrAdmin, async (req, res) => {
  try {
    const condominiumId = getCondominiumId(req);
    if (!condominiumId) {
      return res.status(400).json({ error: "Condomínio não identificado" });
    }
    const parsed = insertConfiguracoesLocacaoSchema.safeParse({ ...req.body, condominiumId });
    if (!parsed.success) {
      return res.status(400).json({ error: "Dados inválidos", details: parsed.error.errors });
    }
    const config = await storage.upsertConfiguracoesLocacao(parsed.data);
    res.json(config);
  } catch (error: any) {
    res.status(500).json({ error: "Falha ao salvar configurações", details: error?.message });
  }
});

// ===== ENCOMENDAS / PARCELS =====
router.get("/parcels", async (req, res) => {
  try {
    const condominiumId = getCondominiumId(req);
    const parcels = await storage.getParcels(condominiumId || undefined);
    res.json(parcels);
  } catch (error: any) {
    res.status(500).json({ error: "Falha ao buscar encomendas", details: error?.message });
  }
});

router.get("/parcels/:id", async (req, res) => {
  try {
    const parcel = await storage.getParcelById(req.params.id);
    if (!parcel) {
      return res.status(404).json({ error: "Encomenda não encontrada" });
    }
    res.json(parcel);
  } catch (error: any) {
    res.status(500).json({ error: "Falha ao buscar encomenda", details: error?.message });
  }
});

router.post("/parcels", requireSindicoOrAdmin, async (req, res) => {
  try {
    const condominiumId = getCondominiumId(req);
    if (!condominiumId) {
      return res.status(400).json({ error: "Condomínio não identificado" });
    }
    const parsed = insertParcelSchema.safeParse({ ...req.body, condominiumId });
    if (!parsed.success) {
      return res.status(400).json({ error: "Dados inválidos", details: parsed.error.errors });
    }
    const parcel = await storage.createParcel(parsed.data);
    res.status(201).json(parcel);
  } catch (error: any) {
    res.status(500).json({ error: "Falha ao criar encomenda", details: error?.message });
  }
});

router.patch("/parcels/:id", requireSindicoOrAdmin, async (req, res) => {
  try {
    const parcel = await storage.updateParcel(req.params.id, req.body);
    if (!parcel) {
      return res.status(404).json({ error: "Encomenda não encontrada" });
    }
    res.json(parcel);
  } catch (error: any) {
    res.status(500).json({ error: "Falha ao atualizar encomenda", details: error?.message });
  }
});

router.delete("/parcels/:id", requireSindicoOrAdmin, async (req, res) => {
  try {
    await storage.deleteParcel(req.params.id);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: "Falha ao excluir encomenda", details: error?.message });
  }
});

// ========== MARKETPLACE ROUTES ==========

// Marketplace Categories (Admin only for write operations)
router.get("/marketplace/categorias", async (req, res) => {
  try {
    const categorias = await storage.getMarketplaceCategorias();
    res.json(categorias);
  } catch (error: any) {
    res.status(500).json({ error: "Falha ao buscar categorias", details: error?.message });
  }
});

router.post("/marketplace/categorias", requireSindicoOrAdmin, async (req, res) => {
  try {
    const parsed = insertMarketplaceCategoriaSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Dados inválidos", details: parsed.error.errors });
    }
    const categoria = await storage.createMarketplaceCategoria(parsed.data);
    res.status(201).json(categoria);
  } catch (error: any) {
    res.status(500).json({ error: "Falha ao criar categoria", details: error?.message });
  }
});

router.patch("/marketplace/categorias/:id", requireSindicoOrAdmin, async (req, res) => {
  try {
    const categoria = await storage.updateMarketplaceCategoria(req.params.id, req.body);
    if (!categoria) {
      return res.status(404).json({ error: "Categoria não encontrada" });
    }
    res.json(categoria);
  } catch (error: any) {
    res.status(500).json({ error: "Falha ao atualizar categoria", details: error?.message });
  }
});

router.delete("/marketplace/categorias/:id", requireSindicoOrAdmin, async (req, res) => {
  try {
    await storage.deleteMarketplaceCategoria(req.params.id);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: "Falha ao excluir categoria", details: error?.message });
  }
});

// Marketplace Servicos (Admin only for write operations)
router.get("/marketplace/servicos", async (req, res) => {
  try {
    const categoriaId = req.query.categoriaId as string | undefined;
    const servicos = await storage.getMarketplaceServicos(categoriaId);
    res.json(servicos);
  } catch (error: any) {
    res.status(500).json({ error: "Falha ao buscar serviços", details: error?.message });
  }
});

router.post("/marketplace/servicos", requireSindicoOrAdmin, async (req, res) => {
  try {
    const parsed = insertMarketplaceServicoSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Dados inválidos", details: parsed.error.errors });
    }
    const servico = await storage.createMarketplaceServico(parsed.data);
    res.status(201).json(servico);
  } catch (error: any) {
    res.status(500).json({ error: "Falha ao criar serviço", details: error?.message });
  }
});

router.patch("/marketplace/servicos/:id", requireSindicoOrAdmin, async (req, res) => {
  try {
    const servico = await storage.updateMarketplaceServico(req.params.id, req.body);
    if (!servico) {
      return res.status(404).json({ error: "Serviço não encontrado" });
    }
    res.json(servico);
  } catch (error: any) {
    res.status(500).json({ error: "Falha ao atualizar serviço", details: error?.message });
  }
});

router.delete("/marketplace/servicos/:id", requireSindicoOrAdmin, async (req, res) => {
  try {
    await storage.deleteMarketplaceServico(req.params.id);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: "Falha ao excluir serviço", details: error?.message });
  }
});

// Marketplace Fornecedores
router.get("/marketplace/fornecedores", async (req, res) => {
  try {
    const condominiumId = getCondominiumId(req);
    const status = req.query.status as string | undefined;
    const fornecedores = await storage.getMarketplaceFornecedores(condominiumId || undefined, status);
    res.json(fornecedores);
  } catch (error: any) {
    res.status(500).json({ error: "Falha ao buscar fornecedores", details: error?.message });
  }
});

router.get("/marketplace/fornecedores/:id", async (req, res) => {
  try {
    const fornecedor = await storage.getMarketplaceFornecedorById(req.params.id);
    if (!fornecedor) {
      return res.status(404).json({ error: "Fornecedor não encontrado" });
    }
    res.json(fornecedor);
  } catch (error: any) {
    res.status(500).json({ error: "Falha ao buscar fornecedor", details: error?.message });
  }
});

router.get("/marketplace/fornecedores/me/profile", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Usuário não autenticado" });
    }
    const fornecedor = await storage.getMarketplaceFornecedorByUserId(userId);
    res.json(fornecedor || null);
  } catch (error: any) {
    res.status(500).json({ error: "Falha ao buscar perfil", details: error?.message });
  }
});

router.post("/marketplace/fornecedores", async (req, res) => {
  try {
    const condominiumId = getCondominiumId(req);
    const userId = getUserId(req);
    if (!condominiumId || !userId) {
      return res.status(400).json({ error: "Condomínio ou usuário não identificado" });
    }
    const parsed = insertMarketplaceFornecedorSchema.safeParse({ ...req.body, condominiumId, userId });
    if (!parsed.success) {
      return res.status(400).json({ error: "Dados inválidos", details: parsed.error.errors });
    }
    const fornecedor = await storage.createMarketplaceFornecedor(parsed.data);
    res.status(201).json(fornecedor);
  } catch (error: any) {
    res.status(500).json({ error: "Falha ao criar fornecedor", details: error?.message });
  }
});

router.patch("/marketplace/fornecedores/:id", async (req, res) => {
  try {
    const fornecedor = await storage.updateMarketplaceFornecedor(req.params.id, req.body);
    if (!fornecedor) {
      return res.status(404).json({ error: "Fornecedor não encontrado" });
    }
    res.json(fornecedor);
  } catch (error: any) {
    res.status(500).json({ error: "Falha ao atualizar fornecedor", details: error?.message });
  }
});

router.post("/marketplace/fornecedores/:id/aprovar", requireSindicoOrAdmin, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Usuário não autenticado" });
    }
    const fornecedor = await storage.aprovarMarketplaceFornecedor(req.params.id, userId);
    if (!fornecedor) {
      return res.status(404).json({ error: "Fornecedor não encontrado" });
    }
    res.json(fornecedor);
  } catch (error: any) {
    res.status(500).json({ error: "Falha ao aprovar fornecedor", details: error?.message });
  }
});

router.post("/marketplace/fornecedores/:id/rejeitar", requireSindicoOrAdmin, async (req, res) => {
  try {
    const fornecedor = await storage.rejeitarMarketplaceFornecedor(req.params.id);
    if (!fornecedor) {
      return res.status(404).json({ error: "Fornecedor não encontrado" });
    }
    res.json(fornecedor);
  } catch (error: any) {
    res.status(500).json({ error: "Falha ao rejeitar fornecedor", details: error?.message });
  }
});

// Marketplace Ofertas
router.get("/marketplace/ofertas", async (req, res) => {
  try {
    const condominiumId = getCondominiumId(req);
    const fornecedorId = req.query.fornecedorId as string | undefined;
    const servicoId = req.query.servicoId as string | undefined;
    const ofertas = await storage.getMarketplaceOfertas(condominiumId || undefined, fornecedorId, servicoId);
    res.json(ofertas);
  } catch (error: any) {
    res.status(500).json({ error: "Falha ao buscar ofertas", details: error?.message });
  }
});

router.get("/marketplace/ofertas/:id", async (req, res) => {
  try {
    const oferta = await storage.getMarketplaceOfertaById(req.params.id);
    if (!oferta) {
      return res.status(404).json({ error: "Oferta não encontrada" });
    }
    res.json(oferta);
  } catch (error: any) {
    res.status(500).json({ error: "Falha ao buscar oferta", details: error?.message });
  }
});

router.post("/marketplace/ofertas", async (req, res) => {
  try {
    const condominiumId = getCondominiumId(req);
    if (!condominiumId) {
      return res.status(400).json({ error: "Condomínio não identificado" });
    }
    const parsed = insertMarketplaceOfertaSchema.safeParse({ ...req.body, condominiumId });
    if (!parsed.success) {
      return res.status(400).json({ error: "Dados inválidos", details: parsed.error.errors });
    }
    const oferta = await storage.createMarketplaceOferta(parsed.data);
    res.status(201).json(oferta);
  } catch (error: any) {
    res.status(500).json({ error: "Falha ao criar oferta", details: error?.message });
  }
});

router.patch("/marketplace/ofertas/:id", async (req, res) => {
  try {
    const oferta = await storage.updateMarketplaceOferta(req.params.id, req.body);
    if (!oferta) {
      return res.status(404).json({ error: "Oferta não encontrada" });
    }
    res.json(oferta);
  } catch (error: any) {
    res.status(500).json({ error: "Falha ao atualizar oferta", details: error?.message });
  }
});

router.delete("/marketplace/ofertas/:id", async (req, res) => {
  try {
    await storage.deleteMarketplaceOferta(req.params.id);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: "Falha ao excluir oferta", details: error?.message });
  }
});

// Marketplace Contratações
router.get("/marketplace/contratacoes", async (req, res) => {
  try {
    const condominiumId = getCondominiumId(req);
    const moradorId = req.query.moradorId as string | undefined;
    const fornecedorId = req.query.fornecedorId as string | undefined;
    const status = req.query.status as string | undefined;
    const contratacoes = await storage.getMarketplaceContratacoes(condominiumId || undefined, moradorId, fornecedorId, status);
    res.json(contratacoes);
  } catch (error: any) {
    res.status(500).json({ error: "Falha ao buscar contratações", details: error?.message });
  }
});

router.get("/marketplace/contratacoes/:id", async (req, res) => {
  try {
    const contratacao = await storage.getMarketplaceContratacaoById(req.params.id);
    if (!contratacao) {
      return res.status(404).json({ error: "Contratação não encontrada" });
    }
    res.json(contratacao);
  } catch (error: any) {
    res.status(500).json({ error: "Falha ao buscar contratação", details: error?.message });
  }
});

router.post("/marketplace/contratacoes", async (req, res) => {
  try {
    const condominiumId = getCondominiumId(req);
    const moradorId = getUserId(req);
    if (!condominiumId || !moradorId) {
      return res.status(400).json({ error: "Condomínio ou usuário não identificado" });
    }
    const parsed = insertMarketplaceContratacaoSchema.safeParse({ ...req.body, condominiumId, moradorId });
    if (!parsed.success) {
      return res.status(400).json({ error: "Dados inválidos", details: parsed.error.errors });
    }
    const contratacao = await storage.createMarketplaceContratacao(parsed.data);
    res.status(201).json(contratacao);
  } catch (error: any) {
    res.status(500).json({ error: "Falha ao criar contratação", details: error?.message });
  }
});

router.patch("/marketplace/contratacoes/:id", async (req, res) => {
  try {
    const contratacao = await storage.updateMarketplaceContratacao(req.params.id, req.body);
    if (!contratacao) {
      return res.status(404).json({ error: "Contratação não encontrada" });
    }
    res.json(contratacao);
  } catch (error: any) {
    res.status(500).json({ error: "Falha ao atualizar contratação", details: error?.message });
  }
});

router.patch("/marketplace/contratacoes/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: "Status é obrigatório" });
    }
    const contratacao = await storage.atualizarStatusContratacao(req.params.id, status);
    if (!contratacao) {
      return res.status(404).json({ error: "Contratação não encontrada" });
    }
    res.json(contratacao);
  } catch (error: any) {
    res.status(500).json({ error: "Falha ao atualizar status", details: error?.message });
  }
});

// Marketplace Avaliações
router.get("/marketplace/avaliacoes", async (req, res) => {
  try {
    const fornecedorId = req.query.fornecedorId as string | undefined;
    const contratacaoId = req.query.contratacaoId as string | undefined;
    const avaliacoes = await storage.getMarketplaceAvaliacoes(fornecedorId, contratacaoId);
    res.json(avaliacoes);
  } catch (error: any) {
    res.status(500).json({ error: "Falha ao buscar avaliações", details: error?.message });
  }
});

router.post("/marketplace/avaliacoes", async (req, res) => {
  try {
    const moradorId = getUserId(req);
    if (!moradorId) {
      return res.status(401).json({ error: "Usuário não autenticado" });
    }
    const parsed = insertMarketplaceAvaliacaoSchema.safeParse({ ...req.body, moradorId });
    if (!parsed.success) {
      return res.status(400).json({ error: "Dados inválidos", details: parsed.error.errors });
    }
    const avaliacao = await storage.createMarketplaceAvaliacao(parsed.data);
    res.status(201).json(avaliacao);
  } catch (error: any) {
    res.status(500).json({ error: "Falha ao criar avaliação", details: error?.message });
  }
});

// Marketplace Comissões (Admin only)
router.get("/marketplace/comissoes", requireSindicoOrAdmin, async (req, res) => {
  try {
    const condominiumId = getCondominiumId(req);
    if (!condominiumId) {
      return res.status(400).json({ error: "Condomínio não identificado" });
    }
    const comissoes = await storage.getMarketplaceComissoes(condominiumId);
    res.json(comissoes);
  } catch (error: any) {
    res.status(500).json({ error: "Falha ao buscar comissões", details: error?.message });
  }
});

router.post("/marketplace/comissoes", requireSindicoOrAdmin, async (req, res) => {
  try {
    const condominiumId = getCondominiumId(req);
    if (!condominiumId) {
      return res.status(400).json({ error: "Condomínio não identificado" });
    }
    const parsed = insertMarketplaceComissaoSchema.safeParse({ ...req.body, condominiumId });
    if (!parsed.success) {
      return res.status(400).json({ error: "Dados inválidos", details: parsed.error.errors });
    }
    const comissao = await storage.upsertMarketplaceComissao(parsed.data);
    res.status(201).json(comissao);
  } catch (error: any) {
    res.status(500).json({ error: "Falha ao criar/atualizar comissão", details: error?.message });
  }
});

// Marketplace Metrics (Admin only)
router.get("/marketplace/metrics", requireSindicoOrAdmin, async (req, res) => {
  try {
    const condominiumId = getCondominiumId(req);
    if (!condominiumId) {
      return res.status(400).json({ error: "Condomínio não identificado" });
    }
    const metrics = await storage.getMarketplaceMetrics(condominiumId);
    res.json(metrics);
  } catch (error: any) {
    res.status(500).json({ error: "Falha ao buscar métricas", details: error?.message });
  }
});

export default router;
