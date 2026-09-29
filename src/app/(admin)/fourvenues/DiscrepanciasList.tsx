"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Loader2, ShieldCheck } from "lucide-react";
import { resolverDiscrepancia, verificarDiscrepancia } from "@/app/actions/fourvenues";

export type DiscrepanciaRow = {
  id: number;
  tipo: string;
  codigo: string;
  created_at: string;
  detalle: Record<string, unknown>;
  evento: { id: string; titulo: string; fecha_texto: string | null } | null;
  perfil: { id: string; username: string | null; email: string; full_name: string | null } | null;
};

const TIPOS: Record<string, { titulo: string; texto: string }> = {
  nombre_distinto: {
    titulo: "Nombre distinto",
    texto: "El email es de este usuario pero el nombre de la entrada no coincide. Puede ser una entrada comprada para otra persona.",
  },
  evento_no_en_app: {
    titulo: "Evento que no está en la app",
    texto: "Este usuario compró entrada para un evento que no está en la app, así que no se ha podido asignar.",
  },
  anulada: {
    titulo: "Entrada anulada",
    texto: "La entrada estaba verificada en la app pero en Fourvenues aparece anulada. Se ha marcado como anulada.",
  },
};

function Acciones({ d }: { d: DiscrepanciaRow }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function ejecutar(accion: () => Promise<void>, pregunta: string) {
    if (!confirm(pregunta)) return;
    startTransition(async () => {
      try {
        await accion();
      } catch (e) {
        alert((e as Error).message);
      }
      router.refresh();
    });
  }

  if (isPending) return <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />;
  return (
    <div className="flex gap-2 shrink-0">
      {d.tipo === "nombre_distinto" && d.perfil && d.evento && (
        <Button
          size="sm"
          className="gap-1.5"
          onClick={() => ejecutar(() => verificarDiscrepancia(d.id), `¿Asignar la entrada ${d.codigo} a ${d.perfil?.username ?? d.perfil?.email} como verificada?`)}
        >
          <ShieldCheck className="w-3.5 h-3.5" /> Verificar igualmente
        </Button>
      )}
      <Button
        size="sm"
        variant="outline"
        className="gap-1.5"
        onClick={() => ejecutar(() => resolverDiscrepancia(d.id), "¿Marcar como revisada?")}
      >
        <Check className="w-3.5 h-3.5" /> Revisada
      </Button>
    </div>
  );
}

export default function DiscrepanciasList({ discrepancias }: { discrepancias: DiscrepanciaRow[] }) {
  if (discrepancias.length === 0) {
    return <p className="text-sm text-muted-foreground">Nada que revisar. Todas las entradas cuadran.</p>;
  }

  return (
    <div className="divide-y divide-border">
      {discrepancias.map((d) => {
        const tipo = TIPOS[d.tipo] ?? { titulo: d.tipo, texto: "" };
        const nombreEntrada = (d.detalle.nombre_entrada ?? d.detalle.nombre) as string | undefined;
        return (
          <div key={d.id} className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">
                  {tipo.titulo}
                </Badge>
                <span className="font-mono text-xs">{d.codigo}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(d.created_at).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{tipo.texto}</p>
              <p className="text-sm">
                {d.perfil ? (
                  <Link href={`/usuarios/${d.perfil.id}`} className="font-medium hover:underline">
                    {d.perfil.full_name ?? d.perfil.username ?? d.perfil.email}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">Usuario desconocido</span>
                )}
                {nombreEntrada && <span className="text-muted-foreground"> · entrada a nombre de «{nombreEntrada}»</span>}
                {d.evento && <span className="text-muted-foreground"> · {d.evento.titulo}{d.evento.fecha_texto ? ` (${d.evento.fecha_texto})` : ""}</span>}
              </p>
            </div>
            <Acciones d={d} />
          </div>
        );
      })}
    </div>
  );
}
