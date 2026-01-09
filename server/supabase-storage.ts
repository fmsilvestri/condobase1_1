import { supabase, isSupabaseConfigured } from "./supabase";
import type { IStorage } from "./storage";
import type {
  User,
  InsertUser,
  Equipment,
  InsertEquipment,
  MaintenanceRequest,
  InsertMaintenanceRequest,
  PoolReading,
  InsertPoolReading,
  WaterReading,
  InsertWaterReading,
  GasReading,
  InsertGasReading,
  EnergyEvent,
  InsertEnergyEvent,
  OccupancyData,
  InsertOccupancyData,
  Document,
  InsertDocument,
  Supplier,
  InsertSupplier,
  Announcement,
  InsertAnnouncement,
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

  async getWaterReadings(): Promise<WaterReading[]> {
    const { data, error } = await this.sb
      .from("water_readings")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map(d => toCamelCase(d) as WaterReading);
  }

  async createWaterReading(reading: InsertWaterReading): Promise<WaterReading> {
    const { data, error } = await this.sb
      .from("water_readings")
      .insert(toSnakeCase(reading))
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toCamelCase(data) as WaterReading;
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
