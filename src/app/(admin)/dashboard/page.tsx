import { createAdminClient } from "@/lib/supabase/server";
import { Users, CalendarDays, MapPin, Wine, Ban, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

async function getStats() {
  const supabase = createAdminClient();

  const [
    { count: totalUsers },
    { count: totalEventos },
    { count: totalLocales },
    { count: totalBares },
    { count: baneadosPorNocturna },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("eventos").select("*", { count: "exact", head: true }),
    supabase.from("locales").select("*", { count: "exact", head: true }),
    supabase.from("bares").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_banned", true),
  ]);

  const { data: recentUsers } = await supabase
    .from("profiles")
    .select("id, username, email, avatar_url, updated_at")
    .order("updated_at", { ascending: false })
    .limit(5);

  const { data: proximosEventos } = await supabase
    .from("eventos")
    .select("id, titulo, fecha_evento, local_texto")
    .gte("fecha_evento", new Date().toISOString())
    .order("fecha_evento", { ascending: true })
    .limit(5);

  return {
    totalUsers: totalUsers ?? 0,
    totalEventos: totalEventos ?? 0,
    totalLocales: totalLocales ?? 0,
    totalBares: totalBares ?? 0,
    baneadosPorNocturna: baneadosPorNocturna ?? 0,
    recentUsers: recentUsers ?? [],
    proximosEventos: proximosEventos ?? [],
  };
}

const statCards = (stats: Awaited<ReturnType<typeof getStats>>) => [
  { label: "Usuarios", value: stats.totalUsers, icon: Users, href: "/usuarios", color: "text-blue-400" },
  { label: "Eventos", value: stats.totalEventos, icon: CalendarDays, href: "/eventos", color: "text-primary" },
  { label: "Locales", value: stats.totalLocales, icon: MapPin, href: "/locales", color: "text-emerald-400" },
  { label: "Bares", value: stats.totalBares, icon: Wine, href: "/bares", color: "text-amber-400" },
  { label: "Baneados por Nocturna", value: stats.baneadosPorNocturna, icon: Ban, href: "/moderacion", color: "text-red-400" },
];

export default async function DashboardPage() {
  const stats = await getStats();
  const cards = statCards(stats);

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Resumen general de Nocturna</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-4">
        {cards.map(({ label, value, icon: Icon, href, color }) => (
          <Link key={label} href={href}>
            <Card className="hover:border-primary/40 transition-colors cursor-pointer">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
                <Icon className={`w-4 h-4 ${color}`} />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Usuarios recientes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Usuarios recientes
            </CardTitle>
            <Link href="/usuarios" className="text-xs text-primary hover:underline">Ver todos</Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.recentUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin datos</p>
            ) : (
              stats.recentUsers.map((u) => (
                <Link key={u.id} href={`/usuarios/${u.id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                  <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                    {u.username?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{u.username ?? "Sin username"}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* Próximos eventos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-primary" />
              Próximos eventos
            </CardTitle>
            <Link href="/eventos" className="text-xs text-primary hover:underline">Ver todos</Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.proximosEventos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin eventos próximos</p>
            ) : (
              stats.proximosEventos.map((e) => (
                <Link key={e.id} href={`/eventos/${e.id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <CalendarDays className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{e.titulo}</p>
                    <p className="text-xs text-muted-foreground">
                      {e.fecha_evento
                        ? new Date(e.fecha_evento).toLocaleDateString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
                        : "Sin fecha"}{" "}
                      {e.local_texto && <span className="opacity-60">· {e.local_texto}</span>}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
