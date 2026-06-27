import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";

import { buildRenderStorageKey } from "../storage/assets";
import { uploadToR2 } from "../storage/r2";
import { getRemotionAwsCredentials, getRemotionLambdaRegion } from "./lambda-config";

function getS3Client(): S3Client {
  const credentials = getRemotionAwsCredentials();
  if (!credentials) {
    throw new Error("AWS credentials are not configured for Remotion Lambda.");
  }
  return new S3Client({
    region: getRemotionLambdaRegion(),
    credentials,
  });
}

/** Copy finished Lambda render from Remotion S3 bucket into user R2 storage. */
export async function copyLambdaRenderToR2(options: {
  userId: string;
  jobId: string;
  bucketName: string;
  outKey: string;
}): Promise<string> {
  const client = getS3Client();
  const res = await client.send(
    new GetObjectCommand({
      Bucket: options.bucketName,
      Key: options.outKey,
    }),
  );
  if (!res.Body) {
    throw new Error("Lambda render object is empty.");
  }
  const bytes = await res.Body.transformToByteArray();
  const storageKey = buildRenderStorageKey(options.userId, options.jobId);
  await uploadToR2({
    key: storageKey,
    body: Buffer.from(bytes),
    contentType: "video/mp4",
  });
  return storageKey;
}
