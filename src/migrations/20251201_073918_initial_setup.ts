import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_subscriptions_status" AS ENUM('active', 'inactive', 'cancelled', 'expired', 'pending');
  CREATE TYPE "public"."enum_meetings_status" AS ENUM('scheduled', 'active', 'completed', 'cancelled');
  CREATE TYPE "public"."enum_invoices_currency" AS ENUM('USD', 'EUR', 'VND');
  CREATE TYPE "public"."enum_invoices_status" AS ENUM('draft', 'pending', 'paid', 'failed', 'refunded', 'cancelled');
  CREATE TYPE "public"."enum_plans_currency" AS ENUM('USD', 'EUR', 'VND');
  CREATE TYPE "public"."enum_plans_billing_period" AS ENUM('monthly', 'quarterly', 'yearly');
  CREATE TYPE "public"."enum_plans_status" AS ENUM('active', 'inactive', 'archived');
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "customers_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "customers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"email_verified_at" timestamp(3) with time zone,
  	"phone" varchar,
  	"avatar_id" integer,
  	"organization" varchar,
  	"organization_description" varchar,
  	"secret_key" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "subscriptions_usage_history" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"month" varchar NOT NULL,
  	"rooms_created" numeric DEFAULT 0,
  	"total_minutes" numeric DEFAULT 0,
  	"participants_count" numeric DEFAULT 0
  );
  
  CREATE TABLE "subscriptions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"customer_id" integer NOT NULL,
  	"plan_id" integer NOT NULL,
  	"start_date" timestamp(3) with time zone NOT NULL,
  	"end_date" timestamp(3) with time zone NOT NULL,
  	"status" "enum_subscriptions_status" DEFAULT 'pending',
  	"auto_renew" boolean DEFAULT true,
  	"current_period_start" timestamp(3) with time zone,
  	"current_period_end" timestamp(3) with time zone,
  	"cancel_at_period_end" boolean DEFAULT false,
  	"monthly_usage_month" varchar,
  	"monthly_usage_rooms_created" numeric DEFAULT 0,
  	"monthly_usage_total_minutes" numeric DEFAULT 0,
  	"monthly_usage_participants_count" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "meetings_users" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"email" varchar NOT NULL
  );
  
  CREATE TABLE "meetings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"customer_id" integer NOT NULL,
  	"subscription_id" integer NOT NULL,
  	"name" varchar NOT NULL,
  	"moodle_course_id" varchar,
  	"moodle_user_email" varchar,
  	"flat_room_id" varchar,
  	"flat_room_link" varchar,
  	"start_time" varchar NOT NULL,
  	"end_time" varchar NOT NULL,
  	"duration" numeric,
  	"participants_count" numeric DEFAULT 0,
  	"status" "enum_meetings_status" DEFAULT 'scheduled',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "invoices_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"description" varchar NOT NULL,
  	"amount" numeric NOT NULL,
  	"quantity" numeric DEFAULT 1 NOT NULL
  );
  
  CREATE TABLE "invoices" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"invoice_number" varchar NOT NULL,
  	"customer_id" integer NOT NULL,
  	"subscription_id" integer NOT NULL,
  	"plan_id" integer NOT NULL,
  	"amount" numeric NOT NULL,
  	"currency" "enum_invoices_currency" DEFAULT 'USD' NOT NULL,
  	"status" "enum_invoices_status" DEFAULT 'draft' NOT NULL,
  	"billing_period_start" timestamp(3) with time zone NOT NULL,
  	"billing_period_end" timestamp(3) with time zone NOT NULL,
  	"due_date" timestamp(3) with time zone NOT NULL,
  	"paid_date" timestamp(3) with time zone,
  	"subtotal" numeric NOT NULL,
  	"tax_amount" numeric DEFAULT 0,
  	"total_amount" numeric NOT NULL,
  	"notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "plans" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"description" varchar,
  	"price" numeric NOT NULL,
  	"currency" "enum_plans_currency" DEFAULT 'USD' NOT NULL,
  	"billing_period" "enum_plans_billing_period" DEFAULT 'monthly' NOT NULL,
  	"max_rooms_per_month" numeric DEFAULT 10 NOT NULL,
  	"max_minutes_per_month" numeric DEFAULT 600 NOT NULL,
  	"max_participants" numeric DEFAULT 50 NOT NULL,
  	"max_duration" numeric DEFAULT 60 NOT NULL,
  	"recording_storage" numeric DEFAULT 1,
  	"max_concurrent_rooms" numeric DEFAULT 1,
  	"whiteboard" boolean DEFAULT true,
  	"status" "enum_plans_status" DEFAULT 'active',
  	"sort_order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"media_id" integer,
  	"customers_id" integer,
  	"subscriptions_id" integer,
  	"meetings_id" integer,
  	"invoices_id" integer,
  	"plans_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"customers_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "customers_sessions" ADD CONSTRAINT "customers_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "customers" ADD CONSTRAINT "customers_avatar_id_media_id_fk" FOREIGN KEY ("avatar_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "subscriptions_usage_history" ADD CONSTRAINT "subscriptions_usage_history_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "meetings_users" ADD CONSTRAINT "meetings_users_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "meetings" ADD CONSTRAINT "meetings_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "meetings" ADD CONSTRAINT "meetings_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "invoices_items" ADD CONSTRAINT "invoices_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "invoices" ADD CONSTRAINT "invoices_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "invoices" ADD CONSTRAINT "invoices_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_customers_fk" FOREIGN KEY ("customers_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_subscriptions_fk" FOREIGN KEY ("subscriptions_id") REFERENCES "public"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_meetings_fk" FOREIGN KEY ("meetings_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_invoices_fk" FOREIGN KEY ("invoices_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_plans_fk" FOREIGN KEY ("plans_id") REFERENCES "public"."plans"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_customers_fk" FOREIGN KEY ("customers_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "customers_sessions_order_idx" ON "customers_sessions" USING btree ("_order");
  CREATE INDEX "customers_sessions_parent_id_idx" ON "customers_sessions" USING btree ("_parent_id");
  CREATE INDEX "customers_avatar_idx" ON "customers" USING btree ("avatar_id");
  CREATE UNIQUE INDEX "customers_secret_key_idx" ON "customers" USING btree ("secret_key");
  CREATE INDEX "customers_updated_at_idx" ON "customers" USING btree ("updated_at");
  CREATE INDEX "customers_created_at_idx" ON "customers" USING btree ("created_at");
  CREATE UNIQUE INDEX "customers_email_idx" ON "customers" USING btree ("email");
  CREATE INDEX "subscriptions_usage_history_order_idx" ON "subscriptions_usage_history" USING btree ("_order");
  CREATE INDEX "subscriptions_usage_history_parent_id_idx" ON "subscriptions_usage_history" USING btree ("_parent_id");
  CREATE INDEX "subscriptions_customer_idx" ON "subscriptions" USING btree ("customer_id");
  CREATE INDEX "subscriptions_plan_idx" ON "subscriptions" USING btree ("plan_id");
  CREATE INDEX "subscriptions_updated_at_idx" ON "subscriptions" USING btree ("updated_at");
  CREATE INDEX "subscriptions_created_at_idx" ON "subscriptions" USING btree ("created_at");
  CREATE INDEX "meetings_users_order_idx" ON "meetings_users" USING btree ("_order");
  CREATE INDEX "meetings_users_parent_id_idx" ON "meetings_users" USING btree ("_parent_id");
  CREATE INDEX "meetings_customer_idx" ON "meetings" USING btree ("customer_id");
  CREATE INDEX "meetings_subscription_idx" ON "meetings" USING btree ("subscription_id");
  CREATE INDEX "meetings_updated_at_idx" ON "meetings" USING btree ("updated_at");
  CREATE INDEX "meetings_created_at_idx" ON "meetings" USING btree ("created_at");
  CREATE INDEX "invoices_items_order_idx" ON "invoices_items" USING btree ("_order");
  CREATE INDEX "invoices_items_parent_id_idx" ON "invoices_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "invoices_invoice_number_idx" ON "invoices" USING btree ("invoice_number");
  CREATE INDEX "invoices_customer_idx" ON "invoices" USING btree ("customer_id");
  CREATE INDEX "invoices_subscription_idx" ON "invoices" USING btree ("subscription_id");
  CREATE INDEX "invoices_plan_idx" ON "invoices" USING btree ("plan_id");
  CREATE INDEX "invoices_updated_at_idx" ON "invoices" USING btree ("updated_at");
  CREATE INDEX "invoices_created_at_idx" ON "invoices" USING btree ("created_at");
  CREATE UNIQUE INDEX "plans_name_idx" ON "plans" USING btree ("name");
  CREATE UNIQUE INDEX "plans_slug_idx" ON "plans" USING btree ("slug");
  CREATE INDEX "plans_updated_at_idx" ON "plans" USING btree ("updated_at");
  CREATE INDEX "plans_created_at_idx" ON "plans" USING btree ("created_at");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_customers_id_idx" ON "payload_locked_documents_rels" USING btree ("customers_id");
  CREATE INDEX "payload_locked_documents_rels_subscriptions_id_idx" ON "payload_locked_documents_rels" USING btree ("subscriptions_id");
  CREATE INDEX "payload_locked_documents_rels_meetings_id_idx" ON "payload_locked_documents_rels" USING btree ("meetings_id");
  CREATE INDEX "payload_locked_documents_rels_invoices_id_idx" ON "payload_locked_documents_rels" USING btree ("invoices_id");
  CREATE INDEX "payload_locked_documents_rels_plans_id_idx" ON "payload_locked_documents_rels" USING btree ("plans_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_preferences_rels_customers_id_idx" ON "payload_preferences_rels" USING btree ("customers_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "customers_sessions" CASCADE;
  DROP TABLE "customers" CASCADE;
  DROP TABLE "subscriptions_usage_history" CASCADE;
  DROP TABLE "subscriptions" CASCADE;
  DROP TABLE "meetings_users" CASCADE;
  DROP TABLE "meetings" CASCADE;
  DROP TABLE "invoices_items" CASCADE;
  DROP TABLE "invoices" CASCADE;
  DROP TABLE "plans" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TYPE "public"."enum_subscriptions_status";
  DROP TYPE "public"."enum_meetings_status";
  DROP TYPE "public"."enum_invoices_currency";
  DROP TYPE "public"."enum_invoices_status";
  DROP TYPE "public"."enum_plans_currency";
  DROP TYPE "public"."enum_plans_billing_period";
  DROP TYPE "public"."enum_plans_status";`)
}
