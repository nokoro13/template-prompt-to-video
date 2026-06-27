import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let _client: S3Client | null = null;

export function isR2Configured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID?.trim() &&
      process.env.R2_ACCESS_KEY_ID?.trim() &&
      process.env.R2_SECRET_ACCESS_KEY?.trim() &&
      process.env.R2_BUCKET_NAME?.trim(),
  );
}

function getR2Endpoint(): string {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  if (!accountId) {
    throw new Error("R2_ACCOUNT_ID is not set");
  }
  return `https://${accountId}.r2.cloudflarestorage.com`;
}

export function getR2Client(): S3Client {
  if (!_client) {
    _client = new S3Client({
      region: "auto",
      endpoint: getR2Endpoint(),
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
  }
  return _client;
}

export function getR2BucketName(): string {
  const bucket = process.env.R2_BUCKET_NAME?.trim();
  if (!bucket) {
    throw new Error("R2_BUCKET_NAME is not set");
  }
  return bucket;
}

/** Public base URL for assets (R2 custom domain or r2.dev). */
export function getR2PublicBaseUrl(): string | null {
  const url = process.env.R2_PUBLIC_BASE_URL?.trim();
  return url ? url.replace(/\/$/, "") : null;
}

export function buildProjectStoragePrefix(userId: string, slug: string): string {
  return `users/${userId}/projects/${slug}`;
}

export async function uploadToR2(options: {
  key: string;
  body: Buffer | Uint8Array | string;
  contentType: string;
}): Promise<void> {
  const client = getR2Client();
  await client.send(
    new PutObjectCommand({
      Bucket: getR2BucketName(),
      Key: options.key,
      Body: options.body,
      ContentType: options.contentType,
    }),
  );
}

export async function getFromR2(key: string): Promise<Buffer | null> {
  const client = getR2Client();
  try {
    const res = await client.send(
      new GetObjectCommand({
        Bucket: getR2BucketName(),
        Key: key,
      }),
    );
    if (!res.Body) return null;
    const bytes = await res.Body.transformToByteArray();
    return Buffer.from(bytes);
  } catch {
    return null;
  }
}

export async function deleteFromR2(key: string): Promise<void> {
  const client = getR2Client();
  await client.send(
    new DeleteObjectCommand({
      Bucket: getR2BucketName(),
      Key: key,
    }),
  );
}

/** Presigned URL for private bucket reads (expires in 1 hour by default). */
export async function getR2SignedReadUrl(
  key: string,
  expiresInSeconds = 3600,
  options?: { downloadFileName?: string },
): Promise<string> {
  const client = getR2Client();
  const downloadFileName = options?.downloadFileName?.trim();
  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: getR2BucketName(),
      Key: key,
      ...(downloadFileName
        ? {
            ResponseContentDisposition: `attachment; filename="${downloadFileName.replace(/"/g, "")}"`,
            ResponseContentType: "video/mp4",
          }
        : {}),
    }),
    { expiresIn: expiresInSeconds },
  );
}

export async function getR2ObjectStream(
  key: string,
): Promise<{
  body: ReadableStream<Uint8Array>;
  contentType: string;
  contentLength: number | undefined;
} | null> {
  const client = getR2Client();
  try {
    const res = await client.send(
      new GetObjectCommand({
        Bucket: getR2BucketName(),
        Key: key,
      }),
    );
    if (!res.Body) return null;
    return {
      body: res.Body.transformToWebStream(),
      contentType: res.ContentType ?? "video/mp4",
      contentLength: res.ContentLength,
    };
  } catch {
    return null;
  }
}

export function getR2PublicUrl(key: string): string | null {
  const base = getR2PublicBaseUrl();
  if (!base) return null;
  return `${base}/${key.replace(/^\//, "")}`;
}
