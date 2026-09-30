import { redirect } from "next/navigation";
import { createAdminClient, createClient } from "@/lib/supabase/server";

// Id del usuario de la sesión si es administrador; null si no hay sesión o no lo es.
// is_admin se lee con la service role: la app no deja leer esa columna con la sesión normal
// (Nocturna/supabase/profiles_privacidad.sql).
export async function usuarioAdmin(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await createAdminClient()
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  return profile?.is_admin ? user.id : null;
}

// Para las server actions: el middleware no las filtra y usan la service role,
// así que cada una tiene que comprobar que quien llama es administrador.
export async function requireAdmin(): Promise<string> {
  const id = await usuarioAdmin();
  if (!id) throw new Error("No autorizado");
  return id;
}

// Para las páginas: el layout no basta, porque Next puede renderizar una página sin volver a
// ejecutar el layout (navegación en cliente / RSC). Cada página que lea datos lo llama primero.
export async function asegurarAdmin(): Promise<string> {
  const id = await usuarioAdmin();
  if (!id) redirect("/login");
  return id;
}
