import { NextResponse } from "next/server";

import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { requireUser } from "@/lib/auth/require-user";
import { getProjectForUser } from "@/lib/db/projects";
import { getStyleForUser } from "@/lib/db/styles";
import { getAsset } from "@/lib/storage/assets";
import { isDatabaseStorageEnabled } from "@/lib/storage/constants";

type RouteContext = { params: Promise<{ path: string[] }> };

function contentTypeForKey(key: string): string {
  if (key.endsWith(".png")) return "image/png";
  if (key.endsWith(".jpg") || key.endsWith(".jpeg")) return "image/jpeg";
  if (key.endsWith(".webp")) return "image/webp";
  if (key.endsWith(".mp3")) return "audio/mpeg";
  if (key.endsWith(".mp4")) return "video/mp4";
  if (key.endsWith(".json")) return "application/json";
  if (key.endsWith(".txt")) return "text/plain; charset=utf-8";
  return "application/octet-stream";
}

async function assertUserOwnsStorageKey(
  userId: string,
  key: string,
): Promise<boolean> {
  const prefix = `users/${userId}/`;
  if (!key.startsWith(prefix)) return false;

  const rest = key.slice(prefix.length);
  if (rest.startsWith("projects/")) {
    const parts = rest.split("/");
    const slug = parts[1];
    if (!slug) return false;
    const project = await getProjectForUser(userId, slug);
    return project !== null;
  }

  if (rest.startsWith("styles/")) {
    const parts = rest.split("/");
    const styleId = parts[1];
    if (!styleId) return false;
    const style = await getStyleForUser(userId, styleId);
    return style !== null;
  }

  if (rest.startsWith("renders/")) {
    return true;
  }

  return false;
}

export async function GET(_req: Request, context: RouteContext) {
  try {
    const user = await requireUser();
    if (!isDatabaseStorageEnabled()) {
      return NextResponse.json(
        { error: "Storage API requires DATABASE_URL" },
        { status: 503 },
      );
    }

    const { path: segments } = await context.params;
    const key = segments.join("/");

    if (!(await assertUserOwnsStorageKey(user.id, key))) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const buf = await getAsset({ storageKey: key });
    if (!buf) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": contentTypeForKey(key),
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    return handleAuthError(err);
  }
}
