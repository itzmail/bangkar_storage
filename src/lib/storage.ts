import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "@/lib/prisma";
import {
  buildStorageKey,
  createPresignedPutUrl,
  s3,
  BUCKET,
  type PresignedPut,
} from "@/lib/s3";
import type { ErrorCode } from "@/lib/schemas";
import type { File as FileModel } from "@/generated/prisma/client";

export class StorageServiceError extends Error {
  constructor(public code: ErrorCode, message: string) {
    super(message);
    this.name = "StorageServiceError";
  }
}

/**
 * Reserve upload quota and create initial file record atomically (eliminating TOCTOU).
 * Quota is reserved via atomic CAS update; file record is initialized with size: 0n.
 */
export async function reserveUpload(
  userId: string,
  filename: string,
  size: number,
  mimeType: string,
): Promise<{ file: FileModel; presigned: PresignedPut }> {
  const sizeBig = BigInt(size);
  const storageKey = buildStorageKey(userId, filename);

  const file = await prisma.$transaction(async (tx) => {
    // 1. Fetch user's current storage limit
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { storageLimit: true },
    });

    if (!user) {
      throw new StorageServiceError("UNAUTHENTICATED", "User not found");
    }

    // 2. Atomic Compare-And-Swap quota reservation
    // Only increments if usedStorage <= storageLimit - sizeBig
    const updateResult = await tx.user.updateMany({
      where: {
        id: userId,
        usedStorage: { lte: user.storageLimit - sizeBig },
      },
      data: {
        usedStorage: { increment: sizeBig },
      },
    });

    if (updateResult.count === 0) {
      throw new StorageServiceError(
        "STORAGE_LIMIT_EXCEEDED",
        "User storage quota is insufficient for this upload.",
      );
    }

    // 3. Create placeholder file record with size = 0 (finalized by completeUpload)
    return await tx.file.create({
      data: {
        userId,
        originalName: filename,
        storageKey,
        mimeType,
        size: BigInt(0),
        visibility: "PRIVATE",
      },
    });

  });

  // Generate presigned PUT URL outside of the database transaction
  const presigned = await createPresignedPutUrl(storageKey, mimeType);

  return { file, presigned };
}

/**
 * Complete upload by verifying the actual S3 object and its ContentLength.
 * Client-claimed size is ignored for security; S3 metadata is the source of truth.
 * Note: Quota was already reserved at reserveUpload time.
 */
export async function completeUpload(
  userId: string,
  fileId: string,
): Promise<FileModel> {
  return await prisma.$transaction(async (tx) => {
    const file = await tx.file.findFirst({
      where: { id: fileId, deletedAt: null },
    });

    if (!file) {
      throw new StorageServiceError("NOT_FOUND", "File record not found");
    }

    if (file.userId !== userId) {
      throw new StorageServiceError("FORBIDDEN", "Unauthorized access to file");
    }

    // Verify S3 object existence and capture actual ContentLength
    let actualSize: number;
    try {
      const head = await s3.send(
        new HeadObjectCommand({
          Bucket: BUCKET,
          Key: file.storageKey,
        }),
      );

      if (head.ContentLength === undefined || head.ContentLength < 0) {
        throw new StorageServiceError(
          "UPLOAD_FAILED",
          "S3 object has no Content-Length",
        );
      }
      actualSize = head.ContentLength;
    } catch (err: unknown) {
      if (err instanceof StorageServiceError) throw err;
      throw new StorageServiceError(
        "UPLOAD_FAILED",
        "S3 object not found or inaccessible",
      );
    }

    // Update the file size with the S3-verified value
    const updatedFile = await tx.file.update({
      where: { id: fileId },
      data: { size: BigInt(actualSize) },
    });

    return updatedFile;
  });
}
