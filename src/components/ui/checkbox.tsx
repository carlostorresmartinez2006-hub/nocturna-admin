"use client";
import { Check, Minus } from "lucide-react";
import { cn } from "cn";

interface CheckboxProps {
  checked?: boolean;
  indeterminate?: boolean;
  onChange?: () => void;
  className?: string;
}

function Checkbox({ checked = false, indeterminate = false, onChange, className }: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : checked}
      onClick={(e) => {
        e.stopPropagation();
        onChange?.();
      }}
      className={cn(
        "w-4 h-4 rounded border transition-all flex items-center justify-center shrink-0 cursor-pointer",
        "outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1 focus-visible:ring-offset-background",
        checked || indeterminate
          ? "bg-primary border-primary"
          : "border-border bg-transparent hover:border-primary/60",
        className
      )}
    >
      {indeterminate ? (
        <Minus className="w-2.5 h-2.5 text-white" strokeWidth={3} />
      ) : checked ? (
        <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
      ) : null}
    </button>
  );
}

export { Checkbox };
