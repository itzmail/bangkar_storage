import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";

export const metadata: Metadata = {
  title: {
    absolute: "Bangkar — Secure File Storage",
  },
  description: "Upload, manage, and share files with end-to-end OWASP-aligned hardening.",
};


export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md mb-6">
        <Shield className="h-8 w-8" />
      </div>
      <h1 className="text-4xl font-bold tracking-tight">Bangkar</h1>
      <p className="mt-3 max-w-md text-balance text-muted-foreground">
        Secure file storage. Upload, manage, and share large files with
        end-to-end OWASP-aligned hardening.
      </p>
      <div className="mt-8 flex gap-3 text-sm">
        <Button asChild variant="primary" size="lg">
          <Link href="/login">Sign in</Link>
        </Button>
        <Button asChild variant="secondary" size="lg">
          <Link href="/register">Create account</Link>
        </Button>
      </div>
    </div>
  );
}
