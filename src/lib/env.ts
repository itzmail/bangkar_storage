import { z } from "zod";

/**
 * Centralised, type-safe environment variables.
 * Validated with Zod on first access so the app fails fast on missing/invalid config.
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  // Database
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .refine((v) => /^mysql:\/\//.test(v), {
      message: "DATABASE_URL must use mysql:// scheme",
    }),

  // S3 / MinIO
  // S3_ENDPOINT: internal endpoint the server uses to reach MinIO
  // (http://minio:9000 inside docker, http://localhost:9000 in dev).
  // S3_PUBLIC_ENDPOINT: public URL browsers use for presigned uploads/downloads.
  S3_ENDPOINT: z.string().url(),
  S3_PUBLIC_ENDPOINT: z.string().url().optional(),
  S3_REGION: z.string().min(1).default("us-east-1"),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  S3_FORCE_PATH_STYLE: z
    .string()
    .default("true")
    .transform((v) => v === "true"),

  // Public app URL (used to build share links)
  NEXT_PUBLIC_APP_URL: z.string().url(),

  // Auth.js (NextAuth v5)
  AUTH_SECRET: z.string().min(16),
  AUTH_TRUST_HOST: z
    .string()
    .default("true")
    .transform((v) => v === "true"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    "❌ Invalid environment variables:",
    z.treeifyError(parsed.error),
  );
  throw new Error("Invalid environment variables. See console output above.");
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
