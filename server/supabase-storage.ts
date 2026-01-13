import { supabase, isSupabaseConfigured } from "./supabase";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";
import type { IStorage } from "./storage";
import {
  condominiums as condominiumsTable,
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

  // User-Condominium relationship methods
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

  async getUser(id: string): Promise<User | undefined> {
    const { data, error } = await this.sb
      .from("users")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !data) return undefined;
    return toCamelCase(data) as User;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const { data, error } = await this.sb
      .from("users")
      .select("*")
      .eq("email", email)
      .single();
    if (error || !data) return undefined;
    return toCamelCase(data) as User;
  }

  async getUsers(): Promise<User[]> {
    const { data, error } = await this.sb
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map(d => toCamelCase(d) as User);
  }

  async createUser(user: InsertUser): Promise<User> {
    const { data, error } = await this.sb
      .from("users")
      .insert(toSnakeCase(user))
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toCamelCase(data) as User;
  }

  async upsertUser(userData: InsertUser & { id: string }): Promise<User> {
    const { data, error } = await this.sb
      .from("users")
      .upsert(toSnakeCase(userData), { onConflict: "id" })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toCamelCase(data) as User;
  }

  async updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined> {
    const { data, error } = await this.sb
      .from("users")
      .update(toSnakeCase(user))
      .eq("id", id)
      .select()
      .single();
    if (error || !data) return undefined;
    return toCamelCase(data) as User;
  }

  async deleteUser(id: string): Promise<boolean> {
    const { error } = await this.sb
      .from("users")
      .delete()
      .eq("id", id);
    return !error;
  }

  async getEquipment(): Promise<Equipment[]> {
    const { data, error } = await this.sb
      .from("equipment")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map(d => toCamelCase(d) as Equipment);
  }

  async getEquipmentById(id: string): Promise<Equipment | undefined> {
    const { data, error } = await this.sb
      .from("equipment")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !data) return undefined;
    return toCamelCase(data) as Equipment;
  }

  async createEquipment(equipment: InsertEquipment): Promise<Equipment> {
    const { data, error } = await this.sb
      .from("equipment")
      .insert(toSnakeCase(equipment))
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toCamelCase(data) as Equipment;
  }

  async updateEquipment(id: string, equipment: Partial<InsertEquipment>): Promise<Equipment | undefined> {
    const { data, error } = await this.sb
      .from("equipment")
      .update(toSnakeCase(equipment))
      .eq("id", id)
      .select()
      .single();
    if (error || !data) return undefined;
    return toCamelCase(data) as Equipment;
  }

  async deleteEquipment(id: string): Promise<boolean> {
    const { error } = await this.sb
      .from("equipment")
      .delete()
      .eq("id", id);
    return !error;
  }

  async getMaintenanceRequests(): Promise<MaintenanceRequest[]> {
    const { data, error } = await this.sb
      .from("maintenance_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map(d => toCamelCase(d) as MaintenanceRequest);
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
    const updateData = toSnakeCase(request);
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

  async getPoolReadings(): Promise<PoolReading[]> {
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

  async getWaterReadings(): Promise<WaterReading[]> {
    return await db.select().from(waterReadingsTable).orderBy(desc(waterReadingsTable.createdAt));
  }

  async createWaterReading(reading: InsertWaterReading): Promise<WaterReading> {
    const [created] = await db.insert(waterReadingsTable).values(reading).returning();
    return created;
  }

  async getGasReadings(): Promise<GasReading[]> {
    const { data, error } = await this.sb
      .from("gas_readings")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map(d => toCamelCase(d) as GasReading);
  }

  async createGasReading(reading: InsertGasReading): Promise<GasReading> {
    const { data, error } = await this.sb
      .from("gas_readings")
      .insert(toSnakeCase(reading))
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toCamelCase(data) as GasReading;
  }

  async getEnergyEvents(): Promise<EnergyEvent[]> {
    const { data, error } = await this.sb
      .from("energy_events")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map(d => toCamelCase(d) as EnergyEvent);
  }

  async createEnergyEvent(event: InsertEnergyEvent): Promise<EnergyEvent> {
    const { data, error } = await this.sb
      .from("energy_events")
      .insert(toSnakeCase(event))
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toCamelCase(data) as EnergyEvent;
  }

  async updateEnergyEvent(id: string, event: Partial<InsertEnergyEvent>): Promise<EnergyEvent | undefined> {
    const updateData = toSnakeCase(event);
    if (event.status === "ok") {
      updateData.resolved_at = new Date().toISOString();
    }
    const { data, error } = await this.sb
      .from("energy_events")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();
    if (error || !data) return undefined;
    return toCamelCase(data) as EnergyEvent;
  }

  async getOccupancyData(): Promise<OccupancyData | undefined> {
    const { data, error } = await this.sb
      .from("occupancy_data")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();
    if (error || !data) return undefined;
    return toCamelCase(data) as OccupancyData;
  }

  async updateOccupancyData(occupancy: InsertOccupancyData): Promise<OccupancyData> {
    const existing = await this.getOccupancyData();
    if (existing) {
      const { data, error } = await this.sb
        .from("occupancy_data")
        .update(toSnakeCase(occupancy))
        .eq("id", existing.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return toCamelCase(data) as OccupancyData;
    } else {
      const { data, error } = await this.sb
        .from("occupancy_data")
        .insert(toSnakeCase(occupancy))
        .select()
        .single();
      if (error) throw new Error(error.message);
      return toCamelCase(data) as OccupancyData;
    }
  }

  async getDocuments(): Promise<Document[]> {
    const { data, error } = await this.sb
      .from("documents")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map(d => toCamelCase(d) as Document);
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

  async getSuppliers(): Promise<Supplier[]> {
    const { data, error } = await this.sb
      .from("suppliers")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map(d => toCamelCase(d) as Supplier);
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

  async getAnnouncements(): Promise<Announcement[]> {
    const { data, error } = await this.sb
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map(d => toCamelCase(d) as Announcement);
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

  async createNotificationsForAllUsers(notification: Omit<InsertNotification, 'userId'>, excludeUserId?: string): Promise<void> {
    const users = await this.getUsers();
    const notificationsToInsert = users
      .filter(user => !excludeUserId || user.id !== excludeUserId)
      .map(user => ({ ...notification, userId: user.id }));
    
    if (notificationsToInsert.length > 0) {
      try {
        await db.insert(notificationsTable).values(notificationsToInsert);
      } catch (error) {
        console.error("Error creating notifications:", error);
      }
    }
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
        .set({ ...config, updatedAt: new Date() })
        .where(eq(wasteConfigTable.id, existing.id))
        .returning();
      return updated;
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
