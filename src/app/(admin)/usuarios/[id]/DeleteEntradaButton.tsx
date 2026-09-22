"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { deleteEntrada } from "@/app/actions/entradas";

export default function DeleteEntradaButton({ entradaId, userId }: { entradaId: string; userId?: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("¿Eliminar esta entrada?")) return;
    startTransition(async () => {
      await deleteEntrada(entradaId, userId);
      router.refresh();
    });
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
    >
      {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
    </button>
  );
}
