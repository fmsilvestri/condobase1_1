import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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
  name: text("name").notNull(),
  category: text("category").notNull(),
  location: text("location").notNull(),
  description: text("description"),
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

export const poolReadings = pgTable("pool_readings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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
});

export type InsertPoolReading = z.infer<typeof insertPoolReadingSchema>;
export type PoolReading = typeof poolReadings.$inferSelect;

export const waterReadings = pgTable("water_readings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tankLevel: real("tank_level").notNull(),
  quality: text("quality").notNull().default("boa"),
  volumeAvailable: real("volume_available").notNull(),
  estimatedAutonomy: real("estimated_autonomy"),
  casanStatus: text("casan_status").default("normal"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  recordedBy: varchar("recorded_by"),
});

export const insertWaterReadingSchema = createInsertSchema(waterReadings).omit({
  id: true,
  createdAt: true,
});

export type InsertWaterReading = z.infer<typeof insertWaterReadingSchema>;
export type WaterReading = typeof waterReadings.$inferSelect;

export const gasReadings = pgTable("gas_readings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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
  name: text("name").notNull(),
  category: text("category").notNull(),
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
  title: text("title").notNull(),
  content: text("content").notNull(),
  priority: text("priority").notNull().default("normal"),
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
