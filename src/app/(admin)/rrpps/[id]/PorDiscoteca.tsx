import { Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { euros } from "@/app/(admin)/fourvenues/formato";
import type { Database } from "@/types/database";
import ComisionDiscoteca, { NuevaComision, type Comision } from "./ComisionDiscoteca";

export type FilaDiscoteca = Database["public"]["Views"]["rrpp_por_local"]["Row"] & { nombre: string };

// Lo que ha vendido un RRPP en cada discoteca, con su comisión en cada una (editable) y lo calculado.
// Es lo que hace falta para saber cuánto pagarle: cada discoteca paga a Nocturna lo suyo.
export default function PorDiscoteca({ rrppId, filas, comisiones, otras }: {
  rrppId: string;
  filas: FilaDiscoteca[];
  /** Comisión fijada en cada discoteca (por local_id) */
  comisiones: Record<string, Comision>;
  /** Discotecas donde no ha vendido ni tiene comisión (para fijarla de antemano) */
  otras: { id: string; nombre: string }[];
}) {
  const total = (k: "ventas" | "pendientes" | "pendiente_facturado" | "pendiente_calculado" | "pendientes_sin_comision" | "pagado") =>
    filas.reduce((s, r) => s + Number(r[k] ?? 0), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2"><Building2 className="w-4 h-4 text-primary" /> Por discoteca</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-0">
        <p className="px-4 text-xs text-muted-foreground">
          Las entradas que ha vendido en cada discoteca. Con lo que te pague cada una decides lo que le pagas. Si quieres, fíjale una comisión en cada
          discoteca (€ por entrada o % del precio) y el panel te lo calcula; cambiarla no toca lo ya pagado.
        </p>
        {filas.length === 0 ? (
          <p className="px-4 text-sm text-muted-foreground">Aún no ha vendido ninguna entrada.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-border text-xs text-muted-foreground">
                  <th className="text-left font-medium px-4 py-2">Discoteca</th>
                  <th className="text-right font-medium px-4 py-2">Vendidas</th>
                  <th className="text-right font-medium px-4 py-2">Sin pagar</th>
                  <th className="text-right font-medium px-4 py-2">En entradas (sin pagar)</th>
                  <th className="text-left font-medium px-4 py-2">Su comisión</th>
                  <th className="text-right font-medium px-4 py-2">Calculado (sin pagar)</th>
                  <th className="text-right font-medium px-4 py-2">Pagado</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((r) => (
                  <tr key={r.local_id ?? "sin"} className="border-b border-border last:border-0">
                    <td className="px-4 py-2 font-medium">{r.nombre}</td>
                    <td className="px-4 py-2 text-right">{r.ventas}</td>
                    <td className="px-4 py-2 text-right">
                      <span className={r.pendientes > 0 ? "font-semibold text-primary" : "text-muted-foreground"}>{r.pendientes}</span>
                      {r.pendientes > 0 && <span className="block text-xs text-muted-foreground">{r.pagables} ya se {r.pagables === 1 ? "puede" : "pueden"} pagar</span>}
                    </td>
                    <td className="px-4 py-2 text-right">{r.pendientes > 0 ? euros(Number(r.pendiente_facturado)) : "—"}</td>
                    <td className="px-4 py-2">
                      {r.local_id ? (
                        <ComisionDiscoteca rrppId={rrppId} localId={r.local_id} comision={comisiones[r.local_id] ?? null} />
                      ) : (
                        <span className="text-xs text-muted-foreground">Fiestas sin discoteca: pon lo que le pagas al pagar</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {r.pendientes === 0 || r.pendientes_sin_comision === r.pendientes ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <>
                          {euros(Number(r.pendiente_calculado))}
                          {r.pendientes_sin_comision > 0 && <span className="block text-xs text-muted-foreground">+{r.pendientes_sin_comision} sin calcular</span>}
                        </>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {euros(Number(r.pagado))}
                      {r.a_descontar > 0 && <span className="block text-xs text-amber-400">{euros(Number(r.a_descontar_euros))} a descontar</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
              {filas.length > 1 && (
                <tfoot>
                  <tr className="border-t border-border font-semibold">
                    <td className="px-4 py-2">Total</td>
                    <td className="px-4 py-2 text-right">{total("ventas")}</td>
                    <td className="px-4 py-2 text-right">{total("pendientes")}</td>
                    <td className="px-4 py-2 text-right">{euros(total("pendiente_facturado"))}</td>
                    <td />
                    <td className="px-4 py-2 text-right">
                      {total("pendientes") > total("pendientes_sin_comision") ? euros(total("pendiente_calculado")) : "—"}
                    </td>
                    <td className="px-4 py-2 text-right">{euros(total("pagado"))}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
        <div className="px-4 pb-4">
          <NuevaComision rrppId={rrppId} discotecas={otras} />
        </div>
      </CardContent>
    </Card>
  );
}
