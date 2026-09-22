"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type RankingConfig = {
  puntos_por_entrada: number;
  bonus_racha_1: number;
  bonus_racha_2: number;
  bonus_racha_3: number;
  bonus_racha_4_plus: number;
  titulo_alma_min: number;
  titulo_vip_min: number;
  titulo_leyenda_min: number;
};

const DEFAULT_RANKING_CONFIG: RankingConfig = {
  puntos_por_entrada: 1,
  bonus_racha_1: 0,
  bonus_racha_2: 0,
  bonus_racha_3: 0,
  bonus_racha_4_plus: 0,
  titulo_alma_min: 5,
  titulo_vip_min: 20,
  titulo_leyenda_min: 50,
};

export async function getRankingConfig(): Promise<RankingConfig> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("ranking_config")
    .select(
      "puntos_por_entrada, bonus_racha_1, bonus_racha_2, bonus_racha_3, bonus_racha_4_plus, titulo_alma_min, titulo_vip_min, titulo_leyenda_min"
    )
    .eq("id", 1)
    .single();
  return (data as RankingConfig | null) ?? DEFAULT_RANKING_CONFIG;
}

export async function updateRankingConfig(config: RankingConfig): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("ranking_config").upsert({
    id: 1,
    ...config,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/ranking");
}
