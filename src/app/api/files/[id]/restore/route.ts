import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { downloadParamsSchema } from "@/lib/schemas";
import { apiError } from "@/lib/api-error";

export async function POST(
  _request: Request,
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

    const { id } = parsedParams.data;

    const restoredFile = await prisma.$transaction(async (tx) => {
      const file = await tx.file.findFirst({
        where: {
          id,
          deletedAt: { not: null },
          userId: session.user.id,
        },
      });

      if (!file) {
        return null;
      }

      await tx.file.update({
        where: { id: file.id },
        data: { deletedAt: null },
      });

      await tx.user.update({
        where: { id: session.user.id },
        data: {
          usedStorage: {
            increment: file.size,
          },
        },
      });

      return file;
    });

    if (!restoredFile) {
      return apiError("NOT_FOUND", "File not found in trash");
    }

    return NextResponse.json({
      id: restoredFile.id,
      deletedAt: null,
    });
  } catch (err: unknown) {
    console.error("Restore file error:", err);
    return apiError("INTERNAL_ERROR", "Failed to restore file");
  }
}
