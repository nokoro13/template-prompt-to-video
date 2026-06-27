CREATE TYPE "public"."render_job_status" AS ENUM('pending', 'running', 'complete', 'error');--> statement-breakpoint
CREATE TABLE "render_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"project_slug" text NOT NULL,
	"aspect_ratio" text NOT NULL,
	"status" "render_job_status" DEFAULT 'pending' NOT NULL,
	"remotion_render_id" text,
	"remotion_bucket_name" text,
	"output_storage_key" text,
	"output_file_name" text,
	"error" text,
	"progress" real DEFAULT 0 NOT NULL,
	"project_updated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);--> statement-breakpoint
ALTER TABLE "render_jobs" ADD CONSTRAINT "render_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "render_jobs_user_slug_idx" ON "render_jobs" USING btree ("user_id","project_slug");
