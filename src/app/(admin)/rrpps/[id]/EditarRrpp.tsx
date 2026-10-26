"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, Power, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { activarRrpp, borrarRrpp, cambiarCodigoRrpp, editarRrpp } from "@/app/actions/rrpps";
import CamposRrpp, { numeroEuros, type ValoresRrpp } from "../CamposRrpp";

interface Props {
  rrpp: {
    id: string;
    nombre: string;
    comision: number;
    email: string | null;
    telefono: string | null;
    notas: string | null;
    cuentaApp: string;
    codigo: string;
    activo: boolean;
    tieneVentas: boolean;
  };
  /** Fechas ya formateadas en el servidor */
  codigos: { codigo: string; desde: string; hasta: string | null }[];
}


export default function EditarRrpp({ rrpp, codigos }: Props) {
  const router = useRouter();
  const [v, setV] = useState<ValoresRrpp>({
    nombre: rrpp.nombre,
    comision: String(rrpp.comision).replace(".", ","),
    email: rrpp.email ?? "",
    telefono: rrpp.telefono ?? "",
    cuentaApp: rrpp.cuentaApp,
    notas: rrpp.notas ?? "",
  });
  const [codigo, setCodigo] = useState("");
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pendiente, startTransition] = useTransition();

  const ejecutar = (fn: () => Promise<{ ok: boolean; error?: string }>, exito: string, despues?: () => void) => {
    setMensaje(null);
    startTransition(async () => {
      const r = await fn();
      if (!r.ok) setMensaje({ ok: false, texto: r.error ?? "No se ha podido hacer" });
      else {
        setMensaje({ ok: true, texto: exito });
        despues?.();
      }
      router.refresh();
    });
  };

  const guardar = (e: React.FormEvent) => {
    e.preventDefault();
    // La cuenta de la app solo se manda si se ha cambiado (si no, se queda la que tenga vinculada)
    const cuentaApp = v.cuentaApp.trim() === rrpp.cuentaApp.trim() ? undefined : v.cuentaApp;
    if (cuentaApp !== undefined && !cuentaApp.trim() && rrpp.cuentaApp && !confirm("¿Desvincular su cuenta de la app? Sus propias compras pasarán a contar como ventas suyas.")) return;
    ejecutar(() => editarRrpp(rrpp.id, { ...v, cuentaApp, comision: numeroEuros(v.comision) }), "Datos guardados");
  };

  const cambiar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm(`¿Cambiar el código ${rrpp.codigo} por ${codigo}? El código ${rrpp.codigo} dejará de funcionar ya (quien lo puso antes de comprar sigue contando para este RRPP).`)) return;
    ejecutar(() => cambiarCodigoRrpp(rrpp.id, codigo), "Código cambiado", () => setCodigo(""));
  };

  const activar = () => {
    const pregunta = rrpp.activo
      ? `¿Desactivar a ${rrpp.nombre}? Su código dejará de funcionar y las compras que se empiecen a partir de ahora no le contarán. Lo que ya tiene pendiente se le puede seguir pagando.`
      : `¿Volver a activar a ${rrpp.nombre}? Su código volverá a funcionar.`;
    if (!confirm(pregunta)) return;
    ejecutar(() => activarRrpp(rrpp.id, !rrpp.activo), rrpp.activo ? "Desactivado" : "Activado");
  };

  const borrar = () => {
    if (!confirm(`¿Borrar a ${rrpp.nombre} del todo? No tiene ventas, así que no se pierde nada.`)) return;
    startTransition(async () => {
      const r = await borrarRrpp(rrpp.id);
      if (!r.ok) setMensaje({ ok: false, texto: r.error });
      else router.push("/rrpps");
    });
  };

  return (
    <div className="space-y-8">
      <form onSubmit={guardar} className="space-y-4">
        <CamposRrpp v={v} set={setV} />
        <Button type="submit" disabled={pendiente} className="gap-2">
          {pendiente ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar datos
        </Button>
      </form>

      <form onSubmit={cambiar} className="space-y-2 border-t border-border pt-6">
        <Label htmlFor="rrpp-nuevo-codigo" className="flex items-center gap-2"><KeyRound className="w-4 h-4" /> Cambiar el código ({rrpp.codigo})</Label>
        <div className="flex gap-2 max-w-md">
          <Input
            id="rrpp-nuevo-codigo"
            value={codigo}
            maxLength={30}
            placeholder="NUEVOCODIGO"
            onChange={(e) => setCodigo(e.target.value.replace(/\s+/g, "").toUpperCase())}
            className="font-mono uppercase"
          />
          <Button type="submit" variant="outline" disabled={pendiente || !codigo}>Cambiar</Button>
        </div>
        {codigos.length > 1 && (
          <p className="text-xs text-muted-foreground">
            Códigos que ha tenido:{" "}
            {codigos.map((c) => `${c.codigo} (${c.desde}${c.hasta ? ` – ${c.hasta}` : ", el actual"})`).join(" · ")}
          </p>
        )}
      </form>

      <div className="flex flex-wrap gap-3 border-t border-border pt-6">
        <Button variant={rrpp.activo ? "outline" : "default"} onClick={activar} disabled={pendiente} className="gap-2">
          <Power className="w-4 h-4" /> {rrpp.activo ? "Desactivar" : "Activar"}
        </Button>
        {!rrpp.tieneVentas && (
          <Button variant="destructive" onClick={borrar} disabled={pendiente} className="gap-2">
            <Trash2 className="w-4 h-4" /> Borrar
          </Button>
        )}
        {rrpp.tieneVentas && (
          <p className="text-xs text-muted-foreground self-center">Tiene ventas o pagos: no se puede borrar (para dejarlo fuera, desactívalo).</p>
        )}
      </div>

      {mensaje && <p className={`text-sm ${mensaje.ok ? "text-green-400" : "text-red-400"}`}>{mensaje.texto}</p>}
    </div>
  );
}
