import { createAdminClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Ban, ShieldAlert, UserX, VolumeX } from "lucide-react";
import Link from "next/link";
import UnblockButton from "./UnblockButton";
import AdminToggleButton from "./AdminToggleButton";
import AdminBanUserForm from "./AdminBanUserForm";

export default async function ModeracionPage() {
  const supabase = createAdminClient();

  const [
    { data: bloqueados },
    { data: silenciados },
    { data: baneadosPorAdmin },
    { data: silenciadosPorAdmin },
    { data: allUsers },
  ] = await Promise.all([
    supabase
      .from("bloqueados")
      .select(`
        id, created_at,
        blocker:profiles!bloqueados_blocker_id_fkey(id, username, email),
        blocked:profiles!bloqueados_blocked_id_fkey(id, username, email)
      `)
      .order("created_at", { ascending: false }),
    supabase
      .from("silenciados")
      .select(`
        id, created_at,
        user:profiles!silenciados_user_id_fkey(id, username, email),
        silenced:profiles!silenciados_silenced_id_fkey(id, username, email)
      `)
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, username, email, updated_at")
      .eq("is_banned", true)
      .order("updated_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, username, email, updated_at")
      .eq("is_silenced_by_admin", true)
      .order("updated_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, username, email")
      .order("username", { ascending: true }),
  ]);

  type UserRef = { id: string; username: string | null; email: string } | null;

  const label = (u: UserRef) => u?.username ?? u?.email ?? "?";

  const bannedIds = new Set((baneadosPorAdmin ?? []).map((u) => u.id));
  const silencedIds = new Set((silenciadosPorAdmin ?? []).map((u) => u.id));
  const nonBannedUsers = (allUsers ?? []).filter((u) => !bannedIds.has(u.id));
  const nonSilencedUsers = (allUsers ?? []).filter((u) => !silencedIds.has(u.id));

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-primary" /> Moderación
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gestión de bloqueos y silencios entre usuarios y por Nocturna
        </p>
      </div>

      {/* Admin-level actions */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Baneados por Nocturna */}
        <Card className="border-red-500/20">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Ban className="w-4 h-4 text-red-400" />
              Baneados por Nocturna ({baneadosPorAdmin?.length ?? 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Usuarios que no pueden acceder a la aplicación.
            </p>
            <AdminBanUserForm type="ban" allUsers={nonBannedUsers} />
            {(baneadosPorAdmin ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Ningún usuario baneado</p>
            ) : (
              (baneadosPorAdmin ?? []).map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between gap-2 p-2 rounded-lg bg-red-500/5 border border-red-500/20"
                >
                  <div>
                    <Link href={`/usuarios/${u.id}`} className="text-sm font-medium hover:text-primary transition-colors">
                      {u.username ?? u.email}
                    </Link>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                  <AdminToggleButton userId={u.id} type="ban" current={true} />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Silenciados por Nocturna */}
        <Card className="border-amber-500/20">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <VolumeX className="w-4 h-4 text-amber-400" />
              Silenciados por Nocturna ({silenciadosPorAdmin?.length ?? 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Usuarios que no pueden enviar notificaciones a nadie.
            </p>
            <AdminBanUserForm type="silence" allUsers={nonSilencedUsers} />
            {(silenciadosPorAdmin ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Ningún usuario silenciado</p>
            ) : (
              (silenciadosPorAdmin ?? []).map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between gap-2 p-2 rounded-lg bg-amber-500/5 border border-amber-500/20"
                >
                  <div>
                    <Link href={`/usuarios/${u.id}`} className="text-sm font-medium hover:text-primary transition-colors">
                      {u.username ?? u.email}
                    </Link>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                  <AdminToggleButton userId={u.id} type="silence" current={true} />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Peer-to-peer */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Bloqueados entre usuarios */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <UserX className="w-4 h-4 text-orange-400" />
              Bloqueados entre usuarios ({bloqueados?.length ?? 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(bloqueados ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin bloqueos entre usuarios</p>
            ) : (
              (bloqueados ?? []).map((b) => {
                const blocker = b.blocker as UserRef;
                const blocked = b.blocked as UserRef;
                return (
                  <div key={b.id} className="text-sm space-y-1 p-2 rounded-lg bg-muted/30">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <Link href={`/usuarios/${blocker?.id}`} className="font-medium hover:text-primary">
                          {label(blocker)}
                        </Link>
                        <span className="text-muted-foreground"> bloqueó a </span>
                        <Link href={`/usuarios/${blocked?.id}`} className="font-medium hover:text-primary">
                          {label(blocked)}
                        </Link>
                      </div>
                      <UnblockButton id={b.id} table="bloqueados" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {b.created_at
                        ? new Date(b.created_at).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })
                        : "—"}
                    </p>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Silenciados entre usuarios */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <VolumeX className="w-4 h-4 text-muted-foreground" />
              Silenciados entre usuarios ({silenciados?.length ?? 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(silenciados ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin silencios entre usuarios</p>
            ) : (
              (silenciados ?? []).map((s) => {
                const user = s.user as UserRef;
                const silenced = s.silenced as UserRef;
                return (
                  <div key={s.id} className="text-sm space-y-1 p-2 rounded-lg bg-muted/30">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <Link href={`/usuarios/${user?.id}`} className="font-medium hover:text-primary">
                          {label(user)}
                        </Link>
                        <span className="text-muted-foreground"> silenció a </span>
                        <Link href={`/usuarios/${silenced?.id}`} className="font-medium hover:text-primary">
                          {label(silenced)}
                        </Link>
                      </div>
                      <UnblockButton id={s.id} table="silenciados" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {s.created_at
                        ? new Date(s.created_at).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })
                        : "—"}
                    </p>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
