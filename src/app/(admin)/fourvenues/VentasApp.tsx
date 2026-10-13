import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BellRing, PlugZap, ReceiptText, Smartphone } from "lucide-react";
import { euros } from "./formato";

// Ventas dentro de la app con el Channel Manager de Fourvenues (repo Nocturna,
// supabase/functions/fv-canal y fv-webhook, tablas de supabase/fourvenues_canal.sql).
// De fv_config solo se leen las filas ultimo_mantenimiento_*: el resto son secretos.

type Entorno = "produccion" | "alpha";
const ENTORNOS: { clave: Entorno; param: string; label: string }[] = [
  { clave: "produccion", param: "real", label: "Real" },
  { clave: "alpha", param: "pruebas", label: "Pruebas" },
];

const ESTADOS: Record<string, { label: string; clase: string }> = {
  pendiente: { label: "Pendiente de pago", clase: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  pagado: { label: "Pagado", clase: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  apuntado: { label: "Apuntado", clase: "bg-sky-500/20 text-sky-400 border-sky-500/30" },
  caducado: { label: "Caducado", clase: "" },
  error: { label: "Error", clase: "bg-red-500/20 text-red-400 border-red-500/30" },
  reembolsado: { label: "Reembolsado", clase: "bg-violet-500/20 text-violet-400 border-violet-500/30" },
};

const AVISOS: Record<string, string> = {
  "payment.success": "Pago confirmado",
  "ticket.request_refund": "Entrada reembolsada",
};

// Resumen que deja el mantenimiento automático (cada 10 min) en fv_config
type Mantenimiento = {
  entorno?: string;
  webhook?: string;
  hosts?: unknown;
  eventos_vistos?: number;
  fiestas_enlazadas?: number;
  avisos_reintentados?: number;
  errores?: unknown;
  at?: string;
};

type Resumen = { tipo: string; entorno: string; estado: string; cantidad: number; total: number | null };
type Aviso = { id: string; evento: string | null; recibido_at: string; procesado_at: string | null; error: string | null; payment_id: string | null };

const MINUTOS_AVISO = 30;
// Hora actual fuera del render (regla de pureza de React)
const ahoraMs = () => Date.now();
const inicioProximos = () => new Date(Date.now() - 12 * 3600 * 1000).toISOString();

function haceCuanto(ms: number) {
  const min = Math.round(ms / 60000);
  if (min < 1) return "ahora mismo";
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  return h < 48 ? `hace ${h} h` : `hace ${Math.round(h / 24)} días`;
}

const fechaHora = (iso: string) =>
  new Date(iso).toLocaleString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });

const badgeEntorno = (entorno: string) =>
  entorno === "produccion" ? (
    <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">Real</Badge>
  ) : (
    <Badge variant="secondary" className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">Pruebas</Badge>
  );

const enlaceCon = (actual: Record<string, string>, entorno: string | null) => {
  const p = new URLSearchParams({ ...actual });
  if (entorno === null) p.delete("entorno");
  else p.set("entorno", entorno);
  const q = p.toString();
  return `/fourvenues${q ? `?${q}` : ""}#ventas-app`;
};

export default async function VentasApp({ params }: { params: Record<string, string> }) {
  const supabase = createAdminClient();
  const elegido = ENTORNOS.find((e) => e.param === params.entorno) ?? ENTORNOS[0];

  // Números de todos los pedidos (solo las columnas que se suman), de mil en mil
  const leerResumen = async () => {
    const filas: Resumen[] = [];
    for (let desde = 0; desde < 20000; desde += 1000) {
      const { data, error } = await supabase
        .from("fv_pedidos")
        .select("tipo, entorno, estado, cantidad, total")
        .order("created_at", { ascending: false })
        .range(desde, desde + 999);
      if (error) return { filas, error };
      filas.push(...(data ?? []));
      if (!data || data.length < 1000) break;
    }
    return { filas, error: null };
  };

  const [config, enlazadas, resumen, recientes, avisosRes] = await Promise.all([
    // Solo las filas del mantenimiento; nunca las de secretos (admin_secret, webhook_secret_*)
    supabase.from("fv_config").select("clave, valor, actualizado_at").like("clave", "ultimo_mantenimiento_%"),
    supabase.from("eventos").select("id", { count: "exact", head: true }).not("fv_cm_evento_id", "is", null).gte("fecha_evento", inicioProximos()),
    leerResumen(),
    supabase
      .from("fv_pedidos")
      .select("id, user_id, evento_id, tipo, entorno, tarifa_nombre, cantidad, total, estado, error, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
    // Del contenido del aviso solo se pide el identificador del pago: el resto puede llevar datos personales
    supabase
      .from("fv_webhooks")
      .select("id, evento, recibido_at, procesado_at, error, payment_id:payload->>payment_id")
      .order("recibido_at", { ascending: false })
      .limit(20),
  ]);

  const pedidos = recientes.data ?? [];
  const avisos = (avisosRes.data ?? []) as unknown as Aviso[];
  const fallo = config.error ?? resumen.error ?? recientes.error ?? avisosRes.error;

  // Usuarios y fiestas de los pedidos, en bloque
  const userIds = [...new Set(pedidos.map((p) => p.user_id))];
  const eventoIds = [...new Set(pedidos.map((p) => p.evento_id).filter((x): x is string => !!x))];
  const [{ data: perfiles }, { data: eventos }] = await Promise.all([
    userIds.length
      ? supabase.from("profiles").select("id, username, full_name").in("id", userIds)
      : Promise.resolve({ data: [] as { id: string; username: string | null; full_name: string | null }[] }),
    eventoIds.length
      ? supabase.from("eventos").select("id, titulo").in("id", eventoIds)
      : Promise.resolve({ data: [] as { id: string; titulo: string }[] }),
  ]);
  const perfilMap = new Map((perfiles ?? []).map((p) => [p.id, p]));
  const eventoMap = new Map((eventos ?? []).map((e) => [e.id, e]));

  // Estado de la conexión: el último mantenimiento que haya escrito (pruebas o real)
  const mantenimientos = (config.data ?? [])
    .filter((c) => c.clave.startsWith("ultimo_mantenimiento_"))
    .map((c) => {
      let datos: Mantenimiento = {};
      try {
        const v: unknown = JSON.parse(c.valor);
        if (v && typeof v === "object") datos = v as Mantenimiento;
      } catch {}
      const entorno = datos.entorno ?? c.clave.slice("ultimo_mantenimiento_".length);
      return { entorno, datos, at: datos.at ?? c.actualizado_at };
    })
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  const conexion = mantenimientos[0] ?? null;
  const antiguedad = conexion ? ahoraMs() - new Date(conexion.at).getTime() : null;
  const parado = antiguedad === null || !Number.isFinite(antiguedad) || antiguedad > MINUTOS_AVISO * 60000;
  const textos = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim() !== "") : []);
  const hosts = textos(conexion?.datos.hosts);
  const errores = textos(conexion?.datos.errores);
  const reintentados = Number(conexion?.datos.avisos_reintentados) || 0;
  const webhook = conexion?.datos.webhook ?? null;
  const webhookOk = webhook === "ya estaba" || webhook === "registrado";
  const fiestas = enlazadas.count ?? 0;

  // Indicadores del entorno elegido (las pruebas nunca se suman a lo real)
  const porEntorno = (e: Entorno) => resumen.filas.filter((f) => (e === "produccion" ? f.entorno === "produccion" : f.entorno !== "produccion"));
  const filas = porEntorno(elegido.clave);
  const cuantos = (estado: string) => filas.filter((f) => f.estado === estado).length;
  const pagados = filas.filter((f) => f.estado === "pagado");
  const entradasVendidas = pagados.filter((f) => f.tipo === "entrada").reduce((s, f) => s + f.cantidad, 0);
  const cobrado = pagados.reduce((s, f) => s + Number(f.total ?? 0), 0);
  const apuntados = filas.filter((f) => f.estado === "apuntado" && f.tipo === "lista").reduce((s, f) => s + f.cantidad, 0);
  const reembolsados = cuantos("reembolsado");
  const caducados = cuantos("caducado");
  const conError = cuantos("error");
  const esPruebas = elegido.clave === "alpha";
  const otros = porEntorno(esPruebas ? "produccion" : "alpha").length;

  const chip = (activo: boolean) => `rounded-md border px-2.5 py-1 ${activo ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:bg-muted"}`;

  return (
    <div id="ventas-app" className="space-y-6 scroll-mt-6">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-primary" /> Ventas dentro de la app
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Entradas y listas que la gente compra o reserva sin salir de Nocturna, a través de Fourvenues.
        </p>
      </div>

      {fallo && (
        <Card className="border-red-500/40">
          <CardContent className="py-3 text-sm text-red-400">
            No se han podido leer todos los datos de las ventas dentro de la app ({fallo.message}). Lo que aparece abajo puede estar incompleto.
          </CardContent>
        </Card>
      )}

      <Card className={errores.length ? "border-red-500/40" : parado || (conexion && (!hosts.length || !webhookOk)) ? "border-amber-500/40" : undefined}>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex flex-wrap items-center gap-2">
            <PlugZap className="w-4 h-4 text-primary" /> Estado de la conexión
            {conexion && badgeEntorno(conexion.entorno)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {!conexion ? (
            <p className="text-amber-400">
              Todavía no hay ninguna comprobación automática registrada. La conexión con Fourvenues se revisa sola cada 10 minutos; si esto sigue así
              pasado ese tiempo, la venta dentro de la app no está en marcha y hay que avisar a quien lleva la parte técnica.
            </p>
          ) : (
            <>
              {errores.length > 0 && (
                <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-red-400">
                  <p className="font-medium">La última comprobación tuvo problemas</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs break-words">
                    {errores.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}
              {conexion.entorno !== "produccion" && (
                <p className="text-amber-400">
                  La conexión está en modo pruebas: las compras que se hagan ahora no son reales y no se cobra a nadie.
                </p>
              )}
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div>
                  <p className="text-xs text-muted-foreground">Última comprobación automática</p>
                  <p className={`mt-0.5 font-medium ${parado ? "text-amber-400" : ""}`}>
                    {antiguedad !== null && Number.isFinite(antiguedad) ? haceCuanto(antiguedad) : "sin fecha"}
                  </p>
                  <p className={`mt-0.5 text-xs ${parado ? "text-amber-400" : "text-muted-foreground"}`}>
                    {parado ? `Lleva más de ${MINUTOS_AVISO} min sin comprobarse: algo se ha parado` : "Se revisa sola cada 10 minutos"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Locales conectados</p>
                  {hosts.length ? (
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {hosts.map((h) => (
                        <Badge key={h} variant="secondary" className="text-xs">{h}</Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-0.5 font-medium text-amber-400">Ninguno</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Fiestas a la venta dentro de la app</p>
                  <p className="mt-0.5 font-medium">{fiestas.toLocaleString("es-ES")}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">próximas fiestas enlazadas con Fourvenues</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Avisos de pago</p>
                  <p className={`mt-0.5 font-medium ${webhookOk ? "text-emerald-400" : "text-amber-400"}`}>{webhookOk ? "Activados" : "Sin confirmar"}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {webhookOk
                      ? "Fourvenues nos avisa cuando alguien paga"
                      : "No consta que Fourvenues nos avise de los pagos; sin eso las entradas pagadas no llegan a la app"}
                  </p>
                  {reintentados > 0 && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {reintentados === 1 ? "1 aviso de pago reintentado" : `${reintentados.toLocaleString("es-ES")} avisos de pago reintentados`}
                    </p>
                  )}
                </div>
              </div>
              {!hosts.length && (
                <p className="text-muted-foreground">
                  Todavía no hay ningún local conectado: cada local tiene que añadir a Nocturna en Fourvenues → Ajustes → Partnerships. Hasta entonces no
                  se puede vender ninguna de sus fiestas dentro de la app.
                </p>
              )}
              {conexion.entorno !== "produccion" && (
                <p className="text-muted-foreground">En pruebas solo pueden comprar los administradores y las cuentas de prueba.</p>
              )}
              {hosts.length > 0 && fiestas === 0 && (
                <p className="text-muted-foreground">
                  Hay locales conectados, pero ninguna de sus próximas fiestas está enlazada todavía. Se enlazan solas cuando el local publica la fiesta en
                  Fourvenues y esa misma fiesta existe en la app.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-medium flex flex-wrap items-center gap-2">
          Indicadores {badgeEntorno(elegido.clave)}
          <span className="text-xs font-normal text-muted-foreground">
            {esPruebas ? "compras de prueba, no son dinero real" : "sin contar las compras de prueba"}
          </span>
        </h3>
        <div className="flex flex-wrap gap-2 text-sm">
          {ENTORNOS.map((e) => (
            <Link key={e.clave} href={enlaceCon(params, e.clave === "produccion" ? null : e.param)} className={chip(elegido.clave === e.clave)}>
              {e.label}
              {e.clave !== elegido.clave && otros > 0 ? ` (${otros})` : ""}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          { label: "Pedidos pagados", value: pagados.length.toLocaleString("es-ES"), sub: reembolsados ? `${reembolsados} más, reembolsados` : "compras ya cobradas", destacado: true },
          { label: "Entradas vendidas", value: entradasVendidas.toLocaleString("es-ES"), sub: "en pedidos pagados" },
          { label: "Cobrado en la app", value: euros(cobrado), sub: "lo que han pagado los clientes" },
          { label: "Apuntados en lista", value: apuntados.toLocaleString("es-ES"), sub: "personas, gratis" },
          { label: "Pendientes de pago", value: cuantos("pendiente").toLocaleString("es-ES"), sub: "pago empezado y sin terminar" },
          { label: "Caducados o con error", value: (caducados + conError).toLocaleString("es-ES"), sub: `${caducados} caducados · ${conError} con error`, alerta: conError > 0 },
        ].map(({ label, value, sub, destacado, alerta }) => (
          <Card key={label} className={alerta ? "border-amber-500/40" : destacado ? "border-primary/40" : undefined}>
            <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle></CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${alerta ? "text-amber-400" : destacado ? "text-primary" : ""}`}>{value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ReceiptText className="w-4 h-4 text-primary" /> Pedidos recientes
            <span className="text-xs font-normal text-muted-foreground">los últimos 50, reales y de prueba</span>
          </CardTitle>
        </CardHeader>
        <CardContent className={pedidos.length ? "p-0" : undefined}>
          {pedidos.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Todavía no hay ningún pedido. Aparecerán aquí en cuanto alguien compre una entrada o se apunte a una lista desde la app.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-border text-xs text-muted-foreground">
                    <th className="text-left font-medium px-4 py-2">Fecha</th>
                    <th className="text-left font-medium px-4 py-2">Usuario</th>
                    <th className="text-left font-medium px-4 py-2">Fiesta</th>
                    <th className="text-left font-medium px-4 py-2">Tipo</th>
                    <th className="text-left font-medium px-4 py-2">Tarifa</th>
                    <th className="text-right font-medium px-4 py-2">Cantidad</th>
                    <th className="text-right font-medium px-4 py-2">Total</th>
                    <th className="text-left font-medium px-4 py-2">Estado</th>
                    <th className="text-left font-medium px-4 py-2">Entorno</th>
                  </tr>
                </thead>
                <tbody>
                  {pedidos.map((p) => {
                    const perfil = perfilMap.get(p.user_id);
                    const evento = p.evento_id ? eventoMap.get(p.evento_id) : undefined;
                    const estado = ESTADOS[p.estado] ?? { label: p.estado, clase: "" };
                    return (
                      <tr key={p.id} className="border-b border-border/50 last:border-0 align-top">
                        <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">{fechaHora(p.created_at)}</td>
                        <td className="px-4 py-2.5 font-medium">
                          <Link href={`/usuarios/${p.user_id}`} className="hover:underline">
                            {perfil?.username ?? perfil?.full_name ?? "Usuario sin nombre"}
                          </Link>
                        </td>
                        <td className="px-4 py-2.5">
                          {evento ? <Link href={`/eventos/${evento.id}`} className="hover:underline">{evento.titulo}</Link> : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-4 py-2.5">
                          {p.tipo === "lista" ? (
                            <Badge variant="secondary" className="bg-sky-500/20 text-sky-400 border-sky-500/30 text-xs">Lista</Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">Entrada</Badge>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">{p.tarifa_nombre ?? "—"}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{p.cantidad}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums whitespace-nowrap">
                          {p.total !== null ? euros(Number(p.total)) : p.tipo === "lista" ? "Gratis" : "—"}
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge variant="secondary" className={`text-xs ${estado.clase}`}>{estado.label}</Badge>
                          {/* Motivo del fallo o, en un pedido pagado, una nota que no impide la compra */}
                          {p.error && <p className="mt-1 max-w-64 text-xs text-muted-foreground break-words">{p.error}</p>}
                        </td>
                        <td className="px-4 py-2.5">{badgeEntorno(p.entorno)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BellRing className="w-4 h-4 text-primary" /> Avisos de pago recibidos
            <span className="text-xs font-normal text-muted-foreground">los últimos 20 que ha mandado Fourvenues</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {avisos.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Todavía no ha llegado ningún aviso. Fourvenues manda uno cada vez que alguien termina de pagar o un local devuelve una entrada; si hay
              pedidos pagándose y aquí no aparece nada, los avisos no están llegando.
            </p>
          ) : (
            <ul className="divide-y divide-border/50 text-sm">
              {avisos.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 first:pt-0 last:pb-0">
                  <span className="w-28 shrink-0 whitespace-nowrap text-xs text-muted-foreground">{fechaHora(a.recibido_at)}</span>
                  <span className="font-medium">{(a.evento && AVISOS[a.evento]) ?? a.evento ?? "Aviso sin nombre"}</span>
                  {a.payment_id && <span className="font-mono text-xs text-muted-foreground">pago {a.payment_id}</span>}
                  <span className="ml-auto flex items-center gap-2">
                    {a.error && <span className="max-w-72 truncate text-xs text-muted-foreground" title={a.error}>{a.error}</span>}
                    {a.error ? (
                      <Badge variant="secondary" className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">Error</Badge>
                    ) : a.procesado_at ? (
                      <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">Procesado</Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">Sin procesar</Badge>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
