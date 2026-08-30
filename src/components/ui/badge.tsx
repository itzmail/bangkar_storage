import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium select-none transition-colors",
  {
    variants: {
      variant: {
        default:
          "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
        primary:
          "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300",
        success:
          "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
        warning:
          "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
        danger:
          "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300",
        muted:
          "bg-muted text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
