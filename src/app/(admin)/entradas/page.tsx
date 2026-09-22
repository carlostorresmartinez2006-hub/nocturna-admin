import { createAdminClient } from "@/lib/supabase/server";
import { Ticket } from "lucide-react";
import EntradaTable from "./EntradaTable";

type EntradaWithRelations = {
  id: string;
  estado: string;
  nombre_ticket: string | null;
  email_ticket: string | null;
  created_at: string;
  user_id: string;
  evento_id: string | null;
  evento: { id: string; titulo: string; fecha_texto: string | null; fecha_evento: string | null } | null;
  profile: { id: string; username: string | null; email: string } | null;
};

export default async function EntradasPage() {
  const supabase = createAdminClient();

  const [
    { data: rawEntradas },
    { data: allEventos },
    { data: allProfiles },
    { data: allLocales },
  ] = await Promise.all([
    supabase
      .from("entradas")
      .select("id, estado, nombre_ticket, email_ticket, created_at, user_id, evento_id, eventos(id, titulo, fecha_texto, fecha_evento)")
      .order("created_at", { ascending: false }),
    supabase
      .from("eventos")
      .select("id, titulo, fecha_texto, fecha_evento, local_id")
      .order("fecha_evento", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, username, email")
      .order("email", { ascending: true }),
    supabase
      .from("locales")
      .select("id, nombre")
      .order("nombre", { ascending: true }),
  ]);

  // Join profiles manually since entradas has no FK to profiles in the schema types
  const userIds = [...new Set((rawEntradas ?? []).map((e: any) => e.user_id as string))];
  const profileMap: Record<string, { id: string; username: string | null; email: string }> = {};
  if (userIds.length > 0) {
    const { data: profilesForEntradas } = await supabase
      .from("profiles")
      .select("id, username, email")
      .in("id", userIds);
    for (const p of profilesForEntradas ?? []) {
      profileMap[p.id] = p;
    }
  }

  const entradas: EntradaWithRelations[] = (rawEntradas ?? []).map((e: any) => ({
    id: e.id,
    estado: e.estado,
    nombre_ticket: e.nombre_ticket,
    email_ticket: e.email_ticket,
    created_at: e.created_at,
    user_id: e.user_id,
    evento_id: e.evento_id,
    evento: e.eventos ?? null,
    profile: profileMap[e.user_id] ?? null,
  }));

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Ticket className="w-6 h-6 text-primary" /> Entradas
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {entradas.length} {entradas.length === 1 ? "entrada registrada" : "entradas registradas"}
        </p>
      </div>
      <EntradaTable
        entradas={entradas}
        allEventos={(allEventos ?? []) as { id: string; titulo: string; fecha_texto: string | null; fecha_evento: string | null; local_id: string | null }[]}
        allProfiles={(allProfiles ?? []) as { id: string; username: string | null; email: string }[]}
        allLocales={(allLocales ?? []) as { id: string; nombre: string }[]}
      />
    </div>
  );
}
