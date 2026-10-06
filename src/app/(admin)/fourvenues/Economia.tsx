import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Coins, Store } from "lucide-react";
import Comision from "./Comision";
import { euros } from "./formato";

// Datos de los robots del VPS (repo Nocturna, eventos-server/economia.js y ventas.js).
// Solo números por fiesta, sin datos personales: se conservan siempre.

const CUENTAS: Record<string, string> = { pablo: "Pablo", nocturna: "Nocturna" };
const PERIODOS: Record<string, string> = { todo: "Todo", ano: "Este año", mes: "Este mes", "30d": "Últimos 30 días" };
// Hora actual fuera del render (regla de pureza de React)
const ahoraMs = () => Date.now();

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

// Lo que se cobra: por cada entrada vendida, cada apuntado en lista, cada reserva y cada pase
// que vengan del enlace de la cuenta.
type Tipo = "entrada" | "lista" | "reserva" | "pase";
const TIPOS: { tipo: Tipo; label: string; corto: string }[] = [
  { tipo: "entrada", label: "Entrada vendida", corto: "Entradas" },
  { tipo: "lista", label: "Apuntado en lista", corto: "Listas" },
  { tipo: "reserva", label: "Reserva", corto: "Reservas" },
  { tipo: "pase", label: "Pase", corto: "Pases" },
];

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
  listas?: number;
  listas_dentro?: number;
  reservas?: number;
  pases?: number;
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

const BASE = "fv_evento_id, cuenta, codigo, nombre, local, inicio, cancelado, vendidas, dentro, apuntados_listado, anuladas";

export default async function Economia({ params }: { params: Record<string, string> }) {
  const supabase = createAdminClient();
  const cuenta = CUENTAS[params.cuenta] ? params.cuenta : "todas";
  const periodo = PERIODOS[params.periodo] ? params.periodo : "todo";
  const todos = params.todos === "1";

  // Todas las filas (unos cientos de fiestas por cuenta). Si falta la parte v2 de economia.sql
  // (listas, reservas, pases), se lee sin ella y se avisa.
  let faltaV2 = false;
  const leer = async (columnas: string) => {
    const filas: Fila[] = [];
    for (let desde = 0; ; desde += 1000) {
      const { data, error } = await supabase.from("fourvenues_economia").select(columnas).order("inicio", { ascending: false }).range(desde, desde + 999);
      if (error) return { filas, error };
      filas.push(...(data as unknown as Fila[]));
      if (!data || data.length < 1000) return { filas, error: null };
    }
  };
  let { filas, error } = await leer(`${BASE}, listas, listas_dentro, reservas, pases`);
  if (error && /listas|reservas|pases/.test(error.message)) {
    faltaV2 = true;
    ({ filas, error } = await leer(BASE));
  }
  if (error) {
    return (
      <Card className="border-amber-500/40">
        <CardContent className="py-4 text-sm text-amber-400">
          Falta crear las tablas de economía: ejecuta <code>eventos-server/economia.sql</code> en el SQL Editor de Supabase.
        </CardContent>
      </Card>
    );
  }
  const conTipo = await supabase.from("fourvenues_comisiones").select("ambito, clave, euros, tipo");
  const comisiones = (conTipo.error
    ? ((await supabase.from("fourvenues_comisiones").select("ambito, clave, euros")).data ?? []).map((c) => ({ ...c, tipo: "entrada" }))
    : conTipo.data ?? []) as { ambito: string; clave: string; euros: number; tipo: string }[];
  if (conTipo.error) faltaV2 = true;

  // Comisión de cada tipo: la de la fiesta, si no la de su local, si no la general
  const mapa = new Map(comisiones.map((c) => [`${c.ambito}|${c.clave}|${c.tipo}`, Number(c.euros)]));
  const propia = (ambito: string, clave: string, tipo: Tipo) => mapa.get(`${ambito}|${clave}|${tipo}`) ?? null;
  const general = (tipo: Tipo) => propia("general", "", tipo) ?? 0;
  const delLocal = (local: string | null, tipo: Tipo) => (local ? propia("local", local, tipo) : null) ?? general(tipo);
  const comisionDe = (f: Fila, tipo: Tipo) => propia("evento", f.fv_evento_id, tipo) ?? delLocal(f.local, tipo);
  const hayComision = comisiones.some((c) => Number(c.euros) > 0);

  const ahora = ahoraMs();
  const hoy = new Date(ahora);
  const inicioPeriodo =
    periodo === "ano" ? new Date(hoy.getFullYear(), 0, 1).getTime()
    : periodo === "mes" ? new Date(hoy.getFullYear(), hoy.getMonth(), 1).getTime()
    : periodo === "30d" ? ahora - 30 * 86400000
    : -Infinity;

  const calc = filas
    .filter((f) => !f.cancelado && (cuenta === "todas" || f.cuenta === cuenta))
    .map((f) => {
      const n: Record<Tipo, number> = {
        entrada: Math.max(f.vendidas ?? 0, f.apuntados_listado ?? 0),
        lista: f.listas ?? 0,
        reserva: f.reservas ?? 0,
        pase: f.pases ?? 0,
      };
      const ganado = TIPOS.reduce((s, { tipo }) => s + n[tipo] * comisionDe(f, tipo), 0);
      const t = f.inicio ? new Date(f.inicio).getTime() : 0;
      return { f, n, ganado, t, pasado: t < ahora, actividad: n.entrada + n.lista + n.reserva + n.pase };
    });
  type Calc = (typeof calc)[number];
  const enPeriodo = calc.filter((x) => x.t >= inicioPeriodo);
  const conActividad = enPeriodo.filter((x) => x.actividad > 0);
  const pasados = conActividad.filter((x) => x.pasado);
  const futuros = conActividad.filter((x) => !x.pasado);
  const sumaGanado = (xs: Calc[]) => xs.reduce((s, x) => s + x.ganado, 0);
  const sumaN = (xs: Calc[], tipo: Tipo) => xs.reduce((s, x) => s + x.n[tipo], 0);
  const vendidasPasadas = sumaN(pasados, "entrada");
  const dentro = pasados.reduce((s, x) => s + (x.f.dentro ?? 0), 0);

  // Por meses (los últimos 12, por fecha de la fiesta)
  const meses = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - 11 + i, 1);
    return { clave: `${d.getFullYear()}-${d.getMonth()}`, etiqueta: `${MESES[d.getMonth()]}${d.getMonth() === 0 ? ` ${String(d.getFullYear()).slice(2)}` : ""}`, ganado: 0, entradas: 0, listas: 0 };
  });
  for (const x of calc) {
    if (!x.t || x.actividad === 0) continue;
    const d = new Date(x.t);
    const m = meses.find((mm) => mm.clave === `${d.getFullYear()}-${d.getMonth()}`);
    if (m) { m.ganado += x.ganado; m.entradas += x.n.entrada; m.listas += x.n.lista; }
  }
  const valorMes = (m: (typeof meses)[number]) => (hayComision ? m.ganado : m.entradas + m.listas);
  const maxMes = Math.max(1, ...meses.map(valorMes));
  const mesActual = meses[11], mesAnterior = meses[10];
  const textoMes = (m: (typeof meses)[number]) => `${m.entradas} entradas · ${m.listas} en lista`;

  // Por local (todos los locales que aparecen en las fiestas, los que tienen actividad primero)
  const locales = new Map<string, { eventos: number; n: Record<Tipo, number>; ganado: number }>();
  for (const x of calc) {
    const nombre = x.f.local ?? "Sin local";
    const l = locales.get(nombre) ?? { eventos: 0, n: { entrada: 0, lista: 0, reserva: 0, pase: 0 }, ganado: 0 };
    if (x.t >= inicioPeriodo && x.actividad > 0) {
      l.eventos++;
      for (const { tipo } of TIPOS) l.n[tipo] += x.n[tipo];
      l.ganado += x.ganado;
    }
    locales.set(nombre, l);
  }
  const conPropia = new Set(comisiones.filter((c) => c.ambito === "local").map((c) => c.clave));
  const listaLocales = [...locales.entries()]
    .filter(([nombre]) => nombre !== "Sin local")
    .sort((a, b) => b[1].eventos - a[1].eventos || Number(conPropia.has(b[0])) - Number(conPropia.has(a[0])) || a[0].localeCompare(b[0]));

  // Fiestas de la tabla: con actividad (o todas con ?todos=1), del periodo
  const tabla = (todos ? enPeriodo : conActividad).slice(0, 400);
  const filtros = { ...(cuenta !== "todas" ? { cuenta } : {}), ...(periodo !== "todo" ? { periodo } : {}), ...(todos ? { todos: "1" } : {}) };
  const chip = (activo: boolean) => `rounded-md border px-2.5 py-1 ${activo ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:bg-muted"}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold flex items-center gap-2"><Coins className="w-5 h-5 text-primary" /> Economía</h2>
        <div className="flex flex-wrap gap-2 text-sm">
          {[["todas", "Las dos cuentas"], ...Object.entries(CUENTAS)].map(([k, v]) => (
            <Link key={k} href={enlaceCon(filtros, { cuenta: k === "todas" ? null : k })} className={chip(cuenta === k)}>{v}</Link>
          ))}
          <span className="mx-1 w-px bg-border" />
          {Object.entries(PERIODOS).map(([k, v]) => (
            <Link key={k} href={enlaceCon(filtros, { periodo: k === "todo" ? null : k })} className={chip(periodo === k)}>{v}</Link>
          ))}
        </div>
      </div>

      {faltaV2 && (
        <Card className="border-amber-500/40">
          <CardContent className="py-3 text-sm text-amber-400">
            Para las listas, reservas, pases y la comisión por tipo hay que ejecutar otra vez <code>eventos-server/economia.sql</code> en el SQL Editor de Supabase (la parte v2).
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          { label: "Ganado", value: euros(sumaGanado(pasados)), sub: "fiestas ya celebradas", destacado: true },
          { label: "Por cobrar", value: euros(sumaGanado(futuros)), sub: "de próximas fiestas" },
          { label: "Entradas vendidas", value: (vendidasPasadas + sumaN(futuros, "entrada")).toLocaleString("es-ES"), sub: `${conActividad.length} fiestas con actividad` },
          { label: "Apuntados en lista", value: (sumaN(pasados, "lista") + sumaN(futuros, "lista")).toLocaleString("es-ES"), sub: `${pasados.reduce((s, x) => s + (x.f.listas_dentro ?? 0), 0)} entraron` },
          { label: "Entraron con entrada", value: dentro.toLocaleString("es-ES"), sub: vendidasPasadas ? `${Math.round((dentro / vendidasPasadas) * 100)} % de asistencia` : "—" },
          { label: "Este mes", value: hayComision ? euros(mesActual.ganado) : `${mesActual.entradas + mesActual.listas}`, sub: `${textoMes(mesActual)} · mes pasado ${hayComision ? euros(mesAnterior.ganado) : mesAnterior.entradas + mesAnterior.listas}` },
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

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" /> {hayComision ? "Ganado por mes" : "Entradas y apuntados en lista por mes"}
            <span className="text-xs font-normal text-muted-foreground">últimos 12 meses, por fecha de la fiesta</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-44 items-end gap-2">
            {meses.map((m) => {
              const v = valorMes(m);
              return (
                <div key={m.clave} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${m.etiqueta}: ${euros(m.ganado)} · ${textoMes(m)}`}>
                  <span className="text-[10px] text-muted-foreground">{v ? (hayComision ? euros(v) : v) : ""}</span>
                  <div className="w-full rounded-t-md bg-primary/80" style={{ height: `${Math.max(v ? 4 : 1, (v / maxMes) * 100)}%`, opacity: v ? 1 : 0.25 }} />
                  <span className="text-[11px] text-muted-foreground">{m.etiqueta}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2"><Store className="w-4 h-4 text-primary" /> Comisiones y resultados por local</CardTitle>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Fourvenues no da la comisión, así que la ponéis vosotros: lo que cobráis en cada local por cada entrada vendida, cada persona que se apunta en
            lista desde vuestro enlace, cada reserva y cada pase. Si un local no tiene la suya, se usa la general (en gris). Pulsa una cifra para cambiarla.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-border text-xs text-muted-foreground">
                  <th className="text-left font-medium px-4 py-2">Local</th>
                  <th className="text-right font-medium px-4 py-2">Fiestas</th>
                  {TIPOS.map((t) => (
                    <th key={t.tipo} className="text-left font-medium px-4 py-2">{t.label}</th>
                  ))}
                  <th className="text-right font-medium px-4 py-2">Ganado</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border bg-muted/30">
                  <td className="px-4 py-2 font-medium">General <span className="text-xs font-normal text-muted-foreground">(locales sin comisión propia)</span></td>
                  <td className="px-4 py-2" />
                  {TIPOS.map((t) => (
                    <td key={t.tipo} className="px-4 py-2">
                      <Comision ambito="general" clave="" tipo={t.tipo} propia={propia("general", "", t.tipo)} compacta />
                    </td>
                  ))}
                  <td className="px-4 py-2" />
                </tr>
                {listaLocales.map(([nombre, l]) => (
                  <tr key={nombre} className="border-b border-border/50 last:border-0">
                    <td className="px-4 py-2 font-medium">{nombre}</td>
                    <td className="px-4 py-2 text-right">{l.eventos || <span className="text-muted-foreground">0</span>}</td>
                    {TIPOS.map((t) => (
                      <td key={t.tipo} className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <Comision ambito="local" clave={nombre} tipo={t.tipo} propia={propia("local", nombre, t.tipo)} heredada={general(t.tipo)} compacta />
                          {l.n[t.tipo] > 0 && <span className="text-xs text-muted-foreground">× {l.n[t.tipo]}</span>}
                        </div>
                      </td>
                    ))}
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
            {todos ? "Todas las fiestas" : "Fiestas con ventas o apuntados"} <span className="text-xs font-normal text-muted-foreground">({tabla.length})</span>
          </CardTitle>
          <Link href={enlaceCon(filtros, { todos: todos ? null : "1" })} className="text-xs text-primary hover:underline">
            {todos ? "Ver solo las que tienen actividad" : "Ver también las que no tienen nada"}
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {tabla.length === 0 ? (
            <p className="px-4 pb-4 text-sm text-muted-foreground">Todavía no hay ventas ni apuntados en este periodo.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-border text-xs text-muted-foreground">
                    <th className="text-left font-medium px-4 py-2">Fecha</th>
                    <th className="text-left font-medium px-4 py-2">Fiesta</th>
                    <th className="text-left font-medium px-4 py-2">Local</th>
                    <th className="text-left font-medium px-4 py-2">Cuenta</th>
                    {TIPOS.map((t) => <th key={t.tipo} className="text-right font-medium px-4 py-2">{t.corto}</th>)}
                    <th className="text-right font-medium px-4 py-2">Entraron</th>
                    <th className="text-right font-medium px-4 py-2">Ganado</th>
                  </tr>
                </thead>
                <tbody>
                  {tabla.map(({ f, n, ganado, pasado }) => (
                    <tr key={f.fv_evento_id} className="border-b border-border/50 last:border-0">
                      <td className="px-4 py-2 whitespace-nowrap text-muted-foreground">
                        {f.inicio ? new Date(f.inicio).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                        {!pasado && <Badge variant="secondary" className="ml-2 text-[10px]">próxima</Badge>}
                      </td>
                      <td className="px-4 py-2 font-medium">{f.nombre ?? f.codigo ?? "—"}</td>
                      <td className="px-4 py-2 text-muted-foreground">{f.local ?? "—"}</td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">{CUENTAS[f.cuenta] ?? f.cuenta}</td>
                      {TIPOS.map((t) => (
                        <td key={t.tipo} className={`px-4 py-2 text-right ${n[t.tipo] ? "" : "text-muted-foreground/50"}`}>
                          {n[t.tipo]}
                          {t.tipo === "entrada" && f.anuladas ? <span className="ml-1 text-xs text-red-400">({f.anuladas} anul.)</span> : null}
                        </td>
                      ))}
                      <td className="px-4 py-2 text-right text-muted-foreground">{pasado ? (f.dentro ?? 0) + (f.listas_dentro ?? 0) : "—"}</td>
                      <td className="px-4 py-2 text-right font-medium">{euros(ganado)}</td>
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
