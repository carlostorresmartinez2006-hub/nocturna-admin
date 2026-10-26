import { asegurarAdmin } from "@/lib/auth/admin";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Ban, CalendarDays, ArrowLeft, Handshake, KeyRound, Wallet } from "lucide-react";
import { euros } from "@/app/(admin)/fourvenues/formato";
import type { Database } from "@/types/database";
import VentasPendientes, { type VentaFila } from "./VentasPendientes";
import Pagos, { type PagoFila } from "./Pagos";
import EditarRrpp from "./EditarRrpp";
import CorregirVenta from "./CorregirVenta";

export const dynamic = "force-dynamic";

type Venta = Database["public"]["Tables"]["rrpp_ventas"]["Row"];

// Las fechas se formatean aquí (en el servidor y en hora de Madrid) para que el navegador no las
// pinte distinto y no haya desajustes al hidratar
const fechaHora = (iso: string) =>
  new Date(iso).toLocaleString("es-ES", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });

// Una venta se puede pagar 12 h después de que empiece la fiesta (como rrpp_liquidar)
const ESPERA_MS = 12 * 3600 * 1000;
const ahora = () => Date.now();

// Supabase devuelve como mucho 1000 filas por consulta: se piden por páginas hasta tenerlas todas
async function todas<T>(
  pagina: (desde: number, hasta: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<{ data: T[]; error: string | null }> {
  const filas: T[] = [];
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await pagina(desde, desde + 999);
    if (error) return { data: filas, error: error.message };
    filas.push(...(data ?? []));
    if (!data || data.length < 1000) return { data: filas, error: null };
  }
}

const MAX_LISTA = 300;

export default async function RrppPage({ params }: { params: Promise<{ id: string }> }) {
  await asegurarAdmin();
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();
  const supabase = createAdminClient();
  const ventasDe = () => supabase.from("rrpp_ventas").select("*").eq("rrpp_id", id);

  const [rRrpp, rResumen, rFiestas, rPagos, rCodigos, rPendientes, rDescontar, rNoCuentan, rPagadas] = await Promise.all([
    supabase.from("rrpps").select("*").eq("id", id).maybeSingle(),
    supabase.from("rrpp_resumen").select("*").eq("rrpp_id", id).maybeSingle(),
    supabase.from("rrpp_por_fiesta").select("*").eq("rrpp_id", id).order("evento_inicio", { ascending: false, nullsFirst: false }).limit(500),
    todas((a, b) => supabase.from("rrpp_liquidaciones").select("*").eq("rrpp_id", id).order("pagada_at", { ascending: false }).order("id").range(a, b)),
    supabase.from("rrpp_codigos").select("*").eq("rrpp_id", id).order("desde", { ascending: false }),
    // Todas las pendientes y las de descontar (son las que se pagan); del resto, las más recientes
    todas((a, b) => ventasDe().eq("estado", "valida").is("liquidacion_id", null).order("vendida_at", { ascending: false }).order("id").range(a, b)),
    todas((a, b) => ventasDe().eq("estado", "anulada").not("liquidacion_id", "is", null).is("descontada_en", null).order("vendida_at", { ascending: false }).order("id").range(a, b)),
    supabase.from("rrpp_ventas").select("*", { count: "exact" }).eq("rrpp_id", id).neq("estado", "valida").is("liquidacion_id", null)
      .order("vendida_at", { ascending: false }).limit(MAX_LISTA),
    ventasDe().not("liquidacion_id", "is", null).order("vendida_at", { ascending: false }).limit(MAX_LISTA),
  ]);

  const fallo =
    rRrpp.error?.message ?? rResumen.error?.message ?? rFiestas.error?.message ?? rPagos.error ?? rCodigos.error?.message ??
    rPendientes.error ?? rDescontar.error ?? rNoCuentan.error?.message ?? rPagadas.error?.message;
  if (fallo) {
    // Con datos a medias se podría pagar mal: mejor no enseñar nada
    return (
      <div className="p-8 space-y-4">
        <Link href="/rrpps" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> RRPPs
        </Link>
        <p className="text-sm text-red-400">No se han podido leer los datos de este RRPP: {fallo}. Recarga la página.</p>
      </div>
    );
  }
  const rrpp = rRrpp.data;
  if (!rrpp) notFound();
  const resumen = rResumen.data;
  const pagos = rPagos.data;
  const noCuentan = rNoCuentan.data ?? [];
  const pagadas = rPagadas.data ?? [];

  // Nombres de los compradores, de su cuenta en la app y de quien marcó cada pago
  const ids = [...new Set([
    ...[...rPendientes.data, ...rDescontar.data, ...noCuentan, ...pagadas].map((v) => v.user_id),
    rrpp.user_id,
    ...pagos.flatMap((p) => [p.creada_por, p.deshecha_por]),
  ].filter((x): x is string => !!x))];
  const perfil = new Map<string, { id: string; username: string | null; email: string }>();
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await supabase.from("profiles").select("id, username, email").in("id", ids.slice(i, i + 200));
    // Sin los perfiles, el formulario mostraría vacía su cuenta de la app y guardarlo la desvincularía
    if (error) {
      return <p className="p-8 text-sm text-red-400">No se han podido leer las cuentas de la app: {error.message}. Recarga la página.</p>;
    }
    for (const p of data ?? []) perfil.set(p.id, p);
  }
  const nombre = (uid: string | null) => {
    if (!uid) return "cuenta borrada";
    const p = perfil.get(uid);
    return p?.username ? `@${p.username}` : p?.email ?? "cuenta borrada";
  };

  const t = ahora();
  const fila = (v: Venta): VentaFila => {
    // Sin fecha de la fiesta no se puede pagar (rrpp_liquidar lo rechaza)
    const pagableDesde = v.evento_inicio ? new Date(v.evento_inicio).getTime() + ESPERA_MS : null;
    return {
      id: v.id,
      fiesta: v.evento_titulo ?? "Fiesta borrada",
      eventoId: v.evento_id,
      vendida: fechaHora(v.vendida_at),
      origen: v.origen,
      precio: v.precio === null ? null : Number(v.precio),
      comision: Number(v.comision),
      comprador: nombre(v.user_id),
      compradorId: v.user_id,
      motivo: v.motivo,
      pagable: pagableDesde !== null && pagableDesde <= t,
      pagableDesde: pagableDesde === null ? "cuando la fiesta tenga fecha" : `desde el ${fechaHora(new Date(pagableDesde).toISOString())}`,
      liquidacionId: v.liquidacion_id,
    };
  };
  // Al leer por páginas mientras entran ventas, una fila puede salir en dos páginas: se quita la repetida
  const unicas = (xs: Venta[]) => [...new Map(xs.map((v) => [v.id, v])).values()];
  const pendientes = unicas(rPendientes.data).map(fila);
  const aDescontar = unicas(rDescontar.data).map(fila);
  const fiestas = rFiestas.data ?? [];
  const personas = resumen?.personas ?? 0;

  const pagosFilas: PagoFila[] = pagos.map((p) => ({
    id: p.id,
    pagada: fechaHora(p.pagada_at),
    importe: Number(p.importe),
    numVentas: p.num_ventas,
    numDescontadas: p.num_descontadas ?? 0,
    nota: p.nota,
    por: p.creada_por ? nombre(p.creada_por) : null,
    deshecha: p.deshecha_at ? fechaHora(p.deshecha_at) : null,
    deshechaPor: p.deshecha_por ? nombre(p.deshecha_por) : null,
  }));
  const nPagadas = resumen?.pagadas ?? 0;
  const nNoCuentan = rNoCuentan.count ?? noCuentan.length;

  return (
    <div className="p-8 space-y-6">
      <div className="space-y-2">
        <Link href="/rrpps" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> RRPPs
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-3 flex-wrap">
          <Handshake className="w-6 h-6 text-primary" /> {rrpp.nombre}
          <Badge className="font-mono text-sm">{rrpp.codigo}</Badge>
          {!rrpp.activo && <Badge variant="destructive">Desactivado: su código no funciona</Badge>}
        </h1>
        <p className="text-sm text-muted-foreground">
          {euros(Number(rrpp.comision_entrada))} por entrada
          {rrpp.email ? ` · ${rrpp.email}` : ""}
          {rrpp.telefono ? ` · ${rrpp.telefono}` : ""}
          {rrpp.user_id ? ` · cuenta en la app: ${nombre(rrpp.user_id)}` : " · sin cuenta en la app vinculada"}
        </p>
        {rrpp.notas && <p className="text-sm whitespace-pre-wrap">{rrpp.notas}</p>}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Pendiente de pagar",
            value: euros(Number(resumen?.pendiente_euros ?? 0)),
            sub: `${resumen?.pendientes ?? 0} ventas · ${euros(Number(resumen?.pagable_euros ?? 0))} ya se pueden pagar`,
            destaca: (resumen?.pendientes ?? 0) > 0,
          },
          {
            label: "Pagado",
            value: euros(Number(resumen?.pagado_euros ?? 0)),
            sub: `${nPagadas} ventas${(resumen?.a_descontar ?? 0) > 0 ? ` · ${euros(Number(resumen?.a_descontar_euros ?? 0))} a descontar` : ""}`,
          },
          { label: "Ventas válidas (total)", value: resumen?.ventas ?? 0, sub: `${euros(Number(resumen?.facturado_euros ?? 0))} en entradas` },
          { label: "Han puesto su código", value: personas, sub: personas === 1 ? "persona" : "personas" },
        ].map(({ label, value, sub, destaca }) => (
          <Card key={label} className={destaca ? "border-primary/40" : undefined}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${destaca ? "text-primary" : ""}`}>{value}</p>
              <p className="text-xs text-muted-foreground mt-1">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2"><Wallet className="w-4 h-4 text-primary" /> Pendientes de pagar</CardTitle>
        </CardHeader>
        <CardContent>
          <VentasPendientes rrppId={rrpp.id} ventas={pendientes} aDescontar={aDescontar} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Pagos hechos</CardTitle>
        </CardHeader>
        <CardContent>
          <Pagos rrppId={rrpp.id} pagos={pagosFilas} />
        </CardContent>
      </Card>

      {fiestas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2"><CalendarDays className="w-4 h-4 text-primary" /> Ventas por fiesta</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-border text-xs text-muted-foreground">
                  <th className="text-left font-medium px-4 py-2">Fiesta</th>
                  <th className="text-right font-medium px-4 py-2">Entradas</th>
                  <th className="text-right font-medium px-4 py-2">En entradas</th>
                  <th className="text-right font-medium px-4 py-2">Comisión</th>
                </tr>
              </thead>
              <tbody>
                {fiestas.map((f) => (
                  <tr key={`${f.evento_id}-${f.evento_titulo}`} className="border-b border-border last:border-0">
                    <td className="px-4 py-2">
                      {f.evento_id ? <Link href={`/eventos/${f.evento_id}`} className="hover:underline">{f.evento_titulo ?? "Fiesta"}</Link> : f.evento_titulo ?? "Fiesta borrada"}
                      {f.evento_inicio && <span className="text-xs text-muted-foreground"> · {fechaHora(f.evento_inicio)}</span>}
                    </td>
                    <td className="px-4 py-2 text-right">{f.ventas}</td>
                    <td className="px-4 py-2 text-right">{euros(Number(f.facturado))}</td>
                    <td className="px-4 py-2 text-right">{euros(Number(f.comision))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {noCuentan.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2"><Ban className="w-4 h-4 text-muted-foreground" /> No cuentan ({nNoCuentan})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <p className="px-4 pb-3 text-xs text-muted-foreground">
              Entradas compradas con su código que no suman: anuladas o reembolsadas, de fiestas canceladas, listas gratis, compras del propio RRPP o
              sin precio. Si una es un error, puedes contarla igualmente (salvo las anuladas o reembolsadas en Fourvenues).
            </p>
            <table className="w-full text-sm">
              <tbody>
                {noCuentan.map((v) => (
                  <tr key={v.id} className="border-t border-border">
                    <td className="px-4 py-2 whitespace-nowrap text-muted-foreground">{fechaHora(v.vendida_at)}</td>
                    <td className="px-4 py-2">{v.evento_titulo ?? "Fiesta borrada"}</td>
                    <td className="px-4 py-2">{nombre(v.user_id)}</td>
                    <td className="px-4 py-2">
                      <Badge variant="outline">{v.estado === "anulada" ? "Anulada" : "Excluida"}</Badge>{" "}
                      <span className="text-xs text-muted-foreground">{v.motivo}</span>
                    </td>
                    <td className="px-4 py-2 text-right">{!v.anulada_origen && <CorregirVenta rrppId={rrpp.id} ventaId={v.id} accion="valida" />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {nNoCuentan > noCuentan.length && <p className="px-4 py-2 text-xs text-muted-foreground">Se muestran las {noCuentan.length} más recientes.</p>}
          </CardContent>
        </Card>
      )}

      {pagadas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Ventas incluidas en pagos</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <tbody>
                {pagadas.map((v) => (
                  <tr key={v.id} className="border-t border-border">
                    <td className="px-4 py-2 whitespace-nowrap text-muted-foreground">{fechaHora(v.vendida_at)}</td>
                    <td className="px-4 py-2">{v.evento_titulo ?? "Fiesta borrada"}</td>
                    <td className="px-4 py-2">{nombre(v.user_id)}</td>
                    <td className="px-4 py-2 text-right">{euros(Number(v.comision))}</td>
                    <td className="px-4 py-2 text-right text-xs text-muted-foreground">
                      pago #{v.liquidacion_id}
                      {v.estado !== "valida" && (v.descontada_en ? ` · anulada, descontada en el pago #${v.descontada_en}` : " · anulada, a descontar")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pagadas.length >= MAX_LISTA && <p className="px-4 py-2 text-xs text-muted-foreground">Se muestran las {MAX_LISTA} más recientes.</p>}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2"><KeyRound className="w-4 h-4 text-primary" /> Datos, código y estado</CardTitle>
        </CardHeader>
        <CardContent>
          <EditarRrpp
            key={rrpp.updated_at}
            rrpp={{
              id: rrpp.id,
              nombre: rrpp.nombre,
              comision: Number(rrpp.comision_entrada),
              email: rrpp.email,
              telefono: rrpp.telefono,
              notas: rrpp.notas,
              cuentaApp: rrpp.user_id ? (perfil.get(rrpp.user_id)?.email || (perfil.get(rrpp.user_id)?.username ? `@${perfil.get(rrpp.user_id)?.username}` : rrpp.user_id)) : "",
              codigo: rrpp.codigo,
              activo: rrpp.activo,
              tieneVentas: (resumen?.ventas ?? 0) + (resumen?.anuladas ?? 0) + (resumen?.excluidas ?? 0) > 0 || pagos.length > 0,
            }}
            codigos={(rCodigos.data ?? []).map((c) => ({ codigo: c.codigo, desde: fechaHora(c.desde), hasta: c.hasta ? fechaHora(c.hasta) : null }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
