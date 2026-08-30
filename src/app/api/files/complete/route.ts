import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { completeUploadSchema } from "@/lib/schemas";
import { apiError } from "@/lib/api-error";
import { completeUpload, StorageServiceError } from "@/lib/storage";

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

    const parsed = completeUploadSchema.safeParse(body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return apiError("VALIDATION_ERROR", issue?.message || "Invalid input");
    }

    const { fileId } = parsed.data;

    const file = await completeUpload(
      session.user.id,
      fileId,
    );

    return NextResponse.json({
      id: file.id,
      originalName: file.originalName,
      size: Number(file.size),
      mimeType: file.mimeType,
      visibility: file.visibility,
      shareToken: file.shareToken,
      createdAt: file.createdAt.toISOString(),
    });
  } catch (err: unknown) {
    if (err instanceof StorageServiceError) {
      return apiError(err.code, err.message);
    }
    console.error("Complete upload error:", err);
    return apiError("INTERNAL_ERROR", "Failed to complete upload");
  }
}
