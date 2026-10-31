"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BanknoteArrowUp, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { liquidarVentas } from "@/app/actions/rrpps";
import { euros } from "@/app/(admin)/fourvenues/formato";
import CorregirVenta from "./CorregirVenta";
import { textoComision, type Comision } from "./ComisionDiscoteca";
import { numeroEuros } from "../CamposRrpp";

export interface VentaFila {
  id: number;
  fiesta: string;
  eventoId: string | null;
  discoteca: string;
  /** Fecha ya formateada en el servidor */
  vendida: string;
  origen: "web" | "app";
  precio: number | null;
  /** Lo calculado con la comisión de su discoteca (null: sin comisión fijada) */
  comision: number | null;
  /** Lo que se le pagó por ella (solo las ya pagadas) */
  pagado: number | null;
  comprador: string;
  compradorId: string | null;
  motivo: string | null;
  /** La fiesta ya se celebró (12 h después de empezar): se puede pagar */
  pagable: boolean;
  pagableDesde: string;
  liquidacionId: number | null;
}

export interface GrupoDiscoteca {
  /** local_id, o "" si la fiesta no tiene discoteca */
  clave: string;
  nombre: string;
  comision: Comision | null;
  ventas: VentaFila[];
}

const redondear = (n: number) => Math.round(n * 100) / 100;
const MAX_IMPORTE = 100000;
// 7.5 → "7,50"; 4 → "4" (como se escribe en el campo)
const aTexto = (n: number) => (Number.isInteger(redondear(n)) ? String(redondear(n)) : redondear(n).toFixed(2).replace(".", ","));

// Ventas válidas aún sin pagar, por discoteca. En cada una se eligen las que se le pagan y se pone lo que
// se le paga por ellas (sale ya puesto lo calculado con su comisión, si la tiene). Todo se registra de
// una vez como un pago (queda en el historial y se puede deshacer). Las anuladas después de pagárselas
// se descuentan en ese pago.
export default function VentasPendientes({ rrppId, grupos, aDescontar }: { rrppId: string; grupos: GrupoDiscoteca[]; aDescontar: VentaFila[] }) {
  const router = useRouter();
  const [elegidas, setElegidas] = useState<Set<number>>(() => new Set());
  // Lo que se ha escrito a mano en cada discoteca (si no, se usa lo calculado)
  const [escrito, setEscrito] = useState<Record<string, string>>({});
  // Lo que hay que descontar va marcado de entrada (se puede desmarcar)
  const [noDescontar, setNoDescontar] = useState<Set<number>>(() => new Set());
  const [nota, setNota] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hecho, setHecho] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();

  const hayVentas = grupos.some((g) => g.ventas.length > 0);
  if (!hayVentas && aDescontar.length === 0) {
    return (
      <div className="space-y-2">
        {hecho && <p className="text-sm text-emerald-400 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> {hecho}</p>}
        <p className="text-sm text-muted-foreground">No tiene ventas pendientes de pagar.</p>
      </div>
    );
  }

  // Por discoteca: lo elegido (solo lo que sigue en la lista y se puede pagar), lo calculado y lo que se paga
  const cuentas = grupos.map((g) => {
    const pagables = g.ventas.filter((v) => v.pagable);
    const sel = pagables.filter((v) => elegidas.has(v.id));
    const sinComision = sel.filter((v) => v.comision === null).length;
    const calculado = sel.length && !sinComision ? redondear(sel.reduce((s, v) => s + (v.comision ?? 0), 0)) : null;
    const texto = escrito[g.clave] ?? (calculado !== null ? aTexto(calculado) : "");
    const importe = numeroEuros(texto);
    const facturado = redondear(sel.reduce((s, v) => s + (v.precio ?? 0), 0));
    return { g, pagables, sel, sinComision, calculado, texto, importe, facturado };
  });
  const usados = cuentas.filter((c) => c.sel.length > 0);
  const desc = aDescontar.filter((v) => !noDescontar.has(v.id));
  const menos = redondear(desc.reduce((s, v) => s + (v.pagado ?? 0), 0));
  const malos = usados.filter((c) => !Number.isFinite(c.importe) || c.importe > MAX_IMPORTE);
  const bruto = redondear(usados.reduce((s, c) => s + (Number.isFinite(c.importe) ? c.importe : 0), 0));
  const neto = redondear(bruto - menos);
  const nEntradas = usados.reduce((s, c) => s + c.sel.length, 0);

  const alternar = (conjunto: Set<number>, poner: (s: Set<number>) => void, ids: number[], marcar?: boolean) => {
    const n = new Set(conjunto);
    for (const id of ids) {
      if (marcar ?? !n.has(id)) n.add(id);
      else n.delete(id);
    }
    poner(n);
  };

  const pagar = () => {
    if (!usados.length && !desc.length) return;
    if (malos.length) {
      setError(`Pon lo que le pagas por las entradas de ${malos.map((c) => c.g.nombre).join(", ")} (en €, p. ej. 25 o 12,50).`);
      return;
    }
    const lineas = usados.map((c) => `· ${c.g.nombre}: ${c.sel.length} ${c.sel.length === 1 ? "entrada" : "entradas"} → ${euros(c.importe)}`);
    if (desc.length) lineas.push(`· Descontado: ${desc.length} ${desc.length === 1 ? "anulada" : "anuladas"} ya pagadas → −${euros(menos)}`);
    const texto =
      (neto >= 0 ? `¿Registrar un pago de ${euros(neto)} a este RRPP?` : `Lo descontado es más que lo que se le paga: te tiene que devolver ${euros(-neto)}. ¿Registrarlo así?`) +
      `\n\n${lineas.join("\n")}\n\nHazlo cuando ya le hayas pagado.`;
    if (!confirm(texto)) return;
    setError(null);
    setHecho(null);
    const pagos = usados.map((c) => ({ ventas: c.sel.map((v) => v.id), importe: c.importe }));
    const descIds = desc.map((v) => v.id);
    startTransition(async () => {
      const r = await liquidarVentas(rrppId, pagos, descIds, nota);
      if (!r.ok) {
        setError(r.error);
        router.refresh();
        return;
      }
      setElegidas(new Set());
      setEscrito({});
      setNoDescontar(new Set());
      setNota("");
      setHecho(`Pago #${r.data} registrado: ${neto < 0 ? `te devuelve ${euros(-neto)}` : euros(neto)}.`);
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      {!hayVentas && <p className="text-sm text-muted-foreground">No tiene ventas pendientes de pagar.</p>}

      {cuentas.filter((c) => c.g.ventas.length > 0).map((c) => {
        const { g, pagables, sel } = c;
        const todas = sel.length === pagables.length && pagables.length > 0;
        const noPagables = g.ventas.length - pagables.length;
        const mal = sel.length > 0 && (!Number.isFinite(c.importe) || c.importe > MAX_IMPORTE);
        return (
          <section key={g.clave || "sin"} className={`rounded-lg border p-3 space-y-3 ${sel.length ? "border-primary/50" : "border-border"}`}>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  aria-label={`Elegir todas las de ${g.nombre} que se pueden pagar`}
                  checked={todas}
                  disabled={!pagables.length}
                  onChange={() => alternar(elegidas, setElegidas, pagables.map((v) => v.id), !todas)}
                  className="h-4 w-4 accent-[var(--primary)]"
                />
                <span className="font-semibold">{g.nombre}</span>
              </label>
              <span className="text-xs text-muted-foreground">
                {g.ventas.length} {g.ventas.length === 1 ? "entrada" : "entradas"} sin pagar
                {noPagables > 0 ? ` · ${pagables.length} ya se ${pagables.length === 1 ? "puede" : "pueden"} pagar` : ""}
                {" · "}
                {g.comision ? `su comisión: ${textoComision(g.comision)}` : "sin comisión fijada"}
              </span>
              {sel.length > 0 && (
                <div className="ml-auto flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {sel.length} {sel.length === 1 ? "elegida" : "elegidas"} · {euros(c.facturado)} en entradas
                    {c.calculado !== null ? ` · calculado ${euros(c.calculado)}` : c.sinComision < sel.length ? ` · ${c.sinComision} sin calcular` : ""}
                  </span>
                  <label className="flex items-center gap-1.5 text-sm">
                    Le pagas
                    <Input
                      inputMode="decimal"
                      value={c.texto}
                      onChange={(e) => { setEscrito({ ...escrito, [g.clave]: e.target.value }); setError(null); }}
                      placeholder="0,00"
                      aria-invalid={mal}
                      className={`h-8 w-24 text-right ${mal ? "border-red-500" : ""}`}
                    />
                    €
                  </label>
                  {escrito[g.clave] !== undefined && c.calculado !== null && (
                    <Button size="xs" variant="ghost" onClick={() => { const n = { ...escrito }; delete n[g.clave]; setEscrito(n); }}>
                      Poner lo calculado
                    </Button>
                  )}
                </div>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="w-8" />
                    <th className="text-left font-medium px-2 py-1.5">Vendida</th>
                    <th className="text-left font-medium px-2 py-1.5">Fiesta</th>
                    <th className="text-left font-medium px-2 py-1.5">Comprador</th>
                    <th className="text-left font-medium px-2 py-1.5">Dónde</th>
                    <th className="text-right font-medium px-2 py-1.5">Entrada</th>
                    <th className="text-right font-medium px-2 py-1.5">Calculado</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {g.ventas.map((v) => (
                    <tr key={v.id} className={`border-b border-border last:border-0 hover:bg-muted/30 ${v.pagable ? "" : "text-muted-foreground"}`}>
                      <td className="px-2 py-1.5">
                        {v.pagable ? (
                          <input
                            type="checkbox"
                            aria-label={`Elegir la venta ${v.id}`}
                            checked={elegidas.has(v.id)}
                            onChange={() => alternar(elegidas, setElegidas, [v.id])}
                            className="h-4 w-4 accent-[var(--primary)]"
                          />
                        ) : (
                          <span title={`La fiesta aún no se ha celebrado: se podrá pagar ${v.pagableDesde}`}>
                            <Clock className="w-4 h-4" />
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 whitespace-nowrap text-muted-foreground">{v.vendida}</td>
                      <td className="px-2 py-1.5">{v.eventoId ? <Link href={`/eventos/${v.eventoId}`} className="hover:underline">{v.fiesta}</Link> : v.fiesta}</td>
                      <td className="px-2 py-1.5">{v.compradorId ? <Link href={`/usuarios/${v.compradorId}`} className="hover:underline">{v.comprador}</Link> : v.comprador}</td>
                      <td className="px-2 py-1.5 text-xs text-muted-foreground">{v.origen === "app" ? "En la app" : "Web de Fourvenues"}</td>
                      <td className="px-2 py-1.5 text-right">{v.precio === null ? "—" : euros(v.precio)}</td>
                      <td className="px-2 py-1.5 text-right">{v.comision === null ? <span className="text-muted-foreground">—</span> : euros(v.comision)}</td>
                      <td className="px-2 py-1.5 text-right"><CorregirVenta rrppId={rrppId} ventaId={v.id} accion="anulada" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {noPagables > 0 && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 shrink-0" /> {noPagables} {noPagables === 1 ? "es de una fiesta que aún no se ha celebrado" : "son de fiestas que aún no se han celebrado"}: se
                podrán pagar 12 horas después de que empiece, cuando ya no haya reembolsos.
              </p>
            )}
          </section>
        );
      })}

      {aDescontar.length > 0 && (
        <div className="rounded-lg border border-amber-500/40 p-3 space-y-2">
          <p className="text-sm font-medium text-amber-400">
            A descontar: {aDescontar.length} {aDescontar.length === 1 ? "venta anulada" : "ventas anuladas"} después de pagársela (
            {euros(aDescontar.reduce((s, v) => s + (v.pagado ?? 0), 0))})
          </p>
          <p className="text-xs text-muted-foreground">
            Se le pagaron, pero luego la entrada se anuló, se reembolsó o la fiesta se canceló. Las marcadas se restan de este pago (lo que se le
            pagó por cada una). Si el pago anterior fue un error, deshazlo abajo en vez de descontar.
          </p>
          {aDescontar.map((v) => (
            <label key={v.id} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={!noDescontar.has(v.id)}
                onChange={() => alternar(noDescontar, setNoDescontar, [v.id])}
                className="h-4 w-4 accent-[var(--primary)]"
              />
              <span>
                {v.vendida} · {v.discoteca} · {v.fiesta} · {v.comprador} · <b>−{euros(v.pagado ?? 0)}</b>
                <span className="text-xs text-muted-foreground"> (pago #{v.liquidacionId}{v.motivo ? ` · ${v.motivo}` : ""})</span>
              </span>
            </label>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <p className="text-sm">
          {usados.length || desc.length ? (
            <>
              {nEntradas} {nEntradas === 1 ? "entrada" : "entradas"}
              {usados.length > 1 ? ` de ${usados.length} discotecas` : ""} ({euros(bruto)}){desc.length ? <> − {euros(menos)} descontado</> : null} ={" "}
              <b className={neto < 0 ? "text-amber-400" : ""}>{neto < 0 ? `te devuelve ${euros(-neto)}` : euros(neto)}</b>
            </>
          ) : (
            <span className="text-muted-foreground">Elige las entradas que le pagas y pon cuánto en cada discoteca</span>
          )}
        </p>
        <Input value={nota} onChange={(e) => setNota(e.target.value)} maxLength={300} placeholder="Nota del pago (Bizum, fecha…)" className="max-w-xs" />
        <Button onClick={pagar} disabled={(!usados.length && !desc.length) || pendiente} className="gap-2">
          {pendiente ? <Loader2 className="w-4 h-4 animate-spin" /> : <BanknoteArrowUp className="w-4 h-4" />}
          Registrar pago
        </Button>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {hecho && <p className="text-sm text-emerald-400 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> {hecho}</p>}
    </div>
  );
}
