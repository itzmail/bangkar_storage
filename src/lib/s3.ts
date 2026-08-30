import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/lib/env";

/**
 * S3-compatible client (works for both AWS S3 and MinIO).
 *
 * - `forcePathStyle: true` is required for MinIO.
 * - `region` is required by the SDK even though MinIO ignores it.
 */
export const s3 = new S3Client({
  region: env.S3_REGION,
  endpoint: env.S3_ENDPOINT,
  forcePathStyle: env.S3_FORCE_PATH_STYLE,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
  },
});

export const BUCKET = env.S3_BUCKET;

/**
 * Rewrite a presigned URL so browsers hit the public endpoint while the
 * server itself talks to the internal endpoint (S3_ENDPOINT). Presigned
 * signatures are host-independent (path + query signed), so swapping the
 * origin keeps the URL valid.
 */
function toPublicUrl(url: string): string {
  const publicEndpoint = env.S3_PUBLIC_ENDPOINT;
  if (!publicEndpoint) return url;
  try {
    const u = new URL(url);
    const p = new URL(publicEndpoint);
    u.protocol = p.protocol;
    u.host = p.host;
    u.port = p.port;
    return u.toString();
  } catch {
    return url;
  }
}

/** Ensures the target bucket exists. Safe to call repeatedly. */
export async function ensureBucket(): Promise<void> {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: BUCKET }));
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: BUCKET }));
  }
}

const PRESIGNED_URL_TTL_SECONDS = 15 * 60; // 15 minutes per PRD §4.1

export interface PresignedPut {
  url: string;
  key: string;
  expiresIn: number;
}

/**
 * Sign a direct-to-storage PUT URL.
 * Caller is responsible for:
 *  - validating quota & MIME type beforehand
 *  - building a sanitized key via `buildStorageKey`
 */
export async function createPresignedPutUrl(
  key: string,
  contentType: string,
): Promise<PresignedPut> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });
  const url = await getSignedUrl(s3, command, {
    expiresIn: PRESIGNED_URL_TTL_SECONDS,
  });
  return { url: toPublicUrl(url), key, expiresIn: PRESIGNED_URL_TTL_SECONDS };
}

export interface PresignedGet {
  url: string;
  expiresIn: number;
}

/**
 * Sign a time-limited GET URL for downloading.
 * The caller is expected to set the OWASP headers (Content-Disposition,
 * X-Content-Type-Options) when issuing the actual response.
 */
export async function createPresignedGetUrl(
  key: string,
  downloadFilename: string,
  ttlSeconds = PRESIGNED_URL_TTL_SECONDS,
): Promise<PresignedGet> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ResponseContentDisposition: `attachment; filename="${sanitizeForHeader(
      downloadFilename,
    )}"`,
    ResponseContentType: "application/octet-stream",
  });
  const url = await getSignedUrl(s3, command, { expiresIn: ttlSeconds });
  return { url: toPublicUrl(url), expiresIn: ttlSeconds };
}

/**
 * Sanitize a filename for use inside the storage key path.
 * Strips directory components, control chars, and non-ASCII separators.
 */
export function buildStorageKey(userId: string, originalName: string): string {
  if (/^\.\.|[/\\]\.\.([/\\]|$)/.test(originalName)) {
    throw new Error("Invalid filename: path traversal not allowed");
  }
  const safe = sanitizeForHeader(originalName).slice(0, 200);
  return `uploads/${userId}/${crypto.randomUUID()}-${safe}`;
}

export function sanitizeForHeader(input: string): string {
  // Strip path separators, quotes, control chars. Keep Unicode word chars.
  return input
    .replace(/[\\/\u0000-\u001f\u007f"']/g, "_")
    .replace(/^\.+/, "_")
    .trim();
}
