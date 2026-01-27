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
  requireSindicoOrAdmin,
  requireGestao,
  isGestao,
  getCondominiumRole
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
  insertFinancialTransactionSchema,
  insertBudgetSchema,
  insertGovernanceDecisionSchema,
  insertMeetingMinutesSchema,
  insertSuccessionPlanSchema,
  insertContractSchema,
  insertLegalChecklistSchema,
  insertInsurancePolicySchema,
  insertAutomationRuleSchema,
  insertScheduledTaskSchema,
  insertOperationLogSchema,
  insertTeamMemberSchema,
  insertProcessSchema,
  insertProcessExecutionSchema,
  insertParcelSchema,
  insertMoradorSchema,
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

  // Executive Dashboard - 7 Pillars Overview
  app.get("/api/executive-dashboard", requireGestao, async (req, res) => {
    try {
      const condominiumId = getCondominiumId(req) || (req.query.condominiumId as string) || undefined;

      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const currentYear = now.getFullYear();

      // Get all data from storage for pillar calculations
      const [
        equipment, 
        requests, 
        documents, 
        suppliers, 
        announcements,
        transactions,
        budgets,
        decisions,
        minutes,
        contracts,
        checklistItems,
        policies
      ] = await Promise.all([
        storage.getEquipment(condominiumId),
        storage.getMaintenanceRequests(condominiumId),
        storage.getDocuments(condominiumId),
        storage.getSuppliers(condominiumId),
        storage.getAnnouncements(condominiumId),
        storage.getFinancialTransactions(condominiumId),
        storage.getBudgets(condominiumId, currentYear),
        storage.getGovernanceDecisions(condominiumId),
        storage.getMeetingMinutes(condominiumId),
        storage.getContracts(condominiumId),
        storage.getLegalChecklist(condominiumId),
        storage.getInsurancePolicies(condominiumId),
      ]);

      const alerts: any[] = [];

      // ===========================
      // PILAR 1: GOVERNANÇA E SUCESSÃO (20%)
      // ===========================
      let governancaScore = 50;
      const recentDecisions = decisions.filter(d => new Date(d.createdAt!) >= thirtyDaysAgo);
      const approvedDecisions = decisions.filter(d => d.status === "aprovada");
      const publishedMinutes = minutes.filter(m => m.status === "publicada");
      
      if (decisions.length > 0) {
        const approvalRate = (approvedDecisions.length / decisions.length) * 100;
        governancaScore = Math.min(100, 40 + approvalRate * 0.3 + publishedMinutes.length * 5 + recentDecisions.length * 10);
      } else if (publishedMinutes.length > 0) {
        governancaScore = 60 + publishedMinutes.length * 5;
      }
      governancaScore = Math.round(Math.min(100, Math.max(20, governancaScore)));

      if (recentDecisions.length === 0 && decisions.length > 0) {
        alerts.push({
          id: "gov-inactive",
          pillar: "governanca",
          category: "governanca_inativa",
          severity: "baixo",
          title: "Sem decisões registradas nos últimos 30 dias",
          description: "Recomenda-se manter registro ativo das decisões do condomínio.",
          suggestedAction: "Registrar decisões e atas de reuniões",
          financialImpact: 0,
          createdAt: now.toISOString(),
        });
      }

      // ===========================
      // PILAR 2: FINANCEIRO E ORÇAMENTÁRIO (20%)
      // ===========================
      let financeiroScore = 50;
      const currentMonthTransactions = transactions.filter(t => {
        const date = new Date(t.transactionDate);
        return date.getMonth() === now.getMonth() && date.getFullYear() === currentYear;
      });
      const totalReceitas = transactions.filter(t => t.type === "receita").reduce((sum, t) => sum + (t.amount || 0), 0);
      const totalDespesas = transactions.filter(t => t.type === "despesa").reduce((sum, t) => sum + (t.amount || 0), 0);
      const pendingPayments = transactions.filter(t => t.status === "pendente" && t.type === "despesa");
      const overduePayments = pendingPayments.filter(t => t.dueDate && new Date(t.dueDate) < now);
      const totalPlanned = budgets.reduce((sum, b) => sum + (b.plannedAmount || 0), 0);
      const totalActual = budgets.reduce((sum, b) => sum + (b.actualAmount || 0), 0);

      if (transactions.length > 0 || budgets.length > 0) {
        const budgetAdherence = totalPlanned > 0 ? Math.max(0, 100 - Math.abs((totalActual - totalPlanned) / totalPlanned * 100)) : 50;
        const paymentHealthScore = pendingPayments.length > 0 ? Math.max(0, 100 - (overduePayments.length / pendingPayments.length) * 100) : 100;
        const cashFlowBalance = totalReceitas >= totalDespesas ? 100 : Math.max(0, (totalReceitas / Math.max(1, totalDespesas)) * 100);
        financeiroScore = Math.round((budgetAdherence * 0.4 + paymentHealthScore * 0.3 + cashFlowBalance * 0.3));
      }
      financeiroScore = Math.round(Math.min(100, Math.max(20, financeiroScore)));

      if (overduePayments.length > 0) {
        const overdueAmount = overduePayments.reduce((sum, t) => sum + (t.amount || 0), 0);
        alerts.push({
          id: "finance-overdue",
          pillar: "financeiro",
          category: "inadimplencia",
          severity: overduePayments.length > 5 ? "alto" : "medio",
          title: `${overduePayments.length} pagamento(s) em atraso`,
          description: `Valor total em atraso: R$ ${overdueAmount.toLocaleString('pt-BR')}`,
          suggestedAction: "Regularizar pagamentos pendentes",
          financialImpact: overdueAmount,
          createdAt: now.toISOString(),
        });
      }

      // ===========================
      // PILAR 3: MANUTENÇÃO E ATIVOS (20%)
      // ===========================
      const openRequests = requests.filter(r => r.status !== "concluído").length;
      const urgentRequests = requests.filter(r => r.priority === "urgente" && r.status !== "concluído");
      const totalRequests = requests.length || 1;
      const completedRequests = requests.filter(r => r.status === "concluído");
      const completionRate = (completedRequests.length / totalRequests) * 100;
      let manutencaoScore = Math.max(20, completionRate - (urgentRequests.length * 5));
      manutencaoScore = Math.round(Math.min(100, Math.max(20, manutencaoScore)));

      if (openRequests > 5) {
        alerts.push({
          id: "maintenance-backlog",
          pillar: "manutencao",
          category: "acumulo_solicitacoes",
          severity: openRequests > 15 ? "alto" : "medio",
          title: `${openRequests} solicitações de manutenção pendentes`,
          description: "Acúmulo de solicitações pode indicar problemas operacionais.",
          suggestedAction: "Revisar e priorizar solicitações pendentes",
          financialImpact: openRequests * 200,
          createdAt: now.toISOString(),
        });
      }

      if (urgentRequests.length > 0) {
        alerts.push({
          id: "maintenance-urgent",
          pillar: "manutencao",
          category: "manutencao_urgente",
          severity: "alto",
          title: `${urgentRequests.length} manutenção(ões) urgente(s) pendente(s)`,
          description: "Manutenções urgentes requerem atenção imediata.",
          suggestedAction: "Priorizar atendimento das manutenções urgentes",
          financialImpact: urgentRequests.length * 1000,
          createdAt: now.toISOString(),
        });
      }

      // ===========================
      // PILAR 4: CONTRATOS E FORNECEDORES (15%)
      // ===========================
      let contratosScore = 50;
      const activeContracts = contracts.filter(c => c.status === "ativo");
      const expiringContracts = contracts.filter(c => 
        c.status === "ativo" && c.endDate && new Date(c.endDate) <= thirtyDaysFromNow
      );
      const expiredContracts = contracts.filter(c => 
        c.endDate && new Date(c.endDate) < now && c.status === "ativo"
      );

      if (contracts.length > 0) {
        const activeRate = (activeContracts.length / contracts.length) * 100;
        const expiryPenalty = (expiringContracts.length * 10) + (expiredContracts.length * 20);
        contratosScore = Math.max(20, activeRate - expiryPenalty);
      } else {
        contratosScore = 30;
      }
      contratosScore = Math.round(Math.min(100, Math.max(20, contratosScore)));

      if (expiredContracts.length > 0) {
        alerts.push({
          id: "contract-expired",
          pillar: "contratos",
          category: "vencimento_contrato",
          severity: "alto",
          title: `${expiredContracts.length} contrato(s) vencido(s)`,
          description: "Contratos vencidos precisam ser renovados ou encerrados.",
          suggestedAction: "Revisar e renovar contratos vencidos",
          financialImpact: expiredContracts.length * 2000,
          createdAt: now.toISOString(),
        });
      }

      if (expiringContracts.length > 0) {
        alerts.push({
          id: "contract-expiring",
          pillar: "contratos",
          category: "vencimento_contrato",
          severity: "medio",
          title: `${expiringContracts.length} contrato(s) vencendo em 30 dias`,
          description: "Contratos próximos do vencimento precisam de atenção.",
          suggestedAction: "Iniciar processo de renovação",
          financialImpact: expiringContracts.length * 1000,
          createdAt: now.toISOString(),
        });
      }

      // ===========================
      // PILAR 5: CONFORMIDADE LEGAL E SEGUROS (15%)
      // ===========================
      let conformidadeScore = 50;
      const pendingChecklist = checklistItems.filter(c => c.status === "pendente" || c.status === "vencido");
      const overdueChecklist = checklistItems.filter(c => c.status === "vencido");
      const activePolicies = policies.filter(p => p.status === "ativo");
      const expiringPolicies = policies.filter(p => 
        p.status === "ativo" && p.endDate && new Date(p.endDate) <= thirtyDaysFromNow
      );
      const expiredPolicies = policies.filter(p => 
        p.endDate && new Date(p.endDate) < now && p.status !== "cancelado"
      );
      
      const expiringDocs = documents.filter(d => 
        d.expirationDate && new Date(d.expirationDate) <= thirtyDaysFromNow
      ).length;
      const expiredDocs = documents.filter(d => 
        d.expirationDate && new Date(d.expirationDate) < now
      ).length;

      const complianceItems = checklistItems.length + policies.length + documents.length || 1;
      const problemItems = overdueChecklist.length + expiredPolicies.length + expiredDocs;
      const warningItems = pendingChecklist.length + expiringPolicies.length + expiringDocs;
      conformidadeScore = Math.max(20, 100 - (problemItems * 15 + warningItems * 5));
      conformidadeScore = Math.round(Math.min(100, Math.max(20, conformidadeScore)));

      if (expiredDocs > 0) {
        alerts.push({
          id: "doc-expired",
          pillar: "conformidade",
          category: "vencimento_documento",
          severity: "alto",
          title: `${expiredDocs} documento(s) vencido(s)`,
          description: "Existem documentos com prazo de validade expirado.",
          suggestedAction: "Renovar documentação vencida",
          financialImpact: expiredDocs * 1000,
          createdAt: now.toISOString(),
        });
      }

      if (expiringDocs > 0) {
        alerts.push({
          id: "doc-expiring",
          pillar: "conformidade",
          category: "vencimento_documento",
          severity: "medio",
          title: `${expiringDocs} documento(s) vencendo em 30 dias`,
          description: "Documentos próximos do vencimento precisam de atenção.",
          suggestedAction: "Iniciar processo de renovação",
          financialImpact: expiringDocs * 500,
          createdAt: now.toISOString(),
        });
      }

      if (expiredPolicies.length > 0) {
        alerts.push({
          id: "insurance-expired",
          pillar: "conformidade",
          category: "vencimento_seguro",
          severity: "critico",
          title: `${expiredPolicies.length} apólice(s) de seguro vencida(s)`,
          description: "O condomínio pode estar sem cobertura de seguro!",
          suggestedAction: "Renovar apólices imediatamente",
          financialImpact: expiredPolicies.reduce((sum, p) => sum + (p.coverageAmount || 0), 0),
          createdAt: now.toISOString(),
        });
      }

      // ===========================
      // PILAR 6: OPERAÇÃO E AUTOMAÇÃO (5%)
      // ===========================
      let operacaoScore = 60;
      const hasEquipment = equipment.length > 0;
      const hasDocumentation = documents.length > 5;
      const hasSuppliers = suppliers.length > 0;
      operacaoScore = 40 + (hasEquipment ? 20 : 0) + (hasDocumentation ? 20 : 0) + (hasSuppliers ? 20 : 0);
      operacaoScore = Math.round(Math.min(100, Math.max(20, operacaoScore)));

      // ===========================
      // PILAR 7: TRANSPARÊNCIA E COMUNICAÇÃO (5%)
      // ===========================
      const recentAnnouncements = announcements.filter(a => new Date(a.createdAt) >= thirtyDaysAgo).length;
      let transparenciaScore = Math.min(100, 30 + recentAnnouncements * 15 + publishedMinutes.length * 10);
      transparenciaScore = Math.round(Math.min(100, Math.max(20, transparenciaScore)));

      // Helper function to determine risk level and maturity
      const getRiskLevel = (score: number) => score >= 70 ? "baixo" : score >= 40 ? "medio" : "alto";
      const getMaturityLevel = (score: number) => score >= 80 ? "inteligente" : score >= 60 ? "estruturado" : score >= 40 ? "em_evolucao" : "iniciante";

      const pillarScores = [
        { pillar: "governanca", score: governancaScore, riskLevel: getRiskLevel(governancaScore), maturityLevel: getMaturityLevel(governancaScore), weight: 20 },
        { pillar: "financeiro", score: financeiroScore, riskLevel: getRiskLevel(financeiroScore), maturityLevel: getMaturityLevel(financeiroScore), weight: 20 },
        { pillar: "manutencao", score: manutencaoScore, riskLevel: getRiskLevel(manutencaoScore), maturityLevel: getMaturityLevel(manutencaoScore), weight: 20 },
        { pillar: "contratos", score: contratosScore, riskLevel: getRiskLevel(contratosScore), maturityLevel: getMaturityLevel(contratosScore), weight: 15 },
        { pillar: "conformidade", score: conformidadeScore, riskLevel: getRiskLevel(conformidadeScore), maturityLevel: getMaturityLevel(conformidadeScore), weight: 15 },
        { pillar: "operacao", score: operacaoScore, riskLevel: getRiskLevel(operacaoScore), maturityLevel: getMaturityLevel(operacaoScore), weight: 5 },
        { pillar: "transparencia", score: transparenciaScore, riskLevel: getRiskLevel(transparenciaScore), maturityLevel: getMaturityLevel(transparenciaScore), weight: 5 },
      ];

      // Calculate overall score (weighted average)
      const overallScore = Math.round(
        pillarScores.reduce((sum, p) => sum + (p.score * p.weight), 0) / 100
      );

      // Determine maturity level
      const maturityLevel = getMaturityLevel(overallScore);

      // Calculate risk distribution
      const riskDistribution = {
        high: pillarScores.filter(p => p.riskLevel === "alto").length,
        medium: pillarScores.filter(p => p.riskLevel === "medio").length,
        low: pillarScores.filter(p => p.riskLevel === "baixo").length,
      };

      // Sort alerts by severity
      const severityOrder = { critico: 0, alto: 1, medio: 2, baixo: 3, info: 4 };
      alerts.sort((a, b) => (severityOrder[a.severity as keyof typeof severityOrder] || 4) - (severityOrder[b.severity as keyof typeof severityOrder] || 4));

      const financialImpact = alerts.reduce((sum, a) => sum + (a.financialImpact || 0), 0);

      res.json({
        overallScore,
        maturityLevel,
        pillarScores,
        alerts,
        financialImpact,
        riskDistribution,
        metrics: {
          totalTransactions: transactions.length,
          totalContracts: contracts.length,
          activeContracts: activeContracts.length,
          totalDecisions: decisions.length,
          totalPolicies: policies.length,
          totalEquipment: equipment.length,
        }
      });
    } catch (error: any) {
      console.error("Executive dashboard error:", error?.message || error);
      res.status(500).json({ error: "Failed to fetch executive dashboard data", details: error?.message });
    }
  });

  // ===========================
  // FINANCIAL MODULE ROUTES
  // ===========================

  // Financial Transactions
  app.get("/api/financial/transactions", requireGestao, async (req, res) => {
    try {
      const condominiumId = getCondominiumId(req);
      const transactions = await storage.getFinancialTransactions(condominiumId);
      res.json(transactions);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch transactions", details: error?.message });
    }
  });

  app.get("/api/financial/transactions/:id", async (req, res) => {
    try {
      const transaction = await storage.getFinancialTransactionById(req.params.id);
      if (!transaction) {
        return res.status(404).json({ error: "Transaction not found" });
      }
      res.json(transaction);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch transaction", details: error?.message });
    }
  });

  app.post("/api/financial/transactions", requireSindicoOrAdmin, async (req, res) => {
    try {
      const condominiumId = getCondominiumId(req);
      if (!condominiumId) {
        return res.status(400).json({ error: "Condominium ID is required" });
      }
      const validation = insertFinancialTransactionSchema.safeParse({
        ...req.body,
        condominiumId,
        createdBy: getUserId(req),
      });
      if (!validation.success) {
        return res.status(400).json({ error: "Validation failed", details: validation.error.errors });
      }
      const transaction = await storage.createFinancialTransaction(validation.data);
      res.status(201).json(transaction);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to create transaction", details: error?.message });
    }
  });

  app.patch("/api/financial/transactions/:id", requireSindicoOrAdmin, async (req, res) => {
    try {
      const validation = insertFinancialTransactionSchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "Validation failed", details: validation.error.errors });
      }
      const transaction = await storage.updateFinancialTransaction(req.params.id, validation.data);
      if (!transaction) {
        return res.status(404).json({ error: "Transaction not found" });
      }
      res.json(transaction);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to update transaction", details: error?.message });
    }
  });

  app.delete("/api/financial/transactions/:id", requireSindicoOrAdmin, async (req, res) => {
    try {
      const success = await storage.deleteFinancialTransaction(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Transaction not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to delete transaction", details: error?.message });
    }
  });

  // Budgets
  app.get("/api/budgets", requireGestao, async (req, res) => {
    try {
      const condominiumId = getCondominiumId(req);
      const year = req.query.year ? parseInt(req.query.year as string) : undefined;
      const budgets = await storage.getBudgets(condominiumId, year);
      res.json(budgets);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch budgets", details: error?.message });
    }
  });

  app.get("/api/budgets/:id", async (req, res) => {
    try {
      const budget = await storage.getBudgetById(req.params.id);
      if (!budget) {
        return res.status(404).json({ error: "Budget not found" });
      }
      res.json(budget);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch budget", details: error?.message });
    }
  });

  app.post("/api/budgets", requireSindicoOrAdmin, async (req, res) => {
    try {
      const condominiumId = getCondominiumId(req);
      if (!condominiumId) {
        return res.status(400).json({ error: "Condominium ID is required" });
      }
      const validation = insertBudgetSchema.safeParse({
        ...req.body,
        condominiumId,
        createdBy: getUserId(req),
      });
      if (!validation.success) {
        return res.status(400).json({ error: "Validation failed", details: validation.error.errors });
      }
      const budget = await storage.createBudget(validation.data);
      res.status(201).json(budget);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to create budget", details: error?.message });
    }
  });

  app.patch("/api/budgets/:id", requireSindicoOrAdmin, async (req, res) => {
    try {
      const validation = insertBudgetSchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "Validation failed", details: validation.error.errors });
      }
      const budget = await storage.updateBudget(req.params.id, validation.data);
      if (!budget) {
        return res.status(404).json({ error: "Budget not found" });
      }
      res.json(budget);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to update budget", details: error?.message });
    }
  });

  app.delete("/api/budgets/:id", requireSindicoOrAdmin, async (req, res) => {
    try {
      const success = await storage.deleteBudget(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Budget not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to delete budget", details: error?.message });
    }
  });

  // ===========================
  // GOVERNANCE MODULE ROUTES
  // ===========================

  // Governance Decisions
  app.get("/api/governance/decisions", requireGestao, async (req, res) => {
    try {
      const condominiumId = getCondominiumId(req);
      const decisions = await storage.getGovernanceDecisions(condominiumId);
      res.json(decisions);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch decisions", details: error?.message });
    }
  });

  app.get("/api/governance/decisions/:id", async (req, res) => {
    try {
      const decision = await storage.getGovernanceDecisionById(req.params.id);
      if (!decision) {
        return res.status(404).json({ error: "Decision not found" });
      }
      res.json(decision);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch decision", details: error?.message });
    }
  });

  app.post("/api/governance/decisions", requireSindicoOrAdmin, async (req, res) => {
    try {
      const condominiumId = getCondominiumId(req);
      if (!condominiumId) {
        return res.status(400).json({ error: "Condominium ID is required" });
      }
      const validation = insertGovernanceDecisionSchema.safeParse({
        ...req.body,
        condominiumId,
        createdBy: getUserId(req),
      });
      if (!validation.success) {
        return res.status(400).json({ error: "Validation failed", details: validation.error.errors });
      }
      const decision = await storage.createGovernanceDecision(validation.data);
      res.status(201).json(decision);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to create decision", details: error?.message });
    }
  });

  app.patch("/api/governance/decisions/:id", requireSindicoOrAdmin, async (req, res) => {
    try {
      const validation = insertGovernanceDecisionSchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "Validation failed", details: validation.error.errors });
      }
      const decision = await storage.updateGovernanceDecision(req.params.id, validation.data);
      if (!decision) {
        return res.status(404).json({ error: "Decision not found" });
      }
      res.json(decision);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to update decision", details: error?.message });
    }
  });

  app.delete("/api/governance/decisions/:id", requireSindicoOrAdmin, async (req, res) => {
    try {
      const success = await storage.deleteGovernanceDecision(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Decision not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to delete decision", details: error?.message });
    }
  });

  // Meeting Minutes
  app.get("/api/governance/minutes", requireGestao, async (req, res) => {
    try {
      const condominiumId = getCondominiumId(req);
      const minutes = await storage.getMeetingMinutes(condominiumId);
      res.json(minutes);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch meeting minutes", details: error?.message });
    }
  });

  app.post("/api/governance/minutes", requireSindicoOrAdmin, async (req, res) => {
    try {
      const condominiumId = getCondominiumId(req);
      if (!condominiumId) {
        return res.status(400).json({ error: "Condominium ID is required" });
      }
      const validation = insertMeetingMinutesSchema.safeParse({
        ...req.body,
        condominiumId,
        createdBy: getUserId(req),
      });
      if (!validation.success) {
        return res.status(400).json({ error: "Validation failed", details: validation.error.errors });
      }
      const minutes = await storage.createMeetingMinutes(validation.data);
      res.status(201).json(minutes);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to create meeting minutes", details: error?.message });
    }
  });

  app.patch("/api/governance/minutes/:id", requireSindicoOrAdmin, async (req, res) => {
    try {
      const validation = insertMeetingMinutesSchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "Validation failed", details: validation.error.errors });
      }
      const minutes = await storage.updateMeetingMinutes(req.params.id, validation.data);
      if (!minutes) {
        return res.status(404).json({ error: "Meeting minutes not found" });
      }
      res.json(minutes);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to update meeting minutes", details: error?.message });
    }
  });

  app.delete("/api/governance/minutes/:id", requireSindicoOrAdmin, async (req, res) => {
    try {
      const success = await storage.deleteMeetingMinutes(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Meeting minutes not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to delete meeting minutes", details: error?.message });
    }
  });

  // Succession Plan
  app.get("/api/governance/succession-plan", requireGestao, async (req, res) => {
    try {
      const condominiumId = getCondominiumId(req);
      if (!condominiumId) {
        return res.status(400).json({ error: "Condominium ID is required" });
      }
      const plan = await storage.getSuccessionPlan(condominiumId);
      res.json(plan || null);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch succession plan", details: error?.message });
    }
  });

  app.post("/api/governance/succession-plan", requireSindicoOrAdmin, async (req, res) => {
    try {
      const condominiumId = getCondominiumId(req);
      if (!condominiumId) {
        return res.status(400).json({ error: "Condominium ID is required" });
      }
      const validation = insertSuccessionPlanSchema.safeParse({
        ...req.body,
        condominiumId,
        createdBy: getUserId(req),
      });
      if (!validation.success) {
        return res.status(400).json({ error: "Validation failed", details: validation.error.errors });
      }
      const plan = await storage.createSuccessionPlan(validation.data);
      res.status(201).json(plan);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to create succession plan", details: error?.message });
    }
  });

  app.patch("/api/governance/succession-plan/:id", requireSindicoOrAdmin, async (req, res) => {
    try {
      const validation = insertSuccessionPlanSchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "Validation failed", details: validation.error.errors });
      }
      const plan = await storage.updateSuccessionPlan(req.params.id, validation.data);
      if (!plan) {
        return res.status(404).json({ error: "Succession plan not found" });
      }
      res.json(plan);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to update succession plan", details: error?.message });
    }
  });

  // ===========================
  // CONTRACTS MODULE ROUTES
  // ===========================

  app.get("/api/contracts", requireGestao, async (req, res) => {
    try {
      const condominiumId = getCondominiumId(req);
      const contracts = await storage.getContracts(condominiumId);
      res.json(contracts);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch contracts", details: error?.message });
    }
  });

  app.get("/api/contracts/:id", async (req, res) => {
    try {
      const contract = await storage.getContractById(req.params.id);
      if (!contract) {
        return res.status(404).json({ error: "Contract not found" });
      }
      res.json(contract);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch contract", details: error?.message });
    }
  });

  app.post("/api/contracts", requireSindicoOrAdmin, async (req, res) => {
    try {
      const condominiumId = getCondominiumId(req);
      if (!condominiumId) {
        return res.status(400).json({ error: "Condominium ID is required" });
      }
      const validation = insertContractSchema.safeParse({
        ...req.body,
        condominiumId,
        createdBy: getUserId(req),
      });
      if (!validation.success) {
        return res.status(400).json({ error: "Validation failed", details: validation.error.errors });
      }
      const contract = await storage.createContract(validation.data);
      res.status(201).json(contract);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to create contract", details: error?.message });
    }
  });

  app.patch("/api/contracts/:id", requireSindicoOrAdmin, async (req, res) => {
    try {
      const validation = insertContractSchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "Validation failed", details: validation.error.errors });
      }
      const contract = await storage.updateContract(req.params.id, validation.data);
      if (!contract) {
        return res.status(404).json({ error: "Contract not found" });
      }
      res.json(contract);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to update contract", details: error?.message });
    }
  });

  app.delete("/api/contracts/:id", requireSindicoOrAdmin, async (req, res) => {
    try {
      const success = await storage.deleteContract(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Contract not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to delete contract", details: error?.message });
    }
  });

  // ===========================
  // COMPLIANCE MODULE ROUTES
  // ===========================

  // Legal Checklist
  app.get("/api/compliance/checklist", requireGestao, async (req, res) => {
    try {
      const condominiumId = getCondominiumId(req);
      const checklist = await storage.getLegalChecklist(condominiumId);
      res.json(checklist);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch checklist", details: error?.message });
    }
  });

  app.post("/api/compliance/checklist", requireSindicoOrAdmin, async (req, res) => {
    try {
      const condominiumId = getCondominiumId(req);
      if (!condominiumId) {
        return res.status(400).json({ error: "Condominium ID is required" });
      }
      const validation = insertLegalChecklistSchema.safeParse({
        ...req.body,
        condominiumId,
        createdBy: getUserId(req),
      });
      if (!validation.success) {
        return res.status(400).json({ error: "Validation failed", details: validation.error.errors });
      }
      const item = await storage.createLegalChecklistItem(validation.data);
      res.status(201).json(item);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to create checklist item", details: error?.message });
    }
  });

  app.patch("/api/compliance/checklist/:id", requireSindicoOrAdmin, async (req, res) => {
    try {
      const validation = insertLegalChecklistSchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "Validation failed", details: validation.error.errors });
      }
      const item = await storage.updateLegalChecklistItem(req.params.id, validation.data);
      if (!item) {
        return res.status(404).json({ error: "Checklist item not found" });
      }
      res.json(item);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to update checklist item", details: error?.message });
    }
  });

  app.delete("/api/compliance/checklist/:id", requireSindicoOrAdmin, async (req, res) => {
    try {
      const success = await storage.deleteLegalChecklistItem(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Checklist item not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to delete checklist item", details: error?.message });
    }
  });

  // Insurance Policies
  app.get("/api/insurance/policies", requireGestao, async (req, res) => {
    try {
      const condominiumId = getCondominiumId(req);
      const policies = await storage.getInsurancePolicies(condominiumId);
      res.json(policies);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch policies", details: error?.message });
    }
  });

  app.post("/api/insurance/policies", requireSindicoOrAdmin, async (req, res) => {
    try {
      const condominiumId = getCondominiumId(req);
      if (!condominiumId) {
        return res.status(400).json({ error: "Condominium ID is required" });
      }
      const validation = insertInsurancePolicySchema.safeParse({
        ...req.body,
        condominiumId,
        createdBy: getUserId(req),
      });
      if (!validation.success) {
        return res.status(400).json({ error: "Validation failed", details: validation.error.errors });
      }
      const policy = await storage.createInsurancePolicy(validation.data);
      res.status(201).json(policy);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to create policy", details: error?.message });
    }
  });

  app.patch("/api/insurance/policies/:id", requireSindicoOrAdmin, async (req, res) => {
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

  app.delete("/api/insurance/policies/:id", requireSindicoOrAdmin, async (req, res) => {
    try {
      const success = await storage.deleteInsurancePolicy(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Policy not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to delete policy", details: error?.message });
    }
  });

  // Smart Alerts
  app.get("/api/alerts", async (req, res) => {
    try {
      const condominiumId = getCondominiumId(req);
      const alerts = await storage.getSmartAlerts(condominiumId);
      res.json(alerts);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch alerts", details: error?.message });
    }
  });

  app.post("/api/alerts/:id/resolve", async (req, res) => {
    try {
      const userId = getUserId(req);
      const alert = await storage.resolveSmartAlert(req.params.id, userId || "system");
      if (!alert) {
        return res.status(404).json({ error: "Alert not found" });
      }
      res.json(alert);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to resolve alert", details: error?.message });
    }
  });

  // Financial Summary endpoint for dashboard
  app.get("/api/financial/summary", requireGestao, async (req, res) => {
    try {
      const condominiumId = getCondominiumId(req);
      const transactions = await storage.getFinancialTransactions(condominiumId);
      const budgets = await storage.getBudgets(condominiumId, new Date().getFullYear());
      
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      
      const monthlyTransactions = transactions.filter(t => {
        const date = new Date(t.transactionDate);
        return date.getMonth() + 1 === currentMonth && date.getFullYear() === now.getFullYear();
      });
      
      const totalReceitas = monthlyTransactions
        .filter(t => t.type === "receita")
        .reduce((sum, t) => sum + (t.amount || 0), 0);
        
      const totalDespesas = monthlyTransactions
        .filter(t => t.type === "despesa")
        .reduce((sum, t) => sum + (t.amount || 0), 0);
      
      const totalPlanned = budgets
        .filter(b => !b.month || b.month === currentMonth)
        .reduce((sum, b) => sum + (b.plannedAmount || 0), 0);
        
      const totalActual = budgets
        .filter(b => !b.month || b.month === currentMonth)
        .reduce((sum, b) => sum + (b.actualAmount || 0), 0);
      
      res.json({
        currentMonth: {
          receitas: totalReceitas,
          despesas: totalDespesas,
          saldo: totalReceitas - totalDespesas,
        },
        budget: {
          planned: totalPlanned,
          actual: totalActual,
          variance: totalPlanned - totalActual,
          variancePercent: totalPlanned > 0 ? ((totalPlanned - totalActual) / totalPlanned) * 100 : 0,
        },
        recentTransactions: transactions.slice(0, 10),
      });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch financial summary", details: error?.message });
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

  // ===========================
  // PILAR 6: OPERAÇÃO E AUTOMAÇÃO
  // ===========================

  // Automation Rules
  app.get("/api/automation/rules", requireGestao, async (req, res) => {
    try {
      const condominiumId = req.condominiumContext?.condominiumId;
      const rules = await storage.getAutomationRules(condominiumId);
      res.json(rules);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch automation rules" });
    }
  });

  app.get("/api/automation/rules/:id", requireGestao, async (req, res) => {
    try {
      const rule = await storage.getAutomationRuleById(req.params.id);
      if (!rule) {
        return res.status(404).json({ error: "Automation rule not found" });
      }
      res.json(rule);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch automation rule" });
    }
  });

  app.post("/api/automation/rules", requireSindicoOrAdmin, async (req, res) => {
    try {
      const condominiumId = req.condominiumContext?.condominiumId;
      if (!condominiumId) {
        return res.status(401).json({ error: "Condomínio não selecionado" });
      }
      const validation = insertAutomationRuleSchema.safeParse({
        ...req.body,
        condominiumId,
        createdBy: getUserId(req),
      });
      if (!validation.success) {
        return res.status(400).json({ error: "Validation failed", details: validation.error.errors });
      }
      const rule = await storage.createAutomationRule(validation.data);
      res.status(201).json(rule);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/automation/rules/:id", requireSindicoOrAdmin, async (req, res) => {
    try {
      const validation = insertAutomationRuleSchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "Validation failed", details: validation.error.errors });
      }
      const rule = await storage.updateAutomationRule(req.params.id, validation.data);
      if (!rule) {
        return res.status(404).json({ error: "Automation rule not found" });
      }
      res.json(rule);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/automation/rules/:id", requireSindicoOrAdmin, async (req, res) => {
    try {
      await storage.deleteAutomationRule(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: "Failed to delete automation rule" });
    }
  });

  // Scheduled Tasks
  app.get("/api/automation/tasks", requireGestao, async (req, res) => {
    try {
      const condominiumId = req.condominiumContext?.condominiumId;
      const tasks = await storage.getScheduledTasks(condominiumId);
      res.json(tasks);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch scheduled tasks" });
    }
  });

  app.get("/api/automation/tasks/:id", requireGestao, async (req, res) => {
    try {
      const task = await storage.getScheduledTaskById(req.params.id);
      if (!task) {
        return res.status(404).json({ error: "Scheduled task not found" });
      }
      res.json(task);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch scheduled task" });
    }
  });

  app.post("/api/automation/tasks", requireSindicoOrAdmin, async (req, res) => {
    try {
      const condominiumId = req.condominiumContext?.condominiumId;
      if (!condominiumId) {
        return res.status(401).json({ error: "Condomínio não selecionado" });
      }
      const validation = insertScheduledTaskSchema.safeParse({
        ...req.body,
        condominiumId,
        createdBy: getUserId(req),
      });
      if (!validation.success) {
        return res.status(400).json({ error: "Validation failed", details: validation.error.errors });
      }
      const task = await storage.createScheduledTask(validation.data);
      res.status(201).json(task);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/automation/tasks/:id", requireSindicoOrAdmin, async (req, res) => {
    try {
      const validation = insertScheduledTaskSchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "Validation failed", details: validation.error.errors });
      }
      const task = await storage.updateScheduledTask(req.params.id, validation.data);
      if (!task) {
        return res.status(404).json({ error: "Scheduled task not found" });
      }
      res.json(task);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/automation/tasks/:id", requireSindicoOrAdmin, async (req, res) => {
    try {
      await storage.deleteScheduledTask(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: "Failed to delete scheduled task" });
    }
  });

  // Operation Logs
  app.get("/api/automation/logs", requireGestao, async (req, res) => {
    try {
      const condominiumId = req.condominiumContext?.condominiumId;
      const logs = await storage.getOperationLogs(condominiumId);
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch operation logs" });
    }
  });

  app.post("/api/automation/logs", requireSindicoOrAdmin, async (req, res) => {
    try {
      const condominiumId = req.condominiumContext?.condominiumId;
      if (!condominiumId) {
        return res.status(401).json({ error: "Condomínio não selecionado" });
      }
      const validation = insertOperationLogSchema.safeParse({
        ...req.body,
        condominiumId,
      });
      if (!validation.success) {
        return res.status(400).json({ error: "Validation failed", details: validation.error.errors });
      }
      const log = await storage.createOperationLog(validation.data);
      res.status(201).json(log);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Team Members
  app.get("/api/team-members", requireGestao, async (req, res) => {
    try {
      const condominiumId = req.condominiumContext?.condominiumId;
      const members = await storage.getTeamMembers(condominiumId);
      res.json(members);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch team members" });
    }
  });

  app.get("/api/team-members/:id", requireGestao, async (req, res) => {
    try {
      const member = await storage.getTeamMemberById(req.params.id);
      if (!member) {
        return res.status(404).json({ error: "Team member not found" });
      }
      res.json(member);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch team member" });
    }
  });

  app.post("/api/team-members", requireSindicoOrAdmin, async (req, res) => {
    try {
      const condominiumId = req.condominiumContext?.condominiumId;
      if (!condominiumId) {
        return res.status(401).json({ error: "Condomínio não selecionado" });
      }
      const validation = insertTeamMemberSchema.safeParse({
        ...req.body,
        condominiumId,
      });
      if (!validation.success) {
        return res.status(400).json({ error: "Validation failed", details: validation.error.errors });
      }
      const member = await storage.createTeamMember(validation.data);
      res.status(201).json(member);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/team-members/:id", requireSindicoOrAdmin, async (req, res) => {
    try {
      const validation = insertTeamMemberSchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "Validation failed", details: validation.error.errors });
      }
      const member = await storage.updateTeamMember(req.params.id, validation.data);
      if (!member) {
        return res.status(404).json({ error: "Team member not found" });
      }
      res.json(member);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/team-members/:id", requireSindicoOrAdmin, async (req, res) => {
    try {
      await storage.deleteTeamMember(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: "Failed to delete team member" });
    }
  });

  // Processes
  app.get("/api/processes", requireGestao, async (req, res) => {
    try {
      const condominiumId = req.condominiumContext?.condominiumId;
      const processes = await storage.getProcesses(condominiumId);
      res.json(processes);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch processes" });
    }
  });

  app.get("/api/processes/:id", requireGestao, async (req, res) => {
    try {
      const process = await storage.getProcessById(req.params.id);
      if (!process) {
        return res.status(404).json({ error: "Process not found" });
      }
      res.json(process);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch process" });
    }
  });

  app.post("/api/processes", requireSindicoOrAdmin, async (req, res) => {
    try {
      const condominiumId = req.condominiumContext?.condominiumId;
      if (!condominiumId) {
        return res.status(401).json({ error: "Condomínio não selecionado" });
      }
      const validation = insertProcessSchema.safeParse({
        ...req.body,
        condominiumId,
      });
      if (!validation.success) {
        return res.status(400).json({ error: "Validation failed", details: validation.error.errors });
      }
      const process = await storage.createProcess(validation.data);
      res.status(201).json(process);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/processes/:id", requireSindicoOrAdmin, async (req, res) => {
    try {
      const validation = insertProcessSchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "Validation failed", details: validation.error.errors });
      }
      const process = await storage.updateProcess(req.params.id, validation.data);
      if (!process) {
        return res.status(404).json({ error: "Process not found" });
      }
      res.json(process);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/processes/:id", requireSindicoOrAdmin, async (req, res) => {
    try {
      await storage.deleteProcess(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: "Failed to delete process" });
    }
  });

  // Process Executions
  app.get("/api/process-executions", requireGestao, async (req, res) => {
    try {
      const condominiumId = req.condominiumContext?.condominiumId;
      const executions = await storage.getProcessExecutions(condominiumId);
      res.json(executions);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch process executions" });
    }
  });

  app.get("/api/process-executions/:id", requireGestao, async (req, res) => {
    try {
      const execution = await storage.getProcessExecutionById(req.params.id);
      if (!execution) {
        return res.status(404).json({ error: "Process execution not found" });
      }
      res.json(execution);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch process execution" });
    }
  });

  app.post("/api/process-executions", requireSindicoOrAdmin, async (req, res) => {
    try {
      const condominiumId = req.condominiumContext?.condominiumId;
      if (!condominiumId) {
        return res.status(401).json({ error: "Condomínio não selecionado" });
      }
      const validation = insertProcessExecutionSchema.safeParse({
        ...req.body,
        condominiumId,
      });
      if (!validation.success) {
        return res.status(400).json({ error: "Validation failed", details: validation.error.errors });
      }
      const execution = await storage.createProcessExecution(validation.data);
      res.status(201).json(execution);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/process-executions/:id", requireSindicoOrAdmin, async (req, res) => {
    try {
      const validation = insertProcessExecutionSchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "Validation failed", details: validation.error.errors });
      }
      const execution = await storage.updateProcessExecution(req.params.id, validation.data);
      if (!execution) {
        return res.status(404).json({ error: "Process execution not found" });
      }
      res.json(execution);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/process-executions/:id", requireSindicoOrAdmin, async (req, res) => {
    try {
      await storage.deleteProcessExecution(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: "Failed to delete process execution" });
    }
  });

  // Parcels - Encomendas
  app.get("/api/parcels", requireGestao, async (req, res) => {
    try {
      const condominiumId = req.condominiumContext?.condominiumId;
      const parcels = await storage.getParcels(condominiumId);
      res.json(parcels);
    } catch (error: any) {
      res.status(500).json({ error: "Falha ao buscar encomendas" });
    }
  });

  app.get("/api/parcels/:id", requireGestao, async (req, res) => {
    try {
      const parcel = await storage.getParcelById(req.params.id);
      if (!parcel) {
        return res.status(404).json({ error: "Encomenda não encontrada" });
      }
      res.json(parcel);
    } catch (error: any) {
      res.status(500).json({ error: "Falha ao buscar encomenda" });
    }
  });

  app.get("/api/parcels/unit/:unit", requireGestao, async (req, res) => {
    try {
      const condominiumId = req.condominiumContext?.condominiumId;
      if (!condominiumId) {
        return res.status(401).json({ error: "Condomínio não selecionado" });
      }
      const parcels = await storage.getParcelsByUnit(condominiumId, req.params.unit);
      res.json(parcels);
    } catch (error: any) {
      res.status(500).json({ error: "Falha ao buscar encomendas da unidade" });
    }
  });

  app.post("/api/parcels", requireGestao, async (req, res) => {
    try {
      const condominiumId = req.condominiumContext?.condominiumId;
      if (!condominiumId) {
        return res.status(401).json({ error: "Condomínio não selecionado" });
      }
      const validation = insertParcelSchema.safeParse({
        ...req.body,
        condominiumId,
      });
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors });
      }
      const parcel = await storage.createParcel(validation.data);
      res.status(201).json(parcel);
    } catch (error: any) {
      res.status(500).json({ error: "Falha ao criar encomenda" });
    }
  });

  app.patch("/api/parcels/:id", requireGestao, async (req, res) => {
    try {
      const parcel = await storage.updateParcel(req.params.id, req.body);
      if (!parcel) {
        return res.status(404).json({ error: "Encomenda não encontrada" });
      }
      res.json(parcel);
    } catch (error: any) {
      res.status(500).json({ error: "Falha ao atualizar encomenda" });
    }
  });

  app.delete("/api/parcels/:id", requireSindicoOrAdmin, async (req, res) => {
    try {
      await storage.deleteParcel(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: "Falha ao excluir encomenda" });
    }
  });

  // Moradores - Cadastro de Proprietários e Moradores
  app.get("/api/moradores", requireGestao, async (req, res) => {
    try {
      const condominiumId = req.condominiumContext?.condominiumId;
      const moradores = await storage.getMoradores(condominiumId);
      res.json(moradores);
    } catch (error: any) {
      res.status(500).json({ error: "Falha ao buscar moradores" });
    }
  });

  app.get("/api/moradores/:id", requireGestao, async (req, res) => {
    try {
      const morador = await storage.getMoradorById(req.params.id);
      if (!morador) {
        return res.status(404).json({ error: "Morador não encontrado" });
      }
      res.json(morador);
    } catch (error: any) {
      res.status(500).json({ error: "Falha ao buscar morador" });
    }
  });

  app.post("/api/moradores", requireSindicoOrAdmin, async (req, res) => {
    try {
      const condominiumId = req.condominiumContext?.condominiumId;
      if (!condominiumId) {
        return res.status(401).json({ error: "Condomínio não selecionado" });
      }
      const validation = insertMoradorSchema.safeParse({
        ...req.body,
        condominiumId,
      });
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors });
      }
      // Check for duplicate CPF
      const existingMorador = await storage.getMoradorByCpf(condominiumId, validation.data.cpf);
      if (existingMorador) {
        return res.status(400).json({ error: "CPF já cadastrado neste condomínio" });
      }
      const morador = await storage.createMorador(validation.data);
      res.status(201).json(morador);
    } catch (error: any) {
      res.status(500).json({ error: "Falha ao criar morador" });
    }
  });

  app.patch("/api/moradores/:id", requireSindicoOrAdmin, async (req, res) => {
    try {
      const condominiumId = req.condominiumContext?.condominiumId;
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
      res.status(500).json({ error: "Falha ao atualizar morador" });
    }
  });

  // Soft delete - sets status to 'inativo' instead of deleting
  app.delete("/api/moradores/:id", requireSindicoOrAdmin, async (req, res) => {
    try {
      const morador = await storage.updateMorador(req.params.id, { status: "inativo" });
      if (!morador) {
        return res.status(404).json({ error: "Morador não encontrado" });
      }
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: "Falha ao inativar morador" });
    }
  });

  // ========== MARKETPLACE DE SERVICOS ==========

  // Categorias de Servicos
  app.get("/api/categorias-servicos", requireGestao, async (req, res) => {
    try {
      const categorias = await storage.getCategoriasServicos(req.condominiumId);
      res.json(categorias);
    } catch (error: any) {
      res.status(500).json({ error: "Falha ao buscar categorias" });
    }
  });

  app.get("/api/categorias-servicos/:id", requireGestao, async (req, res) => {
    try {
      const categoria = await storage.getCategoriaServicoById(req.params.id);
      if (!categoria) {
        return res.status(404).json({ error: "Categoria não encontrada" });
      }
      res.json(categoria);
    } catch (error: any) {
      res.status(500).json({ error: "Falha ao buscar categoria" });
    }
  });

  app.post("/api/categorias-servicos", requireSindicoOrAdmin, async (req, res) => {
    try {
      const categoria = await storage.createCategoriaServico({
        ...req.body,
        condominiumId: req.condominiumId,
      });
      res.status(201).json(categoria);
    } catch (error: any) {
      res.status(500).json({ error: "Falha ao criar categoria" });
    }
  });

  app.patch("/api/categorias-servicos/:id", requireSindicoOrAdmin, async (req, res) => {
    try {
      const categoria = await storage.updateCategoriaServico(req.params.id, req.body);
      if (!categoria) {
        return res.status(404).json({ error: "Categoria não encontrada" });
      }
      res.json(categoria);
    } catch (error: any) {
      res.status(500).json({ error: "Falha ao atualizar categoria" });
    }
  });

  app.delete("/api/categorias-servicos/:id", requireSindicoOrAdmin, async (req, res) => {
    try {
      await storage.deleteCategoriaServico(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: "Falha ao excluir categoria" });
    }
  });

  // Servicos
  app.get("/api/servicos", requireGestao, async (req, res) => {
    try {
      const servicos = await storage.getServicos(req.condominiumId);
      res.json(servicos);
    } catch (error: any) {
      res.status(500).json({ error: "Falha ao buscar servicos" });
    }
  });

  app.get("/api/servicos/:id", requireGestao, async (req, res) => {
    try {
      const servico = await storage.getServicoById(req.params.id);
      if (!servico) {
        return res.status(404).json({ error: "Servico não encontrado" });
      }
      res.json(servico);
    } catch (error: any) {
      res.status(500).json({ error: "Falha ao buscar servico" });
    }
  });

  app.get("/api/servicos/categoria/:categoriaId", requireGestao, async (req, res) => {
    try {
      const servicos = await storage.getServicosByCategoria(req.params.categoriaId);
      res.json(servicos);
    } catch (error: any) {
      res.status(500).json({ error: "Falha ao buscar servicos por categoria" });
    }
  });

  app.post("/api/servicos", requireSindicoOrAdmin, async (req, res) => {
    try {
      const servico = await storage.createServico({
        ...req.body,
        condominiumId: req.condominiumId,
      });
      res.status(201).json(servico);
    } catch (error: any) {
      res.status(500).json({ error: "Falha ao criar servico" });
    }
  });

  app.patch("/api/servicos/:id", requireSindicoOrAdmin, async (req, res) => {
    try {
      const servico = await storage.updateServico(req.params.id, req.body);
      if (!servico) {
        return res.status(404).json({ error: "Servico não encontrado" });
      }
      res.json(servico);
    } catch (error: any) {
      res.status(500).json({ error: "Falha ao atualizar servico" });
    }
  });

  app.delete("/api/servicos/:id", requireSindicoOrAdmin, async (req, res) => {
    try {
      await storage.deleteServico(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: "Falha ao excluir servico" });
    }
  });

  // Fornecedores Marketplace
  app.get("/api/fornecedores-marketplace", requireGestao, async (req, res) => {
    try {
      const fornecedores = await storage.getFornecedoresMarketplace(req.condominiumId);
      res.json(fornecedores);
    } catch (error: any) {
      res.status(500).json({ error: "Falha ao buscar fornecedores" });
    }
  });

  app.get("/api/fornecedores-marketplace/:id", requireGestao, async (req, res) => {
    try {
      const fornecedor = await storage.getFornecedorMarketplaceById(req.params.id);
      if (!fornecedor) {
        return res.status(404).json({ error: "Fornecedor não encontrado" });
      }
      res.json(fornecedor);
    } catch (error: any) {
      res.status(500).json({ error: "Falha ao buscar fornecedor" });
    }
  });

  app.post("/api/fornecedores-marketplace", requireSindicoOrAdmin, async (req, res) => {
    try {
      const fornecedor = await storage.createFornecedorMarketplace({
        ...req.body,
        condominiumId: req.condominiumId,
      });
      res.status(201).json(fornecedor);
    } catch (error: any) {
      res.status(500).json({ error: "Falha ao criar fornecedor" });
    }
  });

  app.patch("/api/fornecedores-marketplace/:id", requireSindicoOrAdmin, async (req, res) => {
    try {
      const fornecedor = await storage.updateFornecedorMarketplace(req.params.id, req.body);
      if (!fornecedor) {
        return res.status(404).json({ error: "Fornecedor não encontrado" });
      }
      res.json(fornecedor);
    } catch (error: any) {
      res.status(500).json({ error: "Falha ao atualizar fornecedor" });
    }
  });

  app.delete("/api/fornecedores-marketplace/:id", requireSindicoOrAdmin, async (req, res) => {
    try {
      await storage.deleteFornecedorMarketplace(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: "Falha ao excluir fornecedor" });
    }
  });

  // Ofertas
  app.get("/api/ofertas", requireGestao, async (req, res) => {
    try {
      const ofertas = await storage.getOfertas(req.condominiumId);
      res.json(ofertas);
    } catch (error: any) {
      res.status(500).json({ error: "Falha ao buscar ofertas" });
    }
  });

  app.get("/api/ofertas/:id", requireGestao, async (req, res) => {
    try {
      const oferta = await storage.getOfertaById(req.params.id);
      if (!oferta) {
        return res.status(404).json({ error: "Oferta não encontrada" });
      }
      res.json(oferta);
    } catch (error: any) {
      res.status(500).json({ error: "Falha ao buscar oferta" });
    }
  });

  app.get("/api/ofertas/servico/:servicoId", requireGestao, async (req, res) => {
    try {
      const ofertas = await storage.getOfertasByServico(req.params.servicoId);
      res.json(ofertas);
    } catch (error: any) {
      res.status(500).json({ error: "Falha ao buscar ofertas por servico" });
    }
  });

  app.get("/api/ofertas/fornecedor/:fornecedorId", requireGestao, async (req, res) => {
    try {
      const ofertas = await storage.getOfertasByFornecedor(req.params.fornecedorId);
      res.json(ofertas);
    } catch (error: any) {
      res.status(500).json({ error: "Falha ao buscar ofertas por fornecedor" });
    }
  });

  app.post("/api/ofertas", requireSindicoOrAdmin, async (req, res) => {
    try {
      const oferta = await storage.createOferta({
        ...req.body,
        condominiumId: req.condominiumId,
      });
      res.status(201).json(oferta);
    } catch (error: any) {
      res.status(500).json({ error: "Falha ao criar oferta" });
    }
  });

  app.patch("/api/ofertas/:id", requireSindicoOrAdmin, async (req, res) => {
    try {
      const oferta = await storage.updateOferta(req.params.id, req.body);
      if (!oferta) {
        return res.status(404).json({ error: "Oferta não encontrada" });
      }
      res.json(oferta);
    } catch (error: any) {
      res.status(500).json({ error: "Falha ao atualizar oferta" });
    }
  });

  app.delete("/api/ofertas/:id", requireSindicoOrAdmin, async (req, res) => {
    try {
      await storage.deleteOferta(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: "Falha ao excluir oferta" });
    }
  });

  // Contratacoes
  app.get("/api/contratacoes", requireGestao, async (req, res) => {
    try {
      const contratacoes = await storage.getContratacoes(req.condominiumId);
      res.json(contratacoes);
    } catch (error: any) {
      res.status(500).json({ error: "Falha ao buscar contratacoes" });
    }
  });

  app.get("/api/contratacoes/:id", requireGestao, async (req, res) => {
    try {
      const contratacao = await storage.getContratacaoById(req.params.id);
      if (!contratacao) {
        return res.status(404).json({ error: "Contratacao não encontrada" });
      }
      res.json(contratacao);
    } catch (error: any) {
      res.status(500).json({ error: "Falha ao buscar contratacao" });
    }
  });

  app.get("/api/contratacoes/morador/:moradorId", requireGestao, async (req, res) => {
    try {
      const contratacoes = await storage.getContratacoesByMorador(req.params.moradorId);
      res.json(contratacoes);
    } catch (error: any) {
      res.status(500).json({ error: "Falha ao buscar contratacoes por morador" });
    }
  });

  app.post("/api/contratacoes", requireGestao, async (req, res) => {
    try {
      const contratacao = await storage.createContratacao({
        ...req.body,
        condominiumId: req.condominiumId,
      });
      res.status(201).json(contratacao);
    } catch (error: any) {
      res.status(500).json({ error: "Falha ao criar contratacao" });
    }
  });

  app.patch("/api/contratacoes/:id", requireGestao, async (req, res) => {
    try {
      const contratacao = await storage.updateContratacao(req.params.id, req.body);
      if (!contratacao) {
        return res.status(404).json({ error: "Contratacao não encontrada" });
      }
      res.json(contratacao);
    } catch (error: any) {
      res.status(500).json({ error: "Falha ao atualizar contratacao" });
    }
  });

  app.patch("/api/contratacoes/:id/status", requireGestao, async (req, res) => {
    try {
      const { status } = req.body;
      const updateData: any = { status };
      
      if (status === "aceito") {
        updateData.dataAceite = new Date();
      } else if (status === "concluido") {
        updateData.dataConclusao = new Date();
      }
      
      const contratacao = await storage.updateContratacao(req.params.id, updateData);
      if (!contratacao) {
        return res.status(404).json({ error: "Contratacao não encontrada" });
      }
      res.json(contratacao);
    } catch (error: any) {
      res.status(500).json({ error: "Falha ao atualizar status" });
    }
  });

  app.patch("/api/contratacoes/:id/avaliar", requireGestao, async (req, res) => {
    try {
      const { avaliacao, comentarioAvaliacao } = req.body;
      const contratacao = await storage.updateContratacao(req.params.id, {
        avaliacao,
        comentarioAvaliacao,
      });
      if (!contratacao) {
        return res.status(404).json({ error: "Contratacao não encontrada" });
      }
      
      // Update fornecedor average rating
      const oferta = await storage.getOfertaById(contratacao.ofertaId);
      if (oferta) {
        const fornecedor = await storage.getFornecedorMarketplaceById(oferta.fornecedorId);
        if (fornecedor) {
          const currentTotal = (fornecedor.avaliacaoMedia || 0) * (fornecedor.totalAvaliacoes || 0);
          const newTotal = fornecedor.totalAvaliacoes || 0;
          const newAverage = (currentTotal + avaliacao) / (newTotal + 1);
          await storage.updateFornecedorMarketplace(oferta.fornecedorId, {
            avaliacaoMedia: newAverage,
            totalAvaliacoes: newTotal + 1,
          });
        }
      }
      
      res.json(contratacao);
    } catch (error: any) {
      res.status(500).json({ error: "Falha ao avaliar contratacao" });
    }
  });

  // Marketplace - Servicos recomendados para morador
  app.get("/api/marketplace", requireGestao, async (req, res) => {
    try {
      const moradorId = req.query.moradorId as string;
      
      // Buscar todas ofertas ativas
      const ofertas = await storage.getOfertas(req.condominiumId);
      const ofertasAtivas = ofertas.filter(o => o.ativo);
      
      // Buscar servicos e fornecedores para enriquecer dados
      const servicos = await storage.getServicos(req.condominiumId);
      const fornecedores = await storage.getFornecedoresMarketplace(req.condominiumId);
      const categorias = await storage.getCategoriasServicos(req.condominiumId);
      
      // Enriquecer ofertas com dados do servico e fornecedor
      const ofertasEnriquecidas = ofertasAtivas.map(oferta => {
        const servico = servicos.find(s => s.id === oferta.servicoId);
        const fornecedor = fornecedores.find(f => f.id === oferta.fornecedorId);
        const categoria = servico ? categorias.find(c => c.id === servico.categoriaId) : null;
        
        return {
          ...oferta,
          servico,
          fornecedor,
          categoria,
        };
      });
      
      // Se tiver moradorId, ordenar por relevancia
      if (moradorId) {
        const morador = await storage.getMoradorById(moradorId);
        if (morador) {
          // Ordenar ofertas por relevancia baseado no perfil do morador
          ofertasEnriquecidas.sort((a, b) => {
            let scoreA = 0;
            let scoreB = 0;
            
            // Se morador tem pet, priorizar servicos de pet
            if (morador.temPet && a.servico?.tipoServico === "pet") scoreA += 10;
            if (morador.temPet && b.servico?.tipoServico === "pet") scoreB += 10;
            
            // Priorizar fornecedores melhor avaliados
            scoreA += (a.fornecedor?.avaliacaoMedia || 0) * 2;
            scoreB += (b.fornecedor?.avaliacaoMedia || 0) * 2;
            
            return scoreB - scoreA;
          });
        }
      }
      
      res.json(ofertasEnriquecidas);
    } catch (error: any) {
      res.status(500).json({ error: "Falha ao buscar marketplace" });
    }
  });

  return httpServer;
}
