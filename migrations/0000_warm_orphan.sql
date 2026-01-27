CREATE TABLE "announcements" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condominium_id" varchar NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"photos" text[],
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"expires_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condominium_id" varchar NOT NULL,
	"user_id" varchar,
	"user_name" text,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" varchar,
	"old_value" text,
	"new_value" text,
	"ip_address" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "automation_rules" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condominium_id" varchar NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"trigger_type" text NOT NULL,
	"trigger_config" text,
	"action_type" text NOT NULL,
	"action_config" text,
	"target_device_id" varchar,
	"is_active" boolean DEFAULT true NOT NULL,
	"priority" integer DEFAULT 1 NOT NULL,
	"last_executed_at" timestamp,
	"execution_count" integer DEFAULT 0 NOT NULL,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "budgets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condominium_id" varchar NOT NULL,
	"year" integer NOT NULL,
	"month" integer,
	"category" text NOT NULL,
	"planned_amount" real DEFAULT 0 NOT NULL,
	"actual_amount" real DEFAULT 0,
	"notes" text,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "condominiums" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"city" text,
	"state" text,
	"zip_code" text,
	"phone" text,
	"email" text,
	"total_units" integer,
	"logo" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contracts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condominium_id" varchar NOT NULL,
	"supplier_id" varchar,
	"title" text NOT NULL,
	"description" text,
	"category" text NOT NULL,
	"contract_number" text,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"monthly_value" real,
	"total_value" real,
	"adjustment_index" text,
	"adjustment_date" timestamp,
	"sla_description" text,
	"sla_response_time" integer,
	"payment_day" integer,
	"auto_renew" boolean DEFAULT false,
	"notify_days_before" integer DEFAULT 30,
	"status" text DEFAULT 'ativo' NOT NULL,
	"attachments" text[],
	"notes" text,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condominium_id" varchar NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"file_url" text,
	"expiration_date" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"uploaded_by" varchar
);
--> statement-breakpoint
CREATE TABLE "energy_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condominium_id" varchar NOT NULL,
	"status" text DEFAULT 'ok' NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now(),
	"resolved_at" timestamp,
	"recorded_by" varchar
);
--> statement-breakpoint
CREATE TABLE "equipment" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condominium_id" varchar NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"location" text NOT NULL,
	"description" text,
	"icon" text,
	"photos" text[],
	"documents" text[],
	"status" text DEFAULT 'operacional' NOT NULL,
	"manufacturer" text,
	"installation_date" timestamp,
	"estimated_lifespan" integer,
	"supplier_id" varchar,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "execution_checklist_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"execution_id" varchar NOT NULL,
	"item_description" text NOT NULL,
	"status" text DEFAULT 'não_verificado' NOT NULL,
	"observations" text,
	"photos" text[],
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "faqs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condominium_id" varchar NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"category" text DEFAULT 'geral' NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "financial_transactions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condominium_id" varchar NOT NULL,
	"type" text NOT NULL,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"amount" real NOT NULL,
	"transaction_date" timestamp NOT NULL,
	"due_date" timestamp,
	"payment_date" timestamp,
	"status" text DEFAULT 'pendente' NOT NULL,
	"supplier_id" varchar,
	"document_url" text,
	"invoice_number" text,
	"notes" text,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "gas_readings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condominium_id" varchar NOT NULL,
	"level" real NOT NULL,
	"percent_available" real NOT NULL,
	"photo" text,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"recorded_by" varchar
);
--> statement-breakpoint
CREATE TABLE "governance_decisions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condominium_id" varchar NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"decision_type" text NOT NULL,
	"decision_date" timestamp NOT NULL,
	"participants" text[],
	"votes_for" integer,
	"votes_against" integer,
	"votes_abstain" integer,
	"status" text DEFAULT 'aprovada' NOT NULL,
	"attachments" text[],
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "hydrometer_readings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condominium_id" varchar NOT NULL,
	"reading_value" real NOT NULL,
	"reading_date" timestamp NOT NULL,
	"photo" text,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"recorded_by" varchar
);
--> statement-breakpoint
CREATE TABLE "insurance_policies" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condominium_id" varchar NOT NULL,
	"policy_number" text NOT NULL,
	"insurance_company" text NOT NULL,
	"coverage_type" text NOT NULL,
	"coverage_amount" real NOT NULL,
	"premium" real NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"broker" text,
	"broker_phone" text,
	"broker_email" text,
	"document_url" text,
	"status" text DEFAULT 'ativo' NOT NULL,
	"notify_days_before" integer DEFAULT 30,
	"notes" text,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "iot_devices" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condominium_id" varchar NOT NULL,
	"device_id" text NOT NULL,
	"platform" text DEFAULT 'ewelink' NOT NULL,
	"name" text NOT NULL,
	"location" text,
	"category" text,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "iot_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"condominium_id" varchar NOT NULL,
	"session_key" text NOT NULL,
	"platform" text DEFAULT 'ewelink' NOT NULL,
	"email" text NOT NULL,
	"region" text DEFAULT 'us' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"expires_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "legal_checklist" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condominium_id" varchar NOT NULL,
	"item_type" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_mandatory" boolean DEFAULT true NOT NULL,
	"frequency" text NOT NULL,
	"last_completed_date" timestamp,
	"next_due_date" timestamp,
	"document_id" varchar,
	"responsible_name" text,
	"status" text DEFAULT 'pendente' NOT NULL,
	"notes" text,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "maintenance_completions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condominium_id" varchar NOT NULL,
	"equipment_id" varchar NOT NULL,
	"maintenance_request_id" varchar,
	"description" text NOT NULL,
	"location" text NOT NULL,
	"photos" text[],
	"performed_by" varchar,
	"performed_by_name" text,
	"completed_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "maintenance_documents" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"execution_id" varchar NOT NULL,
	"document_type" text NOT NULL,
	"file_name" text NOT NULL,
	"file_url" text NOT NULL,
	"notes" text,
	"uploaded_by" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "maintenance_executions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condominium_id" varchar NOT NULL,
	"plan_id" varchar,
	"equipment_id" varchar NOT NULL,
	"maintenance_type" text NOT NULL,
	"scheduled_date" timestamp NOT NULL,
	"executed_date" timestamp,
	"status" text DEFAULT 'pendente' NOT NULL,
	"responsible_name" text,
	"supplier_id" varchar,
	"cost" real,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "maintenance_plans" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condominium_id" varchar NOT NULL,
	"equipment_id" varchar NOT NULL,
	"name" text NOT NULL,
	"maintenance_type" text NOT NULL,
	"periodicity" text NOT NULL,
	"next_maintenance_date" timestamp NOT NULL,
	"last_maintenance_date" timestamp,
	"responsible_type" text DEFAULT 'interno' NOT NULL,
	"responsible_id" varchar,
	"responsible_name" text,
	"required_documents" text[],
	"estimated_cost" real,
	"is_active" boolean DEFAULT true NOT NULL,
	"alert_days_before" integer DEFAULT 7,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "maintenance_requests" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condominium_id" varchar NOT NULL,
	"equipment_id" varchar NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"photos" text[],
	"status" text DEFAULT 'aberto' NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"requested_by" varchar,
	"assigned_to" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "meeting_minutes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condominium_id" varchar NOT NULL,
	"title" text NOT NULL,
	"meeting_type" text NOT NULL,
	"meeting_date" timestamp NOT NULL,
	"location" text,
	"attendees_count" integer,
	"quorum_reached" boolean DEFAULT false,
	"summary" text,
	"full_content" text,
	"attachments" text[],
	"version" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'rascunho' NOT NULL,
	"published_by" varchar,
	"published_at" timestamp,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "module_permissions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condominium_id" varchar NOT NULL,
	"module_key" text NOT NULL,
	"module_label" text NOT NULL,
	"module_icon" text,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	"updated_by" varchar
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"condominium_id" varchar,
	"announcements" boolean DEFAULT true NOT NULL,
	"maintenance_updates" boolean DEFAULT true NOT NULL,
	"urgent_messages" boolean DEFAULT true NOT NULL,
	"quiet_hours_start" text,
	"quiet_hours_end" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condominium_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"related_id" varchar,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "occupancy_data" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condominium_id" varchar NOT NULL,
	"total_units" integer NOT NULL,
	"occupied_units" integer NOT NULL,
	"vacant_units" integer NOT NULL,
	"average_people_per_unit" real NOT NULL,
	"estimated_population" integer NOT NULL,
	"avg_water_consumption" real,
	"avg_gas_consumption" real,
	"avg_energy_consumption" real,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "operation_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condominium_id" varchar NOT NULL,
	"log_type" text NOT NULL,
	"action" text NOT NULL,
	"description" text,
	"entity_type" text,
	"entity_id" varchar,
	"status" text DEFAULT 'sucesso' NOT NULL,
	"error_message" text,
	"executed_by" varchar,
	"executed_at" timestamp DEFAULT now(),
	"duration" integer,
	"metadata" text
);
--> statement-breakpoint
CREATE TABLE "pillar_scores" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condominium_id" varchar NOT NULL,
	"pillar" text NOT NULL,
	"score" real DEFAULT 0 NOT NULL,
	"risk_level" text DEFAULT 'baixo' NOT NULL,
	"maturity_level" text DEFAULT 'iniciante' NOT NULL,
	"calculated_at" timestamp DEFAULT now(),
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "plan_checklist_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" varchar NOT NULL,
	"item_order" integer NOT NULL,
	"description" text NOT NULL,
	"is_mandatory" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pool_readings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condominium_id" varchar NOT NULL,
	"ph" real NOT NULL,
	"chlorine" real NOT NULL,
	"alkalinity" real NOT NULL,
	"calcium_hardness" real NOT NULL,
	"temperature" real NOT NULL,
	"photo" text,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"recorded_by" varchar
);
--> statement-breakpoint
CREATE TABLE "preventive_assets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condominium_id" varchar NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"location" text NOT NULL,
	"manufacturer" text,
	"installation_date" timestamp,
	"estimated_lifespan" integer,
	"status" text DEFAULT 'ativo' NOT NULL,
	"supplier_id" varchar,
	"photo" text,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"condominium_id" varchar,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"user_agent" text,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reservoirs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condominium_id" varchar NOT NULL,
	"name" text NOT NULL,
	"location" text NOT NULL,
	"capacity_liters" real NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "scheduled_tasks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condominium_id" varchar NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"task_type" text NOT NULL,
	"frequency" text DEFAULT 'unica' NOT NULL,
	"scheduled_date" timestamp NOT NULL,
	"scheduled_time" text,
	"days_of_week" text[],
	"day_of_month" integer,
	"assigned_to" varchar,
	"assigned_name" text,
	"status" text DEFAULT 'pendente' NOT NULL,
	"last_run_at" timestamp,
	"next_run_at" timestamp,
	"automation_rule_id" varchar,
	"notes" text,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "security_devices" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condominium_id" varchar NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"location" text NOT NULL,
	"brand" text,
	"model" text,
	"serial_number" text,
	"status" text DEFAULT 'operacional' NOT NULL,
	"last_maintenance_date" timestamp,
	"next_maintenance_date" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "security_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condominium_id" varchar NOT NULL,
	"device_id" varchar NOT NULL,
	"event_type" text NOT NULL,
	"description" text,
	"status" text NOT NULL,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"recorded_by" varchar
);
--> statement-breakpoint
CREATE TABLE "smart_alerts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condominium_id" varchar NOT NULL,
	"pillar" text NOT NULL,
	"category" text NOT NULL,
	"severity" text DEFAULT 'baixo' NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"suggested_action" text,
	"related_entity_id" varchar,
	"related_entity_type" text,
	"financial_impact" real,
	"is_resolved" boolean DEFAULT false NOT NULL,
	"resolved_at" timestamp,
	"resolved_by" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "succession_plans" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condominium_id" varchar NOT NULL,
	"current_sindico_id" varchar,
	"current_sindico_name" text,
	"mandate_start_date" timestamp,
	"mandate_end_date" timestamp,
	"successor_id" varchar,
	"successor_name" text,
	"transition_plan" text,
	"key_responsibilities" text[],
	"critical_contacts" text[],
	"pending_issues" text[],
	"status" text DEFAULT 'ativo' NOT NULL,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "supplier_evaluations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condominium_id" varchar NOT NULL,
	"supplier_id" varchar NOT NULL,
	"contract_id" varchar,
	"evaluation_date" timestamp NOT NULL,
	"quality_score" integer NOT NULL,
	"punctuality_score" integer NOT NULL,
	"price_score" integer NOT NULL,
	"communication_score" integer NOT NULL,
	"overall_score" real NOT NULL,
	"comments" text,
	"would_recommend" boolean,
	"evaluated_by" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condominium_id" varchar NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"icon" text,
	"phone" text,
	"whatsapp" text,
	"email" text,
	"address" text,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_condominiums" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"condominium_id" varchar NOT NULL,
	"role" text DEFAULT 'condômino' NOT NULL,
	"unit" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'condômino' NOT NULL,
	"name" text NOT NULL,
	"unit" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "waste_config" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condominium_id" varchar NOT NULL,
	"schedule" text NOT NULL,
	"organic_items" text NOT NULL,
	"recyclable_categories" text NOT NULL,
	"not_recyclable" text NOT NULL,
	"collection_time" text DEFAULT '07:00',
	"updated_at" timestamp DEFAULT now(),
	"updated_by" varchar
);
--> statement-breakpoint
CREATE TABLE "water_readings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condominium_id" varchar NOT NULL,
	"reservoir_id" varchar,
	"tank_level" real NOT NULL,
	"quality" text DEFAULT 'boa' NOT NULL,
	"volume_available" real DEFAULT 0 NOT NULL,
	"estimated_autonomy" real,
	"casan_status" text DEFAULT 'normal',
	"photo" text,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"recorded_by" varchar
);
--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "energy_events" ADD CONSTRAINT "energy_events_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faqs" ADD CONSTRAINT "faqs_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gas_readings" ADD CONSTRAINT "gas_readings_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "governance_decisions" ADD CONSTRAINT "governance_decisions_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hydrometer_readings" ADD CONSTRAINT "hydrometer_readings_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insurance_policies" ADD CONSTRAINT "insurance_policies_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iot_devices" ADD CONSTRAINT "iot_devices_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iot_sessions" ADD CONSTRAINT "iot_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iot_sessions" ADD CONSTRAINT "iot_sessions_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_checklist" ADD CONSTRAINT "legal_checklist_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_completions" ADD CONSTRAINT "maintenance_completions_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_executions" ADD CONSTRAINT "maintenance_executions_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_plans" ADD CONSTRAINT "maintenance_plans_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_minutes" ADD CONSTRAINT "meeting_minutes_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "module_permissions" ADD CONSTRAINT "module_permissions_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "occupancy_data" ADD CONSTRAINT "occupancy_data_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operation_logs" ADD CONSTRAINT "operation_logs_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pillar_scores" ADD CONSTRAINT "pillar_scores_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pool_readings" ADD CONSTRAINT "pool_readings_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preventive_assets" ADD CONSTRAINT "preventive_assets_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservoirs" ADD CONSTRAINT "reservoirs_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_tasks" ADD CONSTRAINT "scheduled_tasks_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_devices" ADD CONSTRAINT "security_devices_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smart_alerts" ADD CONSTRAINT "smart_alerts_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "succession_plans" ADD CONSTRAINT "succession_plans_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_evaluations" ADD CONSTRAINT "supplier_evaluations_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_evaluations" ADD CONSTRAINT "supplier_evaluations_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_condominiums" ADD CONSTRAINT "user_condominiums_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_condominiums" ADD CONSTRAINT "user_condominiums_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waste_config" ADD CONSTRAINT "waste_config_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "water_readings" ADD CONSTRAINT "water_readings_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE no action ON UPDATE no action;