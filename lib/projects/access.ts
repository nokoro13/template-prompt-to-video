import { getProjectBySlug, getProjectForUser } from "@/lib/db/projects";
import { isDatabaseStorageEnabled } from "@/lib/storage/constants";

export async function assertProjectAccess(
  userId: string,
  slug: string,
): Promise<void> {
  if (!isDatabaseStorageEnabled()) return;
  const project = await getProjectForUser(userId, slug);
  if (!project) {
    throw new Error("Project not found");
  }
}

export async function getProjectOwnerId(slug: string): Promise<string | null> {
  if (!isDatabaseStorageEnabled()) return null;
  const project = await getProjectBySlug(slug);
  return project?.userId ?? null;
}
