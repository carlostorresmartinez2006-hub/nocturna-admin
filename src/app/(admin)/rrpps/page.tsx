import { asegurarAdmin } from "@/lib/auth/admin";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, ChevronRight, Handshake } from "lucide-react";
import { euros } from "@/app/(admin)/fourvenues/formato";
import NuevoRrpp from "./NuevoRrpp";

// Relaciones públicas de Nocturna (Nocturna/supabase/rrpps.sql). Las ventas las registran solos los
// triggers de la base de datos cuando una compra con su código se paga de verdad.
export const dynamic = "force-dynamic";

// Los errores de los últimos 30 días
const hace30Dias = () => new Date(Date.now() - 30 * 86400000).toISOString();

const fecha = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Madrid" }) : "—";

export default async function RrppsPage() {
  await asegurarAdmin();
  const supabase = createAdminClient();
  const hace30 = hace30Dias();

  const [{ data: rrpps, error: e1 }, { data: resumen, error: e2 }, { data: errores }] = await Promise.all([
    supabase.from("rrpps").select("*").order("activo", { ascending: false }).order("nombre"),
    supabase.from("rrpp_resumen").select("*"),
    supabase.from("rrpp_errores").select("*").gte("created_at", hace30).order("created_at", { ascending: false }).limit(20),
  ]);

  const error = e1 ?? e2;
  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Handshake className="w-6 h-6 text-primary" /> RRPPs</h1>
        <p className="mt-4 text-sm text-red-400">
          No se han podido leer los RRPP: {error.message}. Si es la primera vez, falta ejecutar supabase/rrpps.sql (repo Nocturna) en el SQL Editor de Supabase.
        </p>
      </div>
    );
  }

  const porId = new Map((resumen ?? []).map((r) => [r.rrpp_id, r]));
  const lista = (rrpps ?? []).map((p) => ({ ...p, r: porId.get(p.id) }));
  const suma = (k: "pendiente_calculado" | "pendientes_sin_comision" | "pagables" | "pagado_euros" | "a_descontar_euros" | "ventas" | "pendientes") =>
    lista.reduce((s, x) => s + Number(x.r?.[k] ?? 0), 0);
  // Lo calculado solo se enseña si alguna pendiente tiene comisión fijada
  const calculado = (pendientes: number, sinComision: number, euro: number) => (pendientes > sinComision ? ` · ${euros(euro)} calculado` : "");

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Handshake className="w-6 h-6 text-primary" /> RRPPs
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Relaciones públicas de Nocturna. Cada entrada que se compra en la app con su código suma una venta cuando la compra se ha pagado de
          verdad (la lee el robot de ventas de Fourvenues o la confirma el pago dentro de la app). Las listas gratis, las compras del propio RRPP
          y las entradas anuladas no cuentan. En el perfil de cada uno ves lo que ha vendido en cada discoteca y le pagas según lo que te pague
          cada discoteca (o con la comisión que le fijes en cada una).
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Entradas sin pagar",
            value: suma("pendientes"),
            sub: `${suma("pagables")} ya se pueden pagar${calculado(suma("pendientes"), suma("pendientes_sin_comision"), suma("pendiente_calculado"))}`,
          },
          { label: "Pagado en total", value: euros(suma("pagado_euros")) },
          { label: "Entradas vendidas", value: suma("ventas") },
          { label: "A descontar (anuladas tras pagar)", value: euros(suma("a_descontar_euros")), alerta: suma("a_descontar_euros") > 0 },
        ].map(({ label, value, sub, alerta }) => (
          <Card key={label} className={alerta ? "border-amber-500/40" : undefined}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${alerta ? "text-amber-400" : ""}`}>{value}</p>
              {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {(errores ?? []).length > 0 && (
        <Card className="border-red-500/40">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-4 h-4" /> Errores al registrar ventas (últimos 30 días)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs">
            <p className="text-muted-foreground mb-2">
              Estas compras no se han podido revisar para los RRPP (la compra sí se guardó). Pásale el error a quien mantenga la base de datos.
            </p>
            {(errores ?? []).map((e) => (
              <p key={e.id} className="font-mono">
                {new Date(e.created_at).toLocaleString("es-ES", { timeZone: "Europe/Madrid" })} · {e.origen} · {e.ref ?? "—"} · {e.error}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      <NuevoRrpp />

      <Card>
        <CardContent className="p-0">
          {lista.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">Aún no hay ningún RRPP. Añade el primero con el botón de arriba.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="text-left font-medium px-4 py-3">RRPP</th>
                    <th className="text-left font-medium px-4 py-3">Código</th>
                    <th className="text-right font-medium px-4 py-3">Discotecas</th>
                    <th className="text-right font-medium px-4 py-3">Vendidas</th>
                    <th className="text-right font-medium px-4 py-3">Sin pagar</th>
                    <th className="text-right font-medium px-4 py-3">Pagado</th>
                    <th className="text-left font-medium px-4 py-3">Última venta</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {lista.map((p) => (
                    <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <Link href={`/rrpps/${p.id}`} className="font-medium hover:underline">{p.nombre}</Link>
                        {!p.activo && <Badge variant="outline" className="ml-2 text-[10px]">Desactivado</Badge>}
                        {p.email && <p className="text-xs text-muted-foreground">{p.email}</p>}
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold">{p.codigo}</td>
                      <td className="px-4 py-3 text-right">{p.r?.discotecas ?? 0}</td>
                      <td className="px-4 py-3 text-right">{p.r?.ventas ?? 0}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={(p.r?.pendientes ?? 0) > 0 ? "font-semibold text-primary" : "text-muted-foreground"}>
                          {p.r?.pendientes ?? 0} {(p.r?.pendientes ?? 0) === 1 ? "entrada" : "entradas"}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {p.r?.pagables ?? 0} ya
                          {calculado(p.r?.pendientes ?? 0, p.r?.pendientes_sin_comision ?? 0, Number(p.r?.pendiente_calculado ?? 0))}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">{euros(Number(p.r?.pagado_euros ?? 0))}</td>
                      <td className="px-4 py-3 text-muted-foreground">{fecha(p.r?.ultima_venta ?? null)}</td>
                      <td className="px-4 py-3">
                        <Link href={`/rrpps/${p.id}`} className="text-muted-foreground hover:text-foreground"><ChevronRight className="w-4 h-4" /></Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
