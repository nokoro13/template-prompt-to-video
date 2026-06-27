/** Fixed Remotion composition id for Lambda exports (timeline passed via inputProps). */
export const CLIPNG_EXPORT_COMPOSITION_ID = "ClipngExport";

export type AwsRegion = "us-east-1" | "us-east-2" | "us-west-1" | "us-west-2" | "eu-central-1" | "eu-west-1" | "eu-west-2" | "ap-southeast-1" | "ap-northeast-1";

export function getRemotionAwsCredentials(): {
  accessKeyId: string;
  secretAccessKey: string;
} | null {
  const accessKeyId =
    process.env.REMOTION_AWS_ACCESS_KEY_ID?.trim() ||
    process.env.AWS_ACCESS_KEY_ID?.trim();
  const secretAccessKey =
    process.env.REMOTION_AWS_SECRET_ACCESS_KEY?.trim() ||
    process.env.AWS_SECRET_ACCESS_KEY?.trim();
  if (!accessKeyId || !secretAccessKey) return null;
  return { accessKeyId, secretAccessKey };
}

export function getRemotionLambdaRegion(): string {
  return (
    process.env.REMOTION_AWS_REGION?.trim() ||
    process.env.AWS_REGION?.trim() ||
    "us-east-1"
  );
}

export function getRemotionFunctionName(): string | null {
  const name = process.env.REMOTION_FUNCTION_NAME?.trim();
  return name || null;
}

export function getRemotionServeUrl(): string | null {
  const url = process.env.REMOTION_SERVE_URL?.trim();
  return url || null;
}

export function isRemotionLambdaConfigured(): boolean {
  return Boolean(
    getRemotionAwsCredentials() &&
      getRemotionFunctionName() &&
      getRemotionServeUrl(),
  );
}

export function requireRemotionLambdaConfig(): {
  credentials: { accessKeyId: string; secretAccessKey: string };
  region: string;
  functionName: string;
  serveUrl: string;
} {
  const credentials = getRemotionAwsCredentials();
  const functionName = getRemotionFunctionName();
  const serveUrl = getRemotionServeUrl();
  if (!credentials || !functionName || !serveUrl) {
    throw new Error(
      "Remotion Lambda is not configured. Set REMOTION_AWS_ACCESS_KEY_ID, REMOTION_AWS_SECRET_ACCESS_KEY, REMOTION_FUNCTION_NAME, REMOTION_SERVE_URL, and REMOTION_AWS_REGION.",
    );
  }
  return {
    credentials,
    region: getRemotionLambdaRegion(),
    functionName,
    serveUrl,
  };
}
