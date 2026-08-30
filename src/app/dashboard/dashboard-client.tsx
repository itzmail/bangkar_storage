"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  FolderOpen,
  RefreshCw,
  AlertCircle,
  Trash2,
} from "lucide-react";
import type { FileListItem } from "@/lib/types";
import { FileRow } from "./file-row";
import { UploadButton } from "./upload-button";
import { listFiles, listTrashedFiles } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
} from "@/components/ui/table";
import {
  EmptyState,
  EmptyStateIcon,
  EmptyStateTitle,
  EmptyStateDescription,
  EmptyStateAction,
} from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";

interface DashboardClientProps {
  initialFiles: FileListItem[];
  initialNextCursor: string | null;
  currentView?: "all" | "public" | "trash";
}

export function DashboardClient({
  initialFiles,
  initialNextCursor,
  currentView = "all",
}: DashboardClientProps) {
  const router = useRouter();
  const [files, setFiles] = useState<FileListItem[]>(initialFiles);
  const [nextCursor, setNextCursor] = useState<string | null>(
    initialNextCursor,
  );
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleRefresh = async () => {
    setLoading(true);
    setError(null);
    try {
      if (currentView === "trash") {
        const res = await listTrashedFiles({ limit: 20 });
        setFiles(res.files);
        setNextCursor(res.nextCursor);
      } else {
        const res = await listFiles({
          limit: 20,
          visibility: currentView === "public" ? "PUBLIC" : undefined,
        });
        setFiles(res.files);
        setNextCursor(res.nextCursor);
      }
      router.refresh();
    } catch {
      setError("Failed to reload files.");
      toast({
        title: "Could not refresh files",
        variant: "danger",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (!nextCursor || loading) return;
    setLoading(true);
    try {
      if (currentView === "trash") {
        const res = await listTrashedFiles({
          cursor: nextCursor,
          limit: 20,
        });
        setFiles((prev) => [...prev, ...res.files]);
        setNextCursor(res.nextCursor);
      } else {
        const res = await listFiles({
          cursor: nextCursor,
          limit: 20,
          visibility: currentView === "public" ? "PUBLIC" : undefined,
        });
        setFiles((prev) => [...prev, ...res.files]);
        setNextCursor(res.nextCursor);
      }
    } catch {
      toast({
        title: "Failed to load more files",
        variant: "danger",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpdate = (updatedFile: FileListItem) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === updatedFile.id ? updatedFile : f)),
    );
    router.refresh();
  };

  const handleFileDelete = (deletedFileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== deletedFileId));
    router.refresh();
  };

  const handleFileRestore = (restoredFileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== restoredFileId));
    router.refresh();
  };

  const handlePermanentDelete = (deletedFileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== deletedFileId));
    router.refresh();
  };

  const filteredFiles = useMemo(() => {
    let result = files;
    if (currentView === "public") {
      result = result.filter((f) => f.visibility === "PUBLIC");
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((f) => f.originalName.toLowerCase().includes(q));
    }
    return result;
  }, [files, search, currentView]);

  return (
    <div className="space-y-6">
      {/* Page Header & Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-border">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            {currentView === "trash"
              ? "Trash"
              : currentView === "public"
                ? "Public Files"
                : "My files"}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {currentView === "trash"
              ? "Files moved to trash. They will be permanently deleted after 30 days."
              : currentView === "public"
                ? "Files accessible with a public share link"
                : "Manage and share your encrypted files"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={handleRefresh}
            disabled={loading}
            aria-label="Refresh files"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          {currentView !== "trash" && (
            <UploadButton onSuccess={handleRefresh} />
          )}
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search files by name..."
          className="pl-9"
        />
      </div>

      {/* Error banner */}
      {error && (
        <div
          role="alert"
          className="flex items-center justify-between rounded-xl bg-danger/10 p-4 text-xs font-medium text-danger"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            className="text-danger hover:bg-danger/20"
          >
            Retry
          </Button>
        </div>
      )}

      {/* File Table / Empty State */}
      {filteredFiles.length === 0 && !loading ? (
        <EmptyState>
          <EmptyStateIcon>
            {currentView === "trash" ? (
              <Trash2 className="h-6 w-6" />
            ) : (
              <FolderOpen className="h-6 w-6" />
            )}
          </EmptyStateIcon>
          <EmptyStateTitle>
            {search
              ? "No matching files"
              : currentView === "trash"
                ? "Trash is empty"
                : "No files uploaded yet"}
          </EmptyStateTitle>
          <EmptyStateDescription>
            {search
              ? "Try adjusting your search terms or clearing the filter."
              : currentView === "trash"
                ? "No files have been moved to trash."
                : "Drag and drop files here, or click Upload to get started."}
          </EmptyStateDescription>
          {!search && currentView !== "trash" && (
            <EmptyStateAction>
              <UploadButton onSuccess={handleRefresh} />
            </EmptyStateAction>
          )}
        </EmptyState>
      ) : (
        <Card className="p-0 overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sm:pl-6">Name</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Visibility</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead className="text-right sm:pr-6">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFiles.map((file) => (
                <FileRow
                  key={file.id}
                  file={file}
                  onUpdate={handleFileUpdate}
                  onDelete={handleFileDelete}
                  onRestore={handleFileRestore}
                  onPermanentDelete={handlePermanentDelete}
                />
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          {nextCursor && (
            <div className="flex items-center justify-center border-t border-border p-4 bg-muted/20">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleLoadMore}
                disabled={loading}
              >
                {loading ? "Loading..." : "Load more"}
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
