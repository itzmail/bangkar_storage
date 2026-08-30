import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { downloadParamsSchema, visibilityToggleSchema } from "@/lib/schemas";
import { apiError } from "@/lib/api-error";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiError("UNAUTHENTICATED", "Authentication required");
    }

    const params = await context.params;
    const parsedParams = downloadParamsSchema.safeParse(params);
    if (!parsedParams.success) {
      const issue = parsedParams.error.issues[0];
      return apiError("VALIDATION_ERROR", issue?.message || "Invalid file ID");
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError("VALIDATION_ERROR", "Invalid JSON payload");
    }

    const parsedBody = visibilityToggleSchema.safeParse(body);
    if (!parsedBody.success) {
      const issue = parsedBody.error.issues[0];
      return apiError("VALIDATION_ERROR", issue?.message || "Invalid visibility value");
    }

    const { id } = parsedParams.data;
    const { visibility } = parsedBody.data;

    const file = await prisma.file.findFirst({
      where: {
        id,
        deletedAt: null,
        userId: session.user.id,
      },
    });

    if (!file) {
      return apiError("NOT_FOUND", "File not found");
    }

    const shareToken = file.shareToken ?? crypto.randomUUID();

    const updated = await prisma.file.update({
      where: { id: file.id },
      data: {
        visibility,
        shareToken,
      },
    });

    return NextResponse.json({
      id: updated.id,
      visibility: updated.visibility,
      shareToken: updated.shareToken,
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (err: unknown) {
    console.error("Visibility toggle error:", err);
    return apiError("INTERNAL_ERROR", "Failed to update file visibility");
  }
}
