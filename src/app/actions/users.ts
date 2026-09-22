"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ── Peer-to-peer: block ──────────────────────────────────────────────────────

export async function blockUserRelation(blockerId: string, blockedId: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("bloqueados")
    .insert({ blocker_id: blockerId, blocked_id: blockedId });
  if (error && !error.code?.includes("23505")) throw new Error(error.message);
  revalidatePath(`/usuarios/${blockerId}`);
}

export async function unblockUserRelation(blockerId: string, blockedId: string): Promise<void> {
  const supabase = createAdminClient();
  await supabase
    .from("bloqueados")
    .delete()
    .eq("blocker_id", blockerId)
    .eq("blocked_id", blockedId);
  revalidatePath(`/usuarios/${blockerId}`);
}

// ── Peer-to-peer: silence ────────────────────────────────────────────────────

export async function silenceUserRelation(userId: string, silencedId: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("silenciados")
    .insert({ user_id: userId, silenced_id: silencedId });
  if (error && !error.code?.includes("23505")) throw new Error(error.message);
  revalidatePath(`/usuarios/${userId}`);
}

export async function unsilenceUserRelation(userId: string, silencedId: string): Promise<void> {
  const supabase = createAdminClient();
  await supabase
    .from("silenciados")
    .delete()
    .eq("user_id", userId)
    .eq("silenced_id", silencedId);
  revalidatePath(`/usuarios/${userId}`);
}

// ── Peer-to-peer: friendship ─────────────────────────────────────────────────

export async function removeFriendship(userId: string, friendId: string): Promise<void> {
  const supabase = createAdminClient();
  await supabase
    .from("amigos")
    .delete()
    .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`);
  revalidatePath(`/usuarios/${userId}`);
}

export async function addFriendship(userId: string, friendId: string): Promise<void> {
  const supabase = createAdminClient();
  const { data: existing } = await supabase
    .from("amigos")
    .select("id")
    .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`)
    .limit(1)
    .maybeSingle();
  if (existing) return;
  const { error } = await supabase.from("amigos").insert({
    user_id: userId,
    friend_id: friendId,
    status: "accepted",
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/usuarios/${userId}`);
}

// ── Admin-level: ban / unban ─────────────────────────────────────────────────

export async function banUserByAdmin(userId: string, banned: boolean): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("profiles")
    .update({ is_banned: banned })
    .eq("id", userId);
  if (error) throw new Error(error.message);
  if (banned) {
    await supabase.from("notificaciones").insert({
      user_id: userId,
      tipo: "sistema",
      mensaje: "Tu cuenta ha sido suspendida por el equipo de Nocturna. Contacta con soporte si crees que es un error.",
    });
  }
  revalidatePath(`/usuarios/${userId}`);
  revalidatePath("/moderacion");
  revalidatePath("/dashboard");
}

// ── Admin-level: silence / unsilence ────────────────────────────────────────

export async function silenceUserByAdmin(userId: string, silenced: boolean): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("profiles")
    .update({ is_silenced_by_admin: silenced })
    .eq("id", userId);
  if (error) throw new Error(error.message);
  if (silenced) {
    await supabase.from("notificaciones").insert({
      user_id: userId,
      tipo: "sistema",
      mensaje: "Tu cuenta ha sido silenciada por el equipo de Nocturna. No podrás enviar notificaciones a otros usuarios.",
    });
  }
  revalidatePath(`/usuarios/${userId}`);
  revalidatePath("/moderacion");
}
