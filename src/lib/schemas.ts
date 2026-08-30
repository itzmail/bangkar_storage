import { z } from "zod";

/** Whitelisted MIME types for upload. Tighten per deployment policy. */
export const ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/zip",
  "application/json",
  "video/mp4",
  "video/webm",
  "audio/mpeg",
  "audio/wav",
  "application/octet-stream",
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export const MAX_FILE_SIZE_BYTES = 524288000; // 500 MB per PRD §5
export const MAX_UPLOAD_BYTES = MAX_FILE_SIZE_BYTES;

// --- Auth -----------------------------------------------------------------

export const registerSchema = z.object({
  email: z.string().email().max(255).toLowerCase().trim(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128),
  name: z.string().min(1).max(80).trim().optional(),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email().max(255).toLowerCase().trim(),
  password: z.string().min(1).max(128),
});
export type LoginInput = z.infer<typeof loginSchema>;

// --- Files ----------------------------------------------------------------

export const presignedUrlRequestSchema = z.object({
  filename: z.string().min(1, "Filename is required").max(255),
  mimeType: z.string().refine((m) => (ALLOWED_MIME_TYPES as readonly string[]).includes(m), {
    message: "UNSUPPORTED_MIME_TYPE",
  }),
  size: z
    .coerce
    .number()
    .int()
    .positive()
    .max(MAX_FILE_SIZE_BYTES, "FILE_TOO_LARGE"),
});
export type PresignedUrlRequest = z.infer<typeof presignedUrlRequestSchema>;

export const completeUploadSchema = z.object({
  fileId: z.string().uuid("Invalid file ID"),
  size: z
    .coerce
    .number()
    .int()
    .positive()
    .max(MAX_FILE_SIZE_BYTES, "FILE_TOO_LARGE"),
});
export type CompleteUploadInput = z.infer<typeof completeUploadSchema>;

export const fileListQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  visibility: z.enum(["PRIVATE", "PUBLIC"]).optional(),
  sort: z
    .enum(["createdAt", "size", "originalName"])
    .default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type FileListQuery = z.infer<typeof fileListQuerySchema>;

export const listFilesQuerySchema = z.object({
  cursor: z.string().uuid("Invalid cursor format").optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  visibility: z.enum(["PRIVATE", "PUBLIC"]).optional(),
  mimePrefix: z.string().max(100).optional(),
});
export type ListFilesQuery = z.infer<typeof listFilesQuerySchema>;

export const downloadParamsSchema = z.object({
  id: z.string().uuid("Invalid file ID"),
});
export type DownloadParams = z.infer<typeof downloadParamsSchema>;

export const visibilityToggleSchema = z.object({
  visibility: z.enum(["PRIVATE", "PUBLIC"], {
    message: "Visibility must be PRIVATE or PUBLIC",
  }),
});
export type VisibilityToggleInput = z.infer<typeof visibilityToggleSchema>;

export const shareParamsSchema = z.object({
  token: z.string().min(1, "Share token is required"),
});
export type ShareParams = z.infer<typeof shareParamsSchema>;

// --- Errors ---------------------------------------------------------------

export const ERROR_CODES = {
  UNAUTHENTICATED: "UNAUTHENTICATED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  STORAGE_LIMIT_EXCEEDED: "STORAGE_LIMIT_EXCEEDED",
  UNSUPPORTED_MIME_TYPE: "UNSUPPORTED_MIME_TYPE",
  FILE_TOO_LARGE: "FILE_TOO_LARGE",
  UPLOAD_FAILED: "UPLOAD_FAILED",
  EMAIL_TAKEN: "EMAIL_TAKEN",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
