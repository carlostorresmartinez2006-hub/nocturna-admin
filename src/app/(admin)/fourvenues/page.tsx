import { asegurarAdmin } from "@/lib/auth/admin";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CalendarDays, Radar } from "lucide-react";
import Economia from "./Economia";
import DiscrepanciasList, { type DiscrepanciaRow } from "./DiscrepanciasList";

// Datos que escribe el robot del VPS nocturna-bot (repo Nocturna, eventos-server/ventas.js).
export const dynamic = "force-dynamic";

const CUENTAS: Record<string, string> = {
  pablo: "pablo-gomez-puig-garach",
  nocturna: "nocturnagranada",
};

function haceCuanto(iso: string | null) {
  if (!iso) return "nunca";
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "ahora mismo";
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  return h < 48 ? `hace ${h} h` : `hace ${Math.round(h / 24)} días`;
}

const horasDesde = (iso: string) => (Date.now() - new Date(iso).getTime()) / 3600000;

// Los eventos que empezaron hace menos de 12 h siguen contando como próximos.
const inicioProximos = () => new Date(Date.now() - 12 * 3600 * 1000).toISOString();

export default async function FourvenuesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await asegurarAdmin();
  const sp = await searchParams;
  const params = Object.fromEntries(Object.entries(sp).filter((e): e is [string, string] => typeof e[1] === "string"));
  const supabase = createAdminClient();
  const desde = inicioProximos();

  const [{ data: discrepancias }, { data: ventas }, { data: ultima }] = await Promise.all([
    supabase.from("fourvenues_discrepancias").select("*").eq("resuelta", false).order("created_at", { ascending: false }),
    supabase
      .from("fourvenues_ventas")
      .select("*")
      .gte("evento_inicio", desde)
      .order("evento_inicio", { ascending: true })
      .order("nombre", { ascending: true }),
    supabase.from("fourvenues_ventas").select("visto_at").order("visto_at", { ascending: false }).limit(1),
  ]);

  // Cuándo leyeron los robots por última vez (cada pasada queda en fourvenues_lecturas, haya ventas o no)
  const [{ data: lecturasVentas, error: errLecturas }, { data: lecturasEconomia }] = await Promise.all([
    supabase.from("fourvenues_lecturas").select("inicio, fin, ok, error, horas, ventas").eq("tipo", "ventas").order("inicio", { ascending: false }).limit(20),
    supabase.from("fourvenues_lecturas").select("inicio, fin, ok, error, eventos").eq("tipo", "economia").order("inicio", { ascending: false }).limit(5),
  ]);
  const ultimaOk = lecturasVentas?.find((l) => l.ok);
  const ultimaVentas = lecturasVentas?.find((l) => l.ok !== null);
  const fallo = ultimaVentas && !ultimaVentas.ok ? ultimaVentas : null;
  const economiaOk = lecturasEconomia?.find((l) => l.ok);
  const sinNoticias = !ultimaOk || horasDesde(ultimaOk.fin ?? ultimaOk.inicio) > 8;

  const listaVentas = ventas ?? [];
  const listaDisc = discrepancias ?? [];

  // Eventos, perfiles y entradas relacionados, en bloque.
  const eventoIds = [...new Set([...listaVentas, ...listaDisc].map((x) => x.evento_id).filter((x): x is string => !!x))];
  const userIds = [...new Set(listaDisc.map((d) => d.user_id).filter((x): x is string => !!x))];
  const emails = [...new Set(listaVentas.map((v) => v.email).filter((x): x is string => !!x))];
  const codigos = listaVentas.map((v) => v.codigo);

  const [{ data: eventos }, { data: perfilesId }, { data: perfilesEmail }, { data: entradas }] = await Promise.all([
    eventoIds.length
      ? supabase.from("eventos").select("id, titulo, fecha_texto, local_texto").in("id", eventoIds)
      : Promise.resolve({ data: [] as { id: string; titulo: string; fecha_texto: string | null; local_texto: string | null }[] }),
    userIds.length
      ? supabase.from("profiles").select("id, username, email, full_name").in("id", userIds)
      : Promise.resolve({ data: [] as { id: string; username: string | null; email: string; full_name: string | null }[] }),
    emails.length
      ? supabase.from("profiles").select("id, username, email").in("email", emails)
      : Promise.resolve({ data: [] as { id: string; username: string | null; email: string }[] }),
    codigos.length
      ? supabase.from("entradas").select("qr_code, estado, user_id").in("qr_code", codigos)
      : Promise.resolve({ data: [] as { qr_code: string | null; estado: string; user_id: string }[] }),
  ]);

  const eventoMap = new Map((eventos ?? []).map((e) => [e.id, e]));
  const perfilMap = new Map((perfilesId ?? []).map((p) => [p.id, p]));
  const perfilPorEmail = new Map((perfilesEmail ?? []).map((p) => [p.email.toLowerCase(), p]));
  const entradaPorCodigo = new Map((entradas ?? []).map((e) => [e.qr_code, e]));

  const filasDisc: DiscrepanciaRow[] = listaDisc.map((d) => ({
    id: d.id,
    tipo: d.tipo,
    codigo: d.codigo,
    created_at: d.created_at,
    detalle: (d.detalle ?? {}) as Record<string, unknown>,
    evento: d.evento_id ? eventoMap.get(d.evento_id) ?? null : null,
    perfil: d.user_id ? perfilMap.get(d.user_id) ?? null : null,
  }));

  // Ventas agrupadas por evento de Fourvenues.
  const grupos = new Map<string, typeof listaVentas>();
  for (const v of listaVentas) grupos.set(v.fv_evento_id, [...(grupos.get(v.fv_evento_id) ?? []), v]);

  const enApp = listaVentas.filter((v) => v.email && perfilPorEmail.has(v.email)).length;
  const verificadas = listaVentas.filter((v) => entradaPorCodigo.get(v.codigo)?.estado === "verificada").length;

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Radar className="w-6 h-6 text-primary" /> Fourvenues
        </h1>
        {errLecturas ? (
          <p className="text-muted-foreground text-sm mt-1">
            Ventas leídas del panel de Fourvenues por el robot · última venta guardada {haceCuanto(ultima?.[0]?.visto_at ?? null)}
          </p>
        ) : (
          <div className="mt-1 space-y-0.5 text-sm">
            <p className={sinNoticias ? "text-amber-400" : "text-muted-foreground"}>
              Robot de ventas: última lectura {haceCuanto(ultimaOk?.fin ?? ultimaOk?.inicio ?? null)}
              {ultimaOk ? ` (${ultimaOk.ventas ?? 0} ventas de ${ultimaOk.horas === 48 ? "las fiestas de las próximas 48 h" : "todas las próximas fiestas"})` : ""}
              {sinNoticias && " · lleva más de 8 h sin leer"}
            </p>
            {fallo && (
              <p className="text-red-400">
                La última pasada falló {haceCuanto(fallo.inicio)}: {fallo.error ?? "error desconocido"}. Se reintenta sola en la siguiente.
              </p>
            )}
            <p className="text-muted-foreground">
              Histórico de todas las fiestas: actualizado {haceCuanto(economiaOk?.fin ?? null)} (una vez al día)
            </p>
          </div>
        )}
      </div>

      <Economia params={params} />

      <h2 className="text-lg font-semibold pt-2">Próximas ventas</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Ventas próximas", value: listaVentas.length },
          { label: "De usuarios de la app", value: enApp },
          { label: "Verificadas en la app", value: verificadas },
          { label: "Para revisar", value: filasDisc.length, alerta: filasDisc.length > 0 },
        ].map(({ label, value, alerta }) => (
          <Card key={label} className={alerta ? "border-amber-500/40" : undefined}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${alerta ? "text-amber-400" : ""}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className={filasDisc.length ? "border-amber-500/40" : undefined}>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Para revisar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DiscrepanciasList discrepancias={filasDisc} />
        </CardContent>
      </Card>

      {grupos.size === 0 ? (
        <p className="text-sm text-muted-foreground">No hay ventas de eventos próximos.</p>
      ) : (
        [...grupos.entries()].map(([fvId, filas]) => {
          const evento = filas[0].evento_id ? eventoMap.get(filas[0].evento_id) : null;
          return (
            <Card key={fvId}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-primary" />
                  {evento ? (
                    <Link href={`/eventos/${evento.id}`} className="hover:underline">{evento.titulo}</Link>
                  ) : (
                    <span>Evento no está en la app</span>
                  )}
                  <span className="text-xs text-muted-foreground font-normal">
                    {evento?.fecha_texto ?? (filas[0].evento_inicio ? new Date(filas[0].evento_inicio).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" }) : "")}
                    {evento?.local_texto ? ` · ${evento.local_texto}` : ""}
                  </span>
                </CardTitle>
                <span className="text-xs text-muted-foreground">{filas.length} {filas.length === 1 ? "venta" : "ventas"}</span>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-y border-border text-xs text-muted-foreground">
                        <th className="text-left font-medium px-4 py-2">Nombre</th>
                        <th className="text-left font-medium px-4 py-2">Email</th>
                        <th className="text-left font-medium px-4 py-2">Teléfono</th>
                        <th className="text-left font-medium px-4 py-2">Código</th>
                        <th className="text-left font-medium px-4 py-2">RRPP</th>
                        <th className="text-left font-medium px-4 py-2">En la app</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filas.map((v) => {
                        const perfil = v.email ? perfilPorEmail.get(v.email) : undefined;
                        const entrada = entradaPorCodigo.get(v.codigo);
                        return (
                          <tr key={v.codigo} className="border-b border-border/50 last:border-0">
                            <td className="px-4 py-2.5 font-medium">
                              {v.nombre ?? "—"}
                              {v.anulada && (
                                <Badge variant="secondary" className="ml-2 bg-red-500/20 text-red-400 border-red-500/30 text-xs">anulada</Badge>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-muted-foreground">{v.email ?? "—"}</td>
                            <td className="px-4 py-2.5 text-muted-foreground">{v.telefono ?? "—"}</td>
                            <td className="px-4 py-2.5 font-mono text-xs">{v.codigo}</td>
                            <td className="px-4 py-2.5 text-xs text-muted-foreground">{CUENTAS[v.cuenta] ?? v.cuenta}</td>
                            <td className="px-4 py-2.5">
                              {entrada ? (
                                <Badge
                                  variant="secondary"
                                  className={entrada.estado === "verificada" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs" : "text-xs"}
                                >
                                  {entrada.estado}
                                </Badge>
                              ) : perfil ? (
                                <Link href={`/usuarios/${perfil.id}`} className="text-xs text-amber-400 hover:underline">
                                  {perfil.username ?? perfil.email} · sin verificar
                                </Link>
                              ) : (
                                <span className="text-xs text-muted-foreground">no</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
