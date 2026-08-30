import { prisma } from "@/lib/prisma";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { s3, BUCKET } from "@/lib/s3";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export interface PurgeResult {
  deleted: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
}

export async function purgeExpiredFiles(): Promise<PurgeResult> {
  const cutoff = new Date(Date.now() - THIRTY_DAYS_MS);
  const expired = await prisma.file.findMany({
    where: { deletedAt: { lt: cutoff } },
    select: { id: true, storageKey: true },
  });

  const result: PurgeResult = { deleted: 0, failed: 0, errors: [] };

  for (const file of expired) {
    try {
      await s3.send(
        new DeleteObjectCommand({ Bucket: BUCKET, Key: file.storageKey }),
      );
      await prisma.file.delete({ where: { id: file.id } });
      result.deleted++;
    } catch (err) {
      result.failed++;
      result.errors.push({
        id: file.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return result;
}
