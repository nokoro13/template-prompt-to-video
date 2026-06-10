import {
  boolean,
  jsonb,
  pgEnum,
  pgTable,
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

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Style = typeof styles.$inferSelect;
export type NewStyle = typeof styles.$inferInsert;
