"use server";

import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Marca una discrepancia como revisada sin hacer nada más.
export async function resolverDiscrepancia(id: number): Promise<void> {
  await requireAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase.from("fourvenues_discrepancias").update({ resuelta: true }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/fourvenues");
  revalidatePath("/", "layout");
}

// Da por buena una entrada que el robot no verificó (p. ej. el nombre no coincidía):
// la asigna al usuario de la discrepancia y la marca como resuelta.
export async function verificarDiscrepancia(id: number): Promise<void> {
  await requireAdmin();
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

// Comisión que cobra Nocturna: por tipo (entrada vendida, apuntado en lista, reserva, pase) y por
// ámbito (general, de un local o de una fiesta). Con euros = null se quita y vuelve a heredar.
const TIPOS_COMISION = ["entrada", "lista", "reserva", "pase"] as const;
export async function guardarComision(
  ambito: "general" | "local" | "evento",
  clave: string,
  tipo: (typeof TIPOS_COMISION)[number],
  euros: number | null,
): Promise<void> {
  await requireAdmin();
  if (!["general", "local", "evento"].includes(ambito)) throw new Error("Ámbito no válido");
  if (!TIPOS_COMISION.includes(tipo)) throw new Error("Tipo no válido");
  const k = ambito === "general" ? "" : clave.trim();
  if (ambito !== "general" && !k) throw new Error("Falta el local o la fiesta");
  const supabase = createAdminClient();
  if (euros === null) {
    const { error } = await supabase.from("fourvenues_comisiones").delete().eq("ambito", ambito).eq("clave", k).eq("tipo", tipo);
    if (error) throw new Error(error.message);
  } else {
    if (!Number.isFinite(euros) || euros < 0 || euros > 1000) throw new Error("La comisión tiene que estar entre 0 y 1000 €");
    const { error } = await supabase
      .from("fourvenues_comisiones")
      .upsert({ ambito, clave: k, tipo, euros: Math.round(euros * 100) / 100, actualizado_at: new Date().toISOString() }, { onConflict: "ambito,clave,tipo" });
    if (error) throw new Error(/tipo/.test(error.message) ? "Falta ejecutar la parte v2 de economia.sql en Supabase" : error.message);
  }
  revalidatePath("/fourvenues");
}
