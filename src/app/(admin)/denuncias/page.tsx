import { asegurarAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Flag } from "lucide-react";
import DenunciasList, { type DenunciadoRow, type DenunciaDetalle } from "./DenunciasList";

// Usuarios más denunciados desde la app ("Denunciar perfil"). Los términos prometen revisar
// cada denuncia en menos de 24 horas.
export const dynamic = "force-dynamic";

export default async function DenunciasPage() {
  await asegurarAdmin();
  const supabase = createAdminClient();

  const [{ data: ranking, error }, { data: recientes }] = await Promise.all([
    supabase.rpc("ranking_denuncias", { p_limite: 200 }),
    supabase
      .from("denuncias")
      .select("id, denunciado_id, denunciante_id, motivo, detalle, estado, created_at")
      .order("created_at", { ascending: false })
      .limit(1000),
  ]);

  // Nombre de quien denuncia (solo lo ve el equipo; en la app la denuncia es anónima)
  const denunciantes = [...new Set((recientes ?? []).map((d) => d.denunciante_id))];
  const { data: perfiles } = denunciantes.length
    ? await supabase.from("profiles").select("id, username").in("id", denunciantes)
    : { data: [] as { id: string; username: string | null }[] };
  const nombre = new Map((perfiles ?? []).map((p) => [p.id, p.username]));

  const porUsuario = new Map<string, DenunciaDetalle[]>();
  for (const d of recientes ?? []) {
    const lista = porUsuario.get(d.denunciado_id) ?? [];
    lista.push({ ...d, denunciante: nombre.get(d.denunciante_id) ?? null });
    porUsuario.set(d.denunciado_id, lista);
  }

  const filas: DenunciadoRow[] = ((ranking ?? []) as Omit<DenunciadoRow, "denuncias">[]).map((r) => ({
    ...r,
    denuncias: porUsuario.get(r.user_id) ?? [],
  }));
  const pendientes = filas.filter((f) => f.pendientes > 0).length;

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Flag className="w-6 h-6" /> Denuncias
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Usuarios denunciados desde la app, primero los que tienen denuncias pendientes y, dentro de ellos, los que
          han denunciado más personas distintas. Hay que revisarlas en menos de 24 horas.
        </p>
      </div>

      {error ? (
        <Card>
          <CardContent className="pt-6 text-sm text-destructive">
            No se han podido cargar las denuncias ({error.message}). ¿Se ha ejecutado supabase/denuncias.sql?
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {pendientes > 0 ? `${pendientes} usuario${pendientes === 1 ? "" : "s"} por revisar` : "Nada pendiente"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DenunciasList filas={filas} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
