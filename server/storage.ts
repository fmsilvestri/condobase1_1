import {
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
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Condominium methods
  getCondominiums(): Promise<Condominium[]>;
  getCondominiumById(id: string): Promise<Condominium | undefined>;
  createCondominium(condominium: InsertCondominium): Promise<Condominium>;
  updateCondominium(id: string, condominium: Partial<InsertCondominium>): Promise<Condominium | undefined>;
  deleteCondominium(id: string): Promise<boolean>;

  // User-Condominium relationship methods
  getUserCondominiums(userId: string): Promise<(UserCondominium & { condominium?: Condominium })[]>;
  getCondominiumUsers(condominiumId: string): Promise<(UserCondominium & { user?: User })[]>;
  addUserToCondominium(userCondominium: InsertUserCondominium): Promise<UserCondominium>;
  updateUserCondominium(id: string, data: Partial<InsertUserCondominium>): Promise<UserCondominium | undefined>;
  removeUserFromCondominium(userId: string, condominiumId: string): Promise<boolean>;

  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  upsertUser(user: InsertUser & { id: string }): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;

  getEquipment(): Promise<Equipment[]>;
  getEquipmentById(id: string): Promise<Equipment | undefined>;
  createEquipment(equipment: InsertEquipment): Promise<Equipment>;
  updateEquipment(id: string, equipment: Partial<InsertEquipment>): Promise<Equipment | undefined>;
  deleteEquipment(id: string): Promise<boolean>;

  getMaintenanceRequests(): Promise<MaintenanceRequest[]>;
  getMaintenanceRequestById(id: string): Promise<MaintenanceRequest | undefined>;
  createMaintenanceRequest(request: InsertMaintenanceRequest): Promise<MaintenanceRequest>;
  updateMaintenanceRequest(id: string, request: Partial<InsertMaintenanceRequest>): Promise<MaintenanceRequest | undefined>;
  deleteMaintenanceRequest(id: string): Promise<boolean>;

  getMaintenanceCompletions(): Promise<MaintenanceCompletion[]>;
  getMaintenanceCompletionsByEquipmentId(equipmentId: string): Promise<MaintenanceCompletion[]>;
  createMaintenanceCompletion(completion: InsertMaintenanceCompletion): Promise<MaintenanceCompletion>;
  deleteMaintenanceCompletion(id: string): Promise<boolean>;

  getPoolReadings(): Promise<PoolReading[]>;
  createPoolReading(reading: InsertPoolReading): Promise<PoolReading>;

  getReservoirs(): Promise<Reservoir[]>;
  getReservoirById(id: string): Promise<Reservoir | undefined>;
  createReservoir(reservoir: InsertReservoir): Promise<Reservoir>;
  updateReservoir(id: string, reservoir: Partial<InsertReservoir>): Promise<Reservoir | undefined>;
  deleteReservoir(id: string): Promise<boolean>;

  getWaterReadings(): Promise<WaterReading[]>;
  createWaterReading(reading: InsertWaterReading): Promise<WaterReading>;

  getHydrometerReadings(): Promise<HydrometerReading[]>;
  createHydrometerReading(reading: InsertHydrometerReading): Promise<HydrometerReading>;
  updateHydrometerReading(id: string, reading: Partial<InsertHydrometerReading>): Promise<HydrometerReading | undefined>;
  deleteHydrometerReading(id: string): Promise<boolean>;

  getGasReadings(): Promise<GasReading[]>;
  createGasReading(reading: InsertGasReading): Promise<GasReading>;

  getEnergyEvents(): Promise<EnergyEvent[]>;
  createEnergyEvent(event: InsertEnergyEvent): Promise<EnergyEvent>;
  updateEnergyEvent(id: string, event: Partial<InsertEnergyEvent>): Promise<EnergyEvent | undefined>;

  getOccupancyData(): Promise<OccupancyData | undefined>;
  updateOccupancyData(data: InsertOccupancyData): Promise<OccupancyData>;

  getDocuments(): Promise<Document[]>;
  getDocumentById(id: string): Promise<Document | undefined>;
  createDocument(doc: InsertDocument): Promise<Document>;
  updateDocument(id: string, doc: Partial<InsertDocument>): Promise<Document | undefined>;
  deleteDocument(id: string): Promise<boolean>;

  getSuppliers(): Promise<Supplier[]>;
  getSupplierById(id: string): Promise<Supplier | undefined>;
  createSupplier(supplier: InsertSupplier): Promise<Supplier>;
  updateSupplier(id: string, supplier: Partial<InsertSupplier>): Promise<Supplier | undefined>;
  deleteSupplier(id: string): Promise<boolean>;

  getAnnouncements(): Promise<Announcement[]>;
  getAnnouncementById(id: string): Promise<Announcement | undefined>;
  createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement>;
  updateAnnouncement(id: string, announcement: Partial<InsertAnnouncement>): Promise<Announcement | undefined>;
  deleteAnnouncement(id: string): Promise<boolean>;

  getNotifications(userId: string): Promise<Notification[]>;
  getUnreadNotifications(userId: string): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: string): Promise<boolean>;
  markAllNotificationsAsRead(userId: string): Promise<boolean>;
  createNotificationsForAllUsers(notification: Omit<InsertNotification, 'userId'>, excludeUserId?: string): Promise<void>;

  getModulePermissions(): Promise<ModulePermission[]>;
  updateModulePermission(moduleKey: string, isEnabled: boolean, updatedBy?: string): Promise<ModulePermission | undefined>;

  getWasteConfig(): Promise<WasteConfig | undefined>;
  updateWasteConfig(config: Partial<InsertWasteConfig>): Promise<WasteConfig | undefined>;

  getSecurityDevices(): Promise<SecurityDevice[]>;
  getSecurityDeviceById(id: string): Promise<SecurityDevice | undefined>;
  createSecurityDevice(device: InsertSecurityDevice): Promise<SecurityDevice>;
  updateSecurityDevice(id: string, device: Partial<InsertSecurityDevice>): Promise<SecurityDevice | undefined>;
  deleteSecurityDevice(id: string): Promise<boolean>;

  getSecurityEvents(): Promise<SecurityEvent[]>;
  getSecurityEventsByDeviceId(deviceId: string): Promise<SecurityEvent[]>;
  createSecurityEvent(event: InsertSecurityEvent): Promise<SecurityEvent>;
  updateSecurityEvent(id: string, event: Partial<InsertSecurityEvent>): Promise<SecurityEvent | undefined>;
}

export class MemStorage implements IStorage {
  private condominiums: Map<string, Condominium>;
  private userCondominiums: Map<string, UserCondominium>;
  private users: Map<string, User>;
  private equipment: Map<string, Equipment>;
  private maintenanceRequests: Map<string, MaintenanceRequest>;
  private maintenanceCompletions: Map<string, MaintenanceCompletion>;
  private poolReadings: Map<string, PoolReading>;
  private reservoirs: Map<string, Reservoir>;
  private waterReadings: Map<string, WaterReading>;
  private hydrometerReadings: Map<string, HydrometerReading>;
  private gasReadings: Map<string, GasReading>;
  private energyEvents: Map<string, EnergyEvent>;
  private occupancyData: OccupancyData | undefined;
  private documents: Map<string, Document>;
  private suppliers: Map<string, Supplier>;
  private announcements: Map<string, Announcement>;

  constructor() {
    this.condominiums = new Map();
    this.userCondominiums = new Map();
    this.users = new Map();
    this.equipment = new Map();
    this.maintenanceRequests = new Map();
    this.maintenanceCompletions = new Map();
    this.poolReadings = new Map();
    this.reservoirs = new Map();
    this.waterReadings = new Map();
    this.hydrometerReadings = new Map();
    this.gasReadings = new Map();
    this.energyEvents = new Map();
    this.documents = new Map();
    this.suppliers = new Map();
    this.announcements = new Map();

    this.seedData();
  }

  async getCondominiums(): Promise<Condominium[]> {
    return Array.from(this.condominiums.values());
  }

  async getCondominiumById(id: string): Promise<Condominium | undefined> {
    return this.condominiums.get(id);
  }

  async createCondominium(condominium: InsertCondominium): Promise<Condominium> {
    const id = randomUUID();
    const newCondominium: Condominium = { ...condominium, id, createdAt: new Date(), updatedAt: new Date() };
    this.condominiums.set(id, newCondominium);
    return newCondominium;
  }

  async updateCondominium(id: string, condominium: Partial<InsertCondominium>): Promise<Condominium | undefined> {
    const existing = this.condominiums.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...condominium, updatedAt: new Date() };
    this.condominiums.set(id, updated);
    return updated;
  }

  async deleteCondominium(id: string): Promise<boolean> {
    return this.condominiums.delete(id);
  }

  async getUserCondominiums(userId: string): Promise<(UserCondominium & { condominium?: Condominium })[]> {
    return Array.from(this.userCondominiums.values())
      .filter(uc => uc.userId === userId)
      .map(uc => ({ ...uc, condominium: this.condominiums.get(uc.condominiumId) }));
  }

  async getCondominiumUsers(condominiumId: string): Promise<(UserCondominium & { user?: User })[]> {
    return Array.from(this.userCondominiums.values())
      .filter(uc => uc.condominiumId === condominiumId)
      .map(uc => ({ ...uc, user: this.users.get(uc.userId) }));
  }

  async addUserToCondominium(userCondominium: InsertUserCondominium): Promise<UserCondominium> {
    const id = randomUUID();
    const newUserCondominium: UserCondominium = { ...userCondominium, id, createdAt: new Date(), updatedAt: new Date() };
    this.userCondominiums.set(id, newUserCondominium);
    return newUserCondominium;
  }

  async updateUserCondominium(id: string, data: Partial<InsertUserCondominium>): Promise<UserCondominium | undefined> {
    const existing = this.userCondominiums.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data, updatedAt: new Date() };
    this.userCondominiums.set(id, updated);
    return updated;
  }

  async removeUserFromCondominium(userId: string, condominiumId: string): Promise<boolean> {
    const entry = Array.from(this.userCondominiums.entries())
      .find(([_, uc]) => uc.userId === userId && uc.condominiumId === condominiumId);
    if (entry) {
      this.userCondominiums.delete(entry[0]);
      return true;
    }
    return false;
  }

  private seedData() {
    const defaultUser: User = {
      id: "1",
      email: "sindico@condobase.com",
      role: "síndico",
      name: "João Silva",
      unit: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(defaultUser.id, defaultUser);

    const adminUser: User = {
      id: "2",
      email: "admin@condobase.com",
      role: "admin",
      name: "Administrador",
      unit: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(adminUser.id, adminUser);

    const equipmentData: Equipment[] = [
      { id: "1", name: "Bomba d'Água Principal", category: "hidráulico", location: "Casa de Máquinas", description: "Bomba centrífuga 5CV", photos: [], status: "operacional", createdAt: new Date() },
      { id: "2", name: "Elevador Social Bloco A", category: "elevadores", location: "Bloco A", description: "Elevador ThyssenKrupp", photos: [], status: "atenção", createdAt: new Date() },
      { id: "3", name: "Motor Portão Principal", category: "portões", location: "Entrada Principal", description: "Motor PPA 1/2CV", photos: [], status: "operacional", createdAt: new Date() },
      { id: "4", name: "Sistema de Iluminação Área Comum", category: "elétrico", location: "Área Externa", description: "Iluminação LED", photos: [], status: "operacional", createdAt: new Date() },
      { id: "5", name: "Bomba da Piscina", category: "piscina", location: "Área da Piscina", description: "Bomba 1CV", photos: [], status: "alerta", createdAt: new Date() },
      { id: "6", name: "Esteira Academia", category: "academia", location: "Academia", description: "Esteira Movement", photos: [], status: "inativo", createdAt: new Date() },
    ];
    equipmentData.forEach((eq) => this.equipment.set(eq.id, eq));

    const requestsData: MaintenanceRequest[] = [
      { id: "1", equipmentId: "1", title: "Bomba fazendo barulho estranho", description: "Ruído anormal durante funcionamento", photos: [], status: "aberto", priority: "alta", requestedBy: "1", assignedTo: null, createdAt: new Date(), updatedAt: new Date(), completedAt: null },
      { id: "2", equipmentId: "2", title: "Elevador parando entre andares", description: "Ocorre intermitentemente", photos: [], status: "em andamento", priority: "alta", requestedBy: "1", assignedTo: null, createdAt: new Date(), updatedAt: new Date(), completedAt: null },
      { id: "3", equipmentId: "4", title: "Troca de lâmpadas queimadas", description: "3 lâmpadas precisam ser trocadas", photos: [], status: "aberto", priority: "normal", requestedBy: "1", assignedTo: null, createdAt: new Date(), updatedAt: new Date(), completedAt: null },
    ];
    requestsData.forEach((req) => this.maintenanceRequests.set(req.id, req));

    const poolData: PoolReading[] = [
      { id: "1", ph: 7.2, chlorine: 2.5, alkalinity: 120, calciumHardness: 250, temperature: 28, photo: null, notes: null, createdAt: new Date(), recordedBy: "1" },
      { id: "2", ph: 7.0, chlorine: 2.8, alkalinity: 115, calciumHardness: 245, temperature: 27, photo: null, notes: null, createdAt: new Date(Date.now() - 86400000), recordedBy: "1" },
    ];
    poolData.forEach((p) => this.poolReadings.set(p.id, p));

    const waterData: WaterReading[] = [
      { id: "1", reservoirId: null, tankLevel: 85, quality: "boa", volumeAvailable: 42500, estimatedAutonomy: 8.5, casanStatus: "normal", notes: null, createdAt: new Date(), recordedBy: "1" },
    ];
    waterData.forEach((w) => this.waterReadings.set(w.id, w));

    const gasData: GasReading[] = [
      { id: "1", level: 78, percentAvailable: 78, photo: null, notes: null, createdAt: new Date(), recordedBy: "1" },
      { id: "2", level: 82, percentAvailable: 82, photo: null, notes: null, createdAt: new Date(Date.now() - 604800000), recordedBy: "1" },
    ];
    gasData.forEach((g) => this.gasReadings.set(g.id, g));

    const energyData: EnergyEvent[] = [
      { id: "1", status: "ok", description: "Energia restabelecida após manutenção", createdAt: new Date(), resolvedAt: new Date(), recordedBy: "1" },
    ];
    energyData.forEach((e) => this.energyEvents.set(e.id, e));

    this.occupancyData = {
      id: "1",
      totalUnits: 52,
      occupiedUnits: 48,
      vacantUnits: 4,
      averagePeoplePerUnit: 2.8,
      estimatedPopulation: 134,
      avgWaterConsumption: 150,
      avgGasConsumption: 30,
      avgEnergyConsumption: 180,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const documentsData: Document[] = [
      { id: "1", name: "AVCB - Auto de Vistoria do Corpo de Bombeiros", type: "AVCB", fileUrl: null, expirationDate: new Date("2024-06-15"), notes: null, createdAt: new Date(), uploadedBy: "1" },
      { id: "2", name: "Alvará de Funcionamento", type: "Alvará", fileUrl: null, expirationDate: new Date("2024-02-20"), notes: null, createdAt: new Date(), uploadedBy: "1" },
      { id: "3", name: "Certificado de Dedetização", type: "Dedetização", fileUrl: null, expirationDate: new Date("2024-01-25"), notes: null, createdAt: new Date(), uploadedBy: "1" },
    ];
    documentsData.forEach((d) => this.documents.set(d.id, d));

    const suppliersData: Supplier[] = [
      { id: "1", name: "ElevaTec Manutenção", category: "elevadores", phone: "(48) 3333-1111", whatsapp: "5548999991111", email: "contato@elevatec.com.br", address: "Rua das Indústrias, 500", notes: null, createdAt: new Date() },
      { id: "2", name: "HidroServ Bombas", category: "hidráulico", phone: "(48) 3333-2222", whatsapp: "5548999992222", email: "orcamento@hidroserv.com.br", address: null, notes: null, createdAt: new Date() },
      { id: "3", name: "PiscinaLimpa", category: "piscina", phone: "(48) 3333-4444", whatsapp: "5548999994444", email: "piscinalimpa@email.com", address: null, notes: null, createdAt: new Date() },
    ];
    suppliersData.forEach((s) => this.suppliers.set(s.id, s));

    const announcementsData: Announcement[] = [
      { id: "1", title: "Manutenção programada do elevador", content: "O elevador social do Bloco A passará por manutenção preventiva no dia 20/01.", priority: "alta", createdBy: "1", createdAt: new Date(), expiresAt: new Date("2024-01-20") },
      { id: "2", title: "Limpeza da piscina - Sexta-feira", content: "A piscina estará fechada para limpeza e tratamento na próxima sexta-feira.", priority: "normal", createdBy: "1", createdAt: new Date(), expiresAt: new Date("2024-01-19") },
    ];
    announcementsData.forEach((a) => this.announcements.set(a.id, a));
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((user) => user.email === email);
  }

  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values()).sort((a, b) =>
      (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id, createdAt: new Date(), updatedAt: new Date() };
    this.users.set(id, user);
    return user;
  }

  async upsertUser(userData: InsertUser & { id: string }): Promise<User> {
    const existing = this.users.get(userData.id);
    if (existing) {
      const updated = { ...existing, ...userData, updatedAt: new Date() };
      this.users.set(userData.id, updated);
      return updated;
    }
    const user: User = { ...userData, createdAt: new Date(), updatedAt: new Date() };
    this.users.set(userData.id, user);
    return user;
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
    const existing = this.users.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data, updatedAt: new Date() };
    this.users.set(id, updated);
    return updated;
  }

  async deleteUser(id: string): Promise<boolean> {
    return this.users.delete(id);
  }

  async getEquipment(): Promise<Equipment[]> {
    return Array.from(this.equipment.values()).sort((a, b) => 
      (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
    );
  }

  async getEquipmentById(id: string): Promise<Equipment | undefined> {
    return this.equipment.get(id);
  }

  async createEquipment(insertEquipment: InsertEquipment): Promise<Equipment> {
    const id = randomUUID();
    const equipment: Equipment = { ...insertEquipment, id, createdAt: new Date() };
    this.equipment.set(id, equipment);
    return equipment;
  }

  async updateEquipment(id: string, data: Partial<InsertEquipment>): Promise<Equipment | undefined> {
    const existing = this.equipment.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data };
    this.equipment.set(id, updated);
    return updated;
  }

  async deleteEquipment(id: string): Promise<boolean> {
    return this.equipment.delete(id);
  }

  async getMaintenanceRequests(): Promise<MaintenanceRequest[]> {
    return Array.from(this.maintenanceRequests.values()).sort((a, b) =>
      (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
    );
  }

  async getMaintenanceRequestById(id: string): Promise<MaintenanceRequest | undefined> {
    return this.maintenanceRequests.get(id);
  }

  async createMaintenanceRequest(insertRequest: InsertMaintenanceRequest): Promise<MaintenanceRequest> {
    const id = randomUUID();
    const request: MaintenanceRequest = { ...insertRequest, id, createdAt: new Date(), updatedAt: new Date(), completedAt: null };
    this.maintenanceRequests.set(id, request);
    return request;
  }

  async updateMaintenanceRequest(id: string, data: Partial<InsertMaintenanceRequest>): Promise<MaintenanceRequest | undefined> {
    const existing = this.maintenanceRequests.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data, updatedAt: new Date() };
    if (data.status === "concluído") {
      updated.completedAt = new Date();
    }
    this.maintenanceRequests.set(id, updated);
    return updated;
  }

  async deleteMaintenanceRequest(id: string): Promise<boolean> {
    return this.maintenanceRequests.delete(id);
  }

  async getMaintenanceCompletions(): Promise<MaintenanceCompletion[]> {
    return Array.from(this.maintenanceCompletions.values()).sort((a, b) =>
      (b.completedAt?.getTime() || 0) - (a.completedAt?.getTime() || 0)
    );
  }

  async getMaintenanceCompletionsByEquipmentId(equipmentId: string): Promise<MaintenanceCompletion[]> {
    return Array.from(this.maintenanceCompletions.values())
      .filter(c => c.equipmentId === equipmentId)
      .sort((a, b) => (b.completedAt?.getTime() || 0) - (a.completedAt?.getTime() || 0));
  }

  async createMaintenanceCompletion(insertCompletion: InsertMaintenanceCompletion): Promise<MaintenanceCompletion> {
    const id = randomUUID();
    const completion: MaintenanceCompletion = { ...insertCompletion, id, createdAt: new Date() };
    this.maintenanceCompletions.set(id, completion);
    return completion;
  }

  async deleteMaintenanceCompletion(id: string): Promise<boolean> {
    return this.maintenanceCompletions.delete(id);
  }

  async getPoolReadings(): Promise<PoolReading[]> {
    return Array.from(this.poolReadings.values()).sort((a, b) =>
      (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
    );
  }

  async createPoolReading(insertReading: InsertPoolReading): Promise<PoolReading> {
    const id = randomUUID();
    const reading: PoolReading = { ...insertReading, id, createdAt: new Date() };
    this.poolReadings.set(id, reading);
    return reading;
  }

  async getReservoirs(): Promise<Reservoir[]> {
    return Array.from(this.reservoirs.values()).sort((a, b) =>
      (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
    );
  }

  async getReservoirById(id: string): Promise<Reservoir | undefined> {
    return this.reservoirs.get(id);
  }

  async createReservoir(insertReservoir: InsertReservoir): Promise<Reservoir> {
    const id = randomUUID();
    const reservoir: Reservoir = { ...insertReservoir, id, createdAt: new Date() };
    this.reservoirs.set(id, reservoir);
    return reservoir;
  }

  async updateReservoir(id: string, data: Partial<InsertReservoir>): Promise<Reservoir | undefined> {
    const existing = this.reservoirs.get(id);
    if (!existing) return undefined;
    const updated: Reservoir = { ...existing, ...data };
    this.reservoirs.set(id, updated);
    return updated;
  }

  async deleteReservoir(id: string): Promise<boolean> {
    return this.reservoirs.delete(id);
  }

  async getWaterReadings(): Promise<WaterReading[]> {
    return Array.from(this.waterReadings.values()).sort((a, b) =>
      (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
    );
  }

  async createWaterReading(insertReading: InsertWaterReading): Promise<WaterReading> {
    const id = randomUUID();
    const reading: WaterReading = { ...insertReading, id, createdAt: new Date() };
    this.waterReadings.set(id, reading);
    return reading;
  }

  async getHydrometerReadings(): Promise<HydrometerReading[]> {
    return Array.from(this.hydrometerReadings.values()).sort((a, b) =>
      (b.readingDate?.getTime() || 0) - (a.readingDate?.getTime() || 0)
    );
  }

  async createHydrometerReading(insertReading: InsertHydrometerReading): Promise<HydrometerReading> {
    const id = randomUUID();
    const reading: HydrometerReading = { ...insertReading, id, createdAt: new Date() };
    this.hydrometerReadings.set(id, reading);
    return reading;
  }

  async updateHydrometerReading(id: string, data: Partial<InsertHydrometerReading>): Promise<HydrometerReading | undefined> {
    const existing = this.hydrometerReadings.get(id);
    if (!existing) return undefined;
    const updated: HydrometerReading = { ...existing, ...data };
    this.hydrometerReadings.set(id, updated);
    return updated;
  }

  async deleteHydrometerReading(id: string): Promise<boolean> {
    return this.hydrometerReadings.delete(id);
  }

  async getGasReadings(): Promise<GasReading[]> {
    return Array.from(this.gasReadings.values()).sort((a, b) =>
      (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
    );
  }

  async createGasReading(insertReading: InsertGasReading): Promise<GasReading> {
    const id = randomUUID();
    const reading: GasReading = { ...insertReading, id, createdAt: new Date() };
    this.gasReadings.set(id, reading);
    return reading;
  }

  async getEnergyEvents(): Promise<EnergyEvent[]> {
    return Array.from(this.energyEvents.values()).sort((a, b) =>
      (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
    );
  }

  async createEnergyEvent(insertEvent: InsertEnergyEvent): Promise<EnergyEvent> {
    const id = randomUUID();
    const event: EnergyEvent = { ...insertEvent, id, createdAt: new Date(), resolvedAt: null };
    this.energyEvents.set(id, event);
    return event;
  }

  async updateEnergyEvent(id: string, data: Partial<InsertEnergyEvent>): Promise<EnergyEvent | undefined> {
    const existing = this.energyEvents.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data };
    if (data.status === "ok") {
      updated.resolvedAt = new Date();
    }
    this.energyEvents.set(id, updated);
    return updated;
  }

  async getOccupancyData(): Promise<OccupancyData | undefined> {
    return this.occupancyData;
  }

  async updateOccupancyData(data: InsertOccupancyData): Promise<OccupancyData> {
    const id = this.occupancyData?.id || randomUUID();
    this.occupancyData = { ...data, id, createdAt: this.occupancyData?.createdAt || new Date(), updatedAt: new Date() };
    return this.occupancyData;
  }

  async getDocuments(): Promise<Document[]> {
    return Array.from(this.documents.values()).sort((a, b) =>
      (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
    );
  }

  async getDocumentById(id: string): Promise<Document | undefined> {
    return this.documents.get(id);
  }

  async createDocument(insertDoc: InsertDocument): Promise<Document> {
    const id = randomUUID();
    const doc: Document = { ...insertDoc, id, createdAt: new Date() };
    this.documents.set(id, doc);
    return doc;
  }

  async updateDocument(id: string, data: Partial<InsertDocument>): Promise<Document | undefined> {
    const existing = this.documents.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data };
    this.documents.set(id, updated);
    return updated;
  }

  async deleteDocument(id: string): Promise<boolean> {
    return this.documents.delete(id);
  }

  async getSuppliers(): Promise<Supplier[]> {
    return Array.from(this.suppliers.values()).sort((a, b) =>
      (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
    );
  }

  async getSupplierById(id: string): Promise<Supplier | undefined> {
    return this.suppliers.get(id);
  }

  async createSupplier(insertSupplier: InsertSupplier): Promise<Supplier> {
    const id = randomUUID();
    const supplier: Supplier = { ...insertSupplier, id, createdAt: new Date() };
    this.suppliers.set(id, supplier);
    return supplier;
  }

  async updateSupplier(id: string, data: Partial<InsertSupplier>): Promise<Supplier | undefined> {
    const existing = this.suppliers.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data };
    this.suppliers.set(id, updated);
    return updated;
  }

  async deleteSupplier(id: string): Promise<boolean> {
    return this.suppliers.delete(id);
  }

  async getAnnouncements(): Promise<Announcement[]> {
    return Array.from(this.announcements.values()).sort((a, b) =>
      (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
    );
  }

  async getAnnouncementById(id: string): Promise<Announcement | undefined> {
    return this.announcements.get(id);
  }

  async createAnnouncement(insertAnnouncement: InsertAnnouncement): Promise<Announcement> {
    const id = randomUUID();
    const announcement: Announcement = { ...insertAnnouncement, id, createdAt: new Date() };
    this.announcements.set(id, announcement);
    return announcement;
  }

  async updateAnnouncement(id: string, data: Partial<InsertAnnouncement>): Promise<Announcement | undefined> {
    const existing = this.announcements.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data };
    this.announcements.set(id, updated);
    return updated;
  }

  async deleteAnnouncement(id: string): Promise<boolean> {
    return this.announcements.delete(id);
  }

  private notifications: Map<string, Notification> = new Map();

  async getNotifications(userId: string): Promise<Notification[]> {
    return Array.from(this.notifications.values())
      .filter(n => n.userId === userId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async getUnreadNotifications(userId: string): Promise<Notification[]> {
    return Array.from(this.notifications.values())
      .filter(n => n.userId === userId && !n.isRead)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const id = randomUUID();
    const newNotification: Notification = { ...notification, id, createdAt: new Date() };
    this.notifications.set(id, newNotification);
    return newNotification;
  }

  async markNotificationAsRead(id: string): Promise<boolean> {
    const notification = this.notifications.get(id);
    if (!notification) return false;
    notification.isRead = true;
    this.notifications.set(id, notification);
    return true;
  }

  async markAllNotificationsAsRead(userId: string): Promise<boolean> {
    for (const [id, notification] of this.notifications.entries()) {
      if (notification.userId === userId) {
        notification.isRead = true;
        this.notifications.set(id, notification);
      }
    }
    return true;
  }

  async createNotificationsForAllUsers(notification: Omit<InsertNotification, 'userId'>, excludeUserId?: string): Promise<void> {
    const users = await this.getUsers();
    for (const user of users) {
      if (excludeUserId && user.id === excludeUserId) continue;
      await this.createNotification({ ...notification, userId: user.id });
    }
  }

  private modulePermissions: Map<string, ModulePermission> = new Map([
    ["manutencoes", { id: "1", moduleKey: "manutencoes", moduleLabel: "Manutenções", moduleIcon: "Wrench", isEnabled: true, updatedAt: new Date(), updatedBy: null }],
    ["piscina", { id: "2", moduleKey: "piscina", moduleLabel: "Piscina", moduleIcon: "Waves", isEnabled: true, updatedAt: new Date(), updatedBy: null }],
    ["agua", { id: "3", moduleKey: "agua", moduleLabel: "Água", moduleIcon: "Droplet", isEnabled: true, updatedAt: new Date(), updatedBy: null }],
    ["gas", { id: "4", moduleKey: "gas", moduleLabel: "Gás", moduleIcon: "Flame", isEnabled: true, updatedAt: new Date(), updatedBy: null }],
    ["energia", { id: "5", moduleKey: "energia", moduleLabel: "Energia", moduleIcon: "Zap", isEnabled: true, updatedAt: new Date(), updatedBy: null }],
    ["residuos", { id: "6", moduleKey: "residuos", moduleLabel: "Resíduos", moduleIcon: "Trash2", isEnabled: true, updatedAt: new Date(), updatedBy: null }],
    ["ocupacao", { id: "7", moduleKey: "ocupacao", moduleLabel: "Ocupação", moduleIcon: "Users", isEnabled: true, updatedAt: new Date(), updatedBy: null }],
    ["documentos", { id: "8", moduleKey: "documentos", moduleLabel: "Documentos", moduleIcon: "FileText", isEnabled: true, updatedAt: new Date(), updatedBy: null }],
    ["fornecedores", { id: "9", moduleKey: "fornecedores", moduleLabel: "Fornecedores", moduleIcon: "Building2", isEnabled: true, updatedAt: new Date(), updatedBy: null }],
    ["comunicados", { id: "10", moduleKey: "comunicados", moduleLabel: "Comunicados", moduleIcon: "Megaphone", isEnabled: true, updatedAt: new Date(), updatedBy: null }],
  ]);

  async getModulePermissions(): Promise<ModulePermission[]> {
    return Array.from(this.modulePermissions.values());
  }

  async updateModulePermission(moduleKey: string, isEnabled: boolean, updatedBy?: string): Promise<ModulePermission | undefined> {
    const permission = this.modulePermissions.get(moduleKey);
    if (!permission) return undefined;
    const updated = { ...permission, isEnabled, updatedAt: new Date(), updatedBy: updatedBy || null };
    this.modulePermissions.set(moduleKey, updated);
    return updated;
  }

  private wasteConfig: WasteConfig = {
    id: "1",
    schedule: JSON.stringify([
      { day: "Segunda", organic: true, recyclable: false },
      { day: "Terça", organic: false, recyclable: true },
      { day: "Quarta", organic: true, recyclable: false },
      { day: "Quinta", organic: false, recyclable: true },
      { day: "Sexta", organic: true, recyclable: false },
      { day: "Sábado", organic: false, recyclable: true },
    ]),
    organicItems: JSON.stringify([
      "Restos de alimentos",
      "Cascas de frutas e vegetais",
      "Borra de café e saquinhos de chá",
      "Guardanapos e papel toalha usados",
      "Folhas e podas de jardim",
    ]),
    recyclableCategories: JSON.stringify([
      { category: "Papel", items: ["Jornais", "Revistas", "Caixas de papelão", "Papel de escritório"] },
      { category: "Plástico", items: ["Garrafas PET", "Embalagens limpas", "Sacolas plásticas", "Potes"] },
      { category: "Metal", items: ["Latas de alumínio", "Latas de aço", "Tampas metálicas", "Papel alumínio"] },
      { category: "Vidro", items: ["Garrafas", "Potes", "Frascos", "Copos (não quebrados)"] },
    ]),
    notRecyclable: JSON.stringify([
      "Papel higiênico e fraldas",
      "Espelhos e vidros quebrados",
      "Cerâmicas e porcelanas",
      "Isopor sujo",
      "Embalagens metalizadas (como de salgadinho)",
    ]),
    collectionTime: "07:00",
    updatedAt: new Date(),
    updatedBy: null,
  };

  async getWasteConfig(): Promise<WasteConfig | undefined> {
    return this.wasteConfig;
  }

  async updateWasteConfig(config: Partial<InsertWasteConfig>): Promise<WasteConfig | undefined> {
    this.wasteConfig = { ...this.wasteConfig, ...config, updatedAt: new Date() };
    return this.wasteConfig;
  }
}

export const storage = new MemStorage();
