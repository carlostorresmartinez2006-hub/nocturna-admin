"use client";
import { Trash2, X, Loader2 } from "lucide-react";

interface SelectionBarProps {
  count: number;
  onClear: () => void;
  onDelete?: () => void;
  deleting?: boolean;
}

function SelectionBar({ count, onClear, onDelete, deleting }: SelectionBarProps) {
  if (count === 0) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-3 bg-card/95 backdrop-blur border border-primary/30 rounded-xl px-4 py-2.5 shadow-2xl shadow-black/50">
        <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
        <span className="text-sm font-medium tabular-nums">
          {count} {count === 1 ? "elemento seleccionado" : "elementos seleccionados"}
        </span>
        <div className="w-px h-4 bg-border" />
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="text-xs text-destructive hover:text-destructive/80 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50 font-medium"
          >
            {deleting ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Trash2 className="w-3 h-3" />
            )}
            Eliminar ({count})
          </button>
        )}
        {onDelete && <div className="w-px h-4 bg-border" />}
        <button
          type="button"
          onClick={onClear}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 cursor-pointer"
        >
          <X className="w-3 h-3" />
          Limpiar
        </button>
      </div>
    </div>
  );
}

export { SelectionBar };
