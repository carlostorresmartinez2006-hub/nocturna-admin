import { createAdminClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell } from "lucide-react";
import SendNotificationForm from "./SendNotificationForm";
import NotificacionesTable from "./NotificacionesTable";

export default async function NotificacionesPage() {
  const supabase = createAdminClient();

  const { data: notifs } = await supabase
    .from("notificaciones")
    .select(`
      id, user_id, tipo, mensaje, leida, created_at,
      user:profiles!notificaciones_user_id_fkey(username, email)
    `)
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: usuarios } = await supabase
    .from("profiles")
    .select("id, username, email")
    .order("username");

  const { data: eventos } = await supabase
    .from("eventos")
    .select("id, titulo, fecha_texto, local_texto")
    .order("fecha_evento", { ascending: false });

  const { data: previas } = await supabase
    .from("previas")
    .select("id, nombre, icono")
    .order("nombre");

  type NotifRow = {
    id: string;
    user_id: string;
    tipo: string;
    mensaje: string;
    leida: boolean;
    created_at: string;
    user: { username?: string; email: string } | null;
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bell className="w-6 h-6 text-primary" /> Notificaciones
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Envía notificaciones a usuarios y consulta el historial
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Enviar notificación</CardTitle>
          </CardHeader>
          <CardContent>
            <SendNotificationForm
              usuarios={usuarios ?? []}
              eventos={eventos ?? []}
              previas={previas ?? []}
            />
          </CardContent>
        </Card>

        <NotificacionesTable notifs={(notifs ?? []) as unknown as NotifRow[]} />
      </div>
    </div>
  );
}
