import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { presignedUrlRequestSchema } from "@/lib/schemas";
import { apiError } from "@/lib/api-error";
import { reserveUpload, StorageServiceError } from "@/lib/storage";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiError("UNAUTHENTICATED", "Authentication required");
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError("VALIDATION_ERROR", "Invalid JSON payload");
    }

    const parsed = presignedUrlRequestSchema.safeParse(body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const message = issue?.message || "Invalid input";
      if (message === "UNSUPPORTED_MIME_TYPE") {
        return apiError("UNSUPPORTED_MIME_TYPE", "File MIME type is not allowed");
      }
      if (message === "FILE_TOO_LARGE") {
        return apiError("FILE_TOO_LARGE", "File exceeds maximum allowed size");
      }
      return apiError("VALIDATION_ERROR", message);
    }

    const { filename, size, mimeType } = parsed.data;

    const { file, presigned } = await reserveUpload(
      session.user.id,
      filename,
      size,
      mimeType,
    );

    return NextResponse.json(
      {
        fileId: file.id,
        url: presigned.url,
        key: presigned.key,
        expiresIn: presigned.expiresIn,
      },
      { status: 201 },
    );
  } catch (err: unknown) {
    if (err instanceof StorageServiceError) {
      return apiError(err.code, err.message);
    }
    console.error("Presigned URL generation error:", err);
    return apiError("INTERNAL_ERROR", "Failed to generate presigned upload URL");
  }
}
