/**
 * One-time migration: import legacy disk styles/projects into Neon + R2.
 *
 * Usage:
 *   DATABASE_URL=... R2_*=... tsx scripts/migrate-disk-to-storage.ts <clerk-user-id>
 */
import * as fs from "fs";
import * as path from "path";

import { insertProject } from "../lib/db/projects";
import { insertStyle } from "../lib/db/styles";
import { ChannelStyleRecordSchema } from "../lib/channel-styles/types";
import { StylesIndexSchema } from "../lib/channel-styles/types";
import { buildProjectStoragePrefix, putAsset } from "../lib/storage/assets";
import { isR2Configured, uploadToR2 } from "../lib/storage/r2";
import { isDatabaseConfigured } from "../lib/db";

async function uploadTree(
  userId: string,
  localDir: string,
  storagePrefix: string,
): Promise<void> {
  if (!fs.existsSync(localDir)) return;

  const walk = (dir: string, rel = ""): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const entryRel = rel ? `${rel}/${entry.name}` : entry.name;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full, entryRel);
      } else if (entry.isFile()) {
        const body = fs.readFileSync(full);
        const key = `${storagePrefix}/${entryRel}`;
        if (isR2Configured()) {
          void uploadToR2({
            key,
            body,
            contentType: "application/octet-stream",
          });
        }
        void putAsset({
          storageKey: isR2Configured() ? key : undefined,
          publicRelativePath: full.replace(path.join(process.cwd(), "public") + path.sep, "").replace(/\\/g, "/"),
          body,
        });
      }
    }
  };

  walk(localDir);
}

async function main() {
  const userId = process.argv[2]?.trim();
  if (!userId) {
    console.error("Usage: tsx scripts/migrate-disk-to-storage.ts <clerk-user-id>");
    process.exit(1);
  }
  if (!isDatabaseConfigured()) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  const stylesIndexPath = path.join(process.cwd(), "public", "channel-styles", "index.json");
  if (fs.existsSync(stylesIndexPath)) {
    const raw = fs.readFileSync(stylesIndexPath, "utf8");
    const index = StylesIndexSchema.parse(JSON.parse(raw));
    for (const record of Object.values(index.styles)) {
      const parsed = ChannelStyleRecordSchema.parse(record);
      await insertStyle(userId, parsed, isR2Configured());
      const styleDir = path.join(process.cwd(), "public", "channel-styles", parsed.id);
      await uploadTree(
        userId,
        styleDir,
        `users/${userId}/styles/${parsed.id}`,
      );
      console.log(`Migrated style: ${parsed.id}`);
    }
  }

  const contentRoot = path.join(process.cwd(), "public", "content");
  if (fs.existsSync(contentRoot)) {
    for (const dirent of fs.readdirSync(contentRoot, { withFileTypes: true })) {
      if (!dirent.isDirectory()) continue;
      const slug = dirent.name;
      const timelinePath = path.join(contentRoot, slug, "timeline.json");
      const descriptorPath = path.join(contentRoot, slug, "descriptor.json");
      if (!fs.existsSync(descriptorPath)) continue;

      const descriptor = JSON.parse(
        fs.readFileSync(descriptorPath, "utf8"),
      ) as { shortTitle?: string; channelStyleId?: string };
      const title = descriptor.shortTitle ?? slug;

      await insertProject({
        userId,
        slug,
        title,
        styleId: descriptor.channelStyleId,
        status: fs.existsSync(timelinePath) ? "ready" : "draft",
      });

      await uploadTree(
        userId,
        path.join(contentRoot, slug),
        buildProjectStoragePrefix(userId, slug),
      );
      console.log(`Migrated project: ${slug}`);
    }
  }

  console.log("Migration complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
