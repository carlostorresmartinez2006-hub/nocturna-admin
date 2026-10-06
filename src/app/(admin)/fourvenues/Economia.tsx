import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Coins, Store } from "lucide-react";
import Comision from "./Comision";
import { euros } from "./formato";

// Datos de los robots del VPS (repo Nocturna, eventos-server/economia.js y ventas.js).
// Solo números por evento, sin datos personales: se conservan siempre.

const CUENTAS: Record<string, string> = { pablo: "Pablo", nocturna: "Nocturna" };
const PERIODOS: Record<string, string> = { todo: "Todo", ano: "Este año", mes: "Este mes", "30d": "Últimos 30 días" };
// Hora actual fuera del render (regla de pureza de React)
const ahoraMs = () => Date.now();

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

type Fila = {
  fv_evento_id: string;
  cuenta: string;
  codigo: string | null;
  nombre: string | null;
  local: string | null;
  inicio: string | null;
  cancelado: boolean;
  vendidas: number;
  dentro: number;
  apuntados_listado: number | null;
  anuladas: number | null;
  importe: number | null;
};

const enlaceCon = (actual: Record<string, string>, cambio: Record<string, string | null>) => {
  const p = new URLSearchParams({ ...actual });
  for (const [k, v] of Object.entries(cambio)) {
    if (v === null) p.delete(k);
    else p.set(k, v);
  }
  const q = p.toString();
  return q ? `/fourvenues?${q}` : "/fourvenues";
};

export default async function Economia({ params }: { params: Record<string, string> }) {
  const supabase = createAdminClient();
  const cuenta = CUENTAS[params.cuenta] ? params.cuenta : "todas";
  const periodo = PERIODOS[params.periodo] ? params.periodo : "todo";
  const todos = params.todos === "1";

  // Todas las filas (son pocas: unos cientos de eventos por cuenta)
  const filas: Fila[] = [];
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await supabase
      .from("fourvenues_economia")
      .select("fv_evento_id, cuenta, codigo, nombre, local, inicio, cancelado, vendidas, dentro, apuntados_listado, anuladas, importe")
      .order("inicio", { ascending: false })
      .range(desde, desde + 999);
    if (error) {
      return (
        <Card className="border-amber-500/40">
          <CardContent className="py-4 text-sm text-amber-400">
            Falta crear las tablas de economía: ejecuta <code>eventos-server/economia.sql</code> en el SQL Editor de Supabase.
          </CardContent>
        </Card>
      );
    }
    filas.push(...(data as Fila[]));
    if (!data || data.length < 1000) break;
  }
  const { data: comisiones } = await supabase.from("fourvenues_comisiones").select("ambito, clave, euros");

  // Comisión de cada evento: la del evento, si no la de su local, si no la general
  const general = Number(comisiones?.find((c) => c.ambito === "general")?.euros ?? 0);
  const porLocal = new Map((comisiones ?? []).filter((c) => c.ambito === "local").map((c) => [c.clave, Number(c.euros)]));
  const porEvento = new Map((comisiones ?? []).filter((c) => c.ambito === "evento").map((c) => [c.clave, Number(c.euros)]));
  const comisionDe = (f: Fila) => porEvento.get(f.fv_evento_id) ?? (f.local ? porLocal.get(f.local) : undefined) ?? general;

  const ahora = ahoraMs();
  const hoy = new Date();
  const inicioPeriodo =
    periodo === "ano" ? new Date(hoy.getFullYear(), 0, 1).getTime()
    : periodo === "mes" ? new Date(hoy.getFullYear(), hoy.getMonth(), 1).getTime()
    : periodo === "30d" ? ahora - 30 * 86400000
    : -Infinity;

  const enCuenta = filas.filter((f) => !f.cancelado && (cuenta === "todas" || f.cuenta === cuenta));
  const calc = enCuenta.map((f) => {
    const vendidas = Math.max(f.vendidas ?? 0, f.apuntados_listado ?? 0);
    const comision = comisionDe(f);
    const t = f.inicio ? new Date(f.inicio).getTime() : 0;
    return { f, vendidas, comision, ganado: vendidas * comision, t, pasado: t < ahora };
  });
  const enPeriodo = calc.filter((x) => x.t >= inicioPeriodo);
  const conVentas = enPeriodo.filter((x) => x.vendidas > 0);
  const pasados = conVentas.filter((x) => x.pasado);
  const futuros = conVentas.filter((x) => !x.pasado);
  const suma = (xs: typeof calc, k: "vendidas" | "ganado") => xs.reduce((s, x) => s + x[k], 0);
  const vendidasPasadas = suma(pasados, "vendidas");
  const dentro = pasados.reduce((s, x) => s + (x.f.dentro ?? 0), 0);

  // Por meses (los últimos 12, por fecha del evento)
  const meses = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - 11 + i, 1);
    return { clave: `${d.getFullYear()}-${d.getMonth()}`, etiqueta: `${MESES[d.getMonth()]}${d.getMonth() === 0 ? ` ${String(d.getFullYear()).slice(2)}` : ""}`, ganado: 0, vendidas: 0 };
  });
  for (const x of calc) {
    if (!x.t || x.vendidas === 0) continue;
    const d = new Date(x.t);
    const m = meses.find((mm) => mm.clave === `${d.getFullYear()}-${d.getMonth()}`);
    if (m) { m.ganado += x.ganado; m.vendidas += x.vendidas; }
  }
  const usarEuros = general > 0 || porLocal.size > 0 || porEvento.size > 0;
  const maxMes = Math.max(1, ...meses.map((m) => (usarEuros ? m.ganado : m.vendidas)));
  const mesActual = meses[11], mesAnterior = meses[10];

  // Por local
  const locales = new Map<string, { eventos: number; vendidas: number; ganado: number }>();
  for (const x of calc) {
    const nombre = x.f.local ?? "Sin local";
    const l = locales.get(nombre) ?? { eventos: 0, vendidas: 0, ganado: 0 };
    if (x.t >= inicioPeriodo && x.vendidas > 0) { l.eventos++; l.vendidas += x.vendidas; l.ganado += x.ganado; }
    locales.set(nombre, l);
  }
  const listaLocales = [...locales.entries()].sort((a, b) => b[1].vendidas - a[1].vendidas || a[0].localeCompare(b[0]));

  // Eventos de la tabla: con ventas (o todos con ?todos=1), del periodo
  const tabla = (todos ? enPeriodo : conVentas).slice(0, 400);

  const filtros = { ...(cuenta !== "todas" ? { cuenta } : {}), ...(periodo !== "todo" ? { periodo } : {}), ...(todos ? { todos: "1" } : {}) };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold flex items-center gap-2"><Coins className="w-5 h-5 text-primary" /> Economía</h2>
        <div className="flex flex-wrap gap-2 text-sm">
          {[["todas", "Las dos cuentas"], ...Object.entries(CUENTAS)].map(([k, v]) => (
            <Link key={k} href={enlaceCon(filtros, { cuenta: k === "todas" ? null : k })}
              className={`rounded-md border px-2.5 py-1 ${cuenta === k ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:bg-muted"}`}>{v}</Link>
          ))}
          <span className="mx-1 w-px bg-border" />
          {Object.entries(PERIODOS).map(([k, v]) => (
            <Link key={k} href={enlaceCon(filtros, { periodo: k === "todo" ? null : k })}
              className={`rounded-md border px-2.5 py-1 ${periodo === k ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:bg-muted"}`}>{v}</Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          { label: "Ganado", value: euros(suma(pasados, "ganado")), sub: "fiestas ya celebradas", destacado: true },
          { label: "Por cobrar", value: euros(suma(futuros, "ganado")), sub: `${suma(futuros, "vendidas")} entradas de próximas fiestas` },
          { label: "Entradas vendidas", value: (vendidasPasadas + suma(futuros, "vendidas")).toLocaleString("es-ES"), sub: `${conVentas.length} fiestas con ventas` },
          { label: "Entraron", value: dentro.toLocaleString("es-ES"), sub: vendidasPasadas ? `${Math.round((dentro / vendidasPasadas) * 100)} % de asistencia` : "—" },
          { label: "Este mes", value: usarEuros ? euros(mesActual.ganado) : `${mesActual.vendidas} entradas`, sub: `${mesActual.vendidas} entradas` },
          { label: "Mes pasado", value: usarEuros ? euros(mesAnterior.ganado) : `${mesAnterior.vendidas} entradas`, sub: `${mesAnterior.vendidas} entradas` },
        ].map(({ label, value, sub, destacado }) => (
          <Card key={label} className={destacado ? "border-primary/40" : undefined}>
            <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle></CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${destacado ? "text-primary" : ""}`}>{value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" /> {usarEuros ? "Ganado por mes" : "Entradas vendidas por mes"}
              <span className="text-xs font-normal text-muted-foreground">últimos 12 meses, por fecha de la fiesta</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-44 items-end gap-2">
              {meses.map((m) => {
                const v = usarEuros ? m.ganado : m.vendidas;
                return (
                  <div key={m.clave} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${m.etiqueta}: ${euros(m.ganado)} · ${m.vendidas} entradas`}>
                    <span className="text-[10px] text-muted-foreground">{v ? (usarEuros ? euros(v) : v) : ""}</span>
                    <div className="w-full rounded-t-md bg-primary/80" style={{ height: `${Math.max(v ? 4 : 1, (v / maxMes) * 100)}%`, opacity: v ? 1 : 0.25 }} />
                    <span className="text-[11px] text-muted-foreground">{m.etiqueta}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm font-medium flex items-center gap-2"><Coins className="w-4 h-4 text-primary" /> Comisión por entrada</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground mb-1">General (para todas las fiestas)</p>
              <Comision ambito="general" clave="" propia={general} />
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Fourvenues no da la comisión, así que la ponéis vosotros. Lo ganado es entradas vendidas × comisión. Podéis poner otra para un local
              (abajo) o para una fiesta concreta (en la tabla); la de la fiesta manda sobre la del local, y esta sobre la general.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm font-medium flex items-center gap-2"><Store className="w-4 h-4 text-primary" /> Por local</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-border text-xs text-muted-foreground">
                  <th className="text-left font-medium px-4 py-2">Local</th>
                  <th className="text-right font-medium px-4 py-2">Fiestas con ventas</th>
                  <th className="text-right font-medium px-4 py-2">Entradas</th>
                  <th className="text-left font-medium px-4 py-2">Comisión</th>
                  <th className="text-right font-medium px-4 py-2">Ganado</th>
                </tr>
              </thead>
              <tbody>
                {listaLocales.map(([nombre, l]) => (
                  <tr key={nombre} className="border-b border-border/50 last:border-0">
                    <td className="px-4 py-2 font-medium">{nombre}</td>
                    <td className="px-4 py-2 text-right">{l.eventos}</td>
                    <td className="px-4 py-2 text-right">{l.vendidas}</td>
                    <td className="px-4 py-2">
                      {nombre === "Sin local" ? <span className="text-muted-foreground">{euros(general)}</span> : (
                        <Comision ambito="local" clave={nombre} propia={porLocal.get(nombre) ?? null} heredada={general} origenHeredada="general" compacta />
                      )}
                    </td>
                    <td className="px-4 py-2 text-right font-medium">{euros(l.ganado)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">
            {todos ? "Todas las fiestas" : "Fiestas con ventas"} <span className="text-xs font-normal text-muted-foreground">({tabla.length})</span>
          </CardTitle>
          <Link href={enlaceCon(filtros, { todos: todos ? null : "1" })} className="text-xs text-primary hover:underline">
            {todos ? "Ver solo las que tienen ventas" : "Ver también las que no tienen ventas"}
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {tabla.length === 0 ? (
            <p className="px-4 pb-4 text-sm text-muted-foreground">Todavía no hay ventas en este periodo.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-border text-xs text-muted-foreground">
                    <th className="text-left font-medium px-4 py-2">Fecha</th>
                    <th className="text-left font-medium px-4 py-2">Fiesta</th>
                    <th className="text-left font-medium px-4 py-2">Local</th>
                    <th className="text-left font-medium px-4 py-2">Cuenta</th>
                    <th className="text-right font-medium px-4 py-2">Vendidas</th>
                    <th className="text-right font-medium px-4 py-2">Entraron</th>
                    <th className="text-left font-medium px-4 py-2">Comisión</th>
                    <th className="text-right font-medium px-4 py-2">Ganado</th>
                  </tr>
                </thead>
                <tbody>
                  {tabla.map(({ f, vendidas, ganado, pasado }) => {
                    const delLocal = f.local ? porLocal.get(f.local) : undefined;
                    return (
                      <tr key={f.fv_evento_id} className="border-b border-border/50 last:border-0">
                        <td className="px-4 py-2 whitespace-nowrap text-muted-foreground">
                          {f.inicio ? new Date(f.inicio).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                          {!pasado && <Badge variant="secondary" className="ml-2 text-[10px]">próxima</Badge>}
                        </td>
                        <td className="px-4 py-2 font-medium">{f.nombre ?? f.codigo ?? "—"}</td>
                        <td className="px-4 py-2 text-muted-foreground">{f.local ?? "—"}</td>
                        <td className="px-4 py-2 text-xs text-muted-foreground">{CUENTAS[f.cuenta] ?? f.cuenta}</td>
                        <td className="px-4 py-2 text-right">{vendidas}{f.anuladas ? <span className="ml-1 text-xs text-red-400">({f.anuladas} anul.)</span> : null}</td>
                        <td className="px-4 py-2 text-right text-muted-foreground">{pasado ? f.dentro : "—"}</td>
                        <td className="px-4 py-2">
                          <Comision
                            ambito="evento"
                            clave={f.fv_evento_id}
                            propia={porEvento.get(f.fv_evento_id) ?? null}
                            heredada={delLocal ?? general}
                            origenHeredada={delLocal !== undefined ? "local" : "general"}
                            compacta
                          />
                        </td>
                        <td className="px-4 py-2 text-right font-medium">{euros(ganado)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
