"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Marca una discrepancia como revisada sin hacer nada más.
export async function resolverDiscrepancia(id: number): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("fourvenues_discrepancias").update({ resuelta: true }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/fourvenues");
  revalidatePath("/", "layout");
}

// Da por buena una entrada que el robot no verificó (p. ej. el nombre no coincidía):
// la asigna al usuario de la discrepancia y la marca como resuelta.
export async function verificarDiscrepancia(id: number): Promise<void> {
  const supabase = createAdminClient();
  const { data: d, error: errD } = await supabase
    .from("fourvenues_discrepancias")
    .select("codigo, user_id, evento_id")
    .eq("id", id)
    .single();
  if (errD || !d) throw new Error(errD?.message ?? "Discrepancia no encontrada");
  if (!d.user_id || !d.evento_id) throw new Error("Falta el usuario o el evento para crear la entrada");

  const { data: venta } = await supabase
    .from("fourvenues_ventas")
    .select("nombre, email")
    .eq("codigo", d.codigo)
    .maybeSingle();

  const { error } = await supabase.from("entradas").insert({
    user_id: d.user_id,
    evento_id: d.evento_id,
    qr_code: d.codigo,
    estado: "verificada",
    nombre_ticket: venta?.nombre ?? null,
    email_ticket: venta?.email ?? null,
  });
  if (error) throw new Error(error.message);

  await resolverDiscrepancia(id);
  revalidatePath("/entradas");
  revalidatePath("/ranking");
  revalidatePath(`/usuarios/${d.user_id}`);
}
