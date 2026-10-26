"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { corregirVenta } from "@/app/actions/rrpps";

// Corrección a mano: anular una venta válida pendiente (p. ej. fraude) o contar una que no cuenta
export default function CorregirVenta({ rrppId, ventaId, accion }: { rrppId: string; ventaId: number; accion: "valida" | "anulada" }) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();

  const hacer = () => {
    const motivo =
      accion === "anulada"
        ? prompt("¿Por qué la anulas? (se guarda en la venta)", "")
        : prompt("¿Por qué cuenta igualmente? (p. ej. comprobado que se pagó)", "");
    if (motivo === null) return;
    startTransition(async () => {
      const r = await corregirVenta(rrppId, ventaId, accion, motivo);
      if (!r.ok) alert(r.error);
      router.refresh();
    });
  };

  if (pendiente) return <Loader2 className="w-4 h-4 animate-spin text-muted-foreground inline" />;
  return (
    <Button size="xs" variant={accion === "anulada" ? "ghost" : "outline"} onClick={hacer}>
      {accion === "anulada" ? "Anular" : "Contar igualmente"}
    </Button>
  );
}
