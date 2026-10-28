"use server";

import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/server";

// QR de una entrada (lo que se escanea en la puerta), para revisar un error. El código vale para
// entrar, así que no va en el HTML de las páginas (que listan muchas entradas): se pide de uno en
// uno, solo un administrador, y queda en el registro de Vercel (Logs) quién lo ha visto.
//
// Devuelve { ok, error } en vez de lanzar: en producción Next oculta el texto de los errores
// lanzados en una server action.

export type OrigenQr = "entrada" | "amigo";

export interface DetalleQr {
  codigo: string;
  origen: OrigenQr;
  /** entrada: verificada / anulada…; para amigos: pendiente / reclamada / anulada */
  estado: string;
  /** 'entrada' o 'lista' (solo las de la app; null en las de la web o añadidas a mano) */
  tipo: string | null;
  personas: number | null;
  tarifa: string | null;
  precio: number | null;
  /** A nombre de quién está (nombre de la entrada o, para amigos, el que puso quien la compró) */
  nombre: string | null;
  email: string | null;
  evento: { titulo: string; fecha_texto: string | null } | null;
  /** La venta tal como la ve el robot en Fourvenues / tickes.es (si la hay) */
  venta: {
    cuenta: string;
    nombre: string | null;
    email: string | null;
    estado: string | null;
    anulada: boolean;
    precio: number | null;
  } | null;
}

// reintentar: el error puede ser pasajero (leer de la base de datos); si no, no tiene arreglo
export type ResultadoQr = { ok: true; data: DetalleQr } | { ok: false; error: string; reintentar?: boolean };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function verQr(origen: OrigenQr, id: string): Promise<ResultadoQr> {
  let admin: string;
  try {
    admin = await requireAdmin();
  } catch {
    return { ok: false, error: "No autorizado" };
  }
  if ((origen !== "entrada" && origen !== "amigo") || typeof id !== "string" || !UUID.test(id)) {
    return { ok: false, error: "Entrada no válida" };
  }

  const supabase = createAdminClient();
  let base: Omit<DetalleQr, "evento" | "venta" | "codigo">;
  let qr: string | null;
  let eventoId: string | null;
  if (origen === "entrada") {
    const { data, error } = await supabase
      .from("entradas")
      .select("qr_code, estado, tipo, personas, tarifa, precio, nombre_ticket, email_ticket, evento_id")
      .eq("id", id)
      .maybeSingle();
    if (error) return { ok: false, error: "No se ha podido leer la entrada", reintentar: true };
    if (!data) return { ok: false, error: "Esta entrada ya no existe" };
    qr = data.qr_code;
    eventoId = data.evento_id;
    base = {
      origen,
      estado: data.estado,
      tipo: data.tipo,
      personas: data.personas,
      tarifa: data.tarifa,
      precio: data.precio,
      nombre: data.nombre_ticket,
      email: data.email_ticket,
    };
  } else {
    const { data, error } = await supabase
      .from("entradas_amigos")
      .select("qr_code, estado, tarifa, precio, nombre_titular, evento_id")
      .eq("id", id)
      .maybeSingle();
    if (error) return { ok: false, error: "No se ha podido leer la entrada", reintentar: true };
    if (!data) return { ok: false, error: "Esta entrada ya no existe" };
    qr = data.qr_code;
    eventoId = data.evento_id;
    base = {
      origen,
      estado: data.estado,
      tipo: "entrada",
      personas: 1,
      tarifa: data.tarifa,
      precio: data.precio,
      nombre: data.nombre_titular,
      email: null,
    };
  }
  const codigo = qr?.trim();
  if (!codigo) return { ok: false, error: "Esta entrada no tiene QR (se añadió a mano)" };

  const [{ data: evento }, { data: venta }] = await Promise.all([
    eventoId
      ? supabase.from("eventos").select("titulo, fecha_texto").eq("id", eventoId).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("fourvenues_ventas")
      .select("cuenta, nombre, email, estado, anulada, precio")
      .eq("codigo", codigo)
      .maybeSingle(),
  ]);

  console.info(`[qr] el administrador ${admin} ha visto el QR de ${origen === "entrada" ? "la entrada" : "la entrada para amigos"} ${id}`);

  return {
    ok: true,
    data: {
      ...base,
      codigo,
      evento: evento ? { titulo: evento.titulo, fecha_texto: evento.fecha_texto } : null,
      venta: venta ?? null,
    },
  };
}
