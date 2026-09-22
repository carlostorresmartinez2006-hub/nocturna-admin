import { createAdminClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft, Shield, Mail, AtSign, User, Calendar, MapPin,
  Bell, Users, Ticket,
} from "lucide-react";
import AddEntradaForm from "./AddEntradaForm";
import DeleteEntradaButton from "./DeleteEntradaButton";
import EditProfileForm from "./EditProfileForm";
import ManageFriendsSection from "./ManageFriendsSection";

export default async function UsuarioDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createAdminClient();

  const [
    { data: profile },
    { data: entradas },
    { data: recentNotifs },
    { data: eventos },
    { data: locales },
    { data: friendRows },
    { data: allUsers },
    { data: blockedByUser },
    { data: silencedByUser },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", id).single(),
    supabase
      .from("entradas")
      .select("id, estado, nombre_ticket, email_ticket, created_at, eventos(titulo, fecha_texto)")
      .eq("user_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("notificaciones")
      .select("id, tipo, mensaje, leida, created_at")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("eventos")
      .select("id, titulo, fecha_texto, local_id")
      .order("fecha_evento", { ascending: false }),
    supabase
      .from("locales")
      .select("id, nombre")
      .order("nombre", { ascending: true }),
    supabase
      .from("amigos")
      .select("user_id, friend_id")
      .or(`user_id.eq.${id},friend_id.eq.${id}`)
      .eq("status", "accepted"),
    supabase
      .from("profiles")
      .select("id, username, email")
      .neq("id", id)
      .order("username"),
    supabase.from("bloqueados").select("blocked_id").eq("blocker_id", id),
    supabase.from("silenciados").select("silenced_id").eq("user_id", id),
  ]);

  if (!profile) notFound();

  const friendIds = (friendRows ?? []).map((r) =>
    r.user_id === id ? r.friend_id : r.user_id
  );
  let friendProfiles: { id: string; username: string | null; avatar_url: string | null }[] = [];
  if (friendIds.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .in("id", friendIds);
    friendProfiles = data ?? [];
  }

  const blockedFriendIds = (blockedByUser ?? []).map((b) => b.blocked_id);
  const silencedFriendIds = (silencedByUser ?? []).map((s) => s.silenced_id);

  const infoItems = [
    { icon: Mail, label: "Email", value: profile.email },
    { icon: AtSign, label: "Username", value: profile.username ?? "—" },
    { icon: User, label: "Nombre", value: profile.full_name ?? "—" },
    { icon: Calendar, label: "Edad", value: profile.age ? `${profile.age} años` : "—" },
    { icon: AtSign, label: "Instagram", value: profile.instagram_handle ?? "—" },
    { icon: MapPin, label: "Visibilidad", value: profile.profile_visibility },
  ];

  type EntradaRow = {
    id: string;
    estado: string;
    nombre_ticket: string | null;
    email_ticket: string | null;
    created_at: string;
    eventos: { titulo: string; fecha_texto: string | null } | null;
  };
  const entradasTyped = (entradas ?? []) as unknown as EntradaRow[];

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/usuarios" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {profile.username ?? profile.email}
            {profile.is_admin && (
              <Badge className="bg-primary/20 text-primary border-primary/30 gap-1">
                <Shield className="w-3 h-3" /> Admin
              </Badge>
            )}
            {profile.is_banned && (
              <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">Baneado</Badge>
            )}
            {profile.is_silenced_by_admin && (
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">Silenciado</Badge>
            )}
          </h1>
          <p className="text-sm text-muted-foreground">ID: {profile.id}</p>
        </div>
        <div className="ml-auto">
          <EditProfileForm profile={{
            id: profile.id,
            username: profile.username,
            full_name: profile.full_name,
            age: profile.age,
            instagram_handle: profile.instagram_handle,
            avatar_url: profile.avatar_url,
          }} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Info */}
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Información</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {infoItems.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3">
                <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground w-20 shrink-0">{label}</span>
                <span className="text-sm">{value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Friends management */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Amigos ({friendProfiles.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ManageFriendsSection
              userId={id}
              friends={friendProfiles}
              allUsers={(allUsers ?? []) as { id: string; username: string | null; email: string }[]}
              blockedFriendIds={blockedFriendIds}
              silencedFriendIds={silencedFriendIds}
            />
          </CardContent>
        </Card>

        {/* Entradas */}
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Ticket className="w-4 h-4 text-primary" />
              Entradas ({entradasTyped.length})
            </CardTitle>
            <AddEntradaForm
              userId={id}
              eventos={(eventos ?? []) as { id: string; titulo: string; fecha_texto: string | null; local_id: string | null }[]}
              locales={(locales ?? []) as { id: string; nombre: string }[]}
            />
          </CardHeader>
          <CardContent>
            {entradasTyped.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin entradas todavía</p>
            ) : (
              <div className="space-y-2">
                {entradasTyped.map((e) => (
                  <div key={e.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/40">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {e.eventos?.titulo ?? "Evento desconocido"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {e.eventos?.fecha_texto ?? "—"}
                        {e.nombre_ticket && <span> · {e.nombre_ticket}</span>}
                        {e.email_ticket && <span> · {e.email_ticket}</span>}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className={
                        e.estado === "verificada"
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs"
                          : "text-xs"
                      }
                    >
                      {e.estado}
                    </Badge>
                    <p className="text-xs text-muted-foreground shrink-0">
                      {new Date(e.created_at).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })}
                    </p>
                    <DeleteEntradaButton entradaId={e.id} userId={id} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notification prefs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" /> Notificaciones
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {([
              ["Activas", profile.notif_activas],
              ["Solicitudes amigos", profile.notif_solicitudes_amigos],
              ["Solicitudes aceptadas", profile.notif_solicitudes_aceptadas],
              ["Eventos nuevos", profile.notif_eventos_nuevos],
              ["Eventos actualizados", profile.notif_eventos_actualizados],
              ["Ganancia puntos", profile.notif_ganancia_puntos],
              ["Ofertas/promos", profile.notif_ofertas_promos],
              ["Invitaciones", profile.notif_invitaciones],
            ] as [string, boolean | null][]).map(([label, val]) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{label}</span>
                <Badge
                  variant={val ? "default" : "secondary"}
                  className={val ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs" : "text-xs"}
                >
                  {val ? "On" : "Off"}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Últimas notificaciones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(recentNotifs ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin notificaciones</p>
            ) : (
              (recentNotifs ?? []).map((n) => (
                <div key={n.id} className="flex items-start gap-2">
                  <Badge variant="secondary" className="mt-0.5 text-[10px] shrink-0">{n.tipo}</Badge>
                  <div>
                    <p className="text-sm">{n.mensaje}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(n.created_at).toLocaleDateString("es-ES", {
                        day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
