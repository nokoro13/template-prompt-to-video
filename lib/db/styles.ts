import { and, eq } from "drizzle-orm";

import type { ChannelStyleRecord } from "@/lib/channel-styles/types";
import { ChannelStyleRecordSchema } from "@/lib/channel-styles/types";

import { getDb, schema } from "./index";

export type DbStyle = typeof schema.styles.$inferSelect;

export async function listStylesForUser(userId: string): Promise<ChannelStyleRecord[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.styles)
    .where(eq(schema.styles.userId, userId));

  return rows
    .map((row) => ChannelStyleRecordSchema.parse(row.data))
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}

export async function getStyleForUser(
  userId: string,
  styleId: string,
): Promise<ChannelStyleRecord | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.styles)
    .where(
      and(eq(schema.styles.userId, userId), eq(schema.styles.id, styleId)),
    )
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return ChannelStyleRecordSchema.parse(row.data);
}

export async function getStyleRowForUser(
  userId: string,
  styleId: string,
): Promise<DbStyle | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.styles)
    .where(
      and(eq(schema.styles.userId, userId), eq(schema.styles.id, styleId)),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function listStyleIdsForUser(userId: string): Promise<Set<string>> {
  const db = getDb();
  const rows = await db
    .select({ id: schema.styles.id })
    .from(schema.styles)
    .where(eq(schema.styles.userId, userId));
  return new Set(rows.map((r) => r.id));
}

export async function insertStyle(
  userId: string,
  record: ChannelStyleRecord,
  migratedToR2: boolean,
): Promise<ChannelStyleRecord> {
  const parsed = ChannelStyleRecordSchema.parse(record);
  const db = getDb();
  const now = new Date();
  await db.insert(schema.styles).values({
    id: parsed.id,
    userId,
    name: parsed.name,
    data: parsed,
    migratedToR2,
    createdAt: now,
    updatedAt: now,
  });
  return parsed;
}

export async function updateStyleData(
  userId: string,
  styleId: string,
  record: ChannelStyleRecord,
  migratedToR2?: boolean,
): Promise<ChannelStyleRecord> {
  const parsed = ChannelStyleRecordSchema.parse(record);
  const db = getDb();
  await db
    .update(schema.styles)
    .set({
      name: parsed.name,
      data: parsed,
      ...(migratedToR2 !== undefined ? { migratedToR2 } : {}),
      updatedAt: new Date(),
    })
    .where(
      and(eq(schema.styles.userId, userId), eq(schema.styles.id, styleId)),
    );
  return parsed;
}

export async function deleteStyleForUser(
  userId: string,
  styleId: string,
): Promise<void> {
  const db = getDb();
  await db
    .delete(schema.styles)
    .where(
      and(eq(schema.styles.userId, userId), eq(schema.styles.id, styleId)),
    );
}
