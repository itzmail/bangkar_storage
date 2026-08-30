"use client";

import React, { useState, useRef } from "react";
import axios from "axios";
import { Upload, FileUp, AlertCircle } from "lucide-react";
import { requestPresignedUrl, completeUpload } from "@/lib/api-client";
import { formatBytes } from "@/lib/format";
import { useToast } from "@/components/ui/toast";
import { MAX_FILE_SIZE_BYTES, ALLOWED_MIME_TYPES } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

interface UploadButtonProps {
  onSuccess?: () => void;
}

export function UploadButton({ onSuccess }: UploadButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { toast } = useToast();

  const resetState = () => {
    setFile(null);
    setUploading(false);
    setProgress(0);
    setError(null);
    setIsDragOver(false);
    abortControllerRef.current = null;
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && uploading) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    }
    if (!open) {
      resetState();
    }
    setIsOpen(open);
  };

  const validateFile = (selectedFile: File): string | null => {
    if (selectedFile.size <= 0) {
      return "File is empty.";
    }
    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      return `File exceeds maximum allowed size (${formatBytes(MAX_FILE_SIZE_BYTES)}).`;
    }
    const mime = selectedFile.type || "application/octet-stream";
    if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(mime)) {
      return `Unsupported file type: ${mime}`;
    }
    return null;
  };

  const handleFileSelection = (selectedFile: File) => {
    setError(null);
    const validationError = validateFile(selectedFile);
    if (validationError) {
      setError(validationError);
      setFile(null);
      return;
    }
    setFile(selectedFile);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (uploading) return;

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelection(droppedFile);
    }
  };

  const handleStartUpload = async () => {
    if (!file) return;

    setError(null);
    setUploading(true);
    setProgress(0);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const mimeType = file.type || "application/octet-stream";

      // Step 1: Reserve upload / presigned PUT URL
      const { fileId, url } = await requestPresignedUrl({
        filename: file.name,
        size: file.size,
        mimeType,
      });

      // Step 2: Direct PUT to S3 / MinIO via Axios with progress & cancel
      await axios.put(url, file, {
        signal: abortController.signal,
        headers: {
          "Content-Type": mimeType,
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total,
            );
            setProgress(percent);
          }
        },
      });

      // Step 3: Complete upload in DB
      await completeUpload({
        fileId,
        size: file.size,
      });

      toast({
        title: "File uploaded successfully",
        description: file.name,
        variant: "success",
      });
      setIsOpen(false);
      resetState();
      onSuccess?.();
    } catch (err: unknown) {
      let message = "Upload failed.";
      if (
        axios.isCancel(err) ||
        (err instanceof Error && err.name === "CanceledError")
      ) {
        message = "Upload canceled.";
      } else if (err instanceof Error) {
        message = err.message || "Upload failed.";
      }
      setError(message);
      toast({
        title: "Upload failed",
        description: message,
        variant: "danger",
      });
      setUploading(false);
    }
  };

  const handleCancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="primary" size="md">
          <Upload className="h-4 w-4" />
          Upload
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload File</DialogTitle>
          <DialogDescription>
            Upload files up to 500 MB to your encrypted storage
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {error && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-lg bg-danger/10 p-3 text-xs font-medium text-danger"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!file ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
                isDragOver
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground/50 hover:bg-muted/30"
              }`}
            >
              <FileUp className="h-10 w-10 text-muted-foreground" />
              <p className="mt-2 text-sm font-medium text-foreground">
                Click to browse or drag and drop
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Files up to 500 MB
              </p>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const selected = e.target.files?.[0];
                  if (selected) handleFileSelection(selected);
                }}
              />
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="min-w-0 pr-4">
                  <p className="truncate text-sm font-medium text-foreground">
                    {file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(file.size)} •{" "}
                    {file.type || "application/octet-stream"}
                  </p>
                </div>
                {!uploading && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={resetState}
                  >
                    Change
                  </Button>
                )}
              </div>

              {uploading && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Uploading...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} />
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {uploading ? (
            <Button
              type="button"
              variant="danger"
              size="md"
              onClick={handleCancelUpload}
            >
              Abort
            </Button>
          ) : (
            <>
              <DialogClose asChild>
                <Button type="button" variant="secondary" size="md">
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type="button"
                variant="primary"
                size="md"
                disabled={!file}
                onClick={handleStartUpload}
              >
                Start upload
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
