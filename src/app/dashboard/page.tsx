import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { DashboardClient } from "./dashboard-client";
import { formatBytes } from "@/lib/format";
import {
  HardDrive,
  LogOut,
  Shield,
  Files,
  Globe,
  Trash2,
} from "lucide-react";
import type { FileListItem } from "@/lib/types";
import { Avatar } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export async function generateMetadata() {
  return {
    title: "Dashboard",
    description: "Manage and share your secure files.",
  };
}

interface DashboardPageProps {
  searchParams: Promise<{ filter?: string; view?: string }>;
}

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { filter, view } = await searchParams;
  const currentView: "all" | "public" | "trash" =
    view === "trash" ? "trash" : filter === "public" ? "public" : "all";

  // Fetch initial files, counts, and user quota directly via Prisma SSR
  const [initialDbFiles, userRecord, totalCount, publicCount, trashCount] =
    await Promise.all([
      prisma.file.findMany({
        where: {
          userId: session.user.id,
          ...(currentView === "trash"
            ? { deletedAt: { not: null } }
            : {
                deletedAt: null,
                ...(currentView === "public" ? { visibility: "PUBLIC" } : {}),
              }),
        },
        orderBy: {
          ...(currentView === "trash"
            ? { deletedAt: "desc" }
            : { createdAt: "desc" }),
        },
        take: 21,
      }),
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          name: true,
          email: true,
          usedStorage: true,
          storageLimit: true,
        },
      }),
      prisma.file.count({
        where: {
          userId: session.user.id,
          deletedAt: null,
        },
      }),
      prisma.file.count({
        where: {
          userId: session.user.id,
          visibility: "PUBLIC",
          deletedAt: null,
        },
      }),
      prisma.file.count({
        where: {
          userId: session.user.id,
          deletedAt: { not: null },
        },
      }),
    ]);

  let nextCursor: string | null = null;
  const dbFiles = [...initialDbFiles];
  if (dbFiles.length > 20) {
    dbFiles.pop();
    nextCursor = dbFiles[dbFiles.length - 1]?.id ?? null;
  }

  const initialFiles: FileListItem[] = dbFiles.map((file) => ({
    id: file.id,
    originalName: file.originalName,
    mimeType: file.mimeType,
    size: Number(file.size),
    visibility: file.visibility,
    shareToken: file.shareToken,
    createdAt: file.createdAt.toISOString(),
    deletedAt: file.deletedAt?.toISOString() ?? null,
  }));

  const usedBytes = Number(userRecord?.usedStorage ?? 0);
  const limitBytes = Number(userRecord?.storageLimit ?? 1073741824);
  const usagePercent = Math.min(
    Math.round((usedBytes / limitBytes) * 100),
    100,
  );

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Left Sidebar */}
      <aside className="hidden md:flex w-64 flex-col justify-between border-r border-border bg-card p-4 shrink-0 sticky top-0 h-screen">
        <div className="space-y-6">
          {/* Brand header */}
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-foreground">
                Bangkar
              </h1>
              <p className="text-[11px] text-muted-foreground">
                Secure File Storage
              </p>
            </div>
          </div>

          {/* Navigation group */}
          <div className="space-y-1">
            <p className="px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Library
            </p>
            <nav className="space-y-1 pt-1">
              <Link
                href="/dashboard"
                aria-current={currentView === "all" ? "page" : undefined}
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  currentView === "all"
                    ? "bg-muted text-primary font-semibold"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Files className="h-4 w-4" />
                  <span>All files</span>
                </div>
                {totalCount > 0 && (
                  <Badge
                    variant={currentView === "all" ? "primary" : "default"}
                  >
                    {totalCount}
                  </Badge>
                )}
              </Link>

              <Link
                href="/dashboard?filter=public"
                aria-current={currentView === "public" ? "page" : undefined}
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  currentView === "public"
                    ? "bg-muted text-primary font-semibold"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Globe className="h-4 w-4" />
                  <span>Public</span>
                </div>
                {publicCount > 0 && (
                  <Badge
                    variant={currentView === "public" ? "primary" : "default"}
                  >
                    {publicCount}
                  </Badge>
                )}
              </Link>

              <Link
                href="/dashboard?view=trash"
                aria-current={currentView === "trash" ? "page" : undefined}
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  currentView === "trash"
                    ? "bg-muted text-primary font-semibold"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Trash2 className="h-4 w-4" />
                  <span>Trash</span>
                </div>
                {trashCount > 0 && (
                  <Badge
                    variant={currentView === "trash" ? "primary" : "default"}
                  >
                    {trashCount}
                  </Badge>
                )}
              </Link>
            </nav>
          </div>
        </div>

        {/* Sidebar Footer: Quota + User Card */}
        <div className="space-y-4 pt-4 border-t border-border">
          {/* Quota widget */}
          <div className="rounded-xl border border-border bg-muted/40 p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                <HardDrive className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Storage Quota</span>
              </div>
              <span className="text-muted-foreground">{usagePercent}%</span>
            </div>
            <Progress value={usagePercent} />
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>{formatBytes(usedBytes)} used</span>
              <span>{formatBytes(limitBytes)}</span>
            </div>
          </div>

          {/* User Card */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar
                name={userRecord?.name}
                email={userRecord?.email}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-foreground">
                  {userRecord?.name || userRecord?.email?.split("@")[0]}
                </p>
                <p className="truncate text-[10px] text-muted-foreground">
                  {userRecord?.email}
                </p>
              </div>
            </div>

            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                aria-label="Sign out"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-8 max-w-7xl overflow-y-auto">
        <DashboardClient
          key={currentView}
          initialFiles={initialFiles}
          initialNextCursor={nextCursor}
          currentView={currentView}
        />
      </main>
    </div>
  );
}
