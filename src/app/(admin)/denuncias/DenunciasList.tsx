"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Ban, Check, ImageOff, Loader2 } from "lucide-react";
import { marcarDenunciasRevisadas, quitarFotoPerfil } from "@/app/actions/denuncias";
import { banUserByAdmin } from "@/app/actions/users";

export type DenunciaDetalle = {
  id: string;
  motivo: string;
  detalle: string | null;
  estado: string;
  created_at: string;
  denunciante: string | null;
};

export type DenunciadoRow = {
  user_id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  is_banned: boolean;
  denunciantes: number;
  pendientes: number;
  total: number;
  ultima: string;
  motivos: Record<string, number> | null;
  denuncias: DenunciaDetalle[];
};

const MOTIVOS: Record<string, string> = {
  foto: "Foto inapropiada",
  suplantacion: "Suplantación",
  acoso: "Acoso o amenazas",
  ofensivo: "Ofensivo",
  spam: "Spam o cuenta falsa",
  menor: "Posible menor",
  otro: "Otro",
};

const fecha = (iso: string) =>
  new Date(iso).toLocaleString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function Acciones({ f }: { f: DenunciadoRow }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const nombre = f.username ? `@${f.username}` : "este usuario";

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
    <div className="flex flex-wrap gap-2">
      {f.avatar_url && (
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => ejecutar(() => quitarFotoPerfil(f.user_id), `¿Quitar la foto de perfil de ${nombre}? Se le avisará con una notificación.`)}
        >
          <ImageOff className="w-3.5 h-3.5" /> Quitar foto
        </Button>
      )}
      {!f.is_banned && (
        <Button
          size="sm"
          variant="destructive"
          className="gap-1.5"
          onClick={() => ejecutar(() => banUserByAdmin(f.user_id, true), `¿Banear a ${nombre}? No podrá entrar en la app.`)}
        >
          <Ban className="w-3.5 h-3.5" /> Banear
        </Button>
      )}
      {f.pendientes > 0 && (
        <Button
          size="sm"
          className="gap-1.5"
          onClick={() => ejecutar(() => marcarDenunciasRevisadas(f.user_id), `¿Marcar como revisadas las denuncias de ${nombre}?`)}
        >
          <Check className="w-3.5 h-3.5" /> Revisadas
        </Button>
      )}
    </div>
  );
}

export default function DenunciasList({ filas }: { filas: DenunciadoRow[] }) {
  if (filas.length === 0) {
    return <p className="text-sm text-muted-foreground">Todavía no hay ninguna denuncia.</p>;
  }

  return (
    <ol className="space-y-3">
      {filas.map((f, i) => (
        <li
          key={f.user_id}
          className={`rounded-lg border p-4 ${f.pendientes > 0 ? "border-destructive/40 bg-destructive/5" : ""}`}
        >
          <div className="flex items-start gap-4">
            <span className="w-6 pt-2 text-sm font-bold tabular-nums text-muted-foreground">{i + 1}</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={f.avatar_url || `https://api.dicebear.com/9.x/notionists/png?size=96&seed=${encodeURIComponent(f.username ?? f.user_id)}`}
              alt=""
              className="w-12 h-12 rounded-full object-cover bg-muted shrink-0"
            />
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/usuarios/${f.user_id}`} className="font-semibold hover:underline">
                  {f.username ? `@${f.username}` : "(usuario borrado)"}
                </Link>
                {f.full_name && <span className="text-sm text-muted-foreground">{f.full_name}</span>}
                {f.is_banned && <Badge variant="destructive">Baneado</Badge>}
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant={f.pendientes > 0 ? "destructive" : "secondary"}>
                  {f.pendientes} pendiente{f.pendientes === 1 ? "" : "s"}
                </Badge>
                <Badge variant="outline">
                  {f.denunciantes} persona{f.denunciantes === 1 ? "" : "s"} · {f.total} denuncia{f.total === 1 ? "" : "s"}
                </Badge>
                {Object.entries(f.motivos ?? {})
                  .sort((a, b) => b[1] - a[1])
                  .map(([m, n]) => (
                    <Badge key={m} variant="secondary">
                      {MOTIVOS[m] ?? m} · {n}
                    </Badge>
                  ))}
                <span className="text-muted-foreground self-center">Última: {fecha(f.ultima)}</span>
              </div>

              <details className="text-sm">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Ver denuncias</summary>
                <ul className="mt-2 space-y-2">
                  {f.denuncias.map((d) => (
                    <li key={d.id} className="rounded-md bg-muted/50 px-3 py-2">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{MOTIVOS[d.motivo] ?? d.motivo}</span>
                        <span>· {fecha(d.created_at)}</span>
                        <span>· de {d.denunciante ? `@${d.denunciante}` : "usuario borrado"}</span>
                        {d.estado === "revisada" && <Badge variant="outline">Revisada</Badge>}
                      </div>
                      {d.detalle && <p className="mt-1 whitespace-pre-wrap">{d.detalle}</p>}
                    </li>
                  ))}
                </ul>
              </details>

              <Acciones f={f} />
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
