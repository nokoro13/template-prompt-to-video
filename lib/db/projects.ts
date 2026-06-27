import { randomUUID } from "node:crypto";

import { and, desc, eq } from "drizzle-orm";

import { buildProjectStoragePrefix } from "@/lib/storage/assets";
import { purgeExportsBeforeProjectRevision } from "@/lib/export/purge-project-exports";

import { getDb, schema } from "./index";

export type DbProject = typeof schema.projects.$inferSelect;
export type ProjectStatus = DbProject["status"];

export async function listProjectsForUser(userId: string): Promise<DbProject[]> {
  const db = getDb();
  return db
    .select()
    .from(schema.projects)
    .where(eq(schema.projects.userId, userId))
    .orderBy(desc(schema.projects.updatedAt));
}

export async function getProjectForUser(
  userId: string,
  slug: string,
): Promise<DbProject | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.projects)
    .where(
      and(eq(schema.projects.userId, userId), eq(schema.projects.slug, slug)),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function getProjectBySlug(slug: string): Promise<DbProject | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.projects)
    .where(eq(schema.projects.slug, slug))
    .limit(1);
  return rows[0] ?? null;
}

export async function insertProject(options: {
  userId: string;
  slug: string;
  title: string;
  styleId?: string;
  status?: ProjectStatus;
}): Promise<DbProject> {
  const db = getDb();
  const now = new Date();
  const storagePrefix = buildProjectStoragePrefix(options.userId, options.slug);
  const id = randomUUID();
  const [row] = await db
    .insert(schema.projects)
    .values({
      id,
      userId: options.userId,
      slug: options.slug,
      title: options.title,
      status: options.status ?? "draft",
      styleId: options.styleId ?? null,
      storagePrefix,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  return row;
}

export async function updateProject(
  userId: string,
  slug: string,
  patch: Partial<{
    title: string;
    status: ProjectStatus;
    styleId: string | null;
  }>,
): Promise<DbProject | null> {
  const db = getDb();
  const rows = await db
    .update(schema.projects)
    .set({ ...patch, updatedAt: new Date() })
    .where(
      and(eq(schema.projects.userId, userId), eq(schema.projects.slug, slug)),
    )
    .returning();
  const updated = rows[0] ?? null;
  if (updated) {
    await purgeExportsBeforeProjectRevision(userId, slug, updated.updatedAt);
  }
  return updated;
}

export async function deleteProjectForUser(
  userId: string,
  slug: string,
): Promise<void> {
  const { purgeProjectExportFiles } = await import(
    "@/lib/export/purge-project-exports"
  );
  await purgeProjectExportFiles(userId, slug);
  const db = getDb();
  await db
    .delete(schema.projects)
    .where(
      and(eq(schema.projects.userId, userId), eq(schema.projects.slug, slug)),
    );
}
