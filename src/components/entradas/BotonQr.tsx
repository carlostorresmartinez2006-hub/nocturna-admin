"use client";
// Botón «QR» de una entrada: abre su código QR (el mismo que enseña la app en la puerta) con los
// datos para revisar un error. El código se pide al abrir (app/actions/qr.ts), no viene en la página.
import { useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { AlertTriangle, Check, Copy, Loader2, QrCode } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { verQr, type DetalleQr, type OrigenQr } from "@/app/actions/qr";

export type EstadoQr =
  | { tipo: "cargando" }
  | { tipo: "error"; mensaje: string; reintentar: boolean }
  | { tipo: "listo"; qr: DetalleQr };

const euros = (n: number | null) =>
  n == null ? null : new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);

// Qué le pasa a esta entrada en la puerta (null: nada que avisar)
function aviso(qr: DetalleQr): { tono: "rojo" | "ambar"; texto: string } | null {
  if (qr.estado === "anulada") return { tono: "rojo", texto: "Anulada: este QR ya no vale en la puerta." };
  if (qr.venta?.anulada) {
    return { tono: "rojo", texto: `La venta está anulada en ${qr.venta.cuenta === "tickes" ? "tickes.es" : "Fourvenues"}: en la puerta no entrará.` };
  }
  if (qr.origen === "amigo" && qr.estado === "pendiente") {
    return { tono: "ambar", texto: "Para un amigo: todavía no la tiene nadie en su cuenta. Si entra con este QR, no suma su punto." };
  }
  if (qr.origen === "amigo" && qr.estado === "reclamada") {
    return { tono: "ambar", texto: "Ya la tiene un amigo en su cuenta: sale en sus entradas." };
  }
  if (qr.origen === "entrada" && qr.estado !== "verificada") {
    return { tono: "ambar", texto: `Estado «${qr.estado}»: en la app no se enseña el QR hasta que está verificada.` };
  }
  return null;
}

function Dato({ k, v }: { k: string; v: string | null | undefined }) {
  if (!v) return null;
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5 border-b border-border/40 last:border-0">
      <span className="text-xs text-muted-foreground shrink-0">{k}</span>
      <span className="text-sm text-right break-words min-w-0">{v}</span>
    </div>
  );
}

/** Lo de dentro de la ventana: cabecera y, según el estado, cargando, error o el QR con sus datos */
export function ContenidoQr({ estado, onReintentar }: { estado: EstadoQr; onReintentar: () => void }) {
  const [copiado, setCopiado] = useState(false);
  const qr = estado.tipo === "listo" ? estado.qr : null;
  const alerta = qr ? aviso(qr) : null;
  const tipoTexto = qr
    ? [
        qr.origen === "amigo" ? "Para un amigo" : qr.tipo === "lista" ? "Lista" : "Entrada",
        qr.personas && qr.personas > 1 ? `${qr.personas} personas` : null,
      ].filter(Boolean).join(" · ")
    : "";

  async function copiar(codigo: string) {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      // Sin permiso para el portapapeles: el código se puede seleccionar a mano
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="pr-8">{qr?.evento?.titulo ?? "Código QR"}</DialogTitle>
        <DialogDescription>
          {qr ? [qr.evento?.fecha_texto, tipoTexto].filter(Boolean).join(" · ") : "Lo mismo que se escanea en la puerta."}
        </DialogDescription>
      </DialogHeader>

      {estado.tipo === "cargando" ? (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Cargando el QR…
        </div>
      ) : estado.tipo === "error" ? (
        <div className="py-10 text-center space-y-3">
          <p className="text-sm text-destructive">{estado.mensaje}</p>
          {estado.reintentar ? (
            <Button variant="outline" size="sm" onClick={onReintentar}>Reintentar</Button>
          ) : null}
        </div>
      ) : qr ? (
        <div className="space-y-4">
          {alerta && (
            <div
              className={
                alerta.tono === "rojo"
                  ? "flex gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400"
                  : "flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-400"
              }
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{alerta.texto}</span>
            </div>
          )}

          {/* Fondo blanco y margen: se puede escanear desde la pantalla */}
          <div className="mx-auto w-fit rounded-xl bg-white p-4">
            <QRCodeSVG
              value={qr.codigo}
              size={220}
              level="M"
              marginSize={1}
              title={`QR de la entrada ${qr.codigo}`}
              className={qr.estado === "anulada" || qr.venta?.anulada ? "opacity-40" : undefined}
            />
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2">
            <code className="flex-1 min-w-0 break-all font-mono text-xs select-all">{qr.codigo}</code>
            <Button variant="ghost" size="icon-sm" onClick={() => copiar(qr.codigo)} title="Copiar el código">
              {copiado ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </Button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <Badge
              variant="secondary"
              className={
                qr.estado === "verificada" || qr.estado === "reclamada"
                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs"
                  : qr.estado === "anulada"
                    ? "bg-red-500/20 text-red-400 border-red-500/30 text-xs"
                    : "text-xs"
              }
            >
              {qr.estado === "pendiente" && qr.origen === "amigo" ? "sin repartir" : qr.estado}
            </Badge>
            {qr.venta && (
              <Badge variant="secondary" className="text-xs">
                {qr.venta.cuenta === "tickes" ? "tickes.es" : `Fourvenues · ${qr.venta.cuenta}`}
              </Badge>
            )}
          </div>

          <div>
            <Dato k="A nombre de" v={qr.nombre} />
            <Dato k="Email de la entrada" v={qr.email} />
            <Dato k="Tarifa" v={qr.tarifa} />
            <Dato k={qr.tipo === "lista" ? "En puerta" : "Precio"} v={euros(qr.precio)} />
            {qr.venta && (
              <>
                <Dato k="Nombre en la venta" v={qr.venta.nombre && qr.venta.nombre !== qr.nombre ? qr.venta.nombre : null} />
                <Dato k="Email en la venta" v={qr.venta.email && qr.venta.email !== qr.email?.toLowerCase() ? qr.venta.email : null} />
                <Dato k="Estado en la venta" v={qr.venta.estado} />
              </>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Quien tenga este QR puede entrar con él: no lo compartas fuera del equipo.
          </p>
        </div>
      ) : null}
    </>
  );
}

export function BotonQr({
  origen,
  id,
  tieneQr,
  className,
}: {
  origen: OrigenQr;
  id: string;
  /** false: entrada añadida a mano, sin código (el botón sale apagado) */
  tieneQr: boolean;
  className?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [estado, setEstado] = useState<EstadoQr>({ tipo: "cargando" });
  // Turno de la carga: si se cierra (o se vuelve a abrir) antes de que llegue, la respuesta se tira
  const turno = useRef(0);

  async function cargar() {
    const mio = ++turno.current;
    setEstado({ tipo: "cargando" });
    try {
      const r = await verQr(origen, id);
      if (mio !== turno.current) return;
      setEstado(r.ok ? { tipo: "listo", qr: r.data } : { tipo: "error", mensaje: r.error, reintentar: !!r.reintentar });
    } catch {
      if (mio !== turno.current) return;
      setEstado({ tipo: "error", mensaje: "No se ha podido cargar. Revisa la conexión.", reintentar: true });
    }
  }

  function cambiar(abrir: boolean) {
    setAbierto(abrir);
    if (abrir) cargar();
    else {
      // Al cerrar se olvida el código (no se queda en la página)
      turno.current++;
      setEstado({ tipo: "cargando" });
    }
  }

  if (!tieneQr) {
    return (
      <Button variant="outline" size="sm" disabled className={className} title="Sin QR: entrada añadida a mano">
        <QrCode className="w-3.5 h-3.5" /> QR
      </Button>
    );
  }

  return (
    <>
      <Button variant="outline" size="sm" className={className} onClick={() => cambiar(true)} title="Ver el QR de la entrada">
        <QrCode className="w-3.5 h-3.5" /> QR
      </Button>
      <Dialog open={abierto} onOpenChange={(o) => cambiar(o)}>
        <DialogContent className="sm:max-w-sm max-h-[calc(100dvh-2rem)] overflow-y-auto">
          {/* key: al volver a abrir, sin el «copiado» de la vez anterior */}
          <ContenidoQr key={String(abierto)} estado={estado} onReintentar={cargar} />
        </DialogContent>
      </Dialog>
    </>
  );
}
