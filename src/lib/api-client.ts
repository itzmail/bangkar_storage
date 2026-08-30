import type {
  FileListResponse,
  PresignedUrlResponse,
  VisibilityResponse,
  FileVisibility,
  FileListItem,
} from "@/lib/types";

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const code = data?.error?.code || "UNKNOWN_ERROR";
    const message = data?.error?.message || "An unexpected error occurred";
    throw new ApiError(code, message, res.status);
  }

  return data as T;
}

export async function listFiles(query?: {
  cursor?: string;
  limit?: number;
  visibility?: FileVisibility;
  mimePrefix?: string;
}): Promise<FileListResponse> {
  const params = new URLSearchParams();
  if (query?.cursor) params.set("cursor", query.cursor);
  if (query?.limit) params.set("limit", String(query.limit));
  if (query?.visibility) params.set("visibility", query.visibility);
  if (query?.mimePrefix) params.set("mimePrefix", query.mimePrefix);

  const qs = params.toString();
  return apiFetch<FileListResponse>(`/api/files${qs ? `?${qs}` : ""}`);
}

export function getDownloadUrl(id: string): string {
  return `/api/files/${id}/download-proxy`;
}

export async function toggleVisibility(
  id: string,
  visibility: FileVisibility,
): Promise<VisibilityResponse> {
  return apiFetch<VisibilityResponse>(`/api/files/${id}/visibility`, {
    method: "PATCH",
    body: JSON.stringify({ visibility }),
  });
}

export async function requestPresignedUrl(input: {
  filename: string;
  size: number;
  mimeType: string;
}): Promise<PresignedUrlResponse> {
  return apiFetch<PresignedUrlResponse>("/api/files/presigned-url", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function completeUpload(input: {
  fileId: string;
  size: number;
}): Promise<FileListItem> {
  return apiFetch<FileListItem>("/api/files/complete", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function deleteFile(id: string): Promise<{ id: string; deletedAt: string }> {
  return apiFetch<{ id: string; deletedAt: string }>(`/api/files/${id}`, {
    method: "DELETE",
  });
}

export async function listTrashedFiles(query?: {
  cursor?: string;
  limit?: number;
  visibility?: FileVisibility;
  mimePrefix?: string;
}): Promise<FileListResponse> {
  const params = new URLSearchParams();
  if (query?.cursor) params.set("cursor", query.cursor);
  if (query?.limit) params.set("limit", String(query.limit));
  if (query?.visibility) params.set("visibility", query.visibility);
  if (query?.mimePrefix) params.set("mimePrefix", query.mimePrefix);

  const qs = params.toString();
  return apiFetch<FileListResponse>(`/api/files/trash${qs ? `?${qs}` : ""}`);
}

export async function restoreFile(
  id: string,
): Promise<{ id: string; deletedAt: null }> {
  return apiFetch<{ id: string; deletedAt: null }>(`/api/files/${id}/restore`, {
    method: "POST",
  });
}

export async function deleteFileForever(
  id: string,
): Promise<{ id: string; permanentlyDeleted: boolean }> {
  return apiFetch<{ id: string; permanentlyDeleted: boolean }>(`/api/files/${id}`, {
    method: "POST",
  });
}


