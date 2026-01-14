import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, real } from "drizzle-orm/pg-core";
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

export const userRoles = ["condômino", "síndico", "admin"] as const;
export type UserRole = (typeof userRoles)[number];

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default("condômino"),
  name: text("name").notNull(),
  unit: text("unit"),
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
  userId: varchar("user_id").notNull(),
  condominiumId: varchar("condominium_id").notNull(),
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
  condominiumId: varchar("condominium_id"),
  name: text("name").notNull(),
  category: text("category").notNull(),
  location: text("location").notNull(),
  description: text("description"),
  icon: text("icon"),
  photos: text("photos").array(),
  status: text("status").notNull().default("operacional"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertEquipmentSchema = createInsertSchema(equipment).omit({
  id: true,
  createdAt: true,
});

export type InsertEquipment = z.infer<typeof insertEquipmentSchema>;
export type Equipment = typeof equipment.$inferSelect;

export const maintenanceStatuses = ["aberto", "em andamento", "concluído"] as const;
export type MaintenanceStatus = (typeof maintenanceStatuses)[number];

export const maintenanceRequests = pgTable("maintenance_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  condominiumId: varchar("condominium_id"),
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
  condominiumId: varchar("condominium_id"),
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
  condominiumId: varchar("condominium_id"),
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
  condominiumId: varchar("condominium_id"),
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
  condominiumId: varchar("condominium_id"),
  reservoirId: varchar("reservoir_id"),
  tankLevel: real("tank_level").notNull(),
  quality: text("quality").notNull().default("boa"),
  volumeAvailable: real("volume_available").notNull().default(0),
  estimatedAutonomy: real("estimated_autonomy"),
  casanStatus: text("casan_status").default("normal"),
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
  condominiumId: varchar("condominium_id"),
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
  condominiumId: varchar("condominium_id"),
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
  condominiumId: varchar("condominium_id"),
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
  condominiumId: varchar("condominium_id"),
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
  condominiumId: varchar("condominium_id"),
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
  condominiumId: varchar("condominium_id"),
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
});

export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type Supplier = typeof suppliers.$inferSelect;

export const announcements = pgTable("announcements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  condominiumId: varchar("condominium_id"),
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
  condominiumId: varchar("condominium_id"),
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
] as const;

export type ModuleKey = typeof MODULE_KEYS[number];

export const wasteConfig = pgTable("waste_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  condominiumId: varchar("condominium_id"),
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
  condominiumId: varchar("condominium_id"),
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
  condominiumId: varchar("condominium_id"),
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
  condominiumId: varchar("condominium_id"),
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
  condominiumId: varchar("condominium_id"),
  assetId: varchar("asset_id").notNull(),
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
  condominiumId: varchar("condominium_id"),
  planId: varchar("plan_id"),
  assetId: varchar("asset_id").notNull(),
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
