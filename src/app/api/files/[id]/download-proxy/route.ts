import { NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";
import { s3, BUCKET, sanitizeForHeader } from "@/lib/s3";
import { downloadParamsSchema } from "@/lib/schemas";

/**
 * Same-origin download proxy.
 *
 * Browsers ignore Content-Disposition and <a download> on cross-origin
 * URLs, falling back to the URL path (the UUID storage key). Streaming
 * through this route keeps the filename deterministic and hides the
 * presigned URL from the client.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiError("UNAUTHENTICATED", "Authentication required");
    }

    const params = await context.params;
    const parsed = downloadParamsSchema.safeParse(params);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return apiError("VALIDATION_ERROR", issue?.message || "Invalid file ID");
    }

    const { id } = parsed.data;

    const file = await prisma.file.findFirst({
      where: { id, deletedAt: null, userId: session.user.id },
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
    console.error("Download proxy error:", err);
    return apiError("INTERNAL_ERROR", "Failed to download file");
  }
}
