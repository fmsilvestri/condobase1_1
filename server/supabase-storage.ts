import { supabase, isSupabaseConfigured } from "./supabase";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";
import type { IStorage } from "./storage";
import {
  notifications as notificationsTable,
  modulePermissions as modulePermissionsTable,
  reservoirs as reservoirsTable,
  waterReadings as waterReadingsTable,
  wasteConfig as wasteConfigTable,
  type User,
  type InsertUser,
  type Equipment,
  type InsertEquipment,
  type MaintenanceRequest,
  type InsertMaintenanceRequest,
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

  async getPoolReadings(): Promise<PoolReading[]> {
    const { data, error } = await this.sb
      .from("pool_readings")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map(d => toCamelCase(d) as PoolReading);
  }

  async createPoolReading(reading: InsertPoolReading): Promise<PoolReading> {
    const { data, error } = await this.sb
      .from("pool_readings")
      .insert(toSnakeCase(reading))
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toCamelCase(data) as PoolReading;
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
