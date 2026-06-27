import {
  boolean,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/** Mirrors Clerk user id (user_xxx). */
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  name: text("name"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const projectStatusEnum = pgEnum("project_status", [
  "draft",
  "generating",
  "ready",
  "failed",
]);

export const renderJobStatusEnum = pgEnum("render_job_status", [
  "pending",
  "running",
  "complete",
  "error",
]);

/**
 * Video project metadata. Scene assets still live on disk/R2 under slug paths
 * during migration; this row owns the project for auth + listing.
 */
export const projects = pgTable(
  "projects",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    status: projectStatusEnum("status").default("draft").notNull(),
    styleId: text("style_id"),
    /** R2 key prefix, e.g. users/{userId}/projects/{slug}/ */
    storagePrefix: text("storage_prefix"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [uniqueIndex("projects_slug_unique").on(table.slug)],
);

/**
 * Channel style metadata. Full style payload stored as JSON until filesystem
 * migration completes; userId scopes ownership.
 */
export const styles = pgTable(
  "styles",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** ChannelStyleRecord-shaped JSON */
    data: jsonb("data").notNull(),
    migratedToR2: boolean("migrated_to_r2").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [uniqueIndex("styles_user_id_id_unique").on(table.userId, table.id)],
);

/** Remotion Lambda export jobs (MP4 download). */
export const renderJobs = pgTable("render_jobs", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  projectSlug: text("project_slug").notNull(),
  aspectRatio: text("aspect_ratio").notNull(),
  status: renderJobStatusEnum("status").default("pending").notNull(),
  remotionRenderId: text("remotion_render_id"),
  remotionBucketName: text("remotion_bucket_name"),
  /** R2 object key, e.g. users/{userId}/renders/{jobId}.mp4 */
  outputStorageKey: text("output_storage_key"),
  outputFileName: text("output_file_name"),
  error: text("error"),
  progress: real("progress").default(0).notNull(),
  /** Snapshot of project.updatedAt when export started (cache invalidation). */
  projectUpdatedAt: timestamp("project_updated_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Style = typeof styles.$inferSelect;
export type NewStyle = typeof styles.$inferInsert;
export type RenderJob = typeof renderJobs.$inferSelect;
export type NewRenderJob = typeof renderJobs.$inferInsert;
export type RenderJobStatus = RenderJob["status"];
