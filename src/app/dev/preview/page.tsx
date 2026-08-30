"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
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
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  EmptyState,
  EmptyStateIcon,
  EmptyStateTitle,
  EmptyStateDescription,
  EmptyStateAction,
} from "@/components/ui/empty-state";
import { Avatar } from "@/components/ui/avatar";
import {
  FolderOpen,
  MoreVertical,
  Download,
  Trash2,
  Lock,
  Globe,
  Plus,
} from "lucide-react";

function PreviewContent() {
  const { toast } = useToast();
  const [switchVal, setSwitchVal] = useState(false);
  const [progressVal] = useState(65);

  return (
    <div className="min-h-screen bg-background text-foreground p-8 space-y-12 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Bangkar Design System</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Batch 5A UI Component Primitive Preview
        </p>
      </div>

      {/* Buttons */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">1. Buttons</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
          <Button size="icon" variant="secondary" aria-label="Add item">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </section>

      <Separator />

      {/* Inputs & Labels */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">2. Inputs & Labels</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label htmlFor="standard-input">Standard Input</Label>
            <Input id="standard-input" placeholder="Enter text..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="error-input">Error State</Label>
            <Input
              id="error-input"
              error
              helperText="This field is required"
              defaultValue="invalid@input"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sm-input">Small Input</Label>
            <Input id="sm-input" inputSize="sm" placeholder="Compact..." />
          </div>
        </div>
      </section>

      <Separator />

      {/* Badges & Avatars */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">3. Badges & Avatars</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="default">Default</Badge>
          <Badge variant="primary">
            <Globe className="h-3 w-3" /> Public
          </Badge>
          <Badge variant="muted">
            <Lock className="h-3 w-3" /> Private
          </Badge>
          <Badge variant="success">Active</Badge>
          <Badge variant="warning">Pending</Badge>
          <Badge variant="danger">Deleted</Badge>
          <div className="flex items-center gap-2 ml-6">
            <Avatar name="Alice Johnson" size="sm" />
            <Avatar name="Bob Smith" size="md" />
            <Avatar name="Charlie Brown" size="lg" />
          </div>
        </div>
      </section>

      <Separator />

      {/* Progress & Switch */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">4. Progress & Switch</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 items-center">
          <div className="space-y-3">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Quota Used</span>
              <span>{progressVal}%</span>
            </div>
            <Progress value={progressVal} />
            <Progress indeterminate />
          </div>
          <div className="flex items-center gap-3">
            <Switch
              id="preview-switch"
              checked={switchVal}
              onCheckedChange={setSwitchVal}
            />
            <Label htmlFor="preview-switch">
              Enable public sharing ({switchVal ? "ON" : "OFF"})
            </Label>
          </div>
        </div>
      </section>

      <Separator />

      {/* Card & Dialog & Dropdown & Tooltip & Toast */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">5. Interactive Overlays & Cards</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Storage Card</CardTitle>
              <CardDescription>
                Card surfaces use modern shadows instead of harsh borders.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Concentric border radius and clean slate styling.
              </p>
            </CardContent>
            <CardFooter className="gap-3">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="primary">Open Dialog</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Dialog Modal</DialogTitle>
                    <DialogDescription>
                      Wrapped Radix Dialog with smooth enter/exit animations.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4 text-sm">
                    This is inside the accessible dialog window.
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="secondary">Cancel</Button>
                    </DialogClose>
                    <Button variant="primary">Confirm</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary">
                    <MoreVertical className="h-4 w-4" /> Dropdown
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuItem>
                    <Download className="mr-2 h-4 w-4" /> Download
                  </DropdownMenuItem>
                  <DropdownMenuCheckboxItem checked={true}>
                    Public visibility
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="danger">
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost">Hover Tooltip</Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Helpful hint tooltip</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Toast Notifications</CardTitle>
              <CardDescription>
                Test toast triggers with semantic variants.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button
                variant="primary"
                onClick={() =>
                  toast({
                    title: "File uploaded successfully",
                    description: "report.pdf (2.4 MB) has been saved.",
                    variant: "success",
                  })
                }
              >
                Success Toast
              </Button>
              <Button
                variant="danger"
                onClick={() =>
                  toast({
                    title: "Upload failed",
                    description: "Quota limit exceeded.",
                    variant: "danger",
                  })
                }
              >
                Error Toast
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  toast({
                    title: "Information",
                    description: "Copied link to clipboard.",
                    variant: "default",
                  })
                }
              >
                Info Toast
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator />

      {/* Table */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">6. Table</h2>
        <Card className="p-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File Name</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">presentation.pdf</TableCell>
                <TableCell>14.2 MB</TableCell>
                <TableCell>
                  <Badge variant="primary">Public</Badge>
                </TableCell>
                <TableCell>application/pdf</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">database_backup.sql</TableCell>
                <TableCell>85.0 MB</TableCell>
                <TableCell>
                  <Badge variant="muted">Private</Badge>
                </TableCell>
                <TableCell>text/plain</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Card>
      </section>

      <Separator />

      {/* Skeleton & Empty State */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">7. Skeletons & Empty State</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="space-y-3">
            <Skeleton variant="text" className="w-1/2" />
            <Skeleton variant="rectangular" className="h-20 w-full" />
            <div className="flex gap-2">
              <Skeleton variant="circular" className="h-8 w-8" />
              <Skeleton variant="text" className="flex-1 mt-2" />
            </div>
          </Card>

          <EmptyState>
            <EmptyStateIcon>
              <FolderOpen className="h-6 w-6" />
            </EmptyStateIcon>
            <EmptyStateTitle>No files found</EmptyStateTitle>
            <EmptyStateDescription>
              Drag and drop files here or click upload.
            </EmptyStateDescription>
            <EmptyStateAction>
              <Button variant="primary">Upload Now</Button>
            </EmptyStateAction>
          </EmptyState>
        </div>
      </section>
    </div>
  );
}

export default function DesignSystemPreviewPage() {
  return (
    <ToastProvider>
      <PreviewContent />
    </ToastProvider>
  );
}
