import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatBytes, formatDate } from "@/lib/format";
import { Shield, FileText, Globe } from "lucide-react";
import { PublicDownloadButton } from "./download-button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

interface SharePageProps {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: SharePageProps) {
  const { token } = await params;
  if (!token) return { title: "Shared File" };

  const file = await prisma.file.findFirst({
    where: {
      shareToken: token,
      visibility: "PUBLIC",
      deletedAt: null,
    },
    select: { originalName: true },
  });

  if (!file) return { title: "File Not Found" };

  return {
    title: file.originalName,
    description: `Download ${file.originalName} securely from Bangkar.`,
  };
}


export default async function SharePage({ params }: SharePageProps) {
  const { token } = await params;

  if (!token) {
    notFound();
  }

  const file = await prisma.file.findFirst({
    where: {
      shareToken: token,
      visibility: "PUBLIC",
      deletedAt: null,
    },
  });

  if (!file) {
    notFound();
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-foreground">
      <div className="w-full max-w-md space-y-6">
        {/* Brand header */}
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md mb-3">
            <Shield className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Bangkar</h1>
          <p className="text-xs text-muted-foreground">Public File Sharing</p>
        </div>

        {/* File Card */}
        <Card className="shadow-md">
          <CardHeader className="flex-row items-start gap-4 space-y-0">
            <div className="rounded-xl bg-primary/10 p-3 text-primary shrink-0">
              <FileText className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="primary">
                  <Globe className="h-2.5 w-2.5" />
                  Public
                </Badge>
              </div>
              <h2
                className="truncate text-base font-semibold text-foreground"
                title={file.originalName}
              >
                {file.originalName}
              </h2>
              <p className="text-xs text-muted-foreground">
                {formatBytes(Number(file.size))} • {file.mimeType}
              </p>
            </div>
          </CardHeader>

          <CardContent className="border-t border-border pt-4">
            <p className="text-xs text-muted-foreground">
              Uploaded on {formatDate(file.createdAt.toISOString())}
            </p>
          </CardContent>

          <CardFooter className="pt-2">
            <PublicDownloadButton token={token} />
          </CardFooter>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Files on Bangkar are encrypted at rest and in transit.
        </p>
      </div>
    </div>
  );
}
