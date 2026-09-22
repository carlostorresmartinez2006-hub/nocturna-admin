"use server";

import { createAdminClient } from "@/lib/supabase/server";

type Folder = "bares" | "locales" | "eventos" | "puntos_interes" | "avatars";

export async function createSignedUploadUrl(
  folder: Folder,
  filename: string
): Promise<{ signedUrl: string; publicUrl: string }> {
  const supabase = createAdminClient();
  const ext = filename.split(".").pop()?.toLowerCase() ?? "jpg";
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const path = `${folder}/${safeName}`;

  const { data, error } = await supabase.storage
    .from("venue-images")
    .createSignedUploadUrl(path);

  if (error || !data) throw new Error(error?.message ?? "Error al crear URL de subida");

  const { data: publicData } = supabase.storage
    .from("venue-images")
    .getPublicUrl(path);

  return { signedUrl: data.signedUrl, publicUrl: publicData.publicUrl };
}
