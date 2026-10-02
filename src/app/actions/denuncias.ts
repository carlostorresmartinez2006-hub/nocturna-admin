"use server";

import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Denuncias de perfiles que envían los usuarios desde la app (tabla denuncias, repo Nocturna
// supabase/denuncias.sql).

function refrescar() {
  revalidatePath("/denuncias");
  revalidatePath("/", "layout");
}

// Marca como revisadas todas las denuncias pendientes de un usuario.
export async function marcarDenunciasRevisadas(userId: string): Promise<void> {
  await requireAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("denuncias")
    .update({ estado: "revisada", revisada_at: new Date().toISOString() })
    .eq("denunciado_id", userId)
    .eq("estado", "pendiente");
  if (error) throw new Error(error.message);
  refrescar();
}

// Borra un mensaje del chat de un grupo (denunciado). Queda como "Mensaje eliminado".
export async function borrarMensajeGrupo(mensajeId: string): Promise<void> {
  await requireAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase.from("grupo_mensajes").update({ borrado: true, texto: "" }).eq("id", Number(mensajeId));
  if (error) throw new Error(error.message);
  refrescar();
}

// Quita la foto de un grupo (denunciado) y borra sus archivos del bucket.
export async function quitarFotoGrupo(grupoId: string): Promise<void> {
  await requireAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase.from("grupos").update({ foto_url: null }).eq("id", grupoId);
  if (error) throw new Error(error.message);
  const { data } = await supabase.storage.from("grupos").list("", { search: `${grupoId}-`, limit: 100 });
  const rutas = (data ?? []).map((f) => f.name).filter((n) => n.startsWith(`${grupoId}-`));
  if (rutas.length) await supabase.storage.from("grupos").remove(rutas);
  refrescar();
}

// Quita la foto de perfil (la vuelve al avatar por defecto) y borra sus archivos del bucket.
export async function quitarFotoPerfil(userId: string): Promise<void> {
  await requireAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", userId);
  if (error) throw new Error(error.message);
  const { data } = await supabase.storage.from("avatar").list("", { search: `${userId}-`, limit: 100 });
  const rutas = (data ?? []).map((f) => f.name).filter((n) => n.startsWith(`${userId}-`));
  if (rutas.length) await supabase.storage.from("avatar").remove(rutas);
  await supabase.from("notificaciones").insert({
    user_id: userId,
    tipo: "sistema",
    mensaje: "Hemos quitado tu foto de perfil porque no cumple las normas de Nocturna. Puedes poner otra desde Editar perfil.",
  });
  revalidatePath(`/usuarios/${userId}`);
  refrescar();
}
