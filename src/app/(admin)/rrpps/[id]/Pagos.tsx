"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deshacerLiquidacion } from "@/app/actions/rrpps";
import { euros } from "@/app/(admin)/fourvenues/formato";

// Fechas ya formateadas en el servidor
export interface PagoFila {
  id: number;
  pagada: string;
  importe: number;
  numVentas: number;
  numDescontadas: number;
  nota: string | null;
  por: string | null;
  deshecha: string | null;
  deshechaPor: string | null;
}

function Deshacer({ rrppId, pago }: { rrppId: string; pago: PagoFila }) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const hacer = () => {
    const texto =
      `¿Deshacer el pago #${pago.id} de ${euros(pago.importe)}? Sus ${pago.numVentas} ventas volverán a estar pendientes de pagar` +
      (pago.numDescontadas ? ` y las ${pago.numDescontadas} descontadas volverán a estar pendientes de descontar.` : ".");
    if (!confirm(texto)) return;
    startTransition(async () => {
      const r = await deshacerLiquidacion(rrppId, pago.id);
      if (!r.ok) alert(r.error);
      router.refresh();
    });
  };
  return (
    <Button size="xs" variant="ghost" onClick={hacer} disabled={pendiente} className="gap-1">
      {pendiente ? <Loader2 className="w-3 h-3 animate-spin" /> : <Undo2 className="w-3 h-3" />} Deshacer
    </Button>
  );
}

export default function Pagos({ rrppId, pagos }: { rrppId: string; pagos: PagoFila[] }) {
  if (pagos.length === 0) return <p className="text-sm text-muted-foreground">Aún no se le ha pagado nada.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-xs text-muted-foreground">
            <th className="text-left font-medium px-2 py-2">Pago</th>
            <th className="text-left font-medium px-2 py-2">Fecha</th>
            <th className="text-right font-medium px-2 py-2">Ventas</th>
            <th className="text-right font-medium px-2 py-2">Importe</th>
            <th className="text-left font-medium px-2 py-2">Nota</th>
            <th className="text-left font-medium px-2 py-2">Marcado por</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {pagos.map((p) => (
            <tr key={p.id} className={`border-b border-border last:border-0 ${p.deshecha ? "opacity-50" : ""}`}>
              <td className="px-2 py-2 font-mono">#{p.id}</td>
              <td className="px-2 py-2 whitespace-nowrap">{p.pagada}</td>
              <td className="px-2 py-2 text-right">
                {p.numVentas}
                {p.numDescontadas ? <span className="block text-xs text-muted-foreground">−{p.numDescontadas} descontadas</span> : null}
              </td>
              <td className={`px-2 py-2 text-right font-medium ${p.deshecha ? "line-through" : ""}`}>{euros(p.importe)}</td>
              <td className="px-2 py-2 text-muted-foreground">{p.nota ?? "—"}</td>
              <td className="px-2 py-2 text-muted-foreground">{p.por ?? "—"}</td>
              <td className="px-2 py-2 text-right">
                {p.deshecha ? (
                  <Badge variant="outline" title={`Deshecho por ${p.deshechaPor ?? "—"}`}>Deshecho el {p.deshecha}</Badge>
                ) : (
                  <Deshacer rrppId={rrppId} pago={p} />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
