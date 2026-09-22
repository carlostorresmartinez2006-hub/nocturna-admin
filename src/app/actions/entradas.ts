"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function addEntrada(data: {
  userId: string;
  eventoId: string;
  nombreTicket?: string | null;
  emailTicket?: string | null;
}): Promise<void> {
  const supabase = await createAdminClient();
  const { error } = await supabase.from("entradas").insert({
    user_id: data.userId,
    evento_id: data.eventoId,
    nombre_ticket: data.nombreTicket ?? null,
    email_ticket: data.emailTicket ?? null,
    estado: "verificada",
  });
  if (error) throw new Error(error.message);
  revalidatePath("/entradas");
  revalidatePath("/ranking");
  revalidatePath(`/usuarios/${data.userId}`);
}

export async function deleteEntrada(entradaId: string, userId?: string): Promise<void> {
  const supabase = await createAdminClient();
  const { error } = await supabase.from("entradas").delete().eq("id", entradaId);
  if (error) throw new Error(error.message);
  revalidatePath("/entradas");
  revalidatePath("/ranking");
  if (userId) revalidatePath(`/usuarios/${userId}`);
}

export async function deleteEntradas(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const supabase = await createAdminClient();
  const { error } = await supabase.from("entradas").delete().in("id", ids);
  if (error) throw new Error(error.message);
  revalidatePath("/entradas");
  revalidatePath("/ranking");
}
