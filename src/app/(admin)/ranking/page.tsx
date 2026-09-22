import { createAdminClient } from "@/lib/supabase/server";
import { Trophy } from "lucide-react";
import RankingClient from "./RankingClient";
import ScoringConfigSection from "./ScoringConfigSection";
import { getRankingConfig } from "@/app/actions/ranking-config";

export default async function RankingPage() {
  const supabase = createAdminClient();

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const [
    { data: rawTickets },
    { data: allProfiles },
    { data: eventosData },
    { count: totalUsuarios },
    { data: allLocales },
    rankingConfig,
  ] = await Promise.all([
    supabase
      .from("entradas")
      .select("id, user_id, created_at, evento_id")
      .gte("created_at", ninetyDaysAgo.toISOString())
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, username, email, avatar_url"),
    supabase
      .from("eventos")
      .select("id, titulo, fecha_texto, fecha_evento, local_id")
      .order("fecha_evento", { ascending: false }),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true }),
    supabase
      .from("locales")
      .select("id, nombre")
      .order("nombre", { ascending: true }),
    getRankingConfig(),
  ]);

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="w-6 h-6 text-primary" /> Ranking global
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {totalUsuarios ?? 0} usuarios registrados
        </p>
      </div>

      <ScoringConfigSection initial={rankingConfig} />

      <RankingClient
        tickets={(rawTickets ?? []) as { id: string; user_id: string; created_at: string; evento_id: string | null }[]}
        profiles={(allProfiles ?? []) as { id: string; username: string | null; email: string; avatar_url: string | null }[]}
        eventos={(eventosData ?? []) as { id: string; titulo: string; fecha_texto: string | null; fecha_evento: string | null; local_id: string | null }[]}
        locales={(allLocales ?? []) as { id: string; nombre: string }[]}
        config={rankingConfig}
      />
    </div>
  );
}
