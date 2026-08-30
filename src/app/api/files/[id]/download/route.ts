import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { downloadParamsSchema } from "@/lib/schemas";
import { apiError } from "@/lib/api-error";
import { createPresignedGetUrl } from "@/lib/s3";

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
      where: {
        id,
        deletedAt: null,
        userId: session.user.id,
      },
    });

    if (!file) {
      return apiError("NOT_FOUND", "File not found");
    }

    const presigned = await createPresignedGetUrl(
      file.storageKey,
      file.originalName,
    );

    return NextResponse.json({
      url: presigned.url,
      expiresIn: presigned.expiresIn,
      filename: file.originalName,
    });
  } catch (err: unknown) {
    console.error("Download URL generation error:", err);
    return apiError("INTERNAL_ERROR", "Failed to generate download URL");
  }
}
