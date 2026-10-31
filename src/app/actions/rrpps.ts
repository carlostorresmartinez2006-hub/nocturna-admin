"use server";

import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Json } from "@/types/database";

// Relaciones públicas (Nocturna/supabase/rrpps.sql). Lo que toca dinero (pagos, códigos, ventas) va
// por las funciones SQL, que lo hacen de una vez y con bloqueo: dos administradores a la vez no
// pueden pagar dos veces la misma venta.
//
// Devuelven { ok, error } en vez de lanzar: en producción Next oculta el texto de los errores
// lanzados en una server action y el panel no podría decir qué ha fallado.
export type Resultado<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

const CODIGO = /^[A-Z0-9_-]{3,24}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const normalizarCodigo = (c: string) => String(c ?? "").replace(/\s+/g, "").toUpperCase();
const idsValidos = (xs: unknown): number[] =>
  Array.isArray(xs) ? [...new Set(xs)].filter((x): x is number => typeof x === "number" && Number.isSafeInteger(x) && x > 0) : [];

export interface DatosRrpp {
  nombre: string;
  email?: string;
  telefono?: string;
  notas?: string;
  /** Su cuenta en la app (correo o @usuario): sus propias compras no cuentan como ventas. Al editar,
   *  undefined = no se cambia; "" = se desvincula */
  cuentaApp?: string;
}

function errorDe(e: unknown): string {
  if (e && typeof e === "object" && "message" in e && typeof (e as { message: unknown }).message === "string") {
    return (e as { message: string }).message;
  }
  return "No se ha podido hacer";
}

async function admin(): Promise<string | null> {
  try {
    return await requireAdmin();
  } catch {
    return null;
  }
}

function refrescar(id?: string) {
  revalidatePath("/rrpps");
  if (id) revalidatePath(`/rrpps/${id}`);
}

function validar(d: DatosRrpp): string | null {
  if (typeof d?.nombre !== "string" || !d.nombre.trim() || d.nombre.trim().length > 80) return "El nombre es obligatorio (máximo 80 caracteres)";
  if (d.email?.trim() && (d.email.trim().length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim()))) return "El correo no es válido";
  if ((d.telefono?.trim().length ?? 0) > 40) return "El teléfono es demasiado largo";
  if ((d.notas?.trim().length ?? 0) > 2000) return "Las notas son demasiado largas (máximo 2000 caracteres)";
  if ((d.cuentaApp?.trim().length ?? 0) > 200) return "La cuenta de la app no es válida";
  return null;
}

// "@pablo" o "pablo@x.com" → id del perfil (null si se deja vacío)
async function idDeCuenta(cuenta: string | undefined): Promise<{ id: string | null } | { error: string }> {
  const c = (cuenta ?? "").trim();
  if (!c) return { id: null };
  const supabase = createAdminClient();
  const porEmail = c.includes("@") && !c.startsWith("@");
  // ilike sin comodines: el texto exacto sin distinguir mayúsculas (PostgREST trata * como %)
  if (/[*%,()\s]/.test(c)) return { error: "La cuenta de la app no es válida" };
  const exacto = (porEmail ? c : c.replace(/^@/, "")).replace(/[%_\\]/g, "\\$&");
  const { data, error } = await supabase.from("profiles").select("id").ilike(porEmail ? "email" : "username", exacto).limit(2);
  if (error) return { error: error.message };
  if (!data?.length) return { error: `No hay ninguna cuenta de la app con ${porEmail ? "ese correo" : "ese usuario"}` };
  if (data.length > 1) return { error: "Hay más de una cuenta con ese dato: usa el correo exacto" };
  return { id: data[0].id };
}

export async function crearRrpp(d: DatosRrpp & { codigo: string }): Promise<Resultado<string>> {
  if (!(await admin())) return { ok: false, error: "No autorizado" };
  const invalido = validar(d);
  if (invalido) return { ok: false, error: invalido };
  const codigo = normalizarCodigo(d.codigo ?? "");
  if (!CODIGO.test(codigo)) return { ok: false, error: "El código tiene que tener de 3 a 24 letras (sin tildes ni ñ), números, guiones o guiones bajos" };
  const cuenta = await idDeCuenta(d.cuentaApp);
  if ("error" in cuenta) return { ok: false, error: cuenta.error };
  const { data, error } = await createAdminClient().rpc("rrpp_crear", {
    p_nombre: d.nombre.trim(),
    p_codigo: codigo,
    p_email: d.email?.trim() || null,
    p_telefono: d.telefono?.trim() || null,
    p_notas: d.notas?.trim() || null,
    p_user_id: cuenta.id,
  });
  if (error) return { ok: false, error: errorDe(error) };
  refrescar();
  return { ok: true, data: data as string };
}

export async function editarRrpp(id: string, d: DatosRrpp): Promise<Resultado> {
  if (!(await admin())) return { ok: false, error: "No autorizado" };
  if (!UUID.test(String(id))) return { ok: false, error: "Ese RRPP no existe" };
  const invalido = validar(d);
  if (invalido) return { ok: false, error: invalido };
  const cambiaCuenta = d.cuentaApp !== undefined;
  const cuenta = cambiaCuenta ? await idDeCuenta(d.cuentaApp) : { id: null };
  if ("error" in cuenta) return { ok: false, error: cuenta.error };
  const supabase = createAdminClient();
  if (cuenta.id) {
    const { data: otro, error: eOtro } = await supabase.from("rrpps").select("id").eq("user_id", cuenta.id).neq("id", id).maybeSingle();
    if (eOtro) return { ok: false, error: errorDe(eOtro) };
    if (otro) return { ok: false, error: "Esa cuenta de la app ya es de otro RRPP" };
  }
  const { data, error } = await supabase
    .from("rrpps")
    .update({
      nombre: d.nombre.trim(),
      email: d.email?.trim() || null,
      telefono: d.telefono?.trim() || null,
      notas: d.notas?.trim() || null,
      ...(cambiaCuenta ? { user_id: cuenta.id } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id");
  if (error) return { ok: false, error: error.code === "23505" ? "Esa cuenta de la app ya es de otro RRPP" : errorDe(error) };
  if (!data?.length) return { ok: false, error: "Ese RRPP no existe" };
  refrescar(id);
  return { ok: true };
}

export async function cambiarCodigoRrpp(id: string, codigo: string): Promise<Resultado<string>> {
  if (!(await admin())) return { ok: false, error: "No autorizado" };
  if (!UUID.test(String(id))) return { ok: false, error: "Ese RRPP no existe" };
  const c = normalizarCodigo(codigo ?? "");
  if (!CODIGO.test(c)) return { ok: false, error: "El código tiene que tener de 3 a 24 letras (sin tildes ni ñ), números, guiones o guiones bajos" };
  const { data, error } = await createAdminClient().rpc("rrpp_cambiar_codigo", { p_rrpp_id: id, p_codigo: c });
  if (error) return { ok: false, error: errorDe(error) };
  refrescar(id);
  return { ok: true, data: data as string };
}

export async function activarRrpp(id: string, activo: boolean): Promise<Resultado> {
  if (!(await admin())) return { ok: false, error: "No autorizado" };
  if (!UUID.test(String(id)) || typeof activo !== "boolean") return { ok: false, error: "Ese RRPP no existe" };
  const { error } = await createAdminClient().rpc("rrpp_activar", { p_rrpp_id: id, p_activo: activo });
  if (error) return { ok: false, error: errorDe(error) };
  refrescar(id);
  return { ok: true };
}

export async function borrarRrpp(id: string): Promise<Resultado> {
  if (!(await admin())) return { ok: false, error: "No autorizado" };
  if (!UUID.test(String(id))) return { ok: false, error: "Ese RRPP no existe" };
  const { error } = await createAdminClient().rpc("rrpp_borrar", { p_rrpp_id: id });
  if (error) return { ok: false, error: errorDe(error) };
  refrescar();
  return { ok: true };
}

// Comisión de un RRPP en una discoteca: € por entrada o % del precio (null: se quita). Solo sirve
// para calcular lo que se le paga: cambia lo calculado de sus ventas de esa discoteca aún sin pagar.
export async function fijarComisionRrpp(
  rrppId: string,
  localId: string,
  tipo: "euros" | "porcentaje" | null,
  valor: number | null,
): Promise<Resultado> {
  if (!(await admin())) return { ok: false, error: "No autorizado" };
  if (!UUID.test(String(rrppId))) return { ok: false, error: "Ese RRPP no existe" };
  if (typeof localId !== "string" || !localId.trim() || localId.length > 100) return { ok: false, error: "Falta la discoteca" };
  if (tipo !== null && tipo !== "euros" && tipo !== "porcentaje") return { ok: false, error: "Tipo de comisión no válido" };
  if (tipo !== null) {
    const max = tipo === "euros" ? 1000 : 100;
    if (typeof valor !== "number" || !Number.isFinite(valor) || valor < 0 || valor > max || Math.round(valor * 100) / 100 !== valor) {
      return { ok: false, error: `La comisión tiene que estar entre 0 y ${tipo === "euros" ? "1000 €" : "100 %"}, con dos decimales como mucho` };
    }
  }
  const { error } = await createAdminClient().rpc("rrpp_fijar_comision", {
    p_rrpp_id: rrppId,
    p_local_id: localId,
    p_tipo: tipo,
    p_valor: tipo === null ? null : valor,
  });
  if (error) return { ok: false, error: errorDe(error) };
  refrescar(rrppId);
  return { ok: true };
}

export interface GrupoPago {
  /** Ventas que se le pagan (en el panel, las elegidas de una discoteca) */
  ventas: number[];
  /** Lo que se le paga por ellas, en € */
  importe: number;
}

// Registra un pago: por cada discoteca, las ventas elegidas (válidas, sin pagar y de fiestas ya
// celebradas) y lo que se le paga por ellas; menos lo pagado por las anuladas después de pagárselas.
// Si alguna ya no está como tiene que estar, no se paga nada (lo comprueba la función SQL con bloqueo).
export async function liquidarVentas(rrppId: string, grupos: GrupoPago[], descontarIds: number[], nota: string): Promise<Resultado<number>> {
  const adminId = await admin();
  if (!adminId) return { ok: false, error: "No autorizado" };
  if (!UUID.test(String(rrppId))) return { ok: false, error: "Ese RRPP no existe" };
  if (!Array.isArray(grupos) || grupos.length > 500) return { ok: false, error: "Datos del pago no válidos. Recarga la página" };
  const pagos: GrupoPago[] = [];
  const vistas = new Set<number>();
  for (const g of grupos) {
    const ventas = idsValidos(g?.ventas);
    const importe = g?.importe;
    if (!ventas.length || ventas.length !== new Set(g.ventas).size || ventas.some((id) => vistas.has(id))) {
      return { ok: false, error: "Datos del pago no válidos. Recarga la página" };
    }
    if (typeof importe !== "number" || !Number.isFinite(importe) || importe < 0 || importe > 100000 || Math.round(importe * 100) / 100 !== importe) {
      return { ok: false, error: "Cada importe tiene que estar entre 0 y 100.000 €, con céntimos como mucho" };
    }
    ventas.forEach((id) => vistas.add(id));
    pagos.push({ ventas, importe });
  }
  const descontar = idsValidos(descontarIds);
  if (descontar.length !== new Set(descontarIds ?? []).size) return { ok: false, error: "Datos del pago no válidos. Recarga la página" };
  if (!pagos.length && !descontar.length) return { ok: false, error: "Elige al menos una venta" };
  const n = typeof nota === "string" ? nota.trim() : "";
  if (n.length > 300) return { ok: false, error: "La nota es demasiado larga (máximo 300 caracteres)" };
  const { data, error } = await createAdminClient().rpc("rrpp_liquidar", {
    p_rrpp_id: rrppId,
    p_pagos: pagos as unknown as Json,
    p_descontar_ids: descontar,
    p_nota: n || null,
    p_admin: adminId,
  });
  if (error) return { ok: false, error: errorDe(error) };
  refrescar(rrppId);
  return { ok: true, data: data as number };
}

export async function deshacerLiquidacion(rrppId: string, liquidacionId: number): Promise<Resultado> {
  const adminId = await admin();
  if (!adminId) return { ok: false, error: "No autorizado" };
  if (!UUID.test(String(rrppId)) || !Number.isSafeInteger(liquidacionId) || liquidacionId <= 0) return { ok: false, error: "Ese pago no existe" };
  const { error } = await createAdminClient().rpc("rrpp_deshacer_liquidacion", { p_rrpp_id: rrppId, p_liquidacion_id: liquidacionId, p_admin: adminId });
  if (error) return { ok: false, error: errorDe(error) };
  refrescar(rrppId);
  return { ok: true };
}

// Anular a mano una venta válida (p. ej. fraude) o contar una excluida (p. ej. sin precio pero pagada)
export async function corregirVenta(rrppId: string, ventaId: number, estado: "valida" | "anulada", motivo: string): Promise<Resultado> {
  if (!(await admin())) return { ok: false, error: "No autorizado" };
  if (estado !== "valida" && estado !== "anulada") return { ok: false, error: "Estado no válido" };
  if (!UUID.test(String(rrppId)) || !Number.isSafeInteger(ventaId) || ventaId <= 0) return { ok: false, error: "Esa venta no existe" };
  const m = typeof motivo === "string" ? motivo.trim() : "";
  if (m.length > 300) return { ok: false, error: "El motivo es demasiado largo (máximo 300 caracteres)" };
  const { error } = await createAdminClient().rpc("rrpp_corregir_venta", { p_rrpp_id: rrppId, p_venta_id: ventaId, p_estado: estado, p_motivo: m || null });
  if (error) return { ok: false, error: errorDe(error) };
  refrescar(rrppId);
  return { ok: true };
}
