import { currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";

import { getDb, schema } from "@/lib/db";

export type DbUser = typeof schema.users.$inferSelect;

/** Upsert the signed-in Clerk user into Postgres. */
export async function ensureUser(clerkUserId: string): Promise<DbUser> {
  const clerk = await currentUser();
  if (!clerk || clerk.id !== clerkUserId) {
    throw new Error("Clerk user mismatch while syncing to database");
  }

  const email =
    clerk.emailAddresses.find((e) => e.id === clerk.primaryEmailAddressId)
      ?.emailAddress ??
    clerk.emailAddresses[0]?.emailAddress ??
    "";

  if (!email) {
    throw new Error("Signed-in user has no email address");
  }

  const db = getDb();
  const now = new Date();
  const name =
    [clerk.firstName, clerk.lastName].filter(Boolean).join(" ").trim() ||
    clerk.username ||
    null;

  const [row] = await db
    .insert(schema.users)
    .values({
      id: clerkUserId,
      email,
      name,
      imageUrl: clerk.imageUrl,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: schema.users.id,
      set: {
        email,
        name,
        imageUrl: clerk.imageUrl,
        updatedAt: now,
      },
    })
    .returning();

  return row;
}

export async function getUserById(userId: string): Promise<DbUser | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);
  return rows[0] ?? null;
}
