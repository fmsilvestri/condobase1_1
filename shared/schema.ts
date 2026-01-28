import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, real, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Condominiums table - multi-tenancy support
export const condominiums = pgTable("condominiums", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  phone: text("phone"),
  email: text("email"),
  totalUnits: integer("total_units"),
  logo: text("logo"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCondominiumSchema = createInsertSchema(condominiums).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCondominium = z.infer<typeof insertCondominiumSchema>;
export type Condominium = typeof condominiums.$inferSelect;

// User roles:
// - admin: Platform admin with access to all condominiums
// - síndico: Condominium administrator with full access to their condominium
// - conselheiro: Council member with access to governance and reports
// - administradora: Property management company with access to multiple condos
// - condômino: Resident with access to their unit data only
// - prestador: Service provider with limited access to work orders
export const userRoles = ["condômino", "síndico", "conselheiro", "administradora", "admin", "prestador"] as const;
export type UserRole = (typeof userRoles)[number];

// Roles that can be assigned per condominium (user_condominiums table)
export const condominiumRoles = ["condômino", "síndico", "conselheiro", "administradora", "prestador"] as const;
export type CondominiumRole = (typeof condominiumRoles)[number];

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default("condômino"),
  name: text("name").notNull(),
  unit: text("unit"),
  stripeCustomerId: text("stripe_customer_id"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateUserSchema = createInsertSchema(users).partial().omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// User-Condominium relationship (many-to-many with role per condominium)
export const userCondominiums = pgTable("user_condominiums", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  condominiumId: varchar("condominium_id").notNull().references(() => condominiums.id),
  role: text("role").notNull().default("condômino"),
  unit: text("unit"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserCondominiumSchema = createInsertSchema(userCondominiums).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUserCondominium = z.infer<typeof insertUserCondominiumSchema>;
export type UserCondominium = typeof userCondominiums.$inferSelect;

export const equipmentCategories = [
  "elétrico",
  "hidráulico",
  "piscina",
  "elevadores",
  "cisternas",
  "bombas",
  "academia",
  "brinquedoteca",
  "pet place",
  "campo",
  "portas",
  "portões",
  "acessos",
  "pintura",
  "reboco",
  "limpeza",
  "pisos",
  "jardim",
] as const;

export type EquipmentCategory = (typeof equipmentCategories)[number];

export const equipmentStatuses = ["operacional", "atenção", "alerta", "inativo"] as const;
export type EquipmentStatus = (typeof equipmentStatuses)[number];

export const equipment = pgTable("equipment", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  condominiumId: varchar("condominium_id").notNull().references(() => condominiums.id),
  name: text("name").notNull(),
  category: text("category").notNull(),
  location: text("location").notNull(),
  description: text("description"),
  icon: text("icon"),
  photos: text("photos").array(),
  documents: text("documents").array(),
  status: text("status").notNull().default("operacional"),
  manufacturer: text("manufacturer"),
  installationDate: timestamp("installation_date"),
  estimatedLifespan: integer("estimated_lifespan"),
  powerConsumption: real("power_consumption"),
  estimatedUsageHours: real("estimated_usage_hours"),
  supplierId: varchar("supplier_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertEquipmentSchema = createInsertSchema(equipment).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  installationDate: z.coerce.date().optional().nullable(),
  estimatedLifespan: z.coerce.number().optional().nullable(),
  powerConsumption: z.coerce.number().optional().nullable(),
  estimatedUsageHours: z.coerce.number().optional().nullable(),
});

export type InsertEquipment = z.infer<typeof insertEquipmentSchema>;
export type Equipment = typeof equipment.$inferSelect;

export const maintenanceStatuses = ["aberto", "em andamento", "concluído"] as const;
export type MaintenanceStatus = (typeof maintenanceStatuses)[number];

export const maintenanceRequests = pgTable("maintenance_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  condominiumId: varchar("condominium_id").notNull().references(() => condominiums.id),
  equipmentId: varchar("equipment_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  photos: text("photos").array(),
  status: text("status").notNull().default("aberto"),
  priority: text("priority").notNull().default("normal"),
  requestedBy: varchar("requested_by"),
  assignedTo: varchar("assigned_to"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertMaintenanceRequestSchema = createInsertSchema(maintenanceRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
});

export type InsertMaintenanceRequest = z.infer<typeof insertMaintenanceRequestSchema>;
export type MaintenanceRequest = typeof maintenanceRequests.$inferSelect;

export const maintenanceCompletions = pgTable("maintenance_completions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  condominiumId: varchar("condominium_id").notNull().references(() => condominiums.id),
  equipmentId: varchar("equipment_id").notNull(),
  maintenanceRequestId: varchar("maintenance_request_id"),
  description: text("description").notNull(),
  location: text("location").notNull(),
  photos: text("photos").array(),
  performedBy: varchar("performed_by"),
  performedByName: text("performed_by_name"),
  completedAt: timestamp("completed_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMaintenanceCompletionSchema = createInsertSchema(maintenanceCompletions).omit({
  id: true,
  createdAt: true,
}).extend({
  completedAt: z.coerce.date(),
});

export type InsertMaintenanceCompletion = z.infer<typeof insertMaintenanceCompletionSchema>;
export type MaintenanceCompletion = typeof maintenanceCompletions.$inferSelect;

export const poolReadings = pgTable("pool_readings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  condominiumId: varchar("condominium_id").notNull().references(() => condominiums.id),
  ph: real("ph").notNull(),
  chlorine: real("chlorine").notNull(),
  alkalinity: real("alkalinity").notNull(),
  calciumHardness: real("calcium_hardness").notNull(),
  temperature: real("temperature").notNull(),
  photo: text("photo"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  recordedBy: varchar("recorded_by"),
});

export const insertPoolReadingSchema = createInsertSchema(poolReadings).omit({
  id: true,
  createdAt: true,
}).extend({
  ph: z.coerce.number().min(0).max(14),
  chlorine: z.coerce.number().min(0).max(10),
  alkalinity: z.coerce.number().min(0).max(500),
  calciumHardness: z.coerce.number().min(0).max(1000),
  temperature: z.coerce.number().min(0).max(50),
});

export type InsertPoolReading = z.infer<typeof insertPoolReadingSchema>;
export type PoolReading = typeof poolReadings.$inferSelect;

export const reservoirs = pgTable("reservoirs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  condominiumId: varchar("condominium_id").notNull().references(() => condominiums.id),
  name: text("name").notNull(),
  location: text("location").notNull(),
  capacityLiters: real("capacity_liters").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertReservoirSchema = createInsertSchema(reservoirs).omit({
  id: true,
  createdAt: true,
});

export type InsertReservoir = z.infer<typeof insertReservoirSchema>;
export type Reservoir = typeof reservoirs.$inferSelect;

export const waterReadings = pgTable("water_readings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  condominiumId: varchar("condominium_id").notNull().references(() => condominiums.id),
  reservoirId: varchar("reservoir_id"),
  tankLevel: real("tank_level").notNull(),
  quality: text("quality").notNull().default("boa"),
  volumeAvailable: real("volume_available").notNull().default(0),
  estimatedAutonomy: real("estimated_autonomy"),
  casanStatus: text("casan_status").default("normal"),
  photo: text("photo"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  recordedBy: varchar("recorded_by"),
});

export const insertWaterReadingSchema = createInsertSchema(waterReadings).omit({
  id: true,
  createdAt: true,
}).extend({
  volumeAvailable: z.coerce.number().default(0),
  tankLevel: z.coerce.number().min(0).max(100),
  estimatedAutonomy: z.coerce.number().optional().nullable(),
});

export type InsertWaterReading = z.infer<typeof insertWaterReadingSchema>;
export type WaterReading = typeof waterReadings.$inferSelect;

export const hydrometerReadings = pgTable("hydrometer_readings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  condominiumId: varchar("condominium_id").notNull().references(() => condominiums.id),
  readingValue: real("reading_value").notNull(),
  readingDate: timestamp("reading_date").notNull(),
  photo: text("photo"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  recordedBy: varchar("recorded_by"),
});

export const insertHydrometerReadingSchema = createInsertSchema(hydrometerReadings).omit({
  id: true,
  createdAt: true,
}).extend({
  readingValue: z.coerce.number().min(0),
  readingDate: z.coerce.date(),
});

export type InsertHydrometerReading = z.infer<typeof insertHydrometerReadingSchema>;
export type HydrometerReading = typeof hydrometerReadings.$inferSelect;

export const gasReadings = pgTable("gas_readings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  condominiumId: varchar("condominium_id").notNull().references(() => condominiums.id),
  level: real("level").notNull(),
  percentAvailable: real("percent_available").notNull(),
  photo: text("photo"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  recordedBy: varchar("recorded_by"),
});

export const insertGasReadingSchema = createInsertSchema(gasReadings).omit({
  id: true,
  createdAt: true,
});

export type InsertGasReading = z.infer<typeof insertGasReadingSchema>;
export type GasReading = typeof gasReadings.$inferSelect;

export const energyStatuses = ["ok", "falta de energia", "meia fase"] as const;
export type EnergyStatus = (typeof energyStatuses)[number];

export const energyEvents = pgTable("energy_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  condominiumId: varchar("condominium_id").notNull().references(() => condominiums.id),
  status: text("status").notNull().default("ok"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
  recordedBy: varchar("recorded_by"),
});

export const insertEnergyEventSchema = createInsertSchema(energyEvents).omit({
  id: true,
  createdAt: true,
  resolvedAt: true,
});

export type InsertEnergyEvent = z.infer<typeof insertEnergyEventSchema>;
export type EnergyEvent = typeof energyEvents.$inferSelect;

export const occupancyData = pgTable("occupancy_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  condominiumId: varchar("condominium_id").notNull().references(() => condominiums.id),
  totalUnits: integer("total_units").notNull(),
  occupiedUnits: integer("occupied_units").notNull(),
  vacantUnits: integer("vacant_units").notNull(),
  averagePeoplePerUnit: real("average_people_per_unit").notNull(),
  estimatedPopulation: integer("estimated_population").notNull(),
  avgWaterConsumption: real("avg_water_consumption"),
  avgGasConsumption: real("avg_gas_consumption"),
  avgEnergyConsumption: real("avg_energy_consumption"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertOccupancyDataSchema = createInsertSchema(occupancyData).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertOccupancyData = z.infer<typeof insertOccupancyDataSchema>;
export type OccupancyData = typeof occupancyData.$inferSelect;

export const documentTypes = [
  "AVCB",
  "Alvará",
  "Dedetização",
  "Limpeza Caixas d'Água",
  "Certificado",
  "Contrato",
  "Outros",
] as const;

export type DocumentType = (typeof documentTypes)[number];

export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  condominiumId: varchar("condominium_id").notNull().references(() => condominiums.id),
  name: text("name").notNull(),
  type: text("type").notNull(),
  fileUrl: text("file_url"),
  expirationDate: timestamp("expiration_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  uploadedBy: varchar("uploaded_by"),
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
});

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;

export const suppliers = pgTable("suppliers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  condominiumId: varchar("condominium_id").notNull().references(() => condominiums.id),
  name: text("name").notNull(),
  category: text("category").notNull(),
  icon: text("icon"),
  phone: text("phone"),
  whatsapp: text("whatsapp"),
  email: text("email"),
  address: text("address"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSupplierSchema = createInsertSchema(suppliers).omit({
  id: true,
  createdAt: true,
}).extend({
  icon: z.string().optional().transform(v => v === "" ? undefined : v),
  phone: z.string().optional().transform(v => v === "" ? undefined : v),
  whatsapp: z.string().optional().transform(v => v === "" ? undefined : v),
  email: z.string().optional().transform(v => v === "" ? undefined : v),
  address: z.string().optional().transform(v => v === "" ? undefined : v),
  notes: z.string().optional().transform(v => v === "" ? undefined : v),
});

export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type Supplier = typeof suppliers.$inferSelect;

export const announcements = pgTable("announcements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  condominiumId: varchar("condominium_id").notNull().references(() => condominiums.id),
  title: text("title").notNull(),
  content: text("content").notNull(),
  priority: text("priority").notNull().default("normal"),
  photos: text("photos").array(),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
});

export const insertAnnouncementSchema = createInsertSchema(announcements).omit({
  id: true,
  createdAt: true,
});

export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;
export type Announcement = typeof announcements.$inferSelect;

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  condominiumId: varchar("condominium_id").notNull().references(() => condominiums.id),
  userId: varchar("user_id").notNull(),
  type: text("type").notNull(), // "announcement_new", "announcement_updated", "maintenance_update"
  title: text("title").notNull(),
  message: text("message").notNull(),
  relatedId: varchar("related_id"), // announcement id, maintenance request id, etc.
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

export const modulePermissions = pgTable("module_permissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  condominiumId: varchar("condominium_id").notNull().references(() => condominiums.id),
  moduleKey: text("module_key").notNull(),
  moduleLabel: text("module_label").notNull(),
  moduleIcon: text("module_icon"),
  isEnabled: boolean("is_enabled").notNull().default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: varchar("updated_by"),
});

export const insertModulePermissionSchema = createInsertSchema(modulePermissions).omit({
  id: true,
  updatedAt: true,
});

export type InsertModulePermission = z.infer<typeof insertModulePermissionSchema>;
export type ModulePermission = typeof modulePermissions.$inferSelect;

export const MODULE_KEYS = [
  "manutencoes",
  "piscina",
  "agua",
  "gas",
  "energia",
  "residuos",
  "ocupacao",
  "documentos",
  "fornecedores",
  "comunicados",
  "governanca",
  "financeiro",
  "contratos",
  "conformidade",
  "seguros",
] as const;

export type ModuleKey = typeof MODULE_KEYS[number];

export const wasteConfig = pgTable("waste_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  condominiumId: varchar("condominium_id").notNull().references(() => condominiums.id),
  schedule: text("schedule").notNull(),
  organicItems: text("organic_items").notNull(),
  recyclableCategories: text("recyclable_categories").notNull(),
  notRecyclable: text("not_recyclable").notNull(),
  collectionTime: text("collection_time").default("07:00"),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: varchar("updated_by"),
});

export const insertWasteConfigSchema = createInsertSchema(wasteConfig).omit({
  id: true,
  updatedAt: true,
});

export type InsertWasteConfig = z.infer<typeof insertWasteConfigSchema>;
export type WasteConfig = typeof wasteConfig.$inferSelect;

export const securityDeviceTypes = ["portão", "porta", "câmera", "facial"] as const;
export type SecurityDeviceType = (typeof securityDeviceTypes)[number];

export const securityDeviceStatuses = ["operacional", "atenção", "falha", "inativo"] as const;
export type SecurityDeviceStatus = (typeof securityDeviceStatuses)[number];

export const securityDevices = pgTable("security_devices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  condominiumId: varchar("condominium_id").notNull().references(() => condominiums.id),
  name: text("name").notNull(),
  type: text("type").notNull(),
  location: text("location").notNull(),
  brand: text("brand"),
  model: text("model"),
  serialNumber: text("serial_number"),
  status: text("status").notNull().default("operacional"),
  lastMaintenanceDate: timestamp("last_maintenance_date"),
  nextMaintenanceDate: timestamp("next_maintenance_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSecurityDeviceSchema = createInsertSchema(securityDevices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSecurityDevice = z.infer<typeof insertSecurityDeviceSchema>;
export type SecurityDevice = typeof securityDevices.$inferSelect;

export const securityEvents = pgTable("security_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  condominiumId: varchar("condominium_id").notNull().references(() => condominiums.id),
  deviceId: varchar("device_id").notNull(),
  eventType: text("event_type").notNull(),
  description: text("description"),
  status: text("status").notNull(),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  recordedBy: varchar("recorded_by"),
});

export const insertSecurityEventSchema = createInsertSchema(securityEvents).omit({
  id: true,
  createdAt: true,
  resolvedAt: true,
});

export type InsertSecurityEvent = z.infer<typeof insertSecurityEventSchema>;
export type SecurityEvent = typeof securityEvents.$inferSelect;

// ===========================
// MANUTENÇÃO PREVENTIVA MODULE
// ===========================

export const preventiveAssetCategories = [
  "elevador",
  "bomba",
  "elétrica",
  "segurança",
  "incêndio",
  "hidráulica",
  "estrutura",
  "lazer",
] as const;

export type PreventiveAssetCategory = (typeof preventiveAssetCategories)[number];

export const preventiveAssetStatuses = ["ativo", "inativo"] as const;
export type PreventiveAssetStatus = (typeof preventiveAssetStatuses)[number];

export const preventiveAssets = pgTable("preventive_assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  condominiumId: varchar("condominium_id").notNull().references(() => condominiums.id),
  name: text("name").notNull(),
  category: text("category").notNull(),
  location: text("location").notNull(),
  manufacturer: text("manufacturer"),
  installationDate: timestamp("installation_date"),
  estimatedLifespan: integer("estimated_lifespan"), // in months
  status: text("status").notNull().default("ativo"),
  supplierId: varchar("supplier_id"),
  photo: text("photo"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPreventiveAssetSchema = createInsertSchema(preventiveAssets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  installationDate: z.coerce.date().optional().nullable(),
  estimatedLifespan: z.coerce.number().optional().nullable(),
});

export type InsertPreventiveAsset = z.infer<typeof insertPreventiveAssetSchema>;
export type PreventiveAsset = typeof preventiveAssets.$inferSelect;

export const maintenanceTypes = ["preventiva", "corretiva", "inspeção"] as const;
export type MaintenanceType = (typeof maintenanceTypes)[number];

export const maintenancePeriodicities = ["mensal", "trimestral", "semestral", "anual"] as const;
export type MaintenancePeriodicity = (typeof maintenancePeriodicities)[number];

export const maintenancePlans = pgTable("maintenance_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  condominiumId: varchar("condominium_id").notNull().references(() => condominiums.id),
  equipmentId: varchar("equipment_id").notNull(),
  name: text("name").notNull(),
  maintenanceType: text("maintenance_type").notNull(),
  periodicity: text("periodicity").notNull(),
  nextMaintenanceDate: timestamp("next_maintenance_date").notNull(),
  lastMaintenanceDate: timestamp("last_maintenance_date"),
  responsibleType: text("responsible_type").notNull().default("interno"), // interno or fornecedor
  responsibleId: varchar("responsible_id"),
  responsibleName: text("responsible_name"),
  requiredDocuments: text("required_documents").array(), // ["laudo", "ART", "fotos"]
  estimatedCost: real("estimated_cost"),
  isActive: boolean("is_active").notNull().default(true),
  alertDaysBefore: integer("alert_days_before").default(7),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMaintenancePlanSchema = createInsertSchema(maintenancePlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  nextMaintenanceDate: z.coerce.date(),
  lastMaintenanceDate: z.coerce.date().optional().nullable(),
  estimatedCost: z.coerce.number().optional().nullable(),
  alertDaysBefore: z.coerce.number().optional().nullable(),
});

export type InsertMaintenancePlan = z.infer<typeof insertMaintenancePlanSchema>;
export type MaintenancePlan = typeof maintenancePlans.$inferSelect;

// Template checklists for maintenance plans
export const planChecklistItems = pgTable("plan_checklist_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  planId: varchar("plan_id").notNull(),
  itemOrder: integer("item_order").notNull(),
  description: text("description").notNull(),
  isMandatory: boolean("is_mandatory").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPlanChecklistItemSchema = createInsertSchema(planChecklistItems).omit({
  id: true,
  createdAt: true,
}).extend({
  itemOrder: z.coerce.number(),
});

export type InsertPlanChecklistItem = z.infer<typeof insertPlanChecklistItemSchema>;
export type PlanChecklistItem = typeof planChecklistItems.$inferSelect;

export const executionStatuses = ["pendente", "em_andamento", "concluído", "cancelado"] as const;
export type ExecutionStatus = (typeof executionStatuses)[number];

// Actual maintenance executions (history)
export const maintenanceExecutions = pgTable("maintenance_executions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  condominiumId: varchar("condominium_id").notNull().references(() => condominiums.id),
  planId: varchar("plan_id"),
  equipmentId: varchar("equipment_id").notNull(),
  maintenanceType: text("maintenance_type").notNull(),
  scheduledDate: timestamp("scheduled_date").notNull(),
  executedDate: timestamp("executed_date"),
  status: text("status").notNull().default("pendente"),
  responsibleName: text("responsible_name"),
  supplierId: varchar("supplier_id"),
  cost: real("cost"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMaintenanceExecutionSchema = createInsertSchema(maintenanceExecutions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  scheduledDate: z.coerce.date(),
  executedDate: z.coerce.date().optional().nullable(),
  cost: z.coerce.number().optional().nullable(),
});

export type InsertMaintenanceExecution = z.infer<typeof insertMaintenanceExecutionSchema>;
export type MaintenanceExecution = typeof maintenanceExecutions.$inferSelect;

export const checklistItemStatuses = ["ok", "ajuste", "crítico", "não_verificado"] as const;
export type ChecklistItemStatus = (typeof checklistItemStatuses)[number];

// Filled checklist items during execution
export const executionChecklistItems = pgTable("execution_checklist_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  executionId: varchar("execution_id").notNull(),
  itemDescription: text("item_description").notNull(),
  status: text("status").notNull().default("não_verificado"),
  observations: text("observations"),
  photos: text("photos").array(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertExecutionChecklistItemSchema = createInsertSchema(executionChecklistItems).omit({
  id: true,
  createdAt: true,
});

export type InsertExecutionChecklistItem = z.infer<typeof insertExecutionChecklistItemSchema>;
export type ExecutionChecklistItem = typeof executionChecklistItems.$inferSelect;

// Documents attached to executions
export const maintenanceDocuments = pgTable("maintenance_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  executionId: varchar("execution_id").notNull(),
  documentType: text("document_type").notNull(), // laudo, ART, foto, certificado
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  notes: text("notes"),
  uploadedBy: varchar("uploaded_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMaintenanceDocumentSchema = createInsertSchema(maintenanceDocuments).omit({
  id: true,
  createdAt: true,
});

export type InsertMaintenanceDocument = z.infer<typeof insertMaintenanceDocumentSchema>;
export type MaintenanceDocument = typeof maintenanceDocuments.$inferSelect;

// FAQ categories for knowledge base
export const faqCategories = [
  "geral",
  "financeiro",
  "manutenção",
  "reservas",
  "regras",
  "segurança",
  "áreas comuns",
  "animais",
  "mudanças",
  "estacionamento",
] as const;
export type FaqCategory = (typeof faqCategories)[number];

// FAQ / Knowledge Base table
export const faqs = pgTable("faqs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  condominiumId: varchar("condominium_id").notNull().references(() => condominiums.id),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  category: text("category").notNull().default("geral"),
  isPublished: boolean("is_published").notNull().default(true),
  viewCount: integer("view_count").notNull().default(0),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertFaqSchema = createInsertSchema(faqs).omit({
  id: true,
  viewCount: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFaq = z.infer<typeof insertFaqSchema>;
export type Faq = typeof faqs.$inferSelect;

// Push notification subscriptions for browser push notifications
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  condominiumId: varchar("condominium_id").references(() => condominiums.id),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  userAgent: text("user_agent"),
  isEnabled: boolean("is_enabled").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;

// User notification preferences
export const notificationPreferences = pgTable("notification_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  condominiumId: varchar("condominium_id").references(() => condominiums.id),
  announcements: boolean("announcements").notNull().default(true),
  maintenanceUpdates: boolean("maintenance_updates").notNull().default(true),
  urgentMessages: boolean("urgent_messages").notNull().default(true),
  quietHoursStart: text("quiet_hours_start"),
  quietHoursEnd: text("quiet_hours_end"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertNotificationPreferenceSchema = createInsertSchema(notificationPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertNotificationPreference = z.infer<typeof insertNotificationPreferenceSchema>;
export type NotificationPreference = typeof notificationPreferences.$inferSelect;

// IoT Device Sessions - stores eWeLink session tokens per user/condominium
export const iotSessions = pgTable("iot_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  condominiumId: varchar("condominium_id").notNull().references(() => condominiums.id),
  sessionKey: text("session_key").notNull(),
  platform: text("platform").notNull().default("ewelink"), // ewelink, tuya, etc
  email: text("email").notNull(),
  region: text("region").notNull().default("us"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
});

export const insertIotSessionSchema = createInsertSchema(iotSessions).omit({
  id: true,
  createdAt: true,
});

export type InsertIotSession = z.infer<typeof insertIotSessionSchema>;
export type IotSession = typeof iotSessions.$inferSelect;

// IoT Device registry for saved devices per condominium
export const iotDevices = pgTable("iot_devices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  condominiumId: varchar("condominium_id").notNull().references(() => condominiums.id),
  deviceId: text("device_id").notNull(), // External device ID from platform
  platform: text("platform").notNull().default("ewelink"),
  name: text("name").notNull(),
  location: text("location"), // Where in the condo (garage, lobby, etc)
  category: text("category"), // lighting, security, access, etc
  isEnabled: boolean("is_enabled").notNull().default(true),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertIotDeviceSchema = createInsertSchema(iotDevices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertIotDevice = z.infer<typeof insertIotDeviceSchema>;
export type IotDevice = typeof iotDevices.$inferSelect;

// ===========================
// IMOBCORE 7 PILARES
// ===========================

// Os 7 pilares do sistema ImobCore
export const pillarTypes = [
  "governanca",      // Governança e Sucessão (20%)
  "financeiro",      // Financeiro e Orçamentário (20%)
  "manutencao",      // Manutenção e Ativos (20%)
  "contratos",       // Contratos e Fornecedores (15%)
  "conformidade",    // Conformidade Legal e Seguros (15%)
  "operacao",        // Operação e Automação (5%)
  "transparencia",   // Transparência e Comunicação (5%)
] as const;

export type PillarType = (typeof pillarTypes)[number];

export const pillarWeights: Record<PillarType, number> = {
  governanca: 20,
  financeiro: 20,
  manutencao: 20,
  contratos: 15,
  conformidade: 15,
  operacao: 5,
  transparencia: 5,
};

export const maturityLevels = ["iniciante", "em_evolucao", "estruturado", "inteligente"] as const;
export type MaturityLevel = (typeof maturityLevels)[number];

// Pillar Scores - stores calculated scores for each pillar
export const pillarScores = pgTable("pillar_scores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  condominiumId: varchar("condominium_id").notNull().references(() => condominiums.id),
  pillar: text("pillar").notNull(),
  score: real("score").notNull().default(0), // 0-100
  riskLevel: text("risk_level").notNull().default("baixo"), // baixo, médio, alto
  maturityLevel: text("maturity_level").notNull().default("iniciante"),
  calculatedAt: timestamp("calculated_at").defaultNow(),
  notes: text("notes"),
});

export const insertPillarScoreSchema = createInsertSchema(pillarScores).omit({
  id: true,
  calculatedAt: true,
});

export type InsertPillarScore = z.infer<typeof insertPillarScoreSchema>;
export type PillarScore = typeof pillarScores.$inferSelect;

// ===========================
// PILAR 1: GOVERNANÇA E SUCESSÃO
// ===========================

export const decisionTypes = [
  "assembleia",
  "reuniao_conselho",
  "decisao_sindico",
  "votacao_online",
] as const;
export type DecisionType = (typeof decisionTypes)[number];

// Governance Decisions - registro de decisões
export const governanceDecisions = pgTable("governance_decisions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  condominiumId: varchar("condominium_id").notNull().references(() => condominiums.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  decisionType: text("decision_type").notNull(),
  decisionDate: timestamp("decision_date").notNull(),
  participants: text("participants").array(),
  votesFor: integer("votes_for"),
  votesAgainst: integer("votes_against"),
  votesAbstain: integer("votes_abstain"),
  status: text("status").notNull().default("aprovada"), // aprovada, rejeitada, pendente
  attachments: text("attachments").array(),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertGovernanceDecisionSchema = createInsertSchema(governanceDecisions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  decisionDate: z.coerce.date(),
  votesFor: z.coerce.number().optional().nullable(),
  votesAgainst: z.coerce.number().optional().nullable(),
  votesAbstain: z.coerce.number().optional().nullable(),
});

export type InsertGovernanceDecision = z.infer<typeof insertGovernanceDecisionSchema>;
export type GovernanceDecision = typeof governanceDecisions.$inferSelect;

// Meeting Minutes - Atas digitais versionadas
export const meetingMinutes = pgTable("meeting_minutes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  condominiumId: varchar("condominium_id").notNull().references(() => condominiums.id),
  title: text("title").notNull(),
  meetingType: text("meeting_type").notNull(), // assembleia_ordinaria, assembleia_extraordinaria, reuniao_conselho
  meetingDate: timestamp("meeting_date").notNull(),
  location: text("location"),
  attendeesCount: integer("attendees_count"),
  quorumReached: boolean("quorum_reached").default(false),
  summary: text("summary"),
  fullContent: text("full_content"),
  attachments: text("attachments").array(),
  version: integer("version").notNull().default(1),
  status: text("status").notNull().default("rascunho"), // rascunho, publicada, arquivada
  publishedBy: varchar("published_by"),
  publishedAt: timestamp("published_at"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMeetingMinutesSchema = createInsertSchema(meetingMinutes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  publishedAt: true,
}).extend({
  meetingDate: z.coerce.date(),
  attendeesCount: z.coerce.number().optional().nullable(),
  version: z.coerce.number().optional(),
});

export type InsertMeetingMinutes = z.infer<typeof insertMeetingMinutesSchema>;
export type MeetingMinutes = typeof meetingMinutes.$inferSelect;

// Succession Plan - Plano de sucessão do síndico
export const successionPlans = pgTable("succession_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  condominiumId: varchar("condominium_id").notNull().references(() => condominiums.id),
  currentSindicoId: varchar("current_sindico_id"),
  currentSindicoName: text("current_sindico_name"),
  mandateStartDate: timestamp("mandate_start_date"),
  mandateEndDate: timestamp("mandate_end_date"),
  successorId: varchar("successor_id"),
  successorName: text("successor_name"),
  transitionPlan: text("transition_plan"),
  keyResponsibilities: text("key_responsibilities").array(),
  criticalContacts: text("critical_contacts").array(),
  pendingIssues: text("pending_issues").array(),
  status: text("status").notNull().default("ativo"), // ativo, transicao, concluido
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSuccessionPlanSchema = createInsertSchema(successionPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  mandateStartDate: z.coerce.date().optional().nullable(),
  mandateEndDate: z.coerce.date().optional().nullable(),
});

export type InsertSuccessionPlan = z.infer<typeof insertSuccessionPlanSchema>;
export type SuccessionPlan = typeof successionPlans.$inferSelect;

// ===========================
// PILAR 2: FINANCEIRO E ORÇAMENTÁRIO
// ===========================

export const budgetCategories = [
  "pessoal",
  "manutencao",
  "limpeza",
  "seguranca",
  "energia",
  "agua",
  "gas",
  "seguros",
  "administrativo",
  "fundo_reserva",
  "outros",
] as const;
export type BudgetCategory = (typeof budgetCategories)[number];

// Budget - Orçamento anual
export const budgets = pgTable("budgets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  condominiumId: varchar("condominium_id").notNull().references(() => condominiums.id),
  year: integer("year").notNull(),
  month: integer("month"), // null = annual, 1-12 = monthly
  category: text("category").notNull(),
  plannedAmount: real("planned_amount").notNull().default(0),
  actualAmount: real("actual_amount").default(0),
  notes: text("notes"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertBudgetSchema = createInsertSchema(budgets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  year: z.coerce.number(),
  month: z.coerce.number().optional().nullable(),
  plannedAmount: z.coerce.number(),
  actualAmount: z.coerce.number().optional().nullable(),
});

export type InsertBudget = z.infer<typeof insertBudgetSchema>;
export type Budget = typeof budgets.$inferSelect;

export const transactionTypes = ["receita", "despesa"] as const;
export type TransactionType = (typeof transactionTypes)[number];

// Financial Transactions - Controle de despesas e receitas
export const financialTransactions = pgTable("financial_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  condominiumId: varchar("condominium_id").notNull().references(() => condominiums.id),
  type: text("type").notNull(), // receita, despesa
  category: text("category").notNull(),
  description: text("description").notNull(),
  amount: real("amount").notNull(),
  transactionDate: timestamp("transaction_date").notNull(),
  dueDate: timestamp("due_date"),
  paymentDate: timestamp("payment_date"),
  status: text("status").notNull().default("pendente"), // pendente, pago, cancelado
  supplierId: varchar("supplier_id"),
  documentUrl: text("document_url"),
  invoiceNumber: text("invoice_number"),
  notes: text("notes"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertFinancialTransactionSchema = createInsertSchema(financialTransactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  amount: z.coerce.number(),
  transactionDate: z.coerce.date(),
  dueDate: z.coerce.date().optional().nullable(),
  paymentDate: z.coerce.date().optional().nullable(),
});

export type InsertFinancialTransaction = z.infer<typeof insertFinancialTransactionSchema>;
export type FinancialTransaction = typeof financialTransactions.$inferSelect;

// ===========================
// PILAR 4: CONTRATOS E FORNECEDORES
// ===========================

export const contractStatuses = ["ativo", "vencido", "renovado", "cancelado"] as const;
export type ContractStatus = (typeof contractStatuses)[number];

// Contracts - Gestão de contratos
export const contracts = pgTable("contracts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  condominiumId: varchar("condominium_id").notNull().references(() => condominiums.id),
  supplierId: varchar("supplier_id").references(() => suppliers.id),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  contractNumber: text("contract_number"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  monthlyValue: real("monthly_value"),
  totalValue: real("total_value"),
  adjustmentIndex: text("adjustment_index"), // IGPM, IPCA, etc
  adjustmentDate: timestamp("adjustment_date"),
  slaDescription: text("sla_description"),
  slaResponseTime: integer("sla_response_time"), // in hours
  paymentDay: integer("payment_day"),
  autoRenew: boolean("auto_renew").default(false),
  notifyDaysBefore: integer("notify_days_before").default(30),
  status: text("status").notNull().default("ativo"),
  attachments: text("attachments").array(),
  notes: text("notes"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertContractSchema = createInsertSchema(contracts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  monthlyValue: z.coerce.number().optional().nullable(),
  totalValue: z.coerce.number().optional().nullable(),
  adjustmentDate: z.coerce.date().optional().nullable(),
  slaResponseTime: z.coerce.number().optional().nullable(),
  paymentDay: z.coerce.number().optional().nullable(),
  notifyDaysBefore: z.coerce.number().optional().nullable(),
});

export type InsertContract = z.infer<typeof insertContractSchema>;
export type Contract = typeof contracts.$inferSelect;

// Supplier Evaluations - Avaliação de fornecedores
export const supplierEvaluations = pgTable("supplier_evaluations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  condominiumId: varchar("condominium_id").notNull().references(() => condominiums.id),
  supplierId: varchar("supplier_id").notNull().references(() => suppliers.id),
  contractId: varchar("contract_id"),
  evaluationDate: timestamp("evaluation_date").notNull(),
  qualityScore: integer("quality_score").notNull(), // 1-5
  punctualityScore: integer("punctuality_score").notNull(), // 1-5
  priceScore: integer("price_score").notNull(), // 1-5
  communicationScore: integer("communication_score").notNull(), // 1-5
  overallScore: real("overall_score").notNull(), // calculated average
  comments: text("comments"),
  wouldRecommend: boolean("would_recommend"),
  evaluatedBy: varchar("evaluated_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSupplierEvaluationSchema = createInsertSchema(supplierEvaluations).omit({
  id: true,
  createdAt: true,
}).extend({
  evaluationDate: z.coerce.date(),
  qualityScore: z.coerce.number().min(1).max(5),
  punctualityScore: z.coerce.number().min(1).max(5),
  priceScore: z.coerce.number().min(1).max(5),
  communicationScore: z.coerce.number().min(1).max(5),
  overallScore: z.coerce.number(),
});

export type InsertSupplierEvaluation = z.infer<typeof insertSupplierEvaluationSchema>;
export type SupplierEvaluation = typeof supplierEvaluations.$inferSelect;

// ===========================
// PILAR 5: CONFORMIDADE LEGAL E SEGUROS
// ===========================

export const legalChecklistItemTypes = [
  "documento",
  "certificado",
  "licenca",
  "seguro",
  "inspecao",
  "laudo",
] as const;
export type LegalChecklistItemType = (typeof legalChecklistItemTypes)[number];

// Legal Checklist - Checklist legal automatizado
export const legalChecklist = pgTable("legal_checklist", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  condominiumId: varchar("condominium_id").notNull().references(() => condominiums.id),
  itemType: text("item_type").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  isMandatory: boolean("is_mandatory").notNull().default(true),
  frequency: text("frequency").notNull(), // anual, semestral, mensal, unica
  lastCompletedDate: timestamp("last_completed_date"),
  nextDueDate: timestamp("next_due_date"),
  documentId: varchar("document_id"),
  responsibleName: text("responsible_name"),
  status: text("status").notNull().default("pendente"), // pendente, em_dia, vencido, nao_aplicavel
  notes: text("notes"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertLegalChecklistSchema = createInsertSchema(legalChecklist).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  lastCompletedDate: z.coerce.date().optional().nullable(),
  nextDueDate: z.coerce.date().optional().nullable(),
});

export type InsertLegalChecklist = z.infer<typeof insertLegalChecklistSchema>;
export type LegalChecklist = typeof legalChecklist.$inferSelect;

// Insurance Policies - Gestão de apólices de seguro
export const insurancePolicies = pgTable("insurance_policies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  condominiumId: varchar("condominium_id").notNull().references(() => condominiums.id),
  policyNumber: text("policy_number").notNull(),
  insuranceCompany: text("insurance_company").notNull(),
  coverageType: text("coverage_type").notNull(), // incendio, responsabilidade_civil, vida, etc
  coverageAmount: real("coverage_amount").notNull(),
  premium: real("premium").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  broker: text("broker"),
  brokerPhone: text("broker_phone"),
  brokerEmail: text("broker_email"),
  documentUrl: text("document_url"),
  status: text("status").notNull().default("ativo"), // ativo, vencido, cancelado
  notifyDaysBefore: integer("notify_days_before").default(30),
  notes: text("notes"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertInsurancePolicySchema = createInsertSchema(insurancePolicies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  coverageAmount: z.coerce.number(),
  premium: z.coerce.number(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  notifyDaysBefore: z.coerce.number().optional().nullable(),
});

export type InsertInsurancePolicy = z.infer<typeof insertInsurancePolicySchema>;
export type InsurancePolicy = typeof insurancePolicies.$inferSelect;

// ===========================
// PILAR 6: OPERAÇÃO E AUTOMAÇÃO
// ===========================

export const automationTriggerTypes = [
  "horario",
  "evento",
  "sensor",
  "condicao",
  "manual",
] as const;
export type AutomationTriggerType = (typeof automationTriggerTypes)[number];

export const automationActionTypes = [
  "ligar_dispositivo",
  "desligar_dispositivo",
  "enviar_notificacao",
  "gerar_alerta",
  "executar_tarefa",
  "enviar_email",
] as const;
export type AutomationActionType = (typeof automationActionTypes)[number];

// Automation Rules - Regras de automação
export const automationRules = pgTable("automation_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  condominiumId: varchar("condominium_id").notNull().references(() => condominiums.id),
  name: text("name").notNull(),
  description: text("description"),
  triggerType: text("trigger_type").notNull(), // horario, evento, sensor, condicao, manual
  triggerConfig: text("trigger_config"), // JSON config for trigger
  actionType: text("action_type").notNull(), // ligar_dispositivo, desligar_dispositivo, etc
  actionConfig: text("action_config"), // JSON config for action
  targetDeviceId: varchar("target_device_id"),
  isActive: boolean("is_active").notNull().default(true),
  priority: integer("priority").notNull().default(1),
  lastExecutedAt: timestamp("last_executed_at"),
  executionCount: integer("execution_count").notNull().default(0),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAutomationRuleSchema = createInsertSchema(automationRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastExecutedAt: true,
  executionCount: true,
});

export type InsertAutomationRule = z.infer<typeof insertAutomationRuleSchema>;
export type AutomationRule = typeof automationRules.$inferSelect;

export const scheduledTaskStatuses = ["pendente", "em_execucao", "concluida", "falhou", "cancelada"] as const;
export type ScheduledTaskStatus = (typeof scheduledTaskStatuses)[number];

export const scheduledTaskFrequencies = ["unica", "diaria", "semanal", "mensal", "anual"] as const;
export type ScheduledTaskFrequency = (typeof scheduledTaskFrequencies)[number];

// Scheduled Tasks - Tarefas agendadas
export const scheduledTasks = pgTable("scheduled_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  condominiumId: varchar("condominium_id").notNull().references(() => condominiums.id),
  name: text("name").notNull(),
  description: text("description"),
  taskType: text("task_type").notNull(), // manutencao, limpeza, inspecao, relatorio, backup
  frequency: text("frequency").notNull().default("unica"), // unica, diaria, semanal, mensal, anual
  scheduledDate: timestamp("scheduled_date").notNull(),
  scheduledTime: text("scheduled_time"), // HH:MM format
  daysOfWeek: text("days_of_week").array(), // for weekly tasks
  dayOfMonth: integer("day_of_month"), // for monthly tasks
  assignedTo: varchar("assigned_to"),
  assignedName: text("assigned_name"),
  status: text("status").notNull().default("pendente"),
  lastRunAt: timestamp("last_run_at"),
  nextRunAt: timestamp("next_run_at"),
  automationRuleId: varchar("automation_rule_id"),
  notes: text("notes"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertScheduledTaskSchema = createInsertSchema(scheduledTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastRunAt: true,
  nextRunAt: true,
}).extend({
  scheduledDate: z.coerce.date(),
});

export type InsertScheduledTask = z.infer<typeof insertScheduledTaskSchema>;
export type ScheduledTask = typeof scheduledTasks.$inferSelect;

export const operationLogTypes = ["automacao", "dispositivo", "tarefa", "sistema", "usuario"] as const;
export type OperationLogType = (typeof operationLogTypes)[number];

// Operation Logs - Logs de operação do sistema
export const operationLogs = pgTable("operation_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  condominiumId: varchar("condominium_id").notNull().references(() => condominiums.id),
  logType: text("log_type").notNull(), // automacao, dispositivo, tarefa, sistema
  action: text("action").notNull(),
  description: text("description"),
  entityType: text("entity_type"), // automation_rule, scheduled_task, iot_device
  entityId: varchar("entity_id"),
  status: text("status").notNull().default("sucesso"), // sucesso, falha, aviso
  errorMessage: text("error_message"),
  executedBy: varchar("executed_by"), // user or system
  executedAt: timestamp("executed_at").defaultNow(),
  duration: integer("duration"), // in milliseconds
  metadata: text("metadata"), // JSON additional data
});

export const insertOperationLogSchema = createInsertSchema(operationLogs).omit({
  id: true,
  executedAt: true,
});

export type InsertOperationLog = z.infer<typeof insertOperationLogSchema>;
export type OperationLog = typeof operationLogs.$inferSelect;

// ===========================
// SISTEMA DE ALERTAS INTELIGENTES
// ===========================

export const alertSeverities = ["info", "baixo", "medio", "alto", "critico"] as const;
export type AlertSeverity = (typeof alertSeverities)[number];

export const alertCategories = [
  "vencimento_contrato",
  "vencimento_documento",
  "vencimento_seguro",
  "manutencao_pendente",
  "orcamento_excedido",
  "score_baixo",
  "conformidade_legal",
  "financeiro",
  "governanca",
] as const;
export type AlertCategory = (typeof alertCategories)[number];

// Smart Alerts - Alertas inteligentes da IA
export const smartAlerts = pgTable("smart_alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  condominiumId: varchar("condominium_id").notNull().references(() => condominiums.id),
  pillar: text("pillar").notNull(),
  category: text("category").notNull(),
  severity: text("severity").notNull().default("baixo"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  suggestedAction: text("suggested_action"),
  relatedEntityId: varchar("related_entity_id"),
  relatedEntityType: text("related_entity_type"),
  financialImpact: real("financial_impact"),
  isResolved: boolean("is_resolved").notNull().default(false),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: varchar("resolved_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSmartAlertSchema = createInsertSchema(smartAlerts).omit({
  id: true,
  createdAt: true,
  resolvedAt: true,
}).extend({
  financialImpact: z.coerce.number().optional().nullable(),
});

export type InsertSmartAlert = z.infer<typeof insertSmartAlertSchema>;
export type SmartAlert = typeof smartAlerts.$inferSelect;

// Audit Log - Histórico de ações para preservação do legado
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  condominiumId: varchar("condominium_id").notNull().references(() => condominiums.id),
  userId: varchar("user_id"),
  userName: text("user_name"),
  action: text("action").notNull(), // create, update, delete
  entityType: text("entity_type").notNull(), // decision, contract, budget, etc
  entityId: varchar("entity_id"),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

// Team Members - Equipe do condomínio
export const teamMemberRoles = ["zelador", "porteiro", "faxineiro", "jardineiro", "técnico", "administrativo", "segurança", "outro"] as const;
export type TeamMemberRole = (typeof teamMemberRoles)[number];

export const teamMemberStatuses = ["ativo", "inativo", "férias", "afastado"] as const;
export type TeamMemberStatus = (typeof teamMemberStatuses)[number];

export const teamMembers = pgTable("team_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  condominiumId: varchar("condominium_id").notNull().references(() => condominiums.id),
  name: text("name").notNull(),
  cpf: text("cpf"),
  role: text("role").notNull(),
  department: text("department"),
  phone: text("phone"),
  whatsapp: text("whatsapp"),
  email: text("email"),
  photo: text("photo"),
  workSchedule: text("work_schedule"),
  hireDate: timestamp("hire_date"),
  status: text("status").notNull().default("ativo"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  hireDate: z.coerce.date().optional().nullable(),
});

export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type TeamMember = typeof teamMembers.$inferSelect;

// Processes - Processos e rotinas do condomínio
export const processCategories = ["limpeza", "segurança", "manutenção", "administrativo", "jardinagem", "piscina", "portaria", "outro"] as const;
export type ProcessCategory = (typeof processCategories)[number];

export const processFrequencies = ["diário", "semanal", "quinzenal", "mensal", "trimestral", "semestral", "anual", "sob demanda"] as const;
export type ProcessFrequency = (typeof processFrequencies)[number];

export const processes = pgTable("processes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  condominiumId: varchar("condominium_id").notNull().references(() => condominiums.id),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  frequency: text("frequency").notNull(),
  assignedToId: varchar("assigned_to_id").references(() => teamMembers.id),
  checklistItems: text("checklist_items").array(),
  blocks: text("blocks").array(),
  floors: text("floors").array(),
  equipmentIds: text("equipment_ids").array(),
  executionScript: text("execution_script"),
  estimatedDuration: integer("estimated_duration"),
  isActive: boolean("is_active").notNull().default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertProcessSchema = createInsertSchema(processes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  estimatedDuration: z.coerce.number().optional().nullable(),
});

export type InsertProcess = z.infer<typeof insertProcessSchema>;
export type Process = typeof processes.$inferSelect;

// Process Executions - Execuções de processos
export const processExecutionStatuses = ["pendente", "em andamento", "concluído", "cancelado"] as const;
export type ProcessExecutionStatus = (typeof processExecutionStatuses)[number];

export const processExecutions = pgTable("process_executions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  condominiumId: varchar("condominium_id").notNull().references(() => condominiums.id),
  processId: varchar("process_id").notNull().references(() => processes.id),
  executedById: varchar("executed_by_id").references(() => teamMembers.id),
  scheduledDate: timestamp("scheduled_date").notNull(),
  executedDate: timestamp("executed_date"),
  status: text("status").notNull().default("pendente"),
  checklistCompleted: text("checklist_completed").array(),
  duration: integer("duration"),
  photos: text("photos").array(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertProcessExecutionSchema = createInsertSchema(processExecutions).omit({
  id: true,
  createdAt: true,
}).extend({
  scheduledDate: z.coerce.date(),
  executedDate: z.coerce.date().optional().nullable(),
  duration: z.coerce.number().optional().nullable(),
});

export type InsertProcessExecution = z.infer<typeof insertProcessExecutionSchema>;
export type ProcessExecution = typeof processExecutions.$inferSelect;

// Parcels - Encomendas e entregas
export const parcelStatuses = ["aguardando", "notificado", "retirado", "devolvido"] as const;
export type ParcelStatus = (typeof parcelStatuses)[number];

export const parcelTypes = ["carta", "pacote", "caixa", "envelope", "outros"] as const;
export type ParcelType = (typeof parcelTypes)[number];

export const parcels = pgTable("parcels", {
  id: uuid("id").primaryKey().defaultRandom(),
  condominiumId: uuid("condominium_id").notNull().references(() => condominiums.id),
  unit: text("unit").notNull(),
  recipientName: text("recipient_name").notNull(),
  senderName: text("sender_name"),
  carrier: text("carrier"),
  trackingCode: text("tracking_code"),
  type: text("type").notNull().$type<ParcelType>(),
  status: text("status").notNull().$type<ParcelStatus>().default("aguardando"),
  receivedAt: timestamp("received_at").notNull().defaultNow(),
  receivedBy: text("received_by").notNull(),
  notifiedAt: timestamp("notified_at"),
  pickedUpAt: timestamp("picked_up_at"),
  pickedUpBy: text("picked_up_by"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertParcelSchema = createInsertSchema(parcels).omit({
  id: true,
  condominiumId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  condominiumId: z.string().optional(),
  receivedAt: z.coerce.date().optional(),
  notifiedAt: z.coerce.date().optional().nullable(),
  pickedUpAt: z.coerce.date().optional().nullable(),
});

export type InsertParcel = z.infer<typeof insertParcelSchema>;
export type Parcel = typeof parcels.$inferSelect;

// Moradores - Cadastro de Proprietários e Moradores
export const tipoMoradorOptions = ["proprietario", "inquilino", "dependente"] as const;
export type TipoMorador = (typeof tipoMoradorOptions)[number];

export const statusMoradorOptions = ["ativo", "inativo"] as const;
export type StatusMorador = (typeof statusMoradorOptions)[number];

export const perfilAcessoOptions = ["morador", "sindico", "conselheiro", "administrador"] as const;
export type PerfilAcesso = (typeof perfilAcessoOptions)[number];

export const canalPreferidoOptions = ["whatsapp", "email", "app"] as const;
export type CanalPreferido = (typeof canalPreferidoOptions)[number];

export const moradores = pgTable("moradores", {
  id: uuid("id").primaryKey().defaultRandom(),
  condominiumId: varchar("condominium_id").notNull(),
  nomeCompleto: text("nome_completo").notNull(),
  cpf: text("cpf").notNull(),
  dataNascimento: text("data_nascimento"),
  email: text("email"),
  telefone: text("telefone"),
  tipoMorador: text("tipo_morador").notNull().$type<TipoMorador>(),
  status: text("status").notNull().$type<StatusMorador>().default("ativo"),
  unidadeId: text("unidade_id"),
  bloco: text("bloco"),
  torre: text("torre"),
  unidade: text("unidade"),
  inicioOcupacao: text("inicio_ocupacao"),
  fimOcupacao: text("fim_ocupacao"),
  responsavelFinanceiro: boolean("responsavel_financeiro").default(false),
  perfilAcesso: text("perfil_acesso").$type<PerfilAcesso>().default("morador"),
  canalPreferido: text("canal_preferido").$type<CanalPreferido>().default("whatsapp"),
  contatoEmergenciaNome: text("contato_emergencia_nome"),
  contatoEmergenciaTelefone: text("contato_emergencia_telefone"),
  numeroHabitantes: integer("numero_habitantes").default(1),
  temPet: boolean("tem_pet").default(false),
  tipoPet: text("tipo_pet"),
  quantidadePets: integer("quantidade_pets").default(0),
  observacoes: text("observacoes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMoradorSchema = createInsertSchema(moradores).omit({
  id: true,
  condominiumId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  condominiumId: z.string().optional(),
  nomeCompleto: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  cpf: z.string().min(11, "CPF inválido").max(14),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  telefone: z.string().optional(),
});

export type InsertMorador = z.infer<typeof insertMoradorSchema>;
export type Morador = typeof moradores.$inferSelect;

// ========== MARKETPLACE DE SERVICOS ==========

// Categorias de Servicos
export const categoriasServicos = pgTable("categorias_servicos", {
  id: uuid("id").primaryKey().defaultRandom(),
  condominiumId: uuid("condominium_id").notNull().references(() => condominiums.id),
  nome: text("nome").notNull(),
  descricao: text("descricao"),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCategoriaServicoSchema = createInsertSchema(categoriasServicos).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCategoriaServico = z.infer<typeof insertCategoriaServicoSchema>;
export type CategoriaServico = typeof categoriasServicos.$inferSelect;

// Tipos de Servico
export const tipoServicoOptions = ["veiculo", "pet", "limpeza", "manutencao", "pessoal", "geral"] as const;
export type TipoServico = (typeof tipoServicoOptions)[number];

// Servicos
export const servicos = pgTable("servicos", {
  id: uuid("id").primaryKey().defaultRandom(),
  condominiumId: uuid("condominium_id").notNull().references(() => condominiums.id),
  categoriaId: uuid("categoria_id").notNull().references(() => categoriasServicos.id),
  nome: text("nome").notNull(),
  descricao: text("descricao"),
  tipoServico: text("tipo_servico").notNull().$type<TipoServico>().default("geral"),
  requisitos: text("requisitos"),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertServicoSchema = createInsertSchema(servicos).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertServico = z.infer<typeof insertServicoSchema>;
export type Servico = typeof servicos.$inferSelect;

// Status de Aprovacao do Fornecedor
export const statusAprovacaoFornecedorOptions = ["pendente", "aprovado", "bloqueado"] as const;
export type StatusAprovacaoFornecedor = (typeof statusAprovacaoFornecedorOptions)[number];

// Fornecedores
export const fornecedoresMarketplace = pgTable("fornecedores_marketplace", {
  id: uuid("id").primaryKey().defaultRandom(),
  condominiumId: uuid("condominium_id").notNull().references(() => condominiums.id),
  nomeFantasia: text("nome_fantasia").notNull(),
  razaoSocial: text("razao_social"),
  cnpj: text("cnpj"),
  telefone: text("telefone"),
  email: text("email"),
  whatsapp: text("whatsapp"),
  descricao: text("descricao"),
  avaliacaoMedia: real("avaliacao_media").default(0),
  totalAvaliacoes: integer("total_avaliacoes").default(0),
  statusAprovacao: text("status_aprovacao").$type<StatusAprovacaoFornecedor>().default("pendente"),
  motivoBloqueio: text("motivo_bloqueio"),
  userId: uuid("user_id"),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertFornecedorMarketplaceSchema = createInsertSchema(fornecedoresMarketplace).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFornecedorMarketplace = z.infer<typeof insertFornecedorMarketplaceSchema>;
export type FornecedorMarketplace = typeof fornecedoresMarketplace.$inferSelect;

// Unidade de Preco
export const unidadePrecoOptions = ["avulso", "mensal", "semanal", "anual"] as const;
export type UnidadePreco = (typeof unidadePrecoOptions)[number];

// Ofertas
export const ofertas = pgTable("ofertas", {
  id: uuid("id").primaryKey().defaultRandom(),
  condominiumId: uuid("condominium_id").notNull().references(() => condominiums.id),
  servicoId: uuid("servico_id").notNull().references(() => servicos.id),
  fornecedorId: uuid("fornecedor_id").notNull().references(() => fornecedoresMarketplace.id),
  titulo: text("titulo").notNull(),
  descricao: text("descricao"),
  precoBase: real("preco_base"),
  recorrente: boolean("recorrente").default(false),
  unidadePreco: text("unidade_preco").$type<UnidadePreco>().default("avulso"),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertOfertaSchema = createInsertSchema(ofertas).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertOferta = z.infer<typeof insertOfertaSchema>;
export type Oferta = typeof ofertas.$inferSelect;

// Status de Contratacao
export const statusContratacaoOptions = ["solicitado", "aceito", "em_execucao", "concluido", "cancelado"] as const;
export type StatusContratacao = (typeof statusContratacaoOptions)[number];

// Contratacoes
export const contratacoes = pgTable("contratacoes", {
  id: uuid("id").primaryKey().defaultRandom(),
  condominiumId: uuid("condominium_id").notNull().references(() => condominiums.id),
  moradorId: uuid("morador_id").notNull().references(() => moradores.id),
  ofertaId: uuid("oferta_id").notNull().references(() => ofertas.id),
  status: text("status").notNull().$type<StatusContratacao>().default("solicitado"),
  dataSolicitacao: timestamp("data_solicitacao").defaultNow(),
  dataAceite: timestamp("data_aceite"),
  dataConclusao: timestamp("data_conclusao"),
  avaliacao: integer("avaliacao"),
  comentarioAvaliacao: text("comentario_avaliacao"),
  observacoes: text("observacoes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertContratacaoSchema = createInsertSchema(contratacoes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertContratacao = z.infer<typeof insertContratacaoSchema>;
export type Contratacao = typeof contratacoes.$inferSelect;

// ========== AVALIACOES ==========

export const avaliacoes = pgTable("avaliacoes", {
  id: uuid("id").primaryKey().defaultRandom(),
  condominiumId: uuid("condominium_id").notNull().references(() => condominiums.id),
  contratacaoId: uuid("contratacao_id").notNull().references(() => contratacoes.id),
  fornecedorId: uuid("fornecedor_id").notNull().references(() => fornecedoresMarketplace.id),
  moradorId: uuid("morador_id").notNull().references(() => moradores.id),
  nota: integer("nota").notNull(),
  comentario: text("comentario"),
  resposta: text("resposta"),
  dataAvaliacao: timestamp("data_avaliacao").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAvaliacaoSchema = createInsertSchema(avaliacoes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAvaliacao = z.infer<typeof insertAvaliacaoSchema>;
export type Avaliacao = typeof avaliacoes.$inferSelect;

// ========== VEICULOS DOS MORADORES ==========

export const tipoVeiculoOptions = ["carro", "moto", "bicicleta", "outro"] as const;
export type TipoVeiculo = (typeof tipoVeiculoOptions)[number];

export const veiculos = pgTable("veiculos", {
  id: uuid("id").primaryKey().defaultRandom(),
  condominiumId: uuid("condominium_id").notNull().references(() => condominiums.id),
  moradorId: uuid("morador_id").notNull().references(() => moradores.id),
  tipoVeiculo: text("tipo_veiculo").notNull().$type<TipoVeiculo>(),
  marca: text("marca"),
  modelo: text("modelo"),
  cor: text("cor"),
  placa: text("placa"),
  anoFabricacao: text("ano_fabricacao"),
  vagaEstacionamento: text("vaga_estacionamento"),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertVeiculoSchema = createInsertSchema(veiculos).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertVeiculo = z.infer<typeof insertVeiculoSchema>;
export type Veiculo = typeof veiculos.$inferSelect;

// ========== TAXAS E PAGAMENTOS (MAINTENANCE FEES & PAYMENTS) ==========

export const tipoTaxaOptions = ["ordinaria", "extraordinaria", "multa", "reserva", "outro"] as const;
export type TipoTaxa = (typeof tipoTaxaOptions)[number];

export const statusCobrancaOptions = ["pendente", "pago", "atrasado", "cancelado", "parcial"] as const;
export type StatusCobranca = (typeof statusCobrancaOptions)[number];

export const statusPagamentoOptions = ["pendente", "processando", "confirmado", "falhou", "estornado"] as const;
export type StatusPagamento = (typeof statusPagamentoOptions)[number];

export const taxasCondominio = pgTable("taxas_condominio", {
  id: uuid("id").primaryKey().defaultRandom(),
  condominiumId: varchar("condominium_id").notNull().references(() => condominiums.id),
  nome: text("nome").notNull(),
  descricao: text("descricao"),
  tipo: text("tipo").notNull().$type<TipoTaxa>().default("ordinaria"),
  valorPadrao: real("valor_padrao").notNull(),
  diaVencimento: integer("dia_vencimento").default(10),
  recorrente: boolean("recorrente").notNull().default(true),
  ativo: boolean("ativo").notNull().default(true),
  stripePriceId: text("stripe_price_id"),
  stripeProductId: text("stripe_product_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTaxaCondominioSchema = createInsertSchema(taxasCondominio).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTaxaCondominio = z.infer<typeof insertTaxaCondominioSchema>;
export type TaxaCondominio = typeof taxasCondominio.$inferSelect;

export const cobrancas = pgTable("cobrancas", {
  id: uuid("id").primaryKey().defaultRandom(),
  condominiumId: varchar("condominium_id").notNull().references(() => condominiums.id),
  taxaId: uuid("taxa_id").references(() => taxasCondominio.id),
  moradorId: uuid("morador_id").references(() => moradores.id),
  unidade: text("unidade"),
  bloco: text("bloco"),
  descricao: text("descricao").notNull(),
  valor: real("valor").notNull(),
  dataVencimento: timestamp("data_vencimento").notNull(),
  competencia: text("competencia"),
  status: text("status").notNull().$type<StatusCobranca>().default("pendente"),
  valorPago: real("valor_pago").default(0),
  dataPagamento: timestamp("data_pagamento"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  stripeCheckoutSessionId: text("stripe_checkout_session_id"),
  observacoes: text("observacoes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCobrancaSchema = createInsertSchema(cobrancas).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCobranca = z.infer<typeof insertCobrancaSchema>;
export type Cobranca = typeof cobrancas.$inferSelect;

export const pagamentos = pgTable("pagamentos", {
  id: uuid("id").primaryKey().defaultRandom(),
  condominiumId: varchar("condominium_id").notNull().references(() => condominiums.id),
  cobrancaId: uuid("cobranca_id").references(() => cobrancas.id),
  moradorId: uuid("morador_id").references(() => moradores.id),
  userId: varchar("user_id").references(() => users.id),
  valor: real("valor").notNull(),
  metodoPagamento: text("metodo_pagamento"),
  status: text("status").notNull().$type<StatusPagamento>().default("pendente"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  stripeCheckoutSessionId: text("stripe_checkout_session_id"),
  stripeCustomerId: text("stripe_customer_id"),
  comprovante: text("comprovante"),
  observacoes: text("observacoes"),
  processadoEm: timestamp("processado_em"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPagamentoSchema = createInsertSchema(pagamentos).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPagamento = z.infer<typeof insertPagamentoSchema>;
export type Pagamento = typeof pagamentos.$inferSelect;

// ========== GESTÃO DE LOCAÇÕES (RENTAL MANAGEMENT - AIRBNB) ==========

export const tipoLocacaoOptions = ["airbnb", "temporada", "longa_duracao", "outros"] as const;
export type TipoLocacao = (typeof tipoLocacaoOptions)[number];

export const statusHospedagemOptions = ["reservado", "em_andamento", "finalizado", "cancelado"] as const;
export type StatusHospedagem = (typeof statusHospedagemOptions)[number];

export const hospedagens = pgTable("hospedagens", {
  id: uuid("id").primaryKey().defaultRandom(),
  condominiumId: varchar("condominium_id").notNull().references(() => condominiums.id),
  unidade: text("unidade").notNull(),
  bloco: text("bloco"),
  tipoLocacao: text("tipo_locacao").notNull().$type<TipoLocacao>().default("airbnb"),
  nomeHospede: text("nome_hospede").notNull(),
  telefoneHospede: text("telefone_hospede"),
  emailHospede: text("email_hospede"),
  documentoHospede: text("documento_hospede"),
  nacionalidade: text("nacionalidade"),
  quantidadeHospedes: integer("quantidade_hospedes").default(1),
  dataCheckIn: timestamp("data_check_in").notNull(),
  dataCheckOut: timestamp("data_check_out").notNull(),
  horaCheckIn: text("hora_check_in").default("14:00"),
  horaCheckOut: text("hora_check_out").default("11:00"),
  placaVeiculo: text("placa_veiculo"),
  modeloVeiculo: text("modelo_veiculo"),
  corVeiculo: text("cor_veiculo"),
  observacoes: text("observacoes"),
  status: text("status").notNull().$type<StatusHospedagem>().default("reservado"),
  proprietarioId: varchar("proprietario_id").references(() => users.id),
  nomeProprietario: text("nome_proprietario"),
  telefoneProprietario: text("telefone_proprietario"),
  boasVindasEnviadas: boolean("boas_vindas_enviadas").default(false),
  dataEnvioBoasVindas: timestamp("data_envio_boas_vindas"),
  mensagemPersonalizada: text("mensagem_personalizada"),
  urlVideoExplicativo: text("url_video_explicativo"),
  urlRegimentoInterno: text("url_regimento_interno"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertHospedagemSchema = createInsertSchema(hospedagens, {
  dataCheckIn: z.coerce.date(),
  dataCheckOut: z.coerce.date(),
  dataEnvioBoasVindas: z.coerce.date().optional().nullable(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertHospedagem = z.infer<typeof insertHospedagemSchema>;
export type Hospedagem = typeof hospedagens.$inferSelect;

// Condominium settings for welcome messages
export const configuracoesLocacao = pgTable("configuracoes_locacao", {
  id: uuid("id").primaryKey().defaultRandom(),
  condominiumId: varchar("condominium_id").notNull().references(() => condominiums.id).unique(),
  horarioSilencio: text("horario_silencio").default("22h às 8h"),
  horarioPiscina: text("horario_piscina").default("8h às 22h"),
  horarioAcademia: text("horario_academia").default("6h às 22h"),
  horarioSalaoDeFestas: text("horario_salao_festas"),
  diasColetaLixo: text("dias_coleta_lixo").default("Segunda, Quarta e Sexta"),
  regrasImportantes: text("regras_importantes"),
  contatoPortaria: text("contato_portaria"),
  contatoSindico: text("contato_sindico"),
  contatoEmergencia: text("contato_emergencia"),
  dicasPraticas: text("dicas_praticas"),
  mensagemPadrao: text("mensagem_padrao"),
  urlVideoExplicativoPadrao: text("url_video_explicativo_padrao"),
  urlRegimentoInternoPadrao: text("url_regimento_interno_padrao"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertConfiguracoesLocacaoSchema = createInsertSchema(configuracoesLocacao).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertConfiguracoesLocacao = z.infer<typeof insertConfiguracoesLocacaoSchema>;
export type ConfiguracoesLocacao = typeof configuracoesLocacao.$inferSelect;

// ========== MARKETPLACE ==========

export const statusFornecedorOptions = ["pendente", "aprovado", "rejeitado", "suspenso"] as const;
export type StatusFornecedor = (typeof statusFornecedorOptions)[number];

export const tipoPrecoOptions = ["fixo", "hora", "orcamento", "negociavel"] as const;
export type TipoPreco = (typeof tipoPrecoOptions)[number];

export const statusContratacaoOptions = ["solicitado", "confirmado", "em_execucao", "concluido", "cancelado"] as const;
export type StatusContratacao = (typeof statusContratacaoOptions)[number];

// Marketplace Categories
export const marketplaceCategorias = pgTable("marketplace_categorias", {
  id: uuid("id").primaryKey().defaultRandom(),
  nome: text("nome").notNull(),
  descricao: text("descricao"),
  icone: text("icone"),
  ativo: boolean("ativo").default(true),
  ordem: integer("ordem").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMarketplaceCategoriaSchema = createInsertSchema(marketplaceCategorias).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMarketplaceCategoria = z.infer<typeof insertMarketplaceCategoriaSchema>;
export type MarketplaceCategoria = typeof marketplaceCategorias.$inferSelect;

// Marketplace Fornecedores (Providers)
export const marketplaceFornecedores = pgTable("marketplace_fornecedores", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  condominiumId: varchar("condominium_id").notNull().references(() => condominiums.id),
  nomeComercial: text("nome_comercial").notNull(),
  descricao: text("descricao"),
  telefone: text("telefone"),
  whatsapp: text("whatsapp"),
  email: text("email"),
  endereco: text("endereco"),
  documento: text("documento"),
  status: text("status").notNull().$type<StatusFornecedor>().default("pendente"),
  avaliacaoMedia: real("avaliacao_media").default(0),
  totalAvaliacoes: integer("total_avaliacoes").default(0),
  aprovadoPor: uuid("aprovado_por"),
  aprovadoEm: timestamp("aprovado_em"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMarketplaceFornecedorSchema = createInsertSchema(marketplaceFornecedores).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  aprovadoEm: true,
});

export type InsertMarketplaceFornecedor = z.infer<typeof insertMarketplaceFornecedorSchema>;
export type MarketplaceFornecedor = typeof marketplaceFornecedores.$inferSelect;

// Marketplace Services (Types of services)
export const marketplaceServicos = pgTable("marketplace_servicos", {
  id: uuid("id").primaryKey().defaultRandom(),
  categoriaId: uuid("categoria_id").references(() => marketplaceCategorias.id),
  nome: text("nome").notNull(),
  descricao: text("descricao"),
  ativo: boolean("ativo").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMarketplaceServicoSchema = createInsertSchema(marketplaceServicos).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMarketplaceServico = z.infer<typeof insertMarketplaceServicoSchema>;
export type MarketplaceServico = typeof marketplaceServicos.$inferSelect;

// Marketplace Ofertas (Offers from providers)
export const marketplaceOfertas = pgTable("marketplace_ofertas", {
  id: uuid("id").primaryKey().defaultRandom(),
  fornecedorId: uuid("fornecedor_id").notNull().references(() => marketplaceFornecedores.id),
  servicoId: uuid("servico_id").references(() => marketplaceServicos.id),
  condominiumId: varchar("condominium_id").notNull().references(() => condominiums.id),
  titulo: text("titulo").notNull(),
  descricao: text("descricao"),
  preco: real("preco"),
  tipoPreco: text("tipo_preco").$type<TipoPreco>().default("fixo"),
  disponivel: boolean("disponivel").default(true),
  destaque: boolean("destaque").default(false),
  imagemUrl: text("imagem_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMarketplaceOfertaSchema = createInsertSchema(marketplaceOfertas).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMarketplaceOferta = z.infer<typeof insertMarketplaceOfertaSchema>;
export type MarketplaceOferta = typeof marketplaceOfertas.$inferSelect;

// Marketplace Contratações (Hiring/Bookings)
export const marketplaceContratacoes = pgTable("marketplace_contratacoes", {
  id: uuid("id").primaryKey().defaultRandom(),
  ofertaId: uuid("oferta_id").references(() => marketplaceOfertas.id),
  fornecedorId: uuid("fornecedor_id").notNull().references(() => marketplaceFornecedores.id),
  moradorId: uuid("morador_id").notNull(),
  condominiumId: varchar("condominium_id").notNull().references(() => condominiums.id),
  status: text("status").notNull().$type<StatusContratacao>().default("solicitado"),
  valor: real("valor"),
  observacoes: text("observacoes"),
  dataAgendada: timestamp("data_agendada"),
  dataConclusao: timestamp("data_conclusao"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMarketplaceContratacaoSchema = createInsertSchema(marketplaceContratacoes, {
  dataAgendada: z.coerce.date().optional().nullable(),
  dataConclusao: z.coerce.date().optional().nullable(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMarketplaceContratacao = z.infer<typeof insertMarketplaceContratacaoSchema>;
export type MarketplaceContratacao = typeof marketplaceContratacoes.$inferSelect;

// Marketplace Avaliações (Reviews)
export const marketplaceAvaliacoes = pgTable("marketplace_avaliacoes", {
  id: uuid("id").primaryKey().defaultRandom(),
  contratacaoId: uuid("contratacao_id").notNull().references(() => marketplaceContratacoes.id),
  fornecedorId: uuid("fornecedor_id").notNull().references(() => marketplaceFornecedores.id),
  moradorId: uuid("morador_id").notNull(),
  nota: integer("nota").notNull(),
  comentario: text("comentario"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMarketplaceAvaliacaoSchema = createInsertSchema(marketplaceAvaliacoes).omit({
  id: true,
  createdAt: true,
});

export type InsertMarketplaceAvaliacao = z.infer<typeof insertMarketplaceAvaliacaoSchema>;
export type MarketplaceAvaliacao = typeof marketplaceAvaliacoes.$inferSelect;

// Marketplace Comissões (Commissions)
export const marketplaceComissoes = pgTable("marketplace_comissoes", {
  id: uuid("id").primaryKey().defaultRandom(),
  condominiumId: varchar("condominium_id").notNull().references(() => condominiums.id),
  categoriaId: uuid("categoria_id").references(() => marketplaceCategorias.id),
  percentual: real("percentual").default(0),
  valorFixo: real("valor_fixo").default(0),
  ativo: boolean("ativo").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMarketplaceComissaoSchema = createInsertSchema(marketplaceComissoes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMarketplaceComissao = z.infer<typeof insertMarketplaceComissaoSchema>;
export type MarketplaceComissao = typeof marketplaceComissoes.$inferSelect;
