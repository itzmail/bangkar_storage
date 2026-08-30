"use client";

import React, { useState } from "react";
import {
  MoreVertical,
  Download,
  Globe,
  Lock,
  Copy,
  Trash2,
  FileText,
  RotateCcw,
} from "lucide-react";
import type { FileListItem, FileVisibility } from "@/lib/types";
import { formatBytes, formatDate, formatRelative } from "@/lib/format";
import {
  getDownloadUrl,
  toggleVisibility,
  deleteFile,
  restoreFile,
  deleteFileForever,
} from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { TableRow, TableCell } from "@/components/ui/table";

interface FileRowProps {
  file: FileListItem;
  onUpdate: (updatedFile: FileListItem) => void;
  onDelete: (fileId: string) => void;
  onRestore?: (fileId: string) => void;
  onPermanentDelete?: (fileId: string) => void;
}

export function FileRow({
  file,
  onUpdate,
  onDelete,
  onRestore,
  onPermanentDelete,
}: FileRowProps) {
  const [softDeleteOpen, setSoftDeleteOpen] = useState(false);
  const [permanentDeleteOpen, setPermanentDeleteOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  const isTrashed = !!file.deletedAt;

  const handleDownload = async () => {
    try {
      // ponytail: same-origin proxy — browser honors Content-Disposition
      // (cross-origin presigned URLs fall back to the UUID path name)
      const a = document.createElement("a");
      a.href = getDownloadUrl(file.id);
      a.download = file.originalName;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast({
        title: "Download started",
        description: file.originalName,
        variant: "success",
      });
    } catch {
      toast({
        title: "Download failed",
        description: "Could not generate secure download link",
        variant: "danger",
      });
    }
  };

  const handleToggleVisibility = async () => {
    const newVisibility: FileVisibility =
      file.visibility === "PRIVATE" ? "PUBLIC" : "PRIVATE";
    setUpdating(true);
    try {
      const res = await toggleVisibility(file.id, newVisibility);
      onUpdate({
        ...file,
        visibility: res.visibility,
        shareToken: res.shareToken,
      });
      toast({
        title: `File is now ${res.visibility.toLowerCase()}`,
        description: file.originalName,
        variant: "success",
      });
    } catch {
      toast({
        title: "Failed to update visibility",
        variant: "danger",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleCopyLink = async () => {
    if (!file.shareToken) {
      toast({
        title: "No share link available",
        variant: "danger",
      });
      return;
    }
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    const shareUrl = `${origin}/share/${file.shareToken}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Share link copied",
        description: "Public download URL copied to clipboard",
        variant: "success",
      });
    } catch {
      toast({
        title: "Failed to copy share link",
        variant: "danger",
      });
    }
  };

  const handleSoftDelete = async () => {
    setLoading(true);
    try {
      await deleteFile(file.id);
      setSoftDeleteOpen(false);
      onDelete(file.id);
      toast({
        title: "File moved to trash",
        description: file.originalName,
        variant: "default",
      });
    } catch {
      toast({
        title: "Failed to delete file",
        description: "Please try again later.",
        variant: "danger",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreAction = async () => {
    setLoading(true);
    try {
      await restoreFile(file.id);
      onRestore?.(file.id);
      toast({
        title: "File restored",
        description: `${file.originalName} has been returned to your library.`,
        variant: "success",
      });
    } catch {
      toast({
        title: "Failed to restore file",
        description: "Please try again later.",
        variant: "danger",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePermanentDeleteAction = async () => {
    setLoading(true);
    try {
      await deleteFileForever(file.id);
      setPermanentDeleteOpen(false);
      onPermanentDelete?.(file.id);
      toast({
        title: "File permanently deleted",
        description: file.originalName,
        variant: "default",
      });
    } catch {
      toast({
        title: "Failed to delete file",
        description: "Please try again later.",
        variant: "danger",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <TableRow>
        <TableCell className="font-medium text-foreground">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <FileText className="h-4 w-4" />
            </div>
            <span
              className="truncate max-w-xs md:max-w-md font-medium text-sm text-foreground"
              title={file.originalName}
            >
              {file.originalName}
            </span>
          </div>
        </TableCell>
        <TableCell className="whitespace-nowrap text-muted-foreground">
          {formatBytes(file.size)}
        </TableCell>
        <TableCell className="whitespace-nowrap">
          <span className="inline-flex rounded bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground">
            {file.mimeType}
          </span>
        </TableCell>
        <TableCell className="whitespace-nowrap">
          {isTrashed ? (
            <Badge variant="muted">Trash</Badge>
          ) : file.visibility === "PUBLIC" ? (
            <Badge variant="primary">
              <Globe className="h-3 w-3" />
              Public
            </Badge>
          ) : (
            <Badge variant="muted">
              <Lock className="h-3 w-3" />
              Private
            </Badge>
          )}
        </TableCell>
        <TableCell className="whitespace-nowrap text-muted-foreground">
          <div>{formatDate(file.createdAt)}</div>
          <div className="text-xs text-muted-foreground">
            {formatRelative(file.createdAt)}
          </div>
        </TableCell>
        <TableCell className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                disabled={updating || loading}
                aria-label={`Actions for ${file.originalName}`}
              >
                <MoreVertical className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </DropdownMenuItem>

              {!isTrashed ? (
                <>
                  <DropdownMenuItem onClick={handleToggleVisibility}>
                    {file.visibility === "PRIVATE" ? (
                      <>
                        <Globe className="mr-2 h-4 w-4" />
                        Make Public
                      </>
                    ) : (
                      <>
                        <Lock className="mr-2 h-4 w-4" />
                        Make Private
                      </>
                    )}
                  </DropdownMenuItem>
                  {file.visibility === "PUBLIC" && (
                    <DropdownMenuItem onClick={handleCopyLink}>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy share link
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="danger"
                    onClick={() => setSoftDeleteOpen(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Move to trash
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem onClick={handleRestoreAction}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Restore
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="danger"
                    onClick={() => setPermanentDeleteOpen(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete forever
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>

      {/* Move to trash Dialog */}
      <Dialog open={softDeleteOpen} onOpenChange={setSoftDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this file?</DialogTitle>
            <DialogDescription>
              <strong className="font-semibold text-foreground">
                {file.originalName}
              </strong>{" "}
              will be moved to trash. It will be permanently deleted after 30
              days.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary" size="md" disabled={loading}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              variant="danger"
              size="md"
              disabled={loading}
              onClick={handleSoftDelete}
            >
              {loading ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete forever Dialog */}
      <Dialog open={permanentDeleteOpen} onOpenChange={setPermanentDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete permanently?</DialogTitle>
            <DialogDescription>
              <strong className="font-semibold text-foreground">
                {file.originalName}
              </strong>{" "}
              will be permanently deleted immediately. This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary" size="md" disabled={loading}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              variant="danger"
              size="md"
              disabled={loading}
              onClick={handlePermanentDeleteAction}
            >
              {loading ? "Deleting..." : "Delete forever"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
