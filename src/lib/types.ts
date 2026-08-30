export type FileVisibility = "PRIVATE" | "PUBLIC";

export interface FileListItem {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  visibility: FileVisibility;
  shareToken: string | null;
  createdAt: string;
  deletedAt: string | null;
}

export interface FileListResponse {
  files: FileListItem[];
  nextCursor: string | null;
}

export interface PresignedUrlResponse {
  fileId: string;
  url: string;
  key: string;
  expiresIn: number;
}

export interface VisibilityResponse {
  id: string;
  visibility: FileVisibility;
  shareToken: string | null;
  updatedAt: string;
}
