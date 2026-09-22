"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// --- BARES ---

type BarPayload = {
  id?: string;
  nombre: string;
  tipo: string;
  descripcion?: string | null;
  direccion?: string | null;
  horario?: string | null;
  contacto?: string | null;
  precio_rango?: string | null;
  image_url?: string | null;
  latitud?: number | null;
  longitud?: number | null;
  tags?: string[] | null;
  es_destacado?: boolean;
};

export async function upsertBar(payload: BarPayload): Promise<void> {
  const supabase = createAdminClient();
  const { id, ...data } = payload;
  if (id) {
    const { error } = await supabase.from("bares").update(data).eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("bares").insert(data);
    if (error) throw new Error(error.message);
  }
  revalidatePath("/bares");
}

export async function deleteBar(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("bares").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/bares");
}

// --- LOCALES ---

type LocalPayload = {
  id?: string;
  nombre: string;
  tipo: string;
  direccion: string;
  descripcion?: string | null;
  imagen_url?: string | null;
  latitud?: number | null;
  longitud?: number | null;
  vestimenta?: string;
  edad_minima?: string;
  horario_habitual?: string;
  precio_copa?: string;
  precio_tercio?: string;
  estilo?: string;
};

export async function upsertLocal(payload: LocalPayload): Promise<void> {
  const supabase = createAdminClient();
  const { id, ...data } = payload;
  if (id) {
    const { error } = await supabase.from("locales").update(data).eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("locales").insert(data);
    if (error) throw new Error(error.message);
  }
  revalidatePath("/locales");
}

export async function deleteLocal(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("locales").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/locales");
}

// --- EVENTOS ---

type EventoPayload = {
  id?: string;
  titulo: string;
  local_id: string;
  fecha_evento?: string | null;
  fecha_texto?: string | null;
  local_texto?: string | null;
  imagen_cartel_url?: string | null;
  enlace_rrpp: string;
  precio?: string | null;
  descripcion?: string | null;
  fourvenues_evento_id?: string | null;
  cupo_ventas?: number | null;
};

export async function upsertEvento(payload: EventoPayload): Promise<void> {
  const supabase = createAdminClient();
  const { id, ...data } = payload;
  if (id) {
    const { error } = await supabase.from("eventos").update(data).eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("eventos").insert(data);
    if (error) throw new Error(error.message);
  }
  revalidatePath("/eventos");
}

export async function deleteEvento(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("eventos").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/eventos");
}

// --- PUNTOS DE INTERÉS ---

type PuntoInteresPayload = {
  id?: string;
  nombre: string;
  categoria?: string | null;
  descripcion?: string | null;
  direccion?: string | null;
  horario?: string | null;
  precio?: string | null;
  imagen_url?: string | null;
  web_url?: string | null;
  latitud: number;
  longitud: number;
};

export async function upsertPuntoInteres(payload: PuntoInteresPayload): Promise<void> {
  const supabase = createAdminClient();
  const { id, ...data } = payload;
  if (id) {
    const { error } = await supabase.from("puntos_interes").update(data).eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("puntos_interes").insert(data);
    if (error) throw new Error(error.message);
  }
  revalidatePath("/puntos-interes");
}

export async function deletePuntoInteres(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("puntos_interes").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/puntos-interes");
}

// --- DESTACADOS ---

type DestacadoPayload = {
  id?: string;
  badge_text: string;
  title: string;
  subtitle: string;
  image_url: string;
  action_url: string;
};

export async function upsertDestacado(payload: DestacadoPayload): Promise<void> {
  const supabase = createAdminClient();
  const { id, ...data } = payload;
  if (id) {
    const { error } = await supabase.from("destacados").update(data).eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("destacados").insert(data);
    if (error) throw new Error(error.message);
  }
  revalidatePath("/destacados");
}

export async function deleteDestacado(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("destacados").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/destacados");
}

// --- BULK DELETES ---

export async function deleteBares(ids: string[]): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("bares").delete().in("id", ids);
  if (error) throw new Error(error.message);
  revalidatePath("/bares");
}

export async function deleteLocales(ids: string[]): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("locales").delete().in("id", ids);
  if (error) throw new Error(error.message);
  revalidatePath("/locales");
}

export async function deleteEventos(ids: string[]): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("eventos").delete().in("id", ids);
  if (error) throw new Error(error.message);
  revalidatePath("/eventos");
}

export async function deletePuntosInteres(ids: string[]): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("puntos_interes").delete().in("id", ids);
  if (error) throw new Error(error.message);
  revalidatePath("/puntos-interes");
}

export async function deleteDestacados(ids: string[]): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("destacados").delete().in("id", ids);
  if (error) throw new Error(error.message);
  revalidatePath("/destacados");
}

export async function deleteNotificaciones(ids: string[]): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("notificaciones").delete().in("id", ids);
  if (error) throw new Error(error.message);
  revalidatePath("/notificaciones");
}

export async function deleteUsuarios(ids: string[]): Promise<void> {
  const supabase = createAdminClient();
  for (const id of ids) {
    const { error } = await supabase.auth.admin.deleteUser(id);
    if (error) throw new Error(error.message);
  }
  revalidatePath("/usuarios");
}

// --- PROFILES ---

type ProfileUpdatePayload = {
  id: string;
  username?: string | null;
  full_name?: string | null;
  age?: number | null;
  instagram_handle?: string | null;
  avatar_url?: string | null;
};

export async function updateProfile(payload: ProfileUpdatePayload): Promise<void> {
  const supabase = createAdminClient();
  const { id, ...data } = payload;
  const { error } = await supabase.from("profiles").update(data).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/usuarios/${id}`);
  revalidatePath("/usuarios");
}
