import type { Express } from "express";
import { createServer, type Server } from "http";
import { createStorage } from "./supabase-storage";
import {
  insertEquipmentSchema,
  insertMaintenanceRequestSchema,
  insertPoolReadingSchema,
  insertReservoirSchema,
  insertWaterReadingSchema,
  insertGasReadingSchema,
  insertEnergyEventSchema,
  insertOccupancyDataSchema,
  insertDocumentSchema,
  insertSupplierSchema,
  insertAnnouncementSchema,
  insertUserSchema,
  updateUserSchema,
} from "@shared/schema";

import { supabase, isSupabaseConfigured } from "./supabase";

const storage = createStorage();

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

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
  
  app.get("/api/dashboard", async (req, res) => {
    try {
      const [equipment, requests, poolReadings, waterReadings, gasReadings, energyEvents, occupancy, documents, announcements] = await Promise.all([
        storage.getEquipment(),
        storage.getMaintenanceRequests(),
        storage.getPoolReadings(),
        storage.getWaterReadings(),
        storage.getGasReadings(),
        storage.getEnergyEvents(),
        storage.getOccupancyData(),
        storage.getDocuments(),
        storage.getAnnouncements(),
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

  // Users/Admin routes
  app.get("/api/users", async (req, res) => {
    try {
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
      const validatedData = updateUserSchema.parse(req.body);
      const user = await storage.updateUser(req.params.id, validatedData);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
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
      const equipment = await storage.getEquipment();
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
      const equipment = await storage.updateEquipment(req.params.id, req.body);
      if (!equipment) {
        return res.status(404).json({ error: "Equipment not found" });
      }
      res.json(equipment);
    } catch (error) {
      res.status(400).json({ error: "Failed to update equipment" });
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
      const requests = await storage.getMaintenanceRequests();
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
        
        await storage.createNotification({
          userId: request.requestedBy,
          type: "maintenance_update",
          title: `Chamado Atualizado: ${statusLabel}`,
          message: `Seu chamado "${request.title}" foi atualizado para "${statusLabel}".`,
          relatedId: request.id,
          isRead: false,
        });
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

  app.get("/api/pool", async (req, res) => {
    try {
      const readings = await storage.getPoolReadings();
      res.json(readings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch pool readings" });
    }
  });

  app.post("/api/pool", async (req, res) => {
    try {
      const validatedData = insertPoolReadingSchema.parse(req.body);
      const reading = await storage.createPoolReading(validatedData);
      res.status(201).json(reading);
    } catch (error) {
      res.status(400).json({ error: "Invalid pool reading data" });
    }
  });

  app.get("/api/reservoirs", async (req, res) => {
    try {
      const reservoirs = await storage.getReservoirs();
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
      const readings = await storage.getWaterReadings();
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

  app.get("/api/gas", async (req, res) => {
    try {
      const readings = await storage.getGasReadings();
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
      const events = await storage.getEnergyEvents();
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
      const data = await storage.getOccupancyData();
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
      const documents = await storage.getDocuments();
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
      const suppliers = await storage.getSuppliers();
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
      const validatedData = insertSupplierSchema.parse(req.body);
      const supplier = await storage.createSupplier(validatedData);
      res.status(201).json(supplier);
    } catch (error) {
      res.status(400).json({ error: "Invalid supplier data" });
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
      const announcements = await storage.getAnnouncements();
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
        await storage.createNotificationsForAllUsers({
          type: "announcement_new",
          title: "Novo Comunicado",
          message: announcement.title,
          relatedId: announcement.id,
          isRead: false,
        }, validatedData.createdBy || undefined);
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
        await storage.createNotificationsForAllUsers({
          type: "announcement_updated",
          title: "Comunicado Atualizado",
          message: announcement.title,
          relatedId: announcement.id,
          isRead: false,
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

  return httpServer;
}
