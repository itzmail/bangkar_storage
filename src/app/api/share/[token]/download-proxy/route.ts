import { NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";
import { s3, BUCKET, sanitizeForHeader } from "@/lib/s3";

/**
 * Same-origin download proxy for public share links.
 * Keeps the filename deterministic (browsers ignore Content-Disposition
 * on cross-origin presigned URLs) and hides the presigned URL.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  try {
    const params = await context.params;
    const token = params?.token;

    if (!token || typeof token !== "string" || token.trim().length === 0) {
      return apiError("VALIDATION_ERROR", "Share token is required");
    }

    const file = await prisma.file.findFirst({
      where: {
        shareToken: token,
        visibility: "PUBLIC",
        deletedAt: null,
      },
    });

    if (!file) {
      return apiError("NOT_FOUND", "File not found");
    }

    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: file.storageKey,
    });

    const response = await s3.send(command);
    const body = response.Body;

    if (!body) {
      return apiError("NOT_FOUND", "File content not found");
    }

    const stream = body as unknown as ReadableStream;
    const filename = sanitizeForHeader(file.originalName);

    return new NextResponse(stream, {
      headers: {
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Type": file.mimeType || "application/octet-stream",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
        "Content-Length": String(file.size),
      },
    });
  } catch (err: unknown) {
    console.error("Public download proxy error:", err);
    return apiError("INTERNAL_ERROR", "Failed to download file");
  }
}
