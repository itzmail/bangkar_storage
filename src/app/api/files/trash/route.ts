import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listFilesQuerySchema } from "@/lib/schemas";
import { apiError } from "@/lib/api-error";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiError("UNAUTHENTICATED", "Authentication required");
    }

    const { searchParams } = new URL(request.url);
    const queryObj = {
      cursor: searchParams.get("cursor") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      visibility: searchParams.get("visibility") ?? undefined,
      mimePrefix: searchParams.get("mimePrefix") ?? undefined,
    };

    const parsed = listFilesQuerySchema.safeParse(queryObj);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return apiError(
        "VALIDATION_ERROR",
        issue?.message || "Invalid query parameters",
      );
    }

    const { cursor, limit, visibility, mimePrefix } = parsed.data;

    const files = await prisma.file.findMany({
      where: {
        userId: session.user.id,
        deletedAt: { not: null },
        ...(visibility ? { visibility } : {}),
        ...(mimePrefix ? { mimeType: { startsWith: mimePrefix } } : {}),
      },
      orderBy: {
        deletedAt: "desc",
      },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    let nextCursor: string | null = null;
    if (files.length > limit) {
      files.pop();
      nextCursor = files[files.length - 1]?.id ?? null;
    }

    return NextResponse.json({
      files: files.map((file) => ({
        id: file.id,
        originalName: file.originalName,
        mimeType: file.mimeType,
        size: Number(file.size),
        visibility: file.visibility,
        shareToken: file.shareToken,
        createdAt: file.createdAt.toISOString(),
        deletedAt: file.deletedAt?.toISOString() ?? null,
      })),
      nextCursor,
    });
  } catch (err: unknown) {
    console.error("List trash files error:", err);
    return apiError("INTERNAL_ERROR", "Failed to list trash files");
  }
}
