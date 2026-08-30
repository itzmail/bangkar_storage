"use client";

import React, { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PublicDownloadButtonProps {
  token: string;
}

export function PublicDownloadButton({ token }: PublicDownloadButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setLoading(true);
    setError(null);
    try {
      // ponytail: same-origin proxy — browser honors Content-Disposition
      // (cross-origin presigned URLs fall back to the UUID path name)
      const a = document.createElement("a");
      a.href = `/api/share/${token}/download-proxy`;
      a.download = "";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setLoading(false);
    } catch {
      setError("Failed to generate download link. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-3">
      {error && (
        <p className="text-center text-xs text-danger font-medium">
          {error}
        </p>
      )}
      <Button
        type="button"
        variant="primary"
        size="lg"
        onClick={handleDownload}
        disabled={loading}
        className="w-full"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Preparing download...</span>
          </>
        ) : (
          <>
            <Download className="h-4 w-4" />
            <span>Download File</span>
          </>
        )}
      </Button>
    </div>
  );
}
