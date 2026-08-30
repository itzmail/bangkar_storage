import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";
import { createPresignedGetUrl } from "@/lib/s3";

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

    const presigned = await createPresignedGetUrl(
      file.storageKey,
      file.originalName,
    );

    return NextResponse.json({
      filename: file.originalName,
      mimeType: file.mimeType,
      size: Number(file.size),
      url: presigned.url,
      expiresIn: presigned.expiresIn,
    });
  } catch (err: unknown) {
    console.error("Public share link error:", err);
    return apiError("INTERNAL_ERROR", "Failed to retrieve shared file");
  }
}
