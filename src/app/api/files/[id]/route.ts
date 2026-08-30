import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { downloadParamsSchema } from "@/lib/schemas";
import { apiError } from "@/lib/api-error";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { s3, BUCKET } from "@/lib/s3";

export async function DELETE(
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

    const deletedAt = new Date();

    await prisma.$transaction([
      prisma.file.update({
        where: { id: file.id },
        data: { deletedAt },
      }),
      prisma.user.update({
        where: { id: session.user.id },
        data: {
          usedStorage: {
            decrement: file.size,
          },
        },
      }),
    ]);

    return NextResponse.json({
      id: file.id,
      deletedAt: deletedAt.toISOString(),
    });
  } catch (err: unknown) {
    console.error("Delete file error:", err);
    return apiError("INTERNAL_ERROR", "Failed to delete file");
  }
}

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

    const file = await prisma.file.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!file) {
      return apiError("NOT_FOUND", "File not found");
    }

    // Try deleting S3 object
    try {
      await s3.send(
        new DeleteObjectCommand({
          Bucket: BUCKET,
          Key: file.storageKey,
        }),
      );
    } catch (s3Err) {
      console.warn(
        "Failed to delete S3 object during permanent delete:",
        s3Err,
      );
    }

    // If file was active (not soft-deleted), decrement quota on hard delete
    if (file.deletedAt === null) {
      await prisma.$transaction([
        prisma.file.delete({ where: { id: file.id } }),
        prisma.user.update({
          where: { id: session.user.id },
          data: {
            usedStorage: {
              decrement: file.size,
            },
          },
        }),
      ]);
    } else {
      await prisma.file.delete({ where: { id: file.id } });
    }

    return NextResponse.json({
      id: file.id,
      permanentlyDeleted: true,
    });
  } catch (err: unknown) {
    console.error("Permanent delete file error:", err);
    return apiError("INTERNAL_ERROR", "Failed to permanently delete file");
  }
}
