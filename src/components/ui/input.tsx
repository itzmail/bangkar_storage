import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  inputSize?: "sm" | "md";
  error?: boolean;
  helperText?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = "text",
      inputSize = "md",
      error = false,
      helperText,
      ...props
    },
    ref,
  ) => {
    return (
      <div className="w-full space-y-1">
        <input
          type={type}
          className={cn(
            "flex w-full rounded-lg border bg-background text-foreground transition-[color,background-color,border-color,box-shadow] duration-150 ease-out file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
            inputSize === "sm" ? "h-8 px-2.5 text-xs rounded-md" : "h-9 px-3 text-sm rounded-lg",
            error
              ? "border-danger focus-visible:ring-2 focus-visible:ring-danger/40"
              : "border-border focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary",
            className,
          )}
          ref={ref}
          {...props}
        />
        {helperText && (
          <p
            className={cn(
              "text-xs font-medium",
              error ? "text-danger" : "text-muted-foreground",
            )}
          >
            {helperText}
          </p>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";

export { Input };
