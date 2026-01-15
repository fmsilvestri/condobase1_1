import { supabase, isSupabaseConfigured } from "./supabase";
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

  // User-Condominium relationship methods - using Drizzle for local database
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
    const query = condominiumId
      ? db.select().from(equipmentTable).where(eq(equipmentTable.condominiumId, condominiumId)).orderBy(desc(equipmentTable.createdAt))
      : db.select().from(equipmentTable).orderBy(desc(equipmentTable.createdAt));
    
    const data = await query;
    return data.map(equipment => {
      const cachedIcon = this.equipmentIconCache.get(equipment.id);
      if (cachedIcon) {
        return { ...equipment, icon: cachedIcon };
      }
      return equipment;
    });
  }

  async getEquipmentById(id: string): Promise<Equipment | undefined> {
    const [result] = await db.select().from(equipmentTable).where(eq(equipmentTable.id, id));
    return result;
  }

  async createEquipment(equipment: InsertEquipment): Promise<Equipment> {
    const [result] = await db.insert(equipmentTable).values(equipment).returning();
    return result;
  }

  async updateEquipment(id: string, equipment: Partial<InsertEquipment>): Promise<Equipment | undefined> {
    const [result] = await db.update(equipmentTable)
      .set({ ...equipment, updatedAt: new Date() })
      .where(eq(equipmentTable.id, id))
      .returning();
    return result;
  }

  async deleteEquipment(id: string): Promise<boolean> {
    const result = await db.delete(equipmentTable)
      .where(eq(equipmentTable.id, id))
      .returning({ id: equipmentTable.id });
    return result.length > 0;
  }

  async getMaintenanceRequests(condominiumId?: string): Promise<MaintenanceRequest[]> {
    if (condominiumId) {
      return db.select().from(maintenanceRequestsTable)
        .where(eq(maintenanceRequestsTable.condominiumId, condominiumId))
        .orderBy(desc(maintenanceRequestsTable.createdAt));
    }
    return db.select().from(maintenanceRequestsTable).orderBy(desc(maintenanceRequestsTable.createdAt));
  }

  async getMaintenanceRequestById(id: string): Promise<MaintenanceRequest | undefined> {
    const [result] = await db.select().from(maintenanceRequestsTable).where(eq(maintenanceRequestsTable.id, id));
    return result;
  }

  async createMaintenanceRequest(request: InsertMaintenanceRequest): Promise<MaintenanceRequest> {
    const [result] = await db.insert(maintenanceRequestsTable).values(request).returning();
    return result;
  }

  async updateMaintenanceRequest(id: string, request: Partial<InsertMaintenanceRequest>): Promise<MaintenanceRequest | undefined> {
    const updateData: any = { ...request, updatedAt: new Date() };
    if (request.status === "concluído") {
      updateData.completedAt = new Date();
    }
    const [result] = await db.update(maintenanceRequestsTable)
      .set(updateData)
      .where(eq(maintenanceRequestsTable.id, id))
      .returning();
    return result;
  }

  async deleteMaintenanceRequest(id: string): Promise<boolean> {
    const result = await db.delete(maintenanceRequestsTable)
      .where(eq(maintenanceRequestsTable.id, id))
      .returning({ id: maintenanceRequestsTable.id });
    return result.length > 0;
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
    if (condominiumId) {
      const [data] = await db.select().from(occupancyDataTable)
        .where(eq(occupancyDataTable.condominiumId, condominiumId))
        .orderBy(desc(occupancyDataTable.updatedAt))
        .limit(1);
      return data;
    }
    const [data] = await db.select().from(occupancyDataTable)
      .orderBy(desc(occupancyDataTable.updatedAt))
      .limit(1);
    return data;
  }

  async updateOccupancyData(occupancy: InsertOccupancyData): Promise<OccupancyData> {
    const existing = await this.getOccupancyData(occupancy.condominiumId);
    if (existing) {
      const [updated] = await db.update(occupancyDataTable)
        .set(occupancy)
        .where(eq(occupancyDataTable.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(occupancyDataTable).values(occupancy).returning();
      return created;
    }
  }

  async getDocuments(condominiumId?: string): Promise<Document[]> {
    if (condominiumId) {
      return db.select().from(documentsTable)
        .where(eq(documentsTable.condominiumId, condominiumId))
        .orderBy(desc(documentsTable.createdAt));
    }
    return db.select().from(documentsTable).orderBy(desc(documentsTable.createdAt));
  }

  async getDocumentById(id: string): Promise<Document | undefined> {
    const [result] = await db.select().from(documentsTable).where(eq(documentsTable.id, id));
    return result;
  }

  async createDocument(doc: InsertDocument): Promise<Document> {
    const [result] = await db.insert(documentsTable).values(doc).returning();
    return result;
  }

  async updateDocument(id: string, doc: Partial<InsertDocument>): Promise<Document | undefined> {
    const [result] = await db.update(documentsTable)
      .set(doc)
      .where(eq(documentsTable.id, id))
      .returning();
    return result;
  }

  async deleteDocument(id: string): Promise<boolean> {
    const result = await db.delete(documentsTable)
      .where(eq(documentsTable.id, id))
      .returning({ id: documentsTable.id });
    return result.length > 0;
  }

  async getSuppliers(condominiumId?: string): Promise<Supplier[]> {
    if (condominiumId) {
      return db.select().from(suppliersTable)
        .where(eq(suppliersTable.condominiumId, condominiumId))
        .orderBy(desc(suppliersTable.createdAt));
    }
    return db.select().from(suppliersTable).orderBy(desc(suppliersTable.createdAt));
  }

  async getSupplierById(id: string): Promise<Supplier | undefined> {
    const [result] = await db.select().from(suppliersTable).where(eq(suppliersTable.id, id));
    return result;
  }

  async createSupplier(supplier: InsertSupplier): Promise<Supplier> {
    const [result] = await db.insert(suppliersTable).values(supplier).returning();
    return result;
  }

  async updateSupplier(id: string, supplier: Partial<InsertSupplier>): Promise<Supplier | undefined> {
    const [result] = await db.update(suppliersTable)
      .set(supplier)
      .where(eq(suppliersTable.id, id))
      .returning();
    return result;
  }

  async deleteSupplier(id: string): Promise<boolean> {
    const result = await db.delete(suppliersTable)
      .where(eq(suppliersTable.id, id))
      .returning({ id: suppliersTable.id });
    return result.length > 0;
  }

  async getAnnouncements(condominiumId?: string): Promise<Announcement[]> {
    if (condominiumId) {
      return db.select().from(announcementsTable)
        .where(eq(announcementsTable.condominiumId, condominiumId))
        .orderBy(desc(announcementsTable.createdAt));
    }
    return db.select().from(announcementsTable).orderBy(desc(announcementsTable.createdAt));
  }

  async getAnnouncementById(id: string): Promise<Announcement | undefined> {
    const [result] = await db.select().from(announcementsTable).where(eq(announcementsTable.id, id));
    return result;
  }

  async createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement> {
    const [result] = await db.insert(announcementsTable).values(announcement).returning();
    return result;
  }

  async updateAnnouncement(id: string, announcement: Partial<InsertAnnouncement>): Promise<Announcement | undefined> {
    const [result] = await db.update(announcementsTable)
      .set(announcement)
      .where(eq(announcementsTable.id, id))
      .returning();
    return result;
  }

  async deleteAnnouncement(id: string): Promise<boolean> {
    const result = await db.delete(announcementsTable)
      .where(eq(announcementsTable.id, id))
      .returning({ id: announcementsTable.id });
    return result.length > 0;
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

  async getSecurityDevices(): Promise<SecurityDevice[]> {
    const data = await db.select()
      .from(securityDevicesTable)
      .orderBy(desc(securityDevicesTable.createdAt));
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

  async getSecurityEvents(): Promise<SecurityEvent[]> {
    const data = await db.select()
      .from(securityEventsTable)
      .orderBy(desc(securityEventsTable.createdAt));
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
