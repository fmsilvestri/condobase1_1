import { supabase, supabaseAdmin, isSupabaseConfigured, isSupabaseAdminConfigured } from "./supabase";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";
import type { IStorage } from "./storage";
import {
  condominiums as condominiumsTable,
  users as usersTable,
  userCondominiums as userCondominiumsTable,
  notifications as notificationsTable,
  modulePermissions as modulePermissionsTable,
  reservoirs as reservoirsTable,
  waterReadings as waterReadingsTable,
  poolReadings as poolReadingsTable,
  wasteConfig as wasteConfigTable,
  securityDevices as securityDevicesTable,
  securityEvents as securityEventsTable,
  maintenanceCompletions as maintenanceCompletionsTable,
  hydrometerReadings as hydrometerReadingsTable,
  preventiveAssets as preventiveAssetsTable,
  maintenancePlans as maintenancePlansTable,
  planChecklistItems as planChecklistItemsTable,
  maintenanceExecutions as maintenanceExecutionsTable,
  executionChecklistItems as executionChecklistItemsTable,
  maintenanceDocuments as maintenanceDocumentsTable,
  gasReadings as gasReadingsTable,
  energyEvents as energyEventsTable,
  occupancyData as occupancyDataTable,
  equipment as equipmentTable,
  maintenanceRequests as maintenanceRequestsTable,
  documents as documentsTable,
  suppliers as suppliersTable,
  announcements as announcementsTable,
  type Condominium,
  type InsertCondominium,
  type UserCondominium,
  type InsertUserCondominium,
  type User,
  type InsertUser,
  type Equipment,
  type InsertEquipment,
  type MaintenanceRequest,
  type InsertMaintenanceRequest,
  type MaintenanceCompletion,
  type InsertMaintenanceCompletion,
  type PoolReading,
  type InsertPoolReading,
  type Reservoir,
  type InsertReservoir,
  type WaterReading,
  type InsertWaterReading,
  type HydrometerReading,
  type InsertHydrometerReading,
  type GasReading,
  type InsertGasReading,
  type EnergyEvent,
  type InsertEnergyEvent,
  type OccupancyData,
  type InsertOccupancyData,
  type Document,
  type InsertDocument,
  type Supplier,
  type InsertSupplier,
  type Announcement,
  type InsertAnnouncement,
  type Notification,
  type InsertNotification,
  type ModulePermission,
  type InsertModulePermission,
  type WasteConfig,
  type InsertWasteConfig,
  type SecurityDevice,
  type InsertSecurityDevice,
  type SecurityEvent,
  type InsertSecurityEvent,
  type PreventiveAsset,
  type InsertPreventiveAsset,
  type MaintenancePlan,
  type InsertMaintenancePlan,
  type PlanChecklistItem,
  type InsertPlanChecklistItem,
  type MaintenanceExecution,
  type InsertMaintenanceExecution,
  type ExecutionChecklistItem,
  type InsertExecutionChecklistItem,
  type MaintenanceDocument,
  type InsertMaintenanceDocument,
  type Faq,
  type InsertFaq,
  type PushSubscription,
  type InsertPushSubscription,
  type NotificationPreference,
  type InsertNotificationPreference,
  type IotSession,
  type InsertIotSession,
  type IotDevice,
  type InsertIotDevice,
  type GovernanceDecision,
  type InsertGovernanceDecision,
  type MeetingMinutes,
  type InsertMeetingMinutes,
  type Budget,
  type InsertBudget,
  type FinancialTransaction,
  type InsertFinancialTransaction,
  type Contract,
  type InsertContract,
  type LegalChecklist,
  type InsertLegalChecklist,
  type InsurancePolicy,
  type InsertInsurancePolicy,
  type SmartAlert,
  type InsertSmartAlert,
  type SuccessionPlan,
  type InsertSuccessionPlan,
  pushSubscriptions as pushSubscriptionsTable,
  successionPlans as successionPlansTable,
  notificationPreferences as notificationPreferencesTable,
  iotSessions as iotSessionsTable,
  iotDevices as iotDevicesTable,
  governanceDecisions as governanceDecisionsTable,
  meetingMinutes as meetingMinutesTable,
  budgets as budgetsTable,
  financialTransactions as financialTransactionsTable,
  contracts as contractsTable,
  legalChecklist as legalChecklistTable,
  insurancePolicies as insurancePoliciesTable,
  smartAlerts as smartAlertsTable,
  automationRules as automationRulesTable,
  scheduledTasks as scheduledTasksTable,
  operationLogs as operationLogsTable,
  teamMembers as teamMembersTable,
  funcionarios as funcionariosTable,
  processes as processesTable,
  processExecutions as processExecutionsTable,
  parcels as parcelsTable,
  moradores as moradoresTable,
  categoriasServicos as categoriasServicosTable,
  servicos as servicosTable,
  fornecedoresMarketplace as fornecedoresMarketplaceTable,
  ofertas as ofertasTable,
  contratacoes as contratacoesTable,
  avaliacoes as avaliacoesTable,
  veiculos as veiculosTable,
  type AutomationRule,
  type InsertAutomationRule,
  type ScheduledTask,
  type InsertScheduledTask,
  type OperationLog,
  type InsertOperationLog,
  type TeamMember,
  type InsertTeamMember,
  type Funcionario,
  type InsertFuncionario,
  type Process,
  type InsertProcess,
  type ProcessExecution,
  type InsertProcessExecution,
  type Parcel,
  type InsertParcel,
  type Morador,
  type InsertMorador,
  type CategoriaServico,
  type InsertCategoriaServico,
  type Servico,
  type InsertServico,
  type FornecedorMarketplace,
  type InsertFornecedorMarketplace,
  type Oferta,
  type InsertOferta,
  type Contratacao,
  type InsertContratacao,
  type Avaliacao,
  type InsertAvaliacao,
  type Veiculo,
  type InsertVeiculo,
  taxasCondominio as taxasCondominioTable,
  cobrancas as cobrancasTable,
  pagamentos as pagamentosTable,
  type TaxaCondominio,
  type InsertTaxaCondominio,
  type Cobranca,
  type InsertCobranca,
  type Pagamento,
  type InsertPagamento,
  type Hospedagem,
  type InsertHospedagem,
  type ConfiguracoesLocacao,
  type InsertConfiguracoesLocacao,
  type MarketplaceCategoria,
  type InsertMarketplaceCategoria,
  type MarketplaceFornecedor,
  type InsertMarketplaceFornecedor,
  type MarketplaceServico,
  type InsertMarketplaceServico,
  type MarketplaceOferta,
  type InsertMarketplaceOferta,
  type MarketplaceContratacao,
  type InsertMarketplaceContratacao,
  type MarketplaceAvaliacao,
  type InsertMarketplaceAvaliacao,
  type MarketplaceComissao,
  type InsertMarketplaceComissao,
} from "@shared/schema";

function toSnakeCase(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const key in obj) {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    result[snakeKey] = obj[key];
  }
  return result;
}

function toCamelCase(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const key in obj) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = obj[key];
  }
  return result;
}

export class SupabaseStorage implements IStorage {
  private sb = supabase!;
  
  // Local cache for equipment icons (workaround for Supabase schema cache issue)
  private equipmentIconCache: Map<string, string> = new Map();

  // Condominium methods
  async getCondominiums(): Promise<Condominium[]> {
    const data = await db.select().from(condominiumsTable).orderBy(desc(condominiumsTable.createdAt));
    return data;
  }

  async getCondominiumById(id: string): Promise<Condominium | undefined> {
    const [data] = await db.select().from(condominiumsTable).where(eq(condominiumsTable.id, id));
    return data;
  }

  async createCondominium(condominium: InsertCondominium): Promise<Condominium> {
    const [created] = await db.insert(condominiumsTable).values(condominium).returning();
    return created;
  }

  async updateCondominium(id: string, condominium: Partial<InsertCondominium>): Promise<Condominium | undefined> {
    const [updated] = await db.update(condominiumsTable)
      .set({ ...condominium, updatedAt: new Date() })
      .where(eq(condominiumsTable.id, id))
      .returning();
    return updated;
  }

  async deleteCondominium(id: string): Promise<boolean> {
    const result = await db.delete(condominiumsTable)
      .where(eq(condominiumsTable.id, id))
      .returning({ id: condominiumsTable.id });
    return result.length > 0;
  }

  // User-Condominium relationship methods - using local PostgreSQL database
  async getUserCondominiums(userId: string): Promise<(UserCondominium & { condominium?: Condominium })[]> {
    const userCondos = await db.select().from(userCondominiumsTable)
      .where(eq(userCondominiumsTable.userId, userId))
      .orderBy(desc(userCondominiumsTable.createdAt));
    
    const result = await Promise.all(userCondos.map(async (uc) => {
      const condominium = await this.getCondominiumById(uc.condominiumId);
      return { ...uc, condominium };
    }));
    return result;
  }

  async getCondominiumUsers(condominiumId: string): Promise<(UserCondominium & { user?: User })[]> {
    const condoUsers = await db.select().from(userCondominiumsTable)
      .where(eq(userCondominiumsTable.condominiumId, condominiumId))
      .orderBy(desc(userCondominiumsTable.createdAt));
    
    const result = await Promise.all(condoUsers.map(async (uc) => {
      const user = await this.getUser(uc.userId);
      return { ...uc, user };
    }));
    return result;
  }

  async addUserToCondominium(userCondominium: InsertUserCondominium): Promise<UserCondominium> {
    const [created] = await db.insert(userCondominiumsTable).values(userCondominium).returning();
    return created;
  }

  async updateUserCondominium(id: string, data: Partial<InsertUserCondominium>): Promise<UserCondominium | undefined> {
    const [updated] = await db.update(userCondominiumsTable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(userCondominiumsTable.id, id))
      .returning();
    return updated;
  }

  async removeUserFromCondominium(userId: string, condominiumId: string): Promise<boolean> {
    const result = await db.delete(userCondominiumsTable)
      .where(and(
        eq(userCondominiumsTable.userId, userId),
        eq(userCondominiumsTable.condominiumId, condominiumId)
      ))
      .returning({ id: userCondominiumsTable.id });
    return result.length > 0;
  }

  // User methods - using local database for consistency with user_condominiums
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
    return user;
  }

  async getUsers(): Promise<User[]> {
    return db.select().from(usersTable).orderBy(desc(usersTable.createdAt));
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(usersTable).values(user).returning();
    return created;
  }

  async upsertUser(userData: InsertUser & { id: string }): Promise<User> {
    const existing = await this.getUser(userData.id);
    if (existing) {
      const [updated] = await db.update(usersTable)
        .set({ ...userData, updatedAt: new Date() })
        .where(eq(usersTable.id, userData.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(usersTable).values(userData).returning();
      return created;
    }
  }

  async updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined> {
    const [updated] = await db.update(usersTable)
      .set({ ...user, updatedAt: new Date() })
      .where(eq(usersTable.id, id))
      .returning();
    return updated;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(usersTable)
      .where(eq(usersTable.id, id))
      .returning({ id: usersTable.id });
    return result.length > 0;
  }

  async getEquipment(condominiumId?: string): Promise<Equipment[]> {
    // Use supabaseAdmin to bypass RLS restrictions
    const client = supabaseAdmin || this.sb;
    let query = client.from("equipment").select("*").order("created_at", { ascending: false });
    if (condominiumId) {
      query = query.eq("condominium_id", condominiumId);
    }
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data || []).map((item: any) => {
      const equipment = toCamelCase(item) as Equipment;
      const cachedIcon = this.equipmentIconCache.get(equipment.id);
      if (cachedIcon) {
        return { ...equipment, icon: cachedIcon };
      }
      return equipment;
    });
  }

  async getEquipmentById(id: string): Promise<Equipment | undefined> {
    // Use supabaseAdmin to bypass RLS restrictions
    const client = supabaseAdmin || this.sb;
    const { data, error } = await client
      .from("equipment")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !data) return undefined;
    return toCamelCase(data) as Equipment;
  }

  async createEquipment(equipment: InsertEquipment): Promise<Equipment> {
    // Use supabaseAdmin to bypass RLS restrictions
    const client = supabaseAdmin || this.sb;
    const { data, error } = await client
      .from("equipment")
      .insert(toSnakeCase(equipment))
      .select()
      .single();
    if (error) throw new Error(error.message);
    if (equipment.icon) {
      this.equipmentIconCache.set(data.id, equipment.icon);
    }
    return toCamelCase(data) as Equipment;
  }

  async updateEquipment(id: string, equipment: Partial<InsertEquipment>): Promise<Equipment | undefined> {
    // Use supabaseAdmin to bypass RLS restrictions
    const client = supabaseAdmin || this.sb;
    try {
      const updateData: Record<string, any> = {};
      
      // Map all fields to snake_case for Supabase
      if (equipment.name !== undefined) updateData.name = equipment.name;
      if (equipment.category !== undefined) updateData.category = equipment.category;
      if (equipment.location !== undefined) updateData.location = equipment.location;
      if (equipment.description !== undefined) updateData.description = equipment.description || null;
      if (equipment.photos !== undefined) updateData.photos = equipment.photos;
      if (equipment.status !== undefined) updateData.status = equipment.status;
      if (equipment.icon !== undefined) updateData.icon = equipment.icon || null;
      if (equipment.manufacturer !== undefined) updateData.manufacturer = equipment.manufacturer || null;
      
      // Handle installationDate - convert to ISO string for Supabase
      if (equipment.installationDate !== undefined) {
        if (equipment.installationDate) {
          if (equipment.installationDate instanceof Date) {
            updateData.installation_date = equipment.installationDate.toISOString();
          } else if (typeof equipment.installationDate === 'string' && equipment.installationDate.trim() !== '') {
            updateData.installation_date = equipment.installationDate;
          } else {
            updateData.installation_date = null;
          }
        } else {
          updateData.installation_date = null;
        }
      }
      
      if (equipment.estimatedLifespan !== undefined) updateData.estimated_lifespan = equipment.estimatedLifespan || null;
      if (equipment.powerConsumption !== undefined) updateData.power_consumption = equipment.powerConsumption || null;
      if (equipment.estimatedUsageHours !== undefined) updateData.estimated_usage_hours = equipment.estimatedUsageHours || null;
      if (equipment.notes !== undefined) updateData.notes = equipment.notes || null;
      if (equipment.documents !== undefined) updateData.documents = equipment.documents;
      if (equipment.supplierId !== undefined) updateData.supplier_id = equipment.supplierId || null;
      
      updateData.updated_at = new Date().toISOString();

      const { data, error } = await client
        .from("equipment")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();
      
      if (error) {
        console.error('[equipment] Update error:', error);
        return undefined;
      }
      
      if (!data) {
        console.error('[equipment] Update: No rows returned');
        return undefined;
      }
      
      if (equipment.icon) {
        this.equipmentIconCache.set(id, equipment.icon);
      }
      
      return toCamelCase(data) as Equipment;
    } catch (error) {
      console.error('[equipment] Update error:', error);
      return undefined;
    }
  }

  async deleteEquipment(id: string): Promise<boolean> {
    // Use supabaseAdmin to bypass RLS restrictions
    const client = supabaseAdmin || this.sb;
    const { error } = await client
      .from("equipment")
      .delete()
      .eq("id", id);
    if (error) {
      console.error('[equipment] Delete error:', error);
    }
    if (!error) {
      this.equipmentIconCache.delete(id);
    }
    return !error;
  }

  async getMaintenanceRequests(condominiumId?: string): Promise<MaintenanceRequest[]> {
    let query = this.sb.from("maintenance_requests").select("*").order("created_at", { ascending: false });
    if (condominiumId) {
      query = query.eq("condominium_id", condominiumId);
    }
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data || []).map((item: any) => toCamelCase(item) as MaintenanceRequest);
  }

  async getMaintenanceRequestById(id: string): Promise<MaintenanceRequest | undefined> {
    const { data, error } = await this.sb
      .from("maintenance_requests")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !data) return undefined;
    return toCamelCase(data) as MaintenanceRequest;
  }

  async createMaintenanceRequest(request: InsertMaintenanceRequest): Promise<MaintenanceRequest> {
    const { data, error } = await this.sb
      .from("maintenance_requests")
      .insert(toSnakeCase(request))
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toCamelCase(data) as MaintenanceRequest;
  }

  async updateMaintenanceRequest(id: string, request: Partial<InsertMaintenanceRequest>): Promise<MaintenanceRequest | undefined> {
    const updateData: any = { ...toSnakeCase(request), updated_at: new Date().toISOString() };
    if (request.status === "concluído") {
      updateData.completed_at = new Date().toISOString();
    }
    const { data, error } = await this.sb
      .from("maintenance_requests")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();
    if (error || !data) return undefined;
    return toCamelCase(data) as MaintenanceRequest;
  }

  async deleteMaintenanceRequest(id: string): Promise<boolean> {
    const { error } = await this.sb
      .from("maintenance_requests")
      .delete()
      .eq("id", id);
    return !error;
  }

  async getMaintenanceCompletions(): Promise<MaintenanceCompletion[]> {
    return await db.select().from(maintenanceCompletionsTable).orderBy(desc(maintenanceCompletionsTable.completedAt));
  }

  async getMaintenanceCompletionsByEquipmentId(equipmentId: string): Promise<MaintenanceCompletion[]> {
    return await db.select().from(maintenanceCompletionsTable)
      .where(eq(maintenanceCompletionsTable.equipmentId, equipmentId))
      .orderBy(desc(maintenanceCompletionsTable.completedAt));
  }

  async createMaintenanceCompletion(completion: InsertMaintenanceCompletion): Promise<MaintenanceCompletion> {
    const [created] = await db.insert(maintenanceCompletionsTable).values(completion).returning();
    return created;
  }

  async deleteMaintenanceCompletion(id: string): Promise<boolean> {
    await db.delete(maintenanceCompletionsTable).where(eq(maintenanceCompletionsTable.id, id));
    return true;
  }

  async getPoolReadings(condominiumId?: string): Promise<PoolReading[]> {
    if (condominiumId) {
      return await db.select().from(poolReadingsTable)
        .where(eq(poolReadingsTable.condominiumId, condominiumId))
        .orderBy(desc(poolReadingsTable.createdAt));
    }
    return await db.select().from(poolReadingsTable).orderBy(desc(poolReadingsTable.createdAt));
  }

  async createPoolReading(reading: InsertPoolReading): Promise<PoolReading> {
    try {
      console.log("Storage: Inserting pool reading:", JSON.stringify(reading));
      // Ensure all numeric fields are actually numbers and not NaN
      const cleanedReading = {
        ...reading,
        ph: Number(reading.ph) || 0,
        chlorine: Number(reading.chlorine) || 0,
        alkalinity: Number(reading.alkalinity) || 0,
        calciumHardness: Number(reading.calciumHardness) || 0,
        temperature: Number(reading.temperature) || 0,
      };
      const [created] = await db.insert(poolReadingsTable).values(cleanedReading).returning();
      return created;
    } catch (error: any) {
      console.error("Drizzle createPoolReading error:", error);
      throw error;
    }
  }

  async getReservoirs(): Promise<Reservoir[]> {
    return await db.select().from(reservoirsTable).orderBy(desc(reservoirsTable.createdAt));
  }

  async getReservoirById(id: string): Promise<Reservoir | undefined> {
    const [reservoir] = await db.select().from(reservoirsTable).where(eq(reservoirsTable.id, id));
    return reservoir;
  }

  async createReservoir(reservoir: InsertReservoir): Promise<Reservoir> {
    const [created] = await db.insert(reservoirsTable).values(reservoir).returning();
    return created;
  }

  async updateReservoir(id: string, reservoir: Partial<InsertReservoir>): Promise<Reservoir | undefined> {
    const [updated] = await db.update(reservoirsTable).set(reservoir).where(eq(reservoirsTable.id, id)).returning();
    return updated;
  }

  async deleteReservoir(id: string): Promise<boolean> {
    const result = await db.delete(reservoirsTable).where(eq(reservoirsTable.id, id));
    return true;
  }

  async getWaterReadings(condominiumId?: string): Promise<WaterReading[]> {
    if (condominiumId) {
      return await db.select().from(waterReadingsTable)
        .where(eq(waterReadingsTable.condominiumId, condominiumId))
        .orderBy(desc(waterReadingsTable.createdAt));
    }
    return await db.select().from(waterReadingsTable).orderBy(desc(waterReadingsTable.createdAt));
  }

  async createWaterReading(reading: InsertWaterReading): Promise<WaterReading> {
    const [created] = await db.insert(waterReadingsTable).values(reading).returning();
    return created;
  }

  async getHydrometerReadings(): Promise<HydrometerReading[]> {
    return await db.select().from(hydrometerReadingsTable).orderBy(desc(hydrometerReadingsTable.readingDate));
  }

  async createHydrometerReading(reading: InsertHydrometerReading): Promise<HydrometerReading> {
    const [created] = await db.insert(hydrometerReadingsTable).values(reading).returning();
    return created;
  }

  async updateHydrometerReading(id: string, reading: Partial<InsertHydrometerReading>): Promise<HydrometerReading | undefined> {
    const [updated] = await db.update(hydrometerReadingsTable).set(reading).where(eq(hydrometerReadingsTable.id, id)).returning();
    return updated;
  }

  async deleteHydrometerReading(id: string): Promise<boolean> {
    await db.delete(hydrometerReadingsTable).where(eq(hydrometerReadingsTable.id, id));
    return true;
  }

  async getGasReadings(condominiumId?: string): Promise<GasReading[]> {
    if (condominiumId) {
      return db.select().from(gasReadingsTable)
        .where(eq(gasReadingsTable.condominiumId, condominiumId))
        .orderBy(desc(gasReadingsTable.createdAt));
    }
    return db.select().from(gasReadingsTable).orderBy(desc(gasReadingsTable.createdAt));
  }

  async createGasReading(reading: InsertGasReading): Promise<GasReading> {
    const [created] = await db.insert(gasReadingsTable).values(reading).returning();
    return created;
  }

  async getEnergyEvents(condominiumId?: string): Promise<EnergyEvent[]> {
    if (condominiumId) {
      return db.select().from(energyEventsTable)
        .where(eq(energyEventsTable.condominiumId, condominiumId))
        .orderBy(desc(energyEventsTable.createdAt));
    }
    return db.select().from(energyEventsTable).orderBy(desc(energyEventsTable.createdAt));
  }

  async createEnergyEvent(event: InsertEnergyEvent): Promise<EnergyEvent> {
    const [created] = await db.insert(energyEventsTable).values(event).returning();
    return created;
  }

  async updateEnergyEvent(id: string, event: Partial<InsertEnergyEvent>): Promise<EnergyEvent | undefined> {
    const updateData: Partial<InsertEnergyEvent> = { ...event };
    if (event.status === "ok") {
      (updateData as any).resolvedAt = new Date();
    }
    const [updated] = await db.update(energyEventsTable)
      .set(updateData)
      .where(eq(energyEventsTable.id, id))
      .returning();
    return updated;
  }

  async getOccupancyData(condominiumId?: string): Promise<OccupancyData | undefined> {
    let query = this.sb.from("occupancy_data").select("*").order("updated_at", { ascending: false }).limit(1);
    if (condominiumId) {
      query = query.eq("condominium_id", condominiumId);
    }
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) return undefined;
    return toCamelCase(data[0]) as OccupancyData;
  }

  async updateOccupancyData(occupancy: InsertOccupancyData): Promise<OccupancyData> {
    const existing = await this.getOccupancyData(occupancy.condominiumId);
    const snakeCaseData = toSnakeCase(occupancy);
    
    if (existing) {
      const { data, error } = await this.sb
        .from("occupancy_data")
        .update({ ...snakeCaseData, updated_at: new Date().toISOString() })
        .eq("id", existing.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return toCamelCase(data) as OccupancyData;
    } else {
      const { data, error } = await this.sb
        .from("occupancy_data")
        .insert(snakeCaseData)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return toCamelCase(data) as OccupancyData;
    }
  }

  async getDocuments(condominiumId?: string): Promise<Document[]> {
    let query = this.sb.from("documents").select("*").order("created_at", { ascending: false });
    if (condominiumId) {
      query = query.eq("condominium_id", condominiumId);
    }
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data || []).map((item: any) => toCamelCase(item) as Document);
  }

  async getDocumentById(id: string): Promise<Document | undefined> {
    const { data, error } = await this.sb
      .from("documents")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !data) return undefined;
    return toCamelCase(data) as Document;
  }

  async createDocument(doc: InsertDocument): Promise<Document> {
    const { data, error } = await this.sb
      .from("documents")
      .insert(toSnakeCase(doc))
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toCamelCase(data) as Document;
  }

  async updateDocument(id: string, doc: Partial<InsertDocument>): Promise<Document | undefined> {
    const { data, error } = await this.sb
      .from("documents")
      .update(toSnakeCase(doc))
      .eq("id", id)
      .select()
      .single();
    if (error || !data) return undefined;
    return toCamelCase(data) as Document;
  }

  async deleteDocument(id: string): Promise<boolean> {
    const { error } = await this.sb
      .from("documents")
      .delete()
      .eq("id", id);
    return !error;
  }

  async getSuppliers(condominiumId?: string): Promise<Supplier[]> {
    let query = this.sb.from("suppliers").select("*").order("created_at", { ascending: false });
    if (condominiumId) {
      query = query.eq("condominium_id", condominiumId);
    }
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data || []).map((item: any) => toCamelCase(item) as Supplier);
  }

  async getSupplierById(id: string): Promise<Supplier | undefined> {
    const { data, error } = await this.sb
      .from("suppliers")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !data) return undefined;
    return toCamelCase(data) as Supplier;
  }

  async createSupplier(supplier: InsertSupplier): Promise<Supplier> {
    const { data, error } = await this.sb
      .from("suppliers")
      .insert(toSnakeCase(supplier))
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toCamelCase(data) as Supplier;
  }

  async updateSupplier(id: string, supplier: Partial<InsertSupplier>): Promise<Supplier | undefined> {
    const { data, error } = await this.sb
      .from("suppliers")
      .update(toSnakeCase(supplier))
      .eq("id", id)
      .select()
      .single();
    if (error || !data) return undefined;
    return toCamelCase(data) as Supplier;
  }

  async deleteSupplier(id: string): Promise<boolean> {
    const { error } = await this.sb
      .from("suppliers")
      .delete()
      .eq("id", id);
    return !error;
  }

  async getAnnouncements(condominiumId?: string): Promise<Announcement[]> {
    let query = this.sb.from("announcements").select("*").order("created_at", { ascending: false });
    if (condominiumId) {
      query = query.eq("condominium_id", condominiumId);
    }
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data || []).map((item: any) => toCamelCase(item) as Announcement);
  }

  async getAnnouncementById(id: string): Promise<Announcement | undefined> {
    const { data, error } = await this.sb
      .from("announcements")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !data) return undefined;
    return toCamelCase(data) as Announcement;
  }

  async createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement> {
    const { data, error } = await this.sb
      .from("announcements")
      .insert(toSnakeCase(announcement))
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toCamelCase(data) as Announcement;
  }

  async updateAnnouncement(id: string, announcement: Partial<InsertAnnouncement>): Promise<Announcement | undefined> {
    const { data, error } = await this.sb
      .from("announcements")
      .update(toSnakeCase(announcement))
      .eq("id", id)
      .select()
      .single();
    if (error || !data) return undefined;
    return toCamelCase(data) as Announcement;
  }

  async deleteAnnouncement(id: string): Promise<boolean> {
    const { error } = await this.sb
      .from("announcements")
      .delete()
      .eq("id", id);
    return !error;
  }

  async getNotifications(userId: string): Promise<Notification[]> {
    const data = await db.select()
      .from(notificationsTable)
      .where(eq(notificationsTable.userId, userId))
      .orderBy(desc(notificationsTable.createdAt));
    return data;
  }

  async getUnreadNotifications(userId: string): Promise<Notification[]> {
    const data = await db.select()
      .from(notificationsTable)
      .where(and(
        eq(notificationsTable.userId, userId),
        eq(notificationsTable.isRead, false)
      ))
      .orderBy(desc(notificationsTable.createdAt));
    return data;
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [data] = await db.insert(notificationsTable)
      .values(notification)
      .returning();
    return data;
  }

  async markNotificationAsRead(id: string): Promise<boolean> {
    const result = await db.update(notificationsTable)
      .set({ isRead: true })
      .where(eq(notificationsTable.id, id));
    return true;
  }

  async markAllNotificationsAsRead(userId: string): Promise<boolean> {
    await db.update(notificationsTable)
      .set({ isRead: true })
      .where(eq(notificationsTable.userId, userId));
    return true;
  }

  async createNotificationsForAllUsers(notification: Omit<InsertNotification, 'userId'>, excludeUserId?: string): Promise<Notification[]> {
    const users = await this.getUsers();
    const notificationsToInsert = users
      .filter(user => !excludeUserId || user.id !== excludeUserId)
      .map(user => ({ ...notification, userId: user.id }));
    
    if (notificationsToInsert.length > 0) {
      try {
        const createdNotifications = await db.insert(notificationsTable)
          .values(notificationsToInsert)
          .returning();
        return createdNotifications;
      } catch (error) {
        console.error("Error creating notifications:", error);
        return [];
      }
    }
    return [];
  }

  async getModulePermissions(): Promise<ModulePermission[]> {
    const data = await db.select()
      .from(modulePermissionsTable)
      .orderBy(modulePermissionsTable.moduleLabel);
    return data;
  }

  async updateModulePermission(moduleKey: string, isEnabled: boolean, updatedBy?: string): Promise<ModulePermission | undefined> {
    const [data] = await db.update(modulePermissionsTable)
      .set({ 
        isEnabled, 
        updatedAt: new Date(),
        updatedBy: updatedBy || null 
      })
      .where(eq(modulePermissionsTable.moduleKey, moduleKey))
      .returning();
    return data;
  }

  async getWasteConfig(): Promise<WasteConfig | undefined> {
    const [config] = await db.select().from(wasteConfigTable).limit(1);
    return config;
  }

  async updateWasteConfig(config: Partial<InsertWasteConfig>): Promise<WasteConfig | undefined> {
    const existing = await this.getWasteConfig();
    if (existing) {
      const [updated] = await db.update(wasteConfigTable)
        .set(config)
        .where(eq(wasteConfigTable.id, existing.id))
        .returning();
      return updated;
    }
    // Cannot create without condominiumId
    if (!config.condominiumId) {
      throw new Error("condominiumId is required to create waste config");
    }
    const defaultSchedule = JSON.stringify([
      { day: "Segunda", organic: true, recyclable: false },
      { day: "Terça", organic: false, recyclable: true },
      { day: "Quarta", organic: true, recyclable: false },
      { day: "Quinta", organic: false, recyclable: true },
      { day: "Sexta", organic: true, recyclable: false },
      { day: "Sábado", organic: false, recyclable: true },
    ]);
    const defaultOrganic = JSON.stringify(["Restos de alimentos", "Cascas de frutas"]);
    const defaultRecyclable = JSON.stringify([{ category: "Papel", items: ["Jornais"] }]);
    const defaultNotRecyclable = JSON.stringify(["Papel higiênico"]);
    
    const [created] = await db.insert(wasteConfigTable)
      .values({
        condominiumId: config.condominiumId,
        schedule: config.schedule || defaultSchedule,
        organicItems: config.organicItems || defaultOrganic,
        recyclableCategories: config.recyclableCategories || defaultRecyclable,
        notRecyclable: config.notRecyclable || defaultNotRecyclable,
        collectionTime: config.collectionTime || "07:00",
        updatedBy: config.updatedBy || null,
      })
      .returning();
    return created;
  }

  async getSecurityDevices(condominiumId?: string): Promise<SecurityDevice[]> {
    let query = db.select().from(securityDevicesTable);
    if (condominiumId) {
      query = query.where(eq(securityDevicesTable.condominiumId, condominiumId)) as typeof query;
    }
    const data = await query.orderBy(desc(securityDevicesTable.createdAt));
    return data;
  }

  async getSecurityDeviceById(id: string): Promise<SecurityDevice | undefined> {
    const [data] = await db.select()
      .from(securityDevicesTable)
      .where(eq(securityDevicesTable.id, id));
    return data;
  }

  async createSecurityDevice(device: InsertSecurityDevice): Promise<SecurityDevice> {
    const [data] = await db.insert(securityDevicesTable)
      .values(device)
      .returning();
    return data;
  }

  async updateSecurityDevice(id: string, device: Partial<InsertSecurityDevice>): Promise<SecurityDevice | undefined> {
    const [data] = await db.update(securityDevicesTable)
      .set({ ...device, updatedAt: new Date() })
      .where(eq(securityDevicesTable.id, id))
      .returning();
    return data;
  }

  async deleteSecurityDevice(id: string): Promise<boolean> {
    const result = await db.delete(securityDevicesTable)
      .where(eq(securityDevicesTable.id, id));
    return true;
  }

  async getSecurityEvents(condominiumId?: string): Promise<SecurityEvent[]> {
    let query = db.select().from(securityEventsTable);
    if (condominiumId) {
      query = query.where(eq(securityEventsTable.condominiumId, condominiumId)) as typeof query;
    }
    const data = await query.orderBy(desc(securityEventsTable.createdAt));
    return data;
  }

  async getSecurityEventsByDeviceId(deviceId: string): Promise<SecurityEvent[]> {
    const data = await db.select()
      .from(securityEventsTable)
      .where(eq(securityEventsTable.deviceId, deviceId))
      .orderBy(desc(securityEventsTable.createdAt));
    return data;
  }

  async createSecurityEvent(event: InsertSecurityEvent): Promise<SecurityEvent> {
    const [data] = await db.insert(securityEventsTable)
      .values(event)
      .returning();
    return data;
  }

  async updateSecurityEvent(id: string, event: Partial<InsertSecurityEvent>): Promise<SecurityEvent | undefined> {
    const [data] = await db.update(securityEventsTable)
      .set(event)
      .where(eq(securityEventsTable.id, id))
      .returning();
    return data;
  }

  // ===========================
  // PREVENTIVE MAINTENANCE - ASSETS
  // ===========================
  async getPreventiveAssets(): Promise<PreventiveAsset[]> {
    const data = await db.select()
      .from(preventiveAssetsTable)
      .orderBy(desc(preventiveAssetsTable.createdAt));
    return data;
  }

  async getPreventiveAssetById(id: string): Promise<PreventiveAsset | undefined> {
    const [data] = await db.select()
      .from(preventiveAssetsTable)
      .where(eq(preventiveAssetsTable.id, id));
    return data;
  }

  async createPreventiveAsset(asset: InsertPreventiveAsset): Promise<PreventiveAsset> {
    const [data] = await db.insert(preventiveAssetsTable)
      .values(asset)
      .returning();
    return data;
  }

  async updatePreventiveAsset(id: string, asset: Partial<InsertPreventiveAsset>): Promise<PreventiveAsset | undefined> {
    const [data] = await db.update(preventiveAssetsTable)
      .set({ ...asset, updatedAt: new Date() })
      .where(eq(preventiveAssetsTable.id, id))
      .returning();
    return data;
  }

  async deletePreventiveAsset(id: string): Promise<boolean> {
    await db.delete(preventiveAssetsTable)
      .where(eq(preventiveAssetsTable.id, id));
    return true;
  }

  // ===========================
  // PREVENTIVE MAINTENANCE - PLANS
  // ===========================
  async getMaintenancePlans(): Promise<MaintenancePlan[]> {
    const data = await db.select()
      .from(maintenancePlansTable)
      .orderBy(desc(maintenancePlansTable.createdAt));
    return data;
  }

  async getMaintenancePlanById(id: string): Promise<MaintenancePlan | undefined> {
    const [data] = await db.select()
      .from(maintenancePlansTable)
      .where(eq(maintenancePlansTable.id, id));
    return data;
  }

  async getMaintenancePlansByAssetId(assetId: string): Promise<MaintenancePlan[]> {
    const data = await db.select()
      .from(maintenancePlansTable)
      .where(eq(maintenancePlansTable.equipmentId, assetId))
      .orderBy(desc(maintenancePlansTable.createdAt));
    return data;
  }

  async createMaintenancePlan(plan: InsertMaintenancePlan): Promise<MaintenancePlan> {
    const [data] = await db.insert(maintenancePlansTable)
      .values(plan)
      .returning();
    return data;
  }

  async updateMaintenancePlan(id: string, plan: Partial<InsertMaintenancePlan>): Promise<MaintenancePlan | undefined> {
    const [data] = await db.update(maintenancePlansTable)
      .set({ ...plan, updatedAt: new Date() })
      .where(eq(maintenancePlansTable.id, id))
      .returning();
    return data;
  }

  async deleteMaintenancePlan(id: string): Promise<boolean> {
    await db.delete(maintenancePlansTable)
      .where(eq(maintenancePlansTable.id, id));
    return true;
  }

  // ===========================
  // PREVENTIVE MAINTENANCE - PLAN CHECKLIST ITEMS
  // ===========================
  async getPlanChecklistItems(planId: string): Promise<PlanChecklistItem[]> {
    const data = await db.select()
      .from(planChecklistItemsTable)
      .where(eq(planChecklistItemsTable.planId, planId))
      .orderBy(planChecklistItemsTable.itemOrder);
    return data;
  }

  async createPlanChecklistItem(item: InsertPlanChecklistItem): Promise<PlanChecklistItem> {
    const [data] = await db.insert(planChecklistItemsTable)
      .values(item)
      .returning();
    return data;
  }

  async updatePlanChecklistItem(id: string, item: Partial<InsertPlanChecklistItem>): Promise<PlanChecklistItem | undefined> {
    const [data] = await db.update(planChecklistItemsTable)
      .set(item)
      .where(eq(planChecklistItemsTable.id, id))
      .returning();
    return data;
  }

  async deletePlanChecklistItem(id: string): Promise<boolean> {
    await db.delete(planChecklistItemsTable)
      .where(eq(planChecklistItemsTable.id, id));
    return true;
  }

  // ===========================
  // PREVENTIVE MAINTENANCE - EXECUTIONS
  // ===========================
  async getMaintenanceExecutions(): Promise<MaintenanceExecution[]> {
    const data = await db.select()
      .from(maintenanceExecutionsTable)
      .orderBy(desc(maintenanceExecutionsTable.createdAt));
    return data;
  }

  async getMaintenanceExecutionById(id: string): Promise<MaintenanceExecution | undefined> {
    const [data] = await db.select()
      .from(maintenanceExecutionsTable)
      .where(eq(maintenanceExecutionsTable.id, id));
    return data;
  }

  async getMaintenanceExecutionsByAssetId(assetId: string): Promise<MaintenanceExecution[]> {
    const data = await db.select()
      .from(maintenanceExecutionsTable)
      .where(eq(maintenanceExecutionsTable.equipmentId, assetId))
      .orderBy(desc(maintenanceExecutionsTable.createdAt));
    return data;
  }

  async createMaintenanceExecution(execution: InsertMaintenanceExecution): Promise<MaintenanceExecution> {
    const [data] = await db.insert(maintenanceExecutionsTable)
      .values(execution)
      .returning();
    return data;
  }

  async updateMaintenanceExecution(id: string, execution: Partial<InsertMaintenanceExecution>): Promise<MaintenanceExecution | undefined> {
    const [data] = await db.update(maintenanceExecutionsTable)
      .set({ ...execution, updatedAt: new Date() })
      .where(eq(maintenanceExecutionsTable.id, id))
      .returning();
    return data;
  }

  async deleteMaintenanceExecution(id: string): Promise<boolean> {
    await db.delete(maintenanceExecutionsTable)
      .where(eq(maintenanceExecutionsTable.id, id));
    return true;
  }

  // ===========================
  // PREVENTIVE MAINTENANCE - EXECUTION CHECKLIST ITEMS
  // ===========================
  async getExecutionChecklistItems(executionId: string): Promise<ExecutionChecklistItem[]> {
    const data = await db.select()
      .from(executionChecklistItemsTable)
      .where(eq(executionChecklistItemsTable.executionId, executionId));
    return data;
  }

  async createExecutionChecklistItem(item: InsertExecutionChecklistItem): Promise<ExecutionChecklistItem> {
    const [data] = await db.insert(executionChecklistItemsTable)
      .values(item)
      .returning();
    return data;
  }

  async updateExecutionChecklistItem(id: string, item: Partial<InsertExecutionChecklistItem>): Promise<ExecutionChecklistItem | undefined> {
    const [data] = await db.update(executionChecklistItemsTable)
      .set(item)
      .where(eq(executionChecklistItemsTable.id, id))
      .returning();
    return data;
  }

  async deleteExecutionChecklistItem(id: string): Promise<boolean> {
    await db.delete(executionChecklistItemsTable)
      .where(eq(executionChecklistItemsTable.id, id));
    return true;
  }

  // ===========================
  // PREVENTIVE MAINTENANCE - DOCUMENTS
  // ===========================
  async getMaintenanceDocuments(executionId: string): Promise<MaintenanceDocument[]> {
    const data = await db.select()
      .from(maintenanceDocumentsTable)
      .where(eq(maintenanceDocumentsTable.executionId, executionId))
      .orderBy(desc(maintenanceDocumentsTable.createdAt));
    return data;
  }

  async createMaintenanceDocument(doc: InsertMaintenanceDocument): Promise<MaintenanceDocument> {
    const [data] = await db.insert(maintenanceDocumentsTable)
      .values(doc)
      .returning();
    return data;
  }

  async deleteMaintenanceDocument(id: string): Promise<boolean> {
    await db.delete(maintenanceDocumentsTable)
      .where(eq(maintenanceDocumentsTable.id, id));
    return true;
  }

  // ===========================
  // FAQ / KNOWLEDGE BASE
  // ===========================
  async getFaqs(condominiumId?: string): Promise<Faq[]> {
    const { data, error } = condominiumId
      ? await this.sb.from("faqs").select("*").eq("condominium_id", condominiumId).order("created_at", { ascending: false })
      : await this.sb.from("faqs").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map(item => toCamelCase(item) as Faq);
  }

  async getFaqById(id: string): Promise<Faq | undefined> {
    const { data, error } = await this.sb.from("faqs").select("*").eq("id", id).single();
    if (error) return undefined;
    return toCamelCase(data) as Faq;
  }

  async createFaq(faq: InsertFaq): Promise<Faq> {
    const { data, error } = await this.sb.from("faqs").insert(toSnakeCase(faq)).select().single();
    if (error) throw new Error(error.message);
    return toCamelCase(data) as Faq;
  }

  async updateFaq(id: string, faq: Partial<InsertFaq>): Promise<Faq | undefined> {
    const { data, error } = await this.sb.from("faqs").update({ ...toSnakeCase(faq), updated_at: new Date().toISOString() }).eq("id", id).select().single();
    if (error) return undefined;
    return toCamelCase(data) as Faq;
  }

  async deleteFaq(id: string): Promise<boolean> {
    const { error } = await this.sb.from("faqs").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return true;
  }

  async incrementFaqViewCount(id: string): Promise<void> {
    const { data } = await this.sb.from("faqs").select("view_count").eq("id", id).single();
    if (data) {
      await this.sb.from("faqs").update({ view_count: (data.view_count || 0) + 1 }).eq("id", id);
    }
  }

  // ===========================
  // PUSH SUBSCRIPTIONS
  // ===========================
  async getPushSubscriptions(userId: string): Promise<PushSubscription[]> {
    const data = await db.select()
      .from(pushSubscriptionsTable)
      .where(eq(pushSubscriptionsTable.userId, userId));
    return data;
  }

  async getPushSubscriptionByEndpoint(endpoint: string): Promise<PushSubscription | undefined> {
    const [data] = await db.select()
      .from(pushSubscriptionsTable)
      .where(eq(pushSubscriptionsTable.endpoint, endpoint));
    return data;
  }

  async getAllActivePushSubscriptions(condominiumId?: string): Promise<PushSubscription[]> {
    if (condominiumId) {
      const data = await db.select()
        .from(pushSubscriptionsTable)
        .where(and(
          eq(pushSubscriptionsTable.isEnabled, true),
          eq(pushSubscriptionsTable.condominiumId, condominiumId)
        ));
      return data;
    }
    const data = await db.select()
      .from(pushSubscriptionsTable)
      .where(eq(pushSubscriptionsTable.isEnabled, true));
    return data;
  }

  async createPushSubscription(subscription: InsertPushSubscription): Promise<PushSubscription> {
    const [data] = await db.insert(pushSubscriptionsTable)
      .values(subscription)
      .returning();
    return data;
  }

  async updatePushSubscription(id: string, subscription: Partial<InsertPushSubscription>): Promise<PushSubscription | undefined> {
    const [data] = await db.update(pushSubscriptionsTable)
      .set({ ...subscription, updatedAt: new Date() })
      .where(eq(pushSubscriptionsTable.id, id))
      .returning();
    return data;
  }

  async deletePushSubscription(id: string): Promise<boolean> {
    await db.delete(pushSubscriptionsTable)
      .where(eq(pushSubscriptionsTable.id, id));
    return true;
  }

  async deletePushSubscriptionByEndpoint(endpoint: string): Promise<boolean> {
    await db.delete(pushSubscriptionsTable)
      .where(eq(pushSubscriptionsTable.endpoint, endpoint));
    return true;
  }

  // ===========================
  // NOTIFICATION PREFERENCES
  // ===========================
  async getNotificationPreferences(userId: string, condominiumId?: string): Promise<NotificationPreference | undefined> {
    if (condominiumId) {
      const [data] = await db.select()
        .from(notificationPreferencesTable)
        .where(and(
          eq(notificationPreferencesTable.userId, userId),
          eq(notificationPreferencesTable.condominiumId, condominiumId)
        ));
      return data;
    }
    const [data] = await db.select()
      .from(notificationPreferencesTable)
      .where(eq(notificationPreferencesTable.userId, userId));
    return data;
  }

  async createNotificationPreference(preference: InsertNotificationPreference): Promise<NotificationPreference> {
    const [data] = await db.insert(notificationPreferencesTable)
      .values(preference)
      .returning();
    return data;
  }

  async updateNotificationPreference(id: string, preference: Partial<InsertNotificationPreference>): Promise<NotificationPreference | undefined> {
    const [data] = await db.update(notificationPreferencesTable)
      .set({ ...preference, updatedAt: new Date() })
      .where(eq(notificationPreferencesTable.id, id))
      .returning();
    return data;
  }

  async upsertNotificationPreference(userId: string, condominiumId: string | undefined, preference: Partial<InsertNotificationPreference>): Promise<NotificationPreference> {
    const existing = await this.getNotificationPreferences(userId, condominiumId);
    if (existing) {
      const updated = await this.updateNotificationPreference(existing.id, preference);
      return updated!;
    }
    return this.createNotificationPreference({
      userId,
      condominiumId: condominiumId || null,
      announcements: preference.announcements ?? true,
      maintenanceUpdates: preference.maintenanceUpdates ?? true,
      urgentMessages: preference.urgentMessages ?? true,
      quietHoursStart: preference.quietHoursStart || null,
      quietHoursEnd: preference.quietHoursEnd || null,
    });
  }

  // IoT Session methods
  async getIotSessions(userId: string, condominiumId: string): Promise<IotSession[]> {
    const data = await db.select()
      .from(iotSessionsTable)
      .where(and(
        eq(iotSessionsTable.userId, userId),
        eq(iotSessionsTable.condominiumId, condominiumId),
        eq(iotSessionsTable.isActive, true)
      ));
    return data;
  }

  async createIotSession(session: InsertIotSession): Promise<IotSession> {
    const [data] = await db.insert(iotSessionsTable)
      .values(session)
      .returning();
    return data;
  }

  async deleteIotSession(userId: string, condominiumId: string, platform: string): Promise<boolean> {
    const result = await db.delete(iotSessionsTable)
      .where(and(
        eq(iotSessionsTable.userId, userId),
        eq(iotSessionsTable.condominiumId, condominiumId),
        eq(iotSessionsTable.platform, platform)
      ));
    return true;
  }

  // IoT Device methods
  async getIotDevices(condominiumId: string): Promise<IotDevice[]> {
    const data = await db.select()
      .from(iotDevicesTable)
      .where(eq(iotDevicesTable.condominiumId, condominiumId));
    return data;
  }

  async getIotDeviceById(id: string): Promise<IotDevice | undefined> {
    const [data] = await db.select()
      .from(iotDevicesTable)
      .where(eq(iotDevicesTable.id, id));
    return data;
  }

  async createIotDevice(device: InsertIotDevice): Promise<IotDevice> {
    const [data] = await db.insert(iotDevicesTable)
      .values(device)
      .returning();
    return data;
  }

  async updateIotDevice(id: string, device: Partial<InsertIotDevice>): Promise<IotDevice | undefined> {
    const [data] = await db.update(iotDevicesTable)
      .set({ ...device, updatedAt: new Date() })
      .where(eq(iotDevicesTable.id, id))
      .returning();
    return data;
  }

  async deleteIotDevice(id: string): Promise<boolean> {
    await db.delete(iotDevicesTable)
      .where(eq(iotDevicesTable.id, id));
    return true;
  }

  // ===========================
  // 7 PILLARS MANAGEMENT
  // ===========================

  // Governance Decisions
  async getGovernanceDecisions(condominiumId?: string): Promise<GovernanceDecision[]> {
    if (condominiumId) {
      return db.select().from(governanceDecisionsTable)
        .where(eq(governanceDecisionsTable.condominiumId, condominiumId))
        .orderBy(desc(governanceDecisionsTable.decisionDate));
    }
    return db.select().from(governanceDecisionsTable)
      .orderBy(desc(governanceDecisionsTable.decisionDate));
  }

  async getGovernanceDecisionById(id: string): Promise<GovernanceDecision | undefined> {
    const [data] = await db.select().from(governanceDecisionsTable)
      .where(eq(governanceDecisionsTable.id, id));
    return data;
  }

  async createGovernanceDecision(decision: InsertGovernanceDecision): Promise<GovernanceDecision> {
    const [data] = await db.insert(governanceDecisionsTable)
      .values(decision)
      .returning();
    return data;
  }

  async updateGovernanceDecision(id: string, decision: Partial<InsertGovernanceDecision>): Promise<GovernanceDecision | undefined> {
    const [data] = await db.update(governanceDecisionsTable)
      .set({ ...decision, updatedAt: new Date() })
      .where(eq(governanceDecisionsTable.id, id))
      .returning();
    return data;
  }

  async deleteGovernanceDecision(id: string): Promise<boolean> {
    await db.delete(governanceDecisionsTable)
      .where(eq(governanceDecisionsTable.id, id));
    return true;
  }

  // Meeting Minutes
  async getMeetingMinutes(condominiumId?: string): Promise<MeetingMinutes[]> {
    if (condominiumId) {
      return db.select().from(meetingMinutesTable)
        .where(eq(meetingMinutesTable.condominiumId, condominiumId))
        .orderBy(desc(meetingMinutesTable.meetingDate));
    }
    return db.select().from(meetingMinutesTable)
      .orderBy(desc(meetingMinutesTable.meetingDate));
  }

  async getMeetingMinutesById(id: string): Promise<MeetingMinutes | undefined> {
    const [data] = await db.select().from(meetingMinutesTable)
      .where(eq(meetingMinutesTable.id, id));
    return data;
  }

  async createMeetingMinutes(minutes: InsertMeetingMinutes): Promise<MeetingMinutes> {
    const [data] = await db.insert(meetingMinutesTable)
      .values(minutes)
      .returning();
    return data;
  }

  async updateMeetingMinutes(id: string, minutes: Partial<InsertMeetingMinutes>): Promise<MeetingMinutes | undefined> {
    const [data] = await db.update(meetingMinutesTable)
      .set({ ...minutes, updatedAt: new Date() })
      .where(eq(meetingMinutesTable.id, id))
      .returning();
    return data;
  }

  async deleteMeetingMinutes(id: string): Promise<boolean> {
    await db.delete(meetingMinutesTable)
      .where(eq(meetingMinutesTable.id, id));
    return true;
  }

  // Succession Plans
  async getSuccessionPlan(condominiumId: string): Promise<SuccessionPlan | undefined> {
    const result = await db.select().from(successionPlansTable)
      .where(eq(successionPlansTable.condominiumId, condominiumId))
      .limit(1);
    return result[0];
  }

  async createSuccessionPlan(plan: InsertSuccessionPlan): Promise<SuccessionPlan> {
    const result = await db.insert(successionPlansTable)
      .values(plan)
      .returning();
    return result[0];
  }

  async updateSuccessionPlan(id: string, plan: Partial<InsertSuccessionPlan>): Promise<SuccessionPlan | undefined> {
    const result = await db.update(successionPlansTable)
      .set({ ...plan, updatedAt: new Date() })
      .where(eq(successionPlansTable.id, id))
      .returning();
    return result[0];
  }

  // Budgets
  async getBudgets(condominiumId?: string, year?: number): Promise<Budget[]> {
    if (condominiumId && year) {
      return db.select().from(budgetsTable)
        .where(and(
          eq(budgetsTable.condominiumId, condominiumId),
          eq(budgetsTable.year, year)
        ))
        .orderBy(desc(budgetsTable.createdAt));
    }
    if (condominiumId) {
      return db.select().from(budgetsTable)
        .where(eq(budgetsTable.condominiumId, condominiumId))
        .orderBy(desc(budgetsTable.createdAt));
    }
    return db.select().from(budgetsTable)
      .orderBy(desc(budgetsTable.createdAt));
  }

  async getBudgetById(id: string): Promise<Budget | undefined> {
    const [data] = await db.select().from(budgetsTable)
      .where(eq(budgetsTable.id, id));
    return data;
  }

  async createBudget(budget: InsertBudget): Promise<Budget> {
    const [data] = await db.insert(budgetsTable)
      .values(budget)
      .returning();
    return data;
  }

  async updateBudget(id: string, budget: Partial<InsertBudget>): Promise<Budget | undefined> {
    const [data] = await db.update(budgetsTable)
      .set({ ...budget, updatedAt: new Date() })
      .where(eq(budgetsTable.id, id))
      .returning();
    return data;
  }

  async deleteBudget(id: string): Promise<boolean> {
    await db.delete(budgetsTable)
      .where(eq(budgetsTable.id, id));
    return true;
  }

  // Financial Transactions
  async getFinancialTransactions(condominiumId?: string): Promise<FinancialTransaction[]> {
    if (condominiumId) {
      return db.select().from(financialTransactionsTable)
        .where(eq(financialTransactionsTable.condominiumId, condominiumId))
        .orderBy(desc(financialTransactionsTable.transactionDate));
    }
    return db.select().from(financialTransactionsTable)
      .orderBy(desc(financialTransactionsTable.transactionDate));
  }

  async getFinancialTransactionById(id: string): Promise<FinancialTransaction | undefined> {
    const [data] = await db.select().from(financialTransactionsTable)
      .where(eq(financialTransactionsTable.id, id));
    return data;
  }

  async createFinancialTransaction(transaction: InsertFinancialTransaction): Promise<FinancialTransaction> {
    const [data] = await db.insert(financialTransactionsTable)
      .values(transaction)
      .returning();
    return data;
  }

  async updateFinancialTransaction(id: string, transaction: Partial<InsertFinancialTransaction>): Promise<FinancialTransaction | undefined> {
    const [data] = await db.update(financialTransactionsTable)
      .set({ ...transaction, updatedAt: new Date() })
      .where(eq(financialTransactionsTable.id, id))
      .returning();
    return data;
  }

  async deleteFinancialTransaction(id: string): Promise<boolean> {
    await db.delete(financialTransactionsTable)
      .where(eq(financialTransactionsTable.id, id));
    return true;
  }

  // Contracts
  async getContracts(condominiumId?: string): Promise<Contract[]> {
    if (condominiumId) {
      return db.select().from(contractsTable)
        .where(eq(contractsTable.condominiumId, condominiumId))
        .orderBy(desc(contractsTable.createdAt));
    }
    return db.select().from(contractsTable)
      .orderBy(desc(contractsTable.createdAt));
  }

  async getContractById(id: string): Promise<Contract | undefined> {
    const [data] = await db.select().from(contractsTable)
      .where(eq(contractsTable.id, id));
    return data;
  }

  async createContract(contract: InsertContract): Promise<Contract> {
    const [data] = await db.insert(contractsTable)
      .values(contract)
      .returning();
    return data;
  }

  async updateContract(id: string, contract: Partial<InsertContract>): Promise<Contract | undefined> {
    const [data] = await db.update(contractsTable)
      .set({ ...contract, updatedAt: new Date() })
      .where(eq(contractsTable.id, id))
      .returning();
    return data;
  }

  async deleteContract(id: string): Promise<boolean> {
    await db.delete(contractsTable)
      .where(eq(contractsTable.id, id));
    return true;
  }

  // Legal Checklist
  async getLegalChecklist(condominiumId?: string): Promise<LegalChecklist[]> {
    if (condominiumId) {
      return db.select().from(legalChecklistTable)
        .where(eq(legalChecklistTable.condominiumId, condominiumId))
        .orderBy(desc(legalChecklistTable.createdAt));
    }
    return db.select().from(legalChecklistTable)
      .orderBy(desc(legalChecklistTable.createdAt));
  }

  async getLegalChecklistById(id: string): Promise<LegalChecklist | undefined> {
    const [data] = await db.select().from(legalChecklistTable)
      .where(eq(legalChecklistTable.id, id));
    return data;
  }

  async createLegalChecklistItem(item: InsertLegalChecklist): Promise<LegalChecklist> {
    const [data] = await db.insert(legalChecklistTable)
      .values(item)
      .returning();
    return data;
  }

  async updateLegalChecklistItem(id: string, item: Partial<InsertLegalChecklist>): Promise<LegalChecklist | undefined> {
    const [data] = await db.update(legalChecklistTable)
      .set({ ...item, updatedAt: new Date() })
      .where(eq(legalChecklistTable.id, id))
      .returning();
    return data;
  }

  async deleteLegalChecklistItem(id: string): Promise<boolean> {
    await db.delete(legalChecklistTable)
      .where(eq(legalChecklistTable.id, id));
    return true;
  }

  // Insurance Policies
  async getInsurancePolicies(condominiumId?: string): Promise<InsurancePolicy[]> {
    if (condominiumId) {
      return db.select().from(insurancePoliciesTable)
        .where(eq(insurancePoliciesTable.condominiumId, condominiumId))
        .orderBy(desc(insurancePoliciesTable.createdAt));
    }
    return db.select().from(insurancePoliciesTable)
      .orderBy(desc(insurancePoliciesTable.createdAt));
  }

  async getInsurancePolicyById(id: string): Promise<InsurancePolicy | undefined> {
    const [data] = await db.select().from(insurancePoliciesTable)
      .where(eq(insurancePoliciesTable.id, id));
    return data;
  }

  async createInsurancePolicy(policy: InsertInsurancePolicy): Promise<InsurancePolicy> {
    const [data] = await db.insert(insurancePoliciesTable)
      .values(policy)
      .returning();
    return data;
  }

  async updateInsurancePolicy(id: string, policy: Partial<InsertInsurancePolicy>): Promise<InsurancePolicy | undefined> {
    const [data] = await db.update(insurancePoliciesTable)
      .set({ ...policy, updatedAt: new Date() })
      .where(eq(insurancePoliciesTable.id, id))
      .returning();
    return data;
  }

  async deleteInsurancePolicy(id: string): Promise<boolean> {
    await db.delete(insurancePoliciesTable)
      .where(eq(insurancePoliciesTable.id, id));
    return true;
  }

  // Smart Alerts
  async getSmartAlerts(condominiumId?: string): Promise<SmartAlert[]> {
    if (condominiumId) {
      return db.select().from(smartAlertsTable)
        .where(eq(smartAlertsTable.condominiumId, condominiumId))
        .orderBy(desc(smartAlertsTable.createdAt));
    }
    return db.select().from(smartAlertsTable)
      .orderBy(desc(smartAlertsTable.createdAt));
  }

  async getSmartAlertById(id: string): Promise<SmartAlert | undefined> {
    const [data] = await db.select().from(smartAlertsTable)
      .where(eq(smartAlertsTable.id, id));
    return data;
  }

  async createSmartAlert(alert: InsertSmartAlert): Promise<SmartAlert> {
    const [data] = await db.insert(smartAlertsTable)
      .values(alert)
      .returning();
    return data;
  }

  async updateSmartAlert(id: string, alert: Partial<InsertSmartAlert>): Promise<SmartAlert | undefined> {
    const [data] = await db.update(smartAlertsTable)
      .set(alert)
      .where(eq(smartAlertsTable.id, id))
      .returning();
    return data;
  }

  async resolveSmartAlert(id: string, resolvedBy: string): Promise<SmartAlert | undefined> {
    const [data] = await db.update(smartAlertsTable)
      .set({ isResolved: true, resolvedAt: new Date(), resolvedBy })
      .where(eq(smartAlertsTable.id, id))
      .returning();
    return data;
  }

  // Automation Rules
  async getAutomationRules(condominiumId?: string): Promise<AutomationRule[]> {
    if (condominiumId) {
      return db.select().from(automationRulesTable)
        .where(eq(automationRulesTable.condominiumId, condominiumId))
        .orderBy(desc(automationRulesTable.createdAt));
    }
    return db.select().from(automationRulesTable).orderBy(desc(automationRulesTable.createdAt));
  }

  async getAutomationRuleById(id: string): Promise<AutomationRule | undefined> {
    const [data] = await db.select().from(automationRulesTable).where(eq(automationRulesTable.id, id));
    return data;
  }

  async createAutomationRule(rule: InsertAutomationRule): Promise<AutomationRule> {
    const [data] = await db.insert(automationRulesTable).values(rule).returning();
    return data;
  }

  async updateAutomationRule(id: string, rule: Partial<InsertAutomationRule>): Promise<AutomationRule | undefined> {
    const [data] = await db.update(automationRulesTable)
      .set({ ...rule, updatedAt: new Date() })
      .where(eq(automationRulesTable.id, id))
      .returning();
    return data;
  }

  async deleteAutomationRule(id: string): Promise<boolean> {
    const result = await db.delete(automationRulesTable).where(eq(automationRulesTable.id, id));
    return true;
  }

  // Scheduled Tasks
  async getScheduledTasks(condominiumId?: string): Promise<ScheduledTask[]> {
    if (condominiumId) {
      return db.select().from(scheduledTasksTable)
        .where(eq(scheduledTasksTable.condominiumId, condominiumId))
        .orderBy(desc(scheduledTasksTable.scheduledDate));
    }
    return db.select().from(scheduledTasksTable).orderBy(desc(scheduledTasksTable.scheduledDate));
  }

  async getScheduledTaskById(id: string): Promise<ScheduledTask | undefined> {
    const [data] = await db.select().from(scheduledTasksTable).where(eq(scheduledTasksTable.id, id));
    return data;
  }

  async createScheduledTask(task: InsertScheduledTask): Promise<ScheduledTask> {
    const [data] = await db.insert(scheduledTasksTable).values(task).returning();
    return data;
  }

  async updateScheduledTask(id: string, task: Partial<InsertScheduledTask>): Promise<ScheduledTask | undefined> {
    const [data] = await db.update(scheduledTasksTable)
      .set({ ...task, updatedAt: new Date() })
      .where(eq(scheduledTasksTable.id, id))
      .returning();
    return data;
  }

  async deleteScheduledTask(id: string): Promise<boolean> {
    const result = await db.delete(scheduledTasksTable).where(eq(scheduledTasksTable.id, id));
    return true;
  }

  // Operation Logs
  async getOperationLogs(condominiumId?: string): Promise<OperationLog[]> {
    if (condominiumId) {
      return db.select().from(operationLogsTable)
        .where(eq(operationLogsTable.condominiumId, condominiumId))
        .orderBy(desc(operationLogsTable.executedAt));
    }
    return db.select().from(operationLogsTable).orderBy(desc(operationLogsTable.executedAt));
  }

  async createOperationLog(log: InsertOperationLog): Promise<OperationLog> {
    const [data] = await db.insert(operationLogsTable).values(log).returning();
    return data;
  }

  // Team Members
  async getTeamMembers(condominiumId?: string): Promise<TeamMember[]> {
    if (condominiumId) {
      return db.select().from(teamMembersTable)
        .where(eq(teamMembersTable.condominiumId, condominiumId))
        .orderBy(desc(teamMembersTable.createdAt));
    }
    return db.select().from(teamMembersTable).orderBy(desc(teamMembersTable.createdAt));
  }

  async getTeamMemberById(id: string): Promise<TeamMember | undefined> {
    const [data] = await db.select().from(teamMembersTable).where(eq(teamMembersTable.id, id));
    return data;
  }

  async createTeamMember(member: InsertTeamMember): Promise<TeamMember> {
    const [data] = await db.insert(teamMembersTable).values(member).returning();
    return data;
  }

  async updateTeamMember(id: string, member: Partial<InsertTeamMember>): Promise<TeamMember | undefined> {
    const [data] = await db.update(teamMembersTable)
      .set({ ...member, updatedAt: new Date() })
      .where(eq(teamMembersTable.id, id))
      .returning();
    return data;
  }

  async deleteTeamMember(id: string): Promise<boolean> {
    await db.delete(teamMembersTable).where(eq(teamMembersTable.id, id));
    return true;
  }

  // Funcionarios - Sistema de RH
  async getFuncionarios(condominiumId?: string): Promise<Funcionario[]> {
    const sb = supabaseAdmin || this.sb;
    let query = sb.from('funcionarios').select('*').order('nome_completo', { ascending: true });
    
    if (condominiumId) {
      query = query.eq('condominium_id', condominiumId);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    return (data || []).map((row: any) => toCamelCase(row)) as Funcionario[];
  }

  async getFuncionarioById(id: string): Promise<Funcionario | undefined> {
    const sb = supabaseAdmin || this.sb;
    const { data, error } = await sb.from('funcionarios').select('*').eq('id', id).single();
    
    if (error && error.code !== 'PGRST116') throw error;
    if (!data) return undefined;
    
    return toCamelCase(data) as Funcionario;
  }

  async createFuncionario(funcionario: InsertFuncionario): Promise<Funcionario> {
    const sb = supabaseAdmin || this.sb;
    
    // Generate matricula
    const { count } = await sb.from('funcionarios').select('*', { count: 'exact', head: true });
    const nextNumber = (count || 0) + 1;
    const matricula = `FUNC-${String(nextNumber).padStart(4, '0')}`;
    
    const dataToInsert = toSnakeCase({
      ...funcionario,
      matricula,
    });
    
    const { data, error } = await sb.from('funcionarios').insert(dataToInsert).select().single();
    if (error) throw error;
    
    return toCamelCase(data) as Funcionario;
  }

  async updateFuncionario(id: string, funcionario: Partial<InsertFuncionario>): Promise<Funcionario | undefined> {
    const sb = supabaseAdmin || this.sb;
    
    const dataToUpdate = toSnakeCase({
      ...funcionario,
      updatedAt: new Date().toISOString(),
    });
    
    const { data, error } = await sb.from('funcionarios').update(dataToUpdate).eq('id', id).select().single();
    if (error) throw error;
    
    return toCamelCase(data) as Funcionario;
  }

  async deleteFuncionario(id: string): Promise<boolean> {
    const sb = supabaseAdmin || this.sb;
    const { error } = await sb.from('funcionarios').delete().eq('id', id);
    if (error) throw error;
    return true;
  }

  // Processes
  async getProcesses(condominiumId?: string): Promise<Process[]> {
    if (condominiumId) {
      return db.select().from(processesTable)
        .where(eq(processesTable.condominiumId, condominiumId))
        .orderBy(desc(processesTable.createdAt));
    }
    return db.select().from(processesTable).orderBy(desc(processesTable.createdAt));
  }

  async getProcessById(id: string): Promise<Process | undefined> {
    const [data] = await db.select().from(processesTable).where(eq(processesTable.id, id));
    return data;
  }

  async createProcess(process: InsertProcess): Promise<Process> {
    const [data] = await db.insert(processesTable).values(process).returning();
    return data;
  }

  async updateProcess(id: string, process: Partial<InsertProcess>): Promise<Process | undefined> {
    const [data] = await db.update(processesTable)
      .set({ ...process, updatedAt: new Date() })
      .where(eq(processesTable.id, id))
      .returning();
    return data;
  }

  async deleteProcess(id: string): Promise<boolean> {
    await db.delete(processesTable).where(eq(processesTable.id, id));
    return true;
  }

  // Process Executions
  async getProcessExecutions(condominiumId?: string): Promise<ProcessExecution[]> {
    if (condominiumId) {
      return db.select().from(processExecutionsTable)
        .where(eq(processExecutionsTable.condominiumId, condominiumId))
        .orderBy(desc(processExecutionsTable.scheduledDate));
    }
    return db.select().from(processExecutionsTable).orderBy(desc(processExecutionsTable.scheduledDate));
  }

  async getProcessExecutionById(id: string): Promise<ProcessExecution | undefined> {
    const [data] = await db.select().from(processExecutionsTable).where(eq(processExecutionsTable.id, id));
    return data;
  }

  async getProcessExecutionsByProcessId(processId: string): Promise<ProcessExecution[]> {
    return db.select().from(processExecutionsTable)
      .where(eq(processExecutionsTable.processId, processId))
      .orderBy(desc(processExecutionsTable.scheduledDate));
  }

  async createProcessExecution(execution: InsertProcessExecution): Promise<ProcessExecution> {
    const [data] = await db.insert(processExecutionsTable).values(execution).returning();
    return data;
  }

  async updateProcessExecution(id: string, execution: Partial<InsertProcessExecution>): Promise<ProcessExecution | undefined> {
    const [data] = await db.update(processExecutionsTable)
      .set(execution)
      .where(eq(processExecutionsTable.id, id))
      .returning();
    return data;
  }

  async deleteProcessExecution(id: string): Promise<boolean> {
    await db.delete(processExecutionsTable).where(eq(processExecutionsTable.id, id));
    return true;
  }

  // Parcels
  async getParcels(condominiumId?: string): Promise<Parcel[]> {
    if (condominiumId) {
      return db.select().from(parcelsTable)
        .where(eq(parcelsTable.condominiumId, condominiumId))
        .orderBy(desc(parcelsTable.receivedAt));
    }
    return db.select().from(parcelsTable).orderBy(desc(parcelsTable.receivedAt));
  }

  async getParcelById(id: string): Promise<Parcel | undefined> {
    const [data] = await db.select().from(parcelsTable).where(eq(parcelsTable.id, id));
    return data;
  }

  async getParcelsByUnit(condominiumId: string, unit: string): Promise<Parcel[]> {
    return db.select().from(parcelsTable)
      .where(and(eq(parcelsTable.condominiumId, condominiumId), eq(parcelsTable.unit, unit)))
      .orderBy(desc(parcelsTable.receivedAt));
  }

  async createParcel(parcel: InsertParcel): Promise<Parcel> {
    const [data] = await db.insert(parcelsTable).values(parcel).returning();
    return data;
  }

  async updateParcel(id: string, parcel: Partial<InsertParcel>): Promise<Parcel | undefined> {
    const [data] = await db.update(parcelsTable)
      .set({ ...parcel, updatedAt: new Date() })
      .where(eq(parcelsTable.id, id))
      .returning();
    return data;
  }

  async deleteParcel(id: string): Promise<boolean> {
    await db.delete(parcelsTable).where(eq(parcelsTable.id, id));
    return true;
  }

  // Moradores - usando Supabase client diretamente
  async getMoradores(condominiumId?: string): Promise<Morador[]> {
    if (!supabase) throw new Error("Supabase not configured");
    let query = supabase.from("moradores").select("*").order("nome_completo");
    if (condominiumId) {
      query = query.eq("condominium_id", condominiumId);
    }
    const { data, error } = await query;
    if (error) {
      console.error("[getMoradores] Error:", error);
      throw error;
    }
    return (data || []).map(toCamelCase) as Morador[];
  }

  async getMoradorById(id: string): Promise<Morador | undefined> {
    if (!supabase) throw new Error("Supabase not configured");
    const { data, error } = await supabase
      .from("moradores")
      .select("*")
      .eq("id", id)
      .single();
    if (error) {
      if (error.code === "PGRST116") return undefined;
      console.error("[getMoradorById] Error:", error);
      throw error;
    }
    return data ? toCamelCase(data) as Morador : undefined;
  }

  async getMoradorByCpf(condominiumId: string, cpf: string): Promise<Morador | undefined> {
    if (!supabase) throw new Error("Supabase not configured");
    const { data, error } = await supabase
      .from("moradores")
      .select("*")
      .eq("condominium_id", condominiumId)
      .eq("cpf", cpf)
      .maybeSingle();
    if (error) {
      console.error("[getMoradorByCpf] Error:", error);
      throw error;
    }
    return data ? toCamelCase(data) as Morador : undefined;
  }

  async createMorador(morador: InsertMorador): Promise<Morador> {
    if (!supabase) throw new Error("Supabase not configured");
    const snakeCaseData = toSnakeCase(morador);
    console.log("[createMorador] Inserting:", JSON.stringify(snakeCaseData));
    const { data, error } = await supabase
      .from("moradores")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) {
      console.error("[createMorador] Error:", error);
      throw error;
    }
    console.log("[createMorador] Created:", JSON.stringify(data));
    return toCamelCase(data) as Morador;
  }

  async updateMorador(id: string, morador: Partial<InsertMorador>): Promise<Morador | undefined> {
    if (!supabase) throw new Error("Supabase not configured");
    const snakeCaseData = toSnakeCase({ ...morador, updatedAt: new Date() });
    const { data, error } = await supabase
      .from("moradores")
      .update(snakeCaseData)
      .eq("id", id)
      .select()
      .single();
    if (error) {
      console.error("[updateMorador] Error:", error);
      throw error;
    }
    return data ? toCamelCase(data) as Morador : undefined;
  }

  async deleteMorador(id: string): Promise<boolean> {
    if (!supabase) throw new Error("Supabase not configured");
    const { error } = await supabase.from("moradores").delete().eq("id", id);
    if (error) {
      console.error("[deleteMorador] Error:", error);
      throw error;
    }
    return true;
  }

  // ========== MARKETPLACE ==========

  // Categorias de Servicos
  async getCategoriasServicos(condominiumId?: string): Promise<CategoriaServico[]> {
    if (condominiumId) {
      return db.select().from(categoriasServicosTable)
        .where(eq(categoriasServicosTable.condominiumId, condominiumId))
        .orderBy(categoriasServicosTable.nome);
    }
    return db.select().from(categoriasServicosTable).orderBy(categoriasServicosTable.nome);
  }

  async getCategoriaServicoById(id: string): Promise<CategoriaServico | undefined> {
    const [data] = await db.select().from(categoriasServicosTable).where(eq(categoriasServicosTable.id, id));
    return data;
  }

  async createCategoriaServico(categoria: InsertCategoriaServico): Promise<CategoriaServico> {
    const [data] = await db.insert(categoriasServicosTable).values(categoria).returning();
    return data;
  }

  async updateCategoriaServico(id: string, categoria: Partial<InsertCategoriaServico>): Promise<CategoriaServico | undefined> {
    const [data] = await db.update(categoriasServicosTable)
      .set({ ...categoria, updatedAt: new Date() })
      .where(eq(categoriasServicosTable.id, id))
      .returning();
    return data;
  }

  async deleteCategoriaServico(id: string): Promise<boolean> {
    await db.delete(categoriasServicosTable).where(eq(categoriasServicosTable.id, id));
    return true;
  }

  // Servicos
  async getServicos(condominiumId?: string): Promise<Servico[]> {
    if (condominiumId) {
      return db.select().from(servicosTable)
        .where(eq(servicosTable.condominiumId, condominiumId))
        .orderBy(servicosTable.nome);
    }
    return db.select().from(servicosTable).orderBy(servicosTable.nome);
  }

  async getServicoById(id: string): Promise<Servico | undefined> {
    const [data] = await db.select().from(servicosTable).where(eq(servicosTable.id, id));
    return data;
  }

  async getServicosByCategoria(categoriaId: string): Promise<Servico[]> {
    return db.select().from(servicosTable)
      .where(eq(servicosTable.categoriaId, categoriaId))
      .orderBy(servicosTable.nome);
  }

  async createServico(servico: InsertServico): Promise<Servico> {
    const [data] = await db.insert(servicosTable).values(servico).returning();
    return data;
  }

  async updateServico(id: string, servico: Partial<InsertServico>): Promise<Servico | undefined> {
    const [data] = await db.update(servicosTable)
      .set({ ...servico, updatedAt: new Date() })
      .where(eq(servicosTable.id, id))
      .returning();
    return data;
  }

  async deleteServico(id: string): Promise<boolean> {
    await db.delete(servicosTable).where(eq(servicosTable.id, id));
    return true;
  }

  // Fornecedores Marketplace
  async getFornecedoresMarketplace(condominiumId?: string): Promise<FornecedorMarketplace[]> {
    if (condominiumId) {
      return db.select().from(fornecedoresMarketplaceTable)
        .where(eq(fornecedoresMarketplaceTable.condominiumId, condominiumId))
        .orderBy(fornecedoresMarketplaceTable.nomeFantasia);
    }
    return db.select().from(fornecedoresMarketplaceTable).orderBy(fornecedoresMarketplaceTable.nomeFantasia);
  }

  async getFornecedorMarketplaceById(id: string): Promise<FornecedorMarketplace | undefined> {
    const [data] = await db.select().from(fornecedoresMarketplaceTable).where(eq(fornecedoresMarketplaceTable.id, id));
    return data;
  }

  async createFornecedorMarketplace(fornecedor: InsertFornecedorMarketplace): Promise<FornecedorMarketplace> {
    const [data] = await db.insert(fornecedoresMarketplaceTable).values(fornecedor).returning();
    return data;
  }

  async updateFornecedorMarketplace(id: string, fornecedor: Partial<InsertFornecedorMarketplace>): Promise<FornecedorMarketplace | undefined> {
    const [data] = await db.update(fornecedoresMarketplaceTable)
      .set({ ...fornecedor, updatedAt: new Date() })
      .where(eq(fornecedoresMarketplaceTable.id, id))
      .returning();
    return data;
  }

  async deleteFornecedorMarketplace(id: string): Promise<boolean> {
    await db.delete(fornecedoresMarketplaceTable).where(eq(fornecedoresMarketplaceTable.id, id));
    return true;
  }

  // Ofertas
  async getOfertas(condominiumId?: string): Promise<Oferta[]> {
    if (condominiumId) {
      return db.select().from(ofertasTable)
        .where(eq(ofertasTable.condominiumId, condominiumId))
        .orderBy(desc(ofertasTable.createdAt));
    }
    return db.select().from(ofertasTable).orderBy(desc(ofertasTable.createdAt));
  }

  async getOfertaById(id: string): Promise<Oferta | undefined> {
    const [data] = await db.select().from(ofertasTable).where(eq(ofertasTable.id, id));
    return data;
  }

  async getOfertasByServico(servicoId: string): Promise<Oferta[]> {
    return db.select().from(ofertasTable)
      .where(eq(ofertasTable.servicoId, servicoId))
      .orderBy(desc(ofertasTable.createdAt));
  }

  async getOfertasByFornecedor(fornecedorId: string): Promise<Oferta[]> {
    return db.select().from(ofertasTable)
      .where(eq(ofertasTable.fornecedorId, fornecedorId))
      .orderBy(desc(ofertasTable.createdAt));
  }

  async createOferta(oferta: InsertOferta): Promise<Oferta> {
    const [data] = await db.insert(ofertasTable).values(oferta).returning();
    return data;
  }

  async updateOferta(id: string, oferta: Partial<InsertOferta>): Promise<Oferta | undefined> {
    const [data] = await db.update(ofertasTable)
      .set({ ...oferta, updatedAt: new Date() })
      .where(eq(ofertasTable.id, id))
      .returning();
    return data;
  }

  async deleteOferta(id: string): Promise<boolean> {
    await db.delete(ofertasTable).where(eq(ofertasTable.id, id));
    return true;
  }

  // Contratacoes
  async getContratacoes(condominiumId?: string): Promise<Contratacao[]> {
    if (condominiumId) {
      return db.select().from(contratacoesTable)
        .where(eq(contratacoesTable.condominiumId, condominiumId))
        .orderBy(desc(contratacoesTable.createdAt));
    }
    return db.select().from(contratacoesTable).orderBy(desc(contratacoesTable.createdAt));
  }

  async getContratacaoById(id: string): Promise<Contratacao | undefined> {
    const [data] = await db.select().from(contratacoesTable).where(eq(contratacoesTable.id, id));
    return data;
  }

  async getContratacoesByMorador(moradorId: string): Promise<Contratacao[]> {
    return db.select().from(contratacoesTable)
      .where(eq(contratacoesTable.moradorId, moradorId))
      .orderBy(desc(contratacoesTable.createdAt));
  }

  async getContratacoesByOferta(ofertaId: string): Promise<Contratacao[]> {
    return db.select().from(contratacoesTable)
      .where(eq(contratacoesTable.ofertaId, ofertaId))
      .orderBy(desc(contratacoesTable.createdAt));
  }

  async createContratacao(contratacao: InsertContratacao): Promise<Contratacao> {
    const [data] = await db.insert(contratacoesTable).values(contratacao).returning();
    return data;
  }

  async updateContratacao(id: string, contratacao: Partial<InsertContratacao>): Promise<Contratacao | undefined> {
    const [data] = await db.update(contratacoesTable)
      .set({ ...contratacao, updatedAt: new Date() })
      .where(eq(contratacoesTable.id, id))
      .returning();
    return data;
  }

  async deleteContratacao(id: string): Promise<boolean> {
    await db.delete(contratacoesTable).where(eq(contratacoesTable.id, id));
    return true;
  }

  // ========== AVALIACOES ==========

  async getAvaliacoes(condominiumId?: string): Promise<Avaliacao[]> {
    if (condominiumId) {
      return db.select().from(avaliacoesTable).where(eq(avaliacoesTable.condominiumId, condominiumId)).orderBy(desc(avaliacoesTable.createdAt));
    }
    return db.select().from(avaliacoesTable).orderBy(desc(avaliacoesTable.createdAt));
  }

  async getAvaliacaoById(id: string): Promise<Avaliacao | undefined> {
    const [data] = await db.select().from(avaliacoesTable).where(eq(avaliacoesTable.id, id));
    return data;
  }

  async getAvaliacoesByFornecedor(fornecedorId: string): Promise<Avaliacao[]> {
    return db.select().from(avaliacoesTable)
      .where(eq(avaliacoesTable.fornecedorId, fornecedorId))
      .orderBy(desc(avaliacoesTable.createdAt));
  }

  async getAvaliacoesByMorador(moradorId: string): Promise<Avaliacao[]> {
    return db.select().from(avaliacoesTable)
      .where(eq(avaliacoesTable.moradorId, moradorId))
      .orderBy(desc(avaliacoesTable.createdAt));
  }

  async createAvaliacao(avaliacao: InsertAvaliacao): Promise<Avaliacao> {
    const [data] = await db.insert(avaliacoesTable).values(avaliacao).returning();
    
    // Update fornecedor average rating
    const avaliacoesFornecedor = await this.getAvaliacoesByFornecedor(avaliacao.fornecedorId);
    const totalNotas = avaliacoesFornecedor.reduce((acc, a) => acc + a.nota, 0);
    const avaliacaoMedia = totalNotas / avaliacoesFornecedor.length;
    
    await db.update(fornecedoresMarketplaceTable)
      .set({ 
        avaliacaoMedia, 
        totalAvaliacoes: avaliacoesFornecedor.length,
        updatedAt: new Date() 
      })
      .where(eq(fornecedoresMarketplaceTable.id, avaliacao.fornecedorId));
    
    return data;
  }

  async updateAvaliacao(id: string, avaliacao: Partial<InsertAvaliacao>): Promise<Avaliacao | undefined> {
    const [data] = await db.update(avaliacoesTable)
      .set({ ...avaliacao, updatedAt: new Date() })
      .where(eq(avaliacoesTable.id, id))
      .returning();
    return data;
  }

  async deleteAvaliacao(id: string): Promise<boolean> {
    await db.delete(avaliacoesTable).where(eq(avaliacoesTable.id, id));
    return true;
  }

  // ========== VEICULOS ==========

  async getVeiculos(condominiumId?: string): Promise<Veiculo[]> {
    if (condominiumId) {
      return db.select().from(veiculosTable).where(eq(veiculosTable.condominiumId, condominiumId)).orderBy(desc(veiculosTable.createdAt));
    }
    return db.select().from(veiculosTable).orderBy(desc(veiculosTable.createdAt));
  }

  async getVeiculoById(id: string): Promise<Veiculo | undefined> {
    const [data] = await db.select().from(veiculosTable).where(eq(veiculosTable.id, id));
    return data;
  }

  async getVeiculosByMorador(moradorId: string): Promise<Veiculo[]> {
    return db.select().from(veiculosTable)
      .where(eq(veiculosTable.moradorId, moradorId))
      .orderBy(desc(veiculosTable.createdAt));
  }

  async createVeiculo(veiculo: InsertVeiculo): Promise<Veiculo> {
    const [data] = await db.insert(veiculosTable).values(veiculo).returning();
    return data;
  }

  async updateVeiculo(id: string, veiculo: Partial<InsertVeiculo>): Promise<Veiculo | undefined> {
    const [data] = await db.update(veiculosTable)
      .set({ ...veiculo, updatedAt: new Date() })
      .where(eq(veiculosTable.id, id))
      .returning();
    return data;
  }

  async deleteVeiculo(id: string): Promise<boolean> {
    await db.delete(veiculosTable).where(eq(veiculosTable.id, id));
    return true;
  }

  // ========== MARKETPLACE INTELIGENTE ==========

  async getMarketplaceRecomendacoes(moradorId: string, condominiumId: string): Promise<{
    ofertas: Oferta[];
    recomendadas: Oferta[];
    porCategoria: Record<string, Oferta[]>;
  }> {
    // Get morador data for personalization
    const morador = await this.getMoradorById(moradorId);
    const veiculos = await this.getVeiculosByMorador(moradorId);
    
    // Get all active offers from approved suppliers
    const todasOfertas = await db.select().from(ofertasTable)
      .where(and(
        eq(ofertasTable.condominiumId, condominiumId),
        eq(ofertasTable.ativo, true)
      ))
      .orderBy(desc(ofertasTable.createdAt));

    // Get services for categorization
    const todosServicos = await this.getServicos(condominiumId);
    const servicosMap = new Map(todosServicos.map(s => [s.id, s]));

    // Get approved suppliers
    const fornecedores = await db.select().from(fornecedoresMarketplaceTable)
      .where(and(
        eq(fornecedoresMarketplaceTable.condominiumId, condominiumId),
        eq(fornecedoresMarketplaceTable.statusAprovacao, "aprovado"),
        eq(fornecedoresMarketplaceTable.ativo, true)
      ));
    const fornecedoresAprovados = new Set(fornecedores.map(f => f.id));

    // Filter offers from approved suppliers only
    const ofertasAtivas = todasOfertas.filter(o => fornecedoresAprovados.has(o.fornecedorId));

    // Personalized recommendations
    const recomendadas: Oferta[] = [];
    const porCategoria: Record<string, Oferta[]> = {};

    for (const oferta of ofertasAtivas) {
      const servico = servicosMap.get(oferta.servicoId);
      if (!servico) continue;

      // Categorize by service type
      if (!porCategoria[servico.tipoServico]) {
        porCategoria[servico.tipoServico] = [];
      }
      porCategoria[servico.tipoServico].push(oferta);

      // Intelligent recommendations based on morador profile
      let isRecommended = false;

      // Pet services for pet owners
      if (morador?.temPet && servico.tipoServico === "pet") {
        isRecommended = true;
      }

      // Vehicle services for vehicle owners
      if (veiculos.length > 0 && servico.tipoServico === "veiculo") {
        isRecommended = true;
      }

      // Cleaning services for renters
      if (morador?.tipoMorador === "inquilino" && servico.tipoServico === "limpeza") {
        isRecommended = true;
      }

      if (isRecommended && !recomendadas.find(r => r.id === oferta.id)) {
        recomendadas.push(oferta);
      }
    }

    // Sort recommendations by supplier rating
    const fornecedoresMap = new Map(fornecedores.map(f => [f.id, f]));
    recomendadas.sort((a, b) => {
      const fA = fornecedoresMap.get(a.fornecedorId);
      const fB = fornecedoresMap.get(b.fornecedorId);
      return (fB?.avaliacaoMedia || 0) - (fA?.avaliacaoMedia || 0);
    });

    return {
      ofertas: ofertasAtivas,
      recomendadas,
      porCategoria,
    };
  }

  // ========== SUPPLIER APPROVAL ==========

  async aprovarFornecedor(id: string): Promise<FornecedorMarketplace | undefined> {
    const [data] = await db.update(fornecedoresMarketplaceTable)
      .set({ statusAprovacao: "aprovado", motivoBloqueio: null, updatedAt: new Date() })
      .where(eq(fornecedoresMarketplaceTable.id, id))
      .returning();
    return data;
  }

  async bloquearFornecedor(id: string, motivo: string): Promise<FornecedorMarketplace | undefined> {
    const [data] = await db.update(fornecedoresMarketplaceTable)
      .set({ statusAprovacao: "bloqueado", motivoBloqueio: motivo, updatedAt: new Date() })
      .where(eq(fornecedoresMarketplaceTable.id, id))
      .returning();
    return data;
  }

  async getFornecedoresByStatus(condominiumId: string, status: string): Promise<FornecedorMarketplace[]> {
    return db.select().from(fornecedoresMarketplaceTable)
      .where(and(
        eq(fornecedoresMarketplaceTable.condominiumId, condominiumId),
        eq(fornecedoresMarketplaceTable.statusAprovacao, status as any)
      ))
      .orderBy(desc(fornecedoresMarketplaceTable.createdAt));
  }

  // ========== MARKETPLACE REPORTS ==========

  async getMarketplaceRelatorios(condominiumId: string): Promise<{
    servicosMaisContratados: { servicoId: string; nome: string; total: number }[];
    fornecedoresMelhorAvaliados: FornecedorMarketplace[];
    totalContratacoes: number;
    valorTotalContratado: number;
  }> {
    // Get all contracts for the condominium
    const contratacoes = await this.getContratacoes(condominiumId);
    
    // Count contracts per service
    const servicosCount: Record<string, number> = {};
    let valorTotal = 0;
    
    for (const c of contratacoes) {
      const oferta = await this.getOfertaById(c.ofertaId);
      if (oferta) {
        servicosCount[oferta.servicoId] = (servicosCount[oferta.servicoId] || 0) + 1;
        valorTotal += oferta.precoBase || 0;
      }
    }

    // Get services info
    const servicos = await this.getServicos(condominiumId);
    const servicosMap = new Map(servicos.map(s => [s.id, s]));

    const servicosMaisContratados = Object.entries(servicosCount)
      .map(([servicoId, total]) => ({
        servicoId,
        nome: servicosMap.get(servicoId)?.nome || "Desconhecido",
        total,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    // Get best rated suppliers
    const fornecedores = await this.getFornecedoresMarketplace(condominiumId);
    const fornecedoresMelhorAvaliados = fornecedores
      .filter(f => f.totalAvaliacoes && f.totalAvaliacoes > 0)
      .sort((a, b) => (b.avaliacaoMedia || 0) - (a.avaliacaoMedia || 0))
      .slice(0, 10);

    return {
      servicosMaisContratados,
      fornecedoresMelhorAvaliados,
      totalContratacoes: contratacoes.length,
      valorTotalContratado: valorTotal,
    };
  }

  // ========== SUPPLIER PORTAL ==========

  async getOfertasByFornecedorUserId(userId: string): Promise<Oferta[]> {
    // Find fornecedor by userId
    const [fornecedor] = await db.select().from(fornecedoresMarketplaceTable)
      .where(eq(fornecedoresMarketplaceTable.userId, userId));
    
    if (!fornecedor) return [];
    
    return db.select().from(ofertasTable)
      .where(eq(ofertasTable.fornecedorId, fornecedor.id))
      .orderBy(desc(ofertasTable.createdAt));
  }

  async getContratacoesByFornecedorUserId(userId: string): Promise<Contratacao[]> {
    // Find fornecedor by userId
    const [fornecedor] = await db.select().from(fornecedoresMarketplaceTable)
      .where(eq(fornecedoresMarketplaceTable.userId, userId));
    
    if (!fornecedor) return [];
    
    // Get all offers from this supplier
    const ofertas = await db.select().from(ofertasTable)
      .where(eq(ofertasTable.fornecedorId, fornecedor.id));
    
    const ofertaIds = ofertas.map(o => o.id);
    if (ofertaIds.length === 0) return [];
    
    // Get all contracts for these offers
    const allContratacoes = await db.select().from(contratacoesTable)
      .orderBy(desc(contratacoesTable.createdAt));
    
    return allContratacoes.filter(c => ofertaIds.includes(c.ofertaId));
  }

  async getFornecedorByUserId(userId: string): Promise<FornecedorMarketplace | undefined> {
    const [data] = await db.select().from(fornecedoresMarketplaceTable)
      .where(eq(fornecedoresMarketplaceTable.userId, userId));
    return data;
  }

  // ========== TAXAS CONDOMINIO ==========
  async getTaxasCondominio(condominiumId?: string): Promise<TaxaCondominio[]> {
    let query = supabase.from("taxas_condominio").select("*").order("nome");
    if (condominiumId) {
      query = query.eq("condominium_id", condominiumId);
    }
    const { data, error } = await query;
    if (error) {
      console.error("[getTaxasCondominio] Error:", error);
      return [];
    }
    return (data || []).map(toCamelCase) as TaxaCondominio[];
  }

  async getTaxaCondominioById(id: string): Promise<TaxaCondominio | undefined> {
    const { data, error } = await supabase
      .from("taxas_condominio")
      .select("*")
      .eq("id", id)
      .single();
    if (error) {
      console.error("[getTaxaCondominioById] Error:", error);
      return undefined;
    }
    return data ? toCamelCase(data) as TaxaCondominio : undefined;
  }

  async createTaxaCondominio(taxa: InsertTaxaCondominio): Promise<TaxaCondominio> {
    const snakeCaseData = toSnakeCase(taxa);
    const { data, error } = await supabase
      .from("taxas_condominio")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) {
      console.error("[createTaxaCondominio] Error:", error);
      throw new Error(error.message);
    }
    return toCamelCase(data) as TaxaCondominio;
  }

  async updateTaxaCondominio(id: string, taxa: Partial<InsertTaxaCondominio>): Promise<TaxaCondominio> {
    const snakeCaseData = toSnakeCase({ ...taxa, updatedAt: new Date() });
    const { data, error } = await supabase
      .from("taxas_condominio")
      .update(snakeCaseData)
      .eq("id", id)
      .select()
      .single();
    if (error) {
      console.error("[updateTaxaCondominio] Error:", error);
      throw new Error(error.message);
    }
    return toCamelCase(data) as TaxaCondominio;
  }

  async deleteTaxaCondominio(id: string): Promise<void> {
    const { error } = await supabase
      .from("taxas_condominio")
      .delete()
      .eq("id", id);
    if (error) {
      console.error("[deleteTaxaCondominio] Error:", error);
      throw new Error(error.message);
    }
  }

  // ========== COBRANCAS ==========
  async getCobrancas(condominiumId?: string): Promise<Cobranca[]> {
    let query = supabase.from("cobrancas").select("*").order("data_vencimento", { ascending: false });
    if (condominiumId) {
      query = query.eq("condominium_id", condominiumId);
    }
    const { data, error } = await query;
    if (error) {
      console.error("[getCobrancas] Error:", error);
      return [];
    }
    return (data || []).map(toCamelCase) as Cobranca[];
  }

  async getCobrancasByMorador(moradorId: string): Promise<Cobranca[]> {
    const { data, error } = await supabase
      .from("cobrancas")
      .select("*")
      .eq("morador_id", moradorId)
      .order("data_vencimento", { ascending: false });
    if (error) {
      console.error("[getCobrancasByMorador] Error:", error);
      return [];
    }
    return (data || []).map(toCamelCase) as Cobranca[];
  }

  async getCobrancasByUser(userId: string, condominiumId: string): Promise<Cobranca[]> {
    // Get user's moradores records in this condominium
    const moradores = await this.getMoradores(condominiumId);
    const user = await this.getUser(userId);
    if (!user) return [];
    
    // Find morador by email or unit
    const morador = moradores.find(m => m.email === user.email);
    if (!morador) return [];
    
    return this.getCobrancasByMorador(morador.id);
  }

  async getCobrancaById(id: string): Promise<Cobranca | undefined> {
    const { data, error } = await supabase
      .from("cobrancas")
      .select("*")
      .eq("id", id)
      .single();
    if (error) {
      console.error("[getCobrancaById] Error:", error);
      return undefined;
    }
    return data ? toCamelCase(data) as Cobranca : undefined;
  }

  async createCobranca(cobranca: InsertCobranca): Promise<Cobranca> {
    const snakeCaseData = toSnakeCase(cobranca);
    const { data, error } = await supabase
      .from("cobrancas")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) {
      console.error("[createCobranca] Error:", error);
      throw new Error(error.message);
    }
    return toCamelCase(data) as Cobranca;
  }

  async updateCobranca(id: string, cobranca: Partial<InsertCobranca>): Promise<Cobranca> {
    const snakeCaseData = toSnakeCase({ ...cobranca, updatedAt: new Date() });
    const { data, error } = await supabase
      .from("cobrancas")
      .update(snakeCaseData)
      .eq("id", id)
      .select()
      .single();
    if (error) {
      console.error("[updateCobranca] Error:", error);
      throw new Error(error.message);
    }
    return toCamelCase(data) as Cobranca;
  }

  async deleteCobranca(id: string): Promise<void> {
    const { error } = await supabase
      .from("cobrancas")
      .delete()
      .eq("id", id);
    if (error) {
      console.error("[deleteCobranca] Error:", error);
      throw new Error(error.message);
    }
  }

  // ========== PAGAMENTOS ==========
  async getPagamentos(condominiumId?: string): Promise<Pagamento[]> {
    let query = supabase.from("pagamentos").select("*").order("created_at", { ascending: false });
    if (condominiumId) {
      query = query.eq("condominium_id", condominiumId);
    }
    const { data, error } = await query;
    if (error) {
      console.error("[getPagamentos] Error:", error);
      return [];
    }
    return (data || []).map(toCamelCase) as Pagamento[];
  }

  async getPagamentosByUser(userId: string): Promise<Pagamento[]> {
    const { data, error } = await supabase
      .from("pagamentos")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[getPagamentosByUser] Error:", error);
      return [];
    }
    return (data || []).map(toCamelCase) as Pagamento[];
  }

  async getPagamentoById(id: string): Promise<Pagamento | undefined> {
    const { data, error } = await supabase
      .from("pagamentos")
      .select("*")
      .eq("id", id)
      .single();
    if (error) {
      console.error("[getPagamentoById] Error:", error);
      return undefined;
    }
    return data ? toCamelCase(data) as Pagamento : undefined;
  }

  async getPagamentoByStripeSession(sessionId: string): Promise<Pagamento | undefined> {
    const { data, error } = await supabase
      .from("pagamentos")
      .select("*")
      .eq("stripe_checkout_session_id", sessionId)
      .single();
    if (error) {
      console.error("[getPagamentoByStripeSession] Error:", error);
      return undefined;
    }
    return data ? toCamelCase(data) as Pagamento : undefined;
  }

  async createPagamento(pagamento: InsertPagamento): Promise<Pagamento> {
    const snakeCaseData = toSnakeCase(pagamento);
    const { data, error } = await supabase
      .from("pagamentos")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) {
      console.error("[createPagamento] Error:", error);
      throw new Error(error.message);
    }
    return toCamelCase(data) as Pagamento;
  }

  async updatePagamento(id: string, pagamento: Partial<InsertPagamento>): Promise<Pagamento> {
    const snakeCaseData = toSnakeCase({ ...pagamento, updatedAt: new Date() });
    const { data, error } = await supabase
      .from("pagamentos")
      .update(snakeCaseData)
      .eq("id", id)
      .select()
      .single();
    if (error) {
      console.error("[updatePagamento] Error:", error);
      throw new Error(error.message);
    }
    return toCamelCase(data) as Pagamento;
  }

  // ========== HOSPEDAGENS (RENTAL MANAGEMENT) ==========

  async getHospedagens(condominiumId?: string): Promise<Hospedagem[]> {
    let query = supabase.from("hospedagens").select("*").order("created_at", { ascending: false });
    if (condominiumId) {
      query = query.eq("condominium_id", condominiumId);
    }
    const { data, error } = await query;
    if (error) {
      console.error("[getHospedagens] Error:", error);
      return [];
    }
    return (data || []).map(toCamelCase) as Hospedagem[];
  }

  async getHospedagemById(id: string): Promise<Hospedagem | undefined> {
    const { data, error } = await supabase
      .from("hospedagens")
      .select("*")
      .eq("id", id)
      .single();
    if (error) {
      console.error("[getHospedagemById] Error:", error);
      return undefined;
    }
    return data ? toCamelCase(data) as Hospedagem : undefined;
  }

  async getHospedagensAtivas(condominiumId: string): Promise<Hospedagem[]> {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("hospedagens")
      .select("*")
      .eq("condominium_id", condominiumId)
      .in("status", ["reservado", "em_andamento"])
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[getHospedagensAtivas] Error:", error);
      return [];
    }
    return (data || []).map(toCamelCase) as Hospedagem[];
  }

  async createHospedagem(hospedagem: InsertHospedagem): Promise<Hospedagem> {
    const snakeCaseData = toSnakeCase(hospedagem);
    const { data, error } = await supabase
      .from("hospedagens")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) {
      console.error("[createHospedagem] Error:", error);
      throw new Error(error.message);
    }
    return toCamelCase(data) as Hospedagem;
  }

  async updateHospedagem(id: string, hospedagem: Partial<InsertHospedagem>): Promise<Hospedagem> {
    const snakeCaseData = toSnakeCase({ ...hospedagem, updatedAt: new Date() });
    const { data, error } = await supabase
      .from("hospedagens")
      .update(snakeCaseData)
      .eq("id", id)
      .select()
      .single();
    if (error) {
      console.error("[updateHospedagem] Error:", error);
      throw new Error(error.message);
    }
    return toCamelCase(data) as Hospedagem;
  }

  async deleteHospedagem(id: string): Promise<void> {
    const { error } = await supabase
      .from("hospedagens")
      .delete()
      .eq("id", id);
    if (error) {
      console.error("[deleteHospedagem] Error:", error);
      throw new Error(error.message);
    }
  }

  async marcarBoasVindasEnviadas(id: string): Promise<Hospedagem> {
    const { data, error } = await supabase
      .from("hospedagens")
      .update({
        boas_vindas_enviadas: true,
        data_envio_boas_vindas: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select()
      .single();
    if (error) {
      console.error("[marcarBoasVindasEnviadas] Error:", error);
      throw new Error(error.message);
    }
    return toCamelCase(data) as Hospedagem;
  }

  // ========== CONFIGURAÇÕES DE LOCAÇÃO ==========

  async getConfiguracoesLocacao(condominiumId: string): Promise<ConfiguracoesLocacao | undefined> {
    const { data, error } = await supabase
      .from("configuracoes_locacao")
      .select("*")
      .eq("condominium_id", condominiumId)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return undefined;
      console.error("[getConfiguracoesLocacao] Error:", error);
      return undefined;
    }
    return data ? toCamelCase(data) as ConfiguracoesLocacao : undefined;
  }

  async upsertConfiguracoesLocacao(config: InsertConfiguracoesLocacao): Promise<ConfiguracoesLocacao> {
    const snakeCaseData = toSnakeCase(config);
    const { data, error } = await supabase
      .from("configuracoes_locacao")
      .upsert(snakeCaseData, { onConflict: 'condominium_id' })
      .select()
      .single();
    if (error) {
      console.error("[upsertConfiguracoesLocacao] Error:", error);
      throw new Error(error.message);
    }
    return toCamelCase(data) as ConfiguracoesLocacao;
  }

  // ========== MARKETPLACE CATEGORIAS ==========

  async getMarketplaceCategorias(): Promise<MarketplaceCategoria[]> {
    const { data, error } = await supabase
      .from("marketplace_categorias")
      .select("*")
      .order("nome", { ascending: true });
    if (error) {
      console.error("[getMarketplaceCategorias] Error:", error);
      return [];
    }
    return (data || []).map((item: any) => toCamelCase(item) as MarketplaceCategoria);
  }

  async getMarketplaceCategoriaById(id: string): Promise<MarketplaceCategoria | undefined> {
    const { data, error } = await supabase
      .from("marketplace_categorias")
      .select("*")
      .eq("id", id)
      .single();
    if (error) return undefined;
    return data ? toCamelCase(data) as MarketplaceCategoria : undefined;
  }

  async createMarketplaceCategoria(categoria: InsertMarketplaceCategoria): Promise<MarketplaceCategoria> {
    const snakeCaseData = toSnakeCase(categoria);
    const { data, error } = await supabase
      .from("marketplace_categorias")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toCamelCase(data) as MarketplaceCategoria;
  }

  async updateMarketplaceCategoria(id: string, updates: Partial<InsertMarketplaceCategoria>): Promise<MarketplaceCategoria | undefined> {
    const snakeCaseData = toSnakeCase({ ...updates, updatedAt: new Date() });
    const { data, error } = await supabase
      .from("marketplace_categorias")
      .update(snakeCaseData)
      .eq("id", id)
      .select()
      .single();
    if (error) return undefined;
    return toCamelCase(data) as MarketplaceCategoria;
  }

  async deleteMarketplaceCategoria(id: string): Promise<boolean> {
    const { error } = await supabase
      .from("marketplace_categorias")
      .delete()
      .eq("id", id);
    return !error;
  }

  // ========== MARKETPLACE SERVICOS ==========

  async getMarketplaceServicos(categoriaId?: string): Promise<MarketplaceServico[]> {
    let query = supabase.from("marketplace_servicos").select("*").eq("ativo", true);
    if (categoriaId) query = query.eq("categoria_id", categoriaId);
    const { data, error } = await query.order("nome", { ascending: true });
    if (error) return [];
    return (data || []).map((item: any) => toCamelCase(item) as MarketplaceServico);
  }

  async createMarketplaceServico(servico: InsertMarketplaceServico): Promise<MarketplaceServico> {
    const snakeCaseData = toSnakeCase(servico);
    const { data, error } = await supabase.from("marketplace_servicos").insert(snakeCaseData).select().single();
    if (error) throw new Error(error.message);
    return toCamelCase(data) as MarketplaceServico;
  }

  async updateMarketplaceServico(id: string, updates: Partial<InsertMarketplaceServico>): Promise<MarketplaceServico | undefined> {
    const snakeCaseData = toSnakeCase({ ...updates, updatedAt: new Date() });
    const { data, error } = await supabase.from("marketplace_servicos").update(snakeCaseData).eq("id", id).select().single();
    if (error) return undefined;
    return toCamelCase(data) as MarketplaceServico;
  }

  async deleteMarketplaceServico(id: string): Promise<boolean> {
    const { error } = await supabase.from("marketplace_servicos").delete().eq("id", id);
    return !error;
  }

  // ========== MARKETPLACE FORNECEDORES ==========

  async getMarketplaceFornecedores(condominiumId?: string, status?: string): Promise<MarketplaceFornecedor[]> {
    let query = supabase.from("marketplace_fornecedores").select("*");
    if (condominiumId) query = query.eq("condominium_id", condominiumId);
    if (status) query = query.eq("status", status);
    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) return [];
    return (data || []).map((item: any) => toCamelCase(item) as MarketplaceFornecedor);
  }

  async getMarketplaceFornecedorById(id: string): Promise<MarketplaceFornecedor | undefined> {
    const { data, error } = await supabase.from("marketplace_fornecedores").select("*").eq("id", id).single();
    if (error) return undefined;
    return data ? toCamelCase(data) as MarketplaceFornecedor : undefined;
  }

  async getMarketplaceFornecedorByUserId(userId: string): Promise<MarketplaceFornecedor | undefined> {
    const { data, error } = await supabase.from("marketplace_fornecedores").select("*").eq("user_id", userId).single();
    if (error) return undefined;
    return data ? toCamelCase(data) as MarketplaceFornecedor : undefined;
  }

  async createMarketplaceFornecedor(fornecedor: InsertMarketplaceFornecedor): Promise<MarketplaceFornecedor> {
    const snakeCaseData = toSnakeCase(fornecedor);
    const { data, error } = await supabase.from("marketplace_fornecedores").insert(snakeCaseData).select().single();
    if (error) throw new Error(error.message);
    return toCamelCase(data) as MarketplaceFornecedor;
  }

  async updateMarketplaceFornecedor(id: string, updates: Partial<InsertMarketplaceFornecedor>): Promise<MarketplaceFornecedor | undefined> {
    const snakeCaseData = toSnakeCase({ ...updates, updatedAt: new Date() });
    const { data, error } = await supabase.from("marketplace_fornecedores").update(snakeCaseData).eq("id", id).select().single();
    if (error) return undefined;
    return toCamelCase(data) as MarketplaceFornecedor;
  }

  async aprovarMarketplaceFornecedor(id: string, aprovadoPor: string): Promise<MarketplaceFornecedor | undefined> {
    const { data, error } = await supabase
      .from("marketplace_fornecedores")
      .update({ status: "aprovado", aprovado_por: aprovadoPor, aprovado_em: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) return undefined;
    return toCamelCase(data) as MarketplaceFornecedor;
  }

  async rejeitarMarketplaceFornecedor(id: string): Promise<MarketplaceFornecedor | undefined> {
    const { data, error } = await supabase
      .from("marketplace_fornecedores")
      .update({ status: "rejeitado", updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) return undefined;
    return toCamelCase(data) as MarketplaceFornecedor;
  }

  // ========== MARKETPLACE OFERTAS ==========

  async getMarketplaceOfertas(condominiumId?: string, fornecedorId?: string, servicoId?: string): Promise<MarketplaceOferta[]> {
    let query = supabase.from("marketplace_ofertas").select("*").eq("disponivel", true);
    if (condominiumId) query = query.eq("condominium_id", condominiumId);
    if (fornecedorId) query = query.eq("fornecedor_id", fornecedorId);
    if (servicoId) query = query.eq("servico_id", servicoId);
    const { data, error } = await query.order("destaque", { ascending: false }).order("created_at", { ascending: false });
    if (error) return [];
    return (data || []).map((item: any) => toCamelCase(item) as MarketplaceOferta);
  }

  async getMarketplaceOfertaById(id: string): Promise<MarketplaceOferta | undefined> {
    const { data, error } = await supabase.from("marketplace_ofertas").select("*").eq("id", id).single();
    if (error) return undefined;
    return data ? toCamelCase(data) as MarketplaceOferta : undefined;
  }

  async createMarketplaceOferta(oferta: InsertMarketplaceOferta): Promise<MarketplaceOferta> {
    const snakeCaseData = toSnakeCase(oferta);
    const { data, error } = await supabase.from("marketplace_ofertas").insert(snakeCaseData).select().single();
    if (error) throw new Error(error.message);
    return toCamelCase(data) as MarketplaceOferta;
  }

  async updateMarketplaceOferta(id: string, updates: Partial<InsertMarketplaceOferta>): Promise<MarketplaceOferta | undefined> {
    const snakeCaseData = toSnakeCase({ ...updates, updatedAt: new Date() });
    const { data, error } = await supabase.from("marketplace_ofertas").update(snakeCaseData).eq("id", id).select().single();
    if (error) return undefined;
    return toCamelCase(data) as MarketplaceOferta;
  }

  async deleteMarketplaceOferta(id: string): Promise<boolean> {
    const { error } = await supabase.from("marketplace_ofertas").delete().eq("id", id);
    return !error;
  }

  // ========== MARKETPLACE CONTRATACOES ==========

  async getMarketplaceContratacoes(condominiumId?: string, moradorId?: string, fornecedorId?: string, status?: string): Promise<MarketplaceContratacao[]> {
    let query = supabase.from("marketplace_contratacoes").select("*");
    if (condominiumId) query = query.eq("condominium_id", condominiumId);
    if (moradorId) query = query.eq("morador_id", moradorId);
    if (fornecedorId) query = query.eq("fornecedor_id", fornecedorId);
    if (status) query = query.eq("status", status);
    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) return [];
    return (data || []).map((item: any) => toCamelCase(item) as MarketplaceContratacao);
  }

  async getMarketplaceContratacaoById(id: string): Promise<MarketplaceContratacao | undefined> {
    const { data, error } = await supabase.from("marketplace_contratacoes").select("*").eq("id", id).single();
    if (error) return undefined;
    return data ? toCamelCase(data) as MarketplaceContratacao : undefined;
  }

  async createMarketplaceContratacao(contratacao: InsertMarketplaceContratacao): Promise<MarketplaceContratacao> {
    const snakeCaseData = toSnakeCase(contratacao);
    const { data, error } = await supabase.from("marketplace_contratacoes").insert(snakeCaseData).select().single();
    if (error) throw new Error(error.message);
    return toCamelCase(data) as MarketplaceContratacao;
  }

  async updateMarketplaceContratacao(id: string, updates: Partial<InsertMarketplaceContratacao>): Promise<MarketplaceContratacao | undefined> {
    const snakeCaseData = toSnakeCase({ ...updates, updatedAt: new Date() });
    const { data, error } = await supabase.from("marketplace_contratacoes").update(snakeCaseData).eq("id", id).select().single();
    if (error) return undefined;
    return toCamelCase(data) as MarketplaceContratacao;
  }

  async atualizarStatusContratacao(id: string, status: string): Promise<MarketplaceContratacao | undefined> {
    const updates: any = { status, updated_at: new Date().toISOString() };
    if (status === "concluido") updates.data_conclusao = new Date().toISOString();
    const { data, error } = await supabase.from("marketplace_contratacoes").update(updates).eq("id", id).select().single();
    if (error) return undefined;
    return toCamelCase(data) as MarketplaceContratacao;
  }

  // ========== MARKETPLACE AVALIACOES ==========

  async getMarketplaceAvaliacoes(fornecedorId?: string, contratacaoId?: string): Promise<MarketplaceAvaliacao[]> {
    let query = supabase.from("marketplace_avaliacoes").select("*");
    if (fornecedorId) query = query.eq("fornecedor_id", fornecedorId);
    if (contratacaoId) query = query.eq("contratacao_id", contratacaoId);
    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) return [];
    return (data || []).map((item: any) => toCamelCase(item) as MarketplaceAvaliacao);
  }

  async createMarketplaceAvaliacao(avaliacao: InsertMarketplaceAvaliacao): Promise<MarketplaceAvaliacao> {
    const snakeCaseData = toSnakeCase(avaliacao);
    const { data, error } = await supabase.from("marketplace_avaliacoes").insert(snakeCaseData).select().single();
    if (error) throw new Error(error.message);
    
    // Update fornecedor rating
    await this.atualizarMediaAvaliacaoFornecedor(avaliacao.fornecedorId);
    
    return toCamelCase(data) as MarketplaceAvaliacao;
  }

  async atualizarMediaAvaliacaoFornecedor(fornecedorId: string): Promise<void> {
    const { data, error } = await supabase
      .from("marketplace_avaliacoes")
      .select("nota")
      .eq("fornecedor_id", fornecedorId);
    if (error || !data || data.length === 0) return;
    
    const totalAvaliacoes = data.length;
    const avaliacaoMedia = data.reduce((sum, a) => sum + a.nota, 0) / totalAvaliacoes;
    
    await supabase
      .from("marketplace_fornecedores")
      .update({ avaliacao_media: avaliacaoMedia, total_avaliacoes: totalAvaliacoes, updated_at: new Date().toISOString() })
      .eq("id", fornecedorId);
  }

  // ========== MARKETPLACE COMISSOES ==========

  async getMarketplaceComissoes(condominiumId: string): Promise<MarketplaceComissao[]> {
    const { data, error } = await supabase.from("marketplace_comissoes").select("*").eq("condominium_id", condominiumId);
    if (error) return [];
    return (data || []).map((item: any) => toCamelCase(item) as MarketplaceComissao);
  }

  async upsertMarketplaceComissao(comissao: InsertMarketplaceComissao): Promise<MarketplaceComissao> {
    const snakeCaseData = toSnakeCase(comissao);
    const { data, error } = await supabase
      .from("marketplace_comissoes")
      .upsert(snakeCaseData, { onConflict: 'condominium_id,categoria_id' })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toCamelCase(data) as MarketplaceComissao;
  }

  // ========== MARKETPLACE METRICS ==========

  async getMarketplaceMetrics(condominiumId: string): Promise<{
    totalFornecedores: number;
    fornecedoresPendentes: number;
    totalContratacoes: number;
    contratacoesMes: number;
    avaliacaoMedia: number;
    servicosMaisContratados: { servicoId: string; total: number }[];
  }> {
    const [fornecedores, contratacoes, avaliacoes] = await Promise.all([
      this.getMarketplaceFornecedores(condominiumId),
      this.getMarketplaceContratacoes(condominiumId),
      supabase.from("marketplace_avaliacoes").select("nota")
    ]);
    
    const mesAtual = new Date();
    mesAtual.setDate(1);
    const contratacoesMes = contratacoes.filter(c => new Date(c.createdAt!) >= mesAtual).length;
    
    const avaliacoesData = avaliacoes.data || [];
    const avaliacaoMedia = avaliacoesData.length > 0 
      ? avaliacoesData.reduce((sum, a) => sum + a.nota, 0) / avaliacoesData.length 
      : 0;
    
    const servicoCount: Record<string, number> = {};
    contratacoes.forEach(c => {
      if (c.ofertaId) {
        servicoCount[c.ofertaId] = (servicoCount[c.ofertaId] || 0) + 1;
      }
    });
    
    const servicosMaisContratados = Object.entries(servicoCount)
      .map(([servicoId, total]) => ({ servicoId, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
    
    return {
      totalFornecedores: fornecedores.filter(f => f.status === "aprovado").length,
      fornecedoresPendentes: fornecedores.filter(f => f.status === "pendente").length,
      totalContratacoes: contratacoes.length,
      contratacoesMes,
      avaliacaoMedia,
      servicosMaisContratados
    };
  }

  // ========== ACTIVITY CATEGORIES ==========

  async getActivityCategories(condominiumId?: string): Promise<any[]> {
    if (condominiumId) {
      const { data, error } = await supabase.from("activity_categories").select("*").eq("condominium_id", condominiumId).eq("is_active", true).order("ordem");
      if (error) return [];
      return (data || []).map((item: any) => toCamelCase(item));
    }
    const { data, error } = await supabase.from("activity_categories").select("*").eq("is_active", true).order("ordem");
    if (error) return [];
    return (data || []).map((item: any) => toCamelCase(item));
  }

  async createActivityCategory(category: any): Promise<any> {
    const snakeCaseData = toSnakeCase(category);
    const { data, error } = await supabase.from("activity_categories").insert(snakeCaseData).select().single();
    if (error) throw new Error(error.message);
    return toCamelCase(data);
  }

  async updateActivityCategory(id: string, category: any): Promise<any> {
    const snakeCaseData = toSnakeCase(category);
    const { data, error } = await supabase.from("activity_categories").update({ ...snakeCaseData, updated_at: new Date().toISOString() }).eq("id", id).select().single();
    if (error) throw new Error(error.message);
    return toCamelCase(data);
  }

  async deleteActivityCategory(id: string): Promise<void> {
    await supabase.from("activity_categories").update({ is_active: false }).eq("id", id);
  }

  // ========== ACTIVITY TEMPLATES ==========

  async getActivityTemplates(condominiumId?: string, funcao?: string): Promise<any[]> {
    const client = supabaseAdmin || supabase;
    let query = client.from("activity_templates").select("*").eq("is_active", true).order("ordem");
    if (condominiumId) query = query.eq("condominium_id", condominiumId);
    if (funcao) query = query.eq("funcao", funcao);
    const { data, error } = await query;
    if (error) {
      console.error("Error fetching activity templates:", error);
      return [];
    }
    return (data || []).map((item: any) => toCamelCase(item));
  }

  async getActivityTemplateById(id: string): Promise<any | null> {
    const client = supabaseAdmin || supabase;
    const { data, error } = await client.from("activity_templates").select("*").eq("id", id).single();
    if (error) return null;
    return toCamelCase(data);
  }

  async createActivityTemplate(template: any): Promise<any> {
    const snakeCaseData = toSnakeCase(template);
    // Use supabaseAdmin for inserts to bypass schema cache issues
    const client = supabaseAdmin || supabase;
    const { data, error } = await client.from("activity_templates").insert(snakeCaseData).select().single();
    if (error) throw new Error(error.message);
    return toCamelCase(data);
  }

  async updateActivityTemplate(id: string, template: any): Promise<any> {
    const snakeCaseData = toSnakeCase(template);
    const client = supabaseAdmin || supabase;
    const { data, error } = await client.from("activity_templates").update({ ...snakeCaseData, updated_at: new Date().toISOString() }).eq("id", id).select().single();
    if (error) throw new Error(error.message);
    return toCamelCase(data);
  }

  async deleteActivityTemplate(id: string): Promise<void> {
    const client = supabaseAdmin || supabase;
    await client.from("activity_templates").update({ is_active: false }).eq("id", id);
  }

  // ========== ACTIVITY LISTS ==========

  async getActivityLists(condominiumId?: string, membroId?: string): Promise<any[]> {
    const client = supabaseAdmin || supabase;
    let query = client.from("activity_lists").select("*").order("data", { ascending: false });
    if (condominiumId) query = query.eq("condominium_id", condominiumId);
    if (membroId) query = query.eq("team_member_id", membroId);
    const { data, error } = await query;
    if (error) {
      console.error("Error fetching activity lists:", error);
      return [];
    }
    return (data || []).map((item: any) => toCamelCase(item));
  }

  async getActivityListById(id: string): Promise<any | null> {
    const client = supabaseAdmin || supabase;
    const { data, error } = await client.from("activity_lists").select("*").eq("id", id).single();
    if (error) return null;
    return toCamelCase(data);
  }

  async createActivityList(list: any): Promise<any> {
    const snakeCaseData = toSnakeCase(list);
    const client = supabaseAdmin || supabase;
    const { data, error } = await client.from("activity_lists").insert(snakeCaseData).select().single();
    if (error) throw new Error(error.message);
    return toCamelCase(data);
  }

  async updateActivityList(id: string, list: any): Promise<any> {
    const snakeCaseData = toSnakeCase(list);
    const client = supabaseAdmin || supabase;
    const { data, error } = await client.from("activity_lists").update({ ...snakeCaseData, updated_at: new Date().toISOString() }).eq("id", id).select().single();
    if (error) throw new Error(error.message);
    return toCamelCase(data);
  }

  async deleteActivityList(id: string): Promise<void> {
    const client = supabaseAdmin || supabase;
    await client.from("activity_list_items").delete().eq("activity_list_id", id);
    await client.from("activity_lists").delete().eq("id", id);
  }

  // ========== ACTIVITY LIST ITEMS ==========

  async getActivityListItems(listaId: string): Promise<any[]> {
    const client = supabaseAdmin || supabase;
    const { data, error } = await client.from("activity_list_items").select("*").eq("activity_list_id", listaId).order("ordem");
    if (error) {
      console.error("Error fetching activity list items:", error);
      return [];
    }
    return (data || []).map((item: any) => toCamelCase(item));
  }

  async getActivityListItemById(id: string): Promise<any | null> {
    const client = supabaseAdmin || supabase;
    const { data, error } = await client.from("activity_list_items").select("*").eq("id", id).single();
    if (error) return null;
    return toCamelCase(data);
  }

  async createActivityListItem(item: any): Promise<any> {
    const snakeCaseData = toSnakeCase(item);
    const client = supabaseAdmin || supabase;
    const { data, error } = await client.from("activity_list_items").insert(snakeCaseData).select().single();
    if (error) throw new Error(error.message);
    return toCamelCase(data);
  }

  async createActivityListItems(items: any[]): Promise<any[]> {
    const snakeCaseItems = items.map((item: any) => toSnakeCase(item));
    const client = supabaseAdmin || supabase;
    const { data, error } = await client.from("activity_list_items").insert(snakeCaseItems).select();
    if (error) throw new Error(error.message);
    return (data || []).map((item: any) => toCamelCase(item));
  }

  async updateActivityListItem(id: string, item: any): Promise<any> {
    const snakeCaseData = toSnakeCase(item);
    const client = supabaseAdmin || supabase;
    const { data, error } = await client.from("activity_list_items").update(snakeCaseData).eq("id", id).select().single();
    if (error) throw new Error(error.message);
    return toCamelCase(data);
  }

  async markActivityItemConcluido(id: string, concluido: boolean, observacoes?: string): Promise<any> {
    const updateData: any = { concluido };
    if (concluido) {
      updateData.data_conclusao = new Date().toISOString();
    }
    if (observacoes !== undefined) {
      updateData.observacoes = observacoes;
    }
    const client = supabaseAdmin || supabase;
    const { data, error } = await client.from("activity_list_items").update(updateData).eq("id", id).select().single();
    if (error) throw new Error(error.message);
    
    const item = toCamelCase(data);
    const allItems = await this.getActivityListItems(item.activityListId);
    const allConcluido = allItems.every((i: any) => i.concluido);
    if (allConcluido) {
      await this.updateActivityList(item.activityListId, { status: "concluida" });
    } else if (allItems.some((i: any) => i.concluido)) {
      await this.updateActivityList(item.activityListId, { status: "em_andamento" });
    }
    
    return item;
  }

  // ========== WHATSAPP ENVIOS ==========

  async createWhatsappEnvio(envio: any): Promise<any> {
    const snakeCaseData = toSnakeCase(envio);
    const { data, error } = await supabase.from("whatsapp_envios").insert(snakeCaseData).select().single();
    if (error) throw new Error(error.message);
    return toCamelCase(data);
  }

  async getWhatsappEnvios(condominiumId: string): Promise<any[]> {
    const { data, error } = await supabase.from("whatsapp_envios").select("*").eq("condominium_id", condominiumId).order("created_at", { ascending: false });
    if (error) return [];
    return (data || []).map((item: any) => toCamelCase(item));
  }

  // ========== ACTIVITY STATISTICS ==========

  async getActivityStatistics(condominiumId: string, membroId?: string): Promise<{
    totalListas: number;
    listasPendentes: number;
    listasEmAndamento: number;
    listasConcluidas: number;
    totalAtividades: number;
    atividadesConcluidas: number;
    percentualConclusao: number;
  }> {
    const lists = await this.getActivityLists(condominiumId, membroId);
    
    const stats = {
      totalListas: lists.length,
      listasPendentes: lists.filter((l: any) => l.status === "pendente").length,
      listasEmAndamento: lists.filter((l: any) => l.status === "em_andamento").length,
      listasConcluidas: lists.filter((l: any) => l.status === "concluida").length,
      totalAtividades: 0,
      atividadesConcluidas: 0,
      percentualConclusao: 0,
    };
    
    for (const list of lists) {
      const items = await this.getActivityListItems(list.id);
      stats.totalAtividades += items.length;
      stats.atividadesConcluidas += items.filter((i: any) => i.concluido).length;
    }
    
    if (stats.totalAtividades > 0) {
      stats.percentualConclusao = Math.round((stats.atividadesConcluidas / stats.totalAtividades) * 100);
    }
    
    return stats;
  }
}

export function createStorage(): IStorage {
  if (isSupabaseConfigured) {
    console.log("Using Supabase storage");
    return new SupabaseStorage();
  }
  console.log("Supabase not configured, falling back to in-memory storage");
  const { MemStorage } = require("./storage");
  return new MemStorage();
}
