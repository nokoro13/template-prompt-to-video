import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { buildRenderStorageKey, storageApiUrl } from "../storage/assets";
import { useDatabaseStorage, useR2Storage } from "../storage/constants";
import { uploadToR2 } from "../storage/r2";
import { patchRenderJob } from "./render-jobs";

export function startRemotionRenderJob(options: {
  jobId: string;
  compositionId: string;
  aspectRatio: "9:16" | "16:9";
  projectRoot: string;
  userId?: string;
}): void {
  const { jobId, compositionId, aspectRatio, projectRoot, userId } = options;

  const rendersDir = path.join(projectRoot, "public", "renders");
  fs.mkdirSync(rendersDir, { recursive: true });

  const outputFile = `${jobId}.mp4`;
  const outputPath = path.join(rendersDir, outputFile);
  const propsPath = path.join(os.tmpdir(), `remotion-props-${jobId}.json`);

  fs.writeFileSync(
    propsPath,
    JSON.stringify({ aspectRatio }),
    "utf8",
  );

  patchRenderJob(jobId, {
    status: "running",
    startedAt: Date.now(),
  });

  const proc = spawn(
    "npx",
    [
      "remotion",
      "render",
      "src/index.ts",
      compositionId,
      outputPath,
      "--props",
      propsPath,
    ],
    {
      cwd: projectRoot,
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env },
    },
  );

  let stderr = "";
  proc.stderr?.on("data", (chunk: Buffer) => {
    stderr += chunk.toString();
  });

  proc.on("error", (err) => {
    patchRenderJob(jobId, {
      status: "error",
      completedAt: Date.now(),
      error: err.message,
    });
    try {
      fs.unlinkSync(propsPath);
    } catch {
      /* ignore */
    }
  });

  proc.on("close", (code) => {
    try {
      fs.unlinkSync(propsPath);
    } catch {
      /* ignore */
    }

    if (code === 0 && fs.existsSync(outputPath)) {
      void (async () => {
        let outputUrl = `/renders/${outputFile}`;
        if (useDatabaseStorage() && userId && useR2Storage()) {
          try {
            const key = buildRenderStorageKey(userId, jobId);
            await uploadToR2({
              key,
              body: fs.readFileSync(outputPath),
              contentType: "video/mp4",
            });
            outputUrl = storageApiUrl(key);
          } catch {
            /* keep local /renders URL */
          }
        }
        patchRenderJob(jobId, {
          status: "complete",
          completedAt: Date.now(),
          outputUrl,
        });
      })();
      return;
    }

    patchRenderJob(jobId, {
      status: "error",
      completedAt: Date.now(),
      error:
        stderr.trim().slice(-2000) ||
        `Render exited with code ${code ?? "unknown"}`,
    });
  });
}
