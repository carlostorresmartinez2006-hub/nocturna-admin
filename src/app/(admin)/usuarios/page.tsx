import { createAdminClient } from "@/lib/supabase/server";
import { Users } from "lucide-react";
import UsuariosTable from "./UsuariosTable";

export default async function UsuariosPage() {
  const supabase = await createAdminClient();
  const { data: usuarios } = await supabase
    .from("profiles")
    .select("id, username, email, full_name, avatar_url, updated_at, is_admin, age")
    .order("updated_at", { ascending: false });

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="w-6 h-6 text-primary" /> Usuarios
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {usuarios?.length ?? 0} usuarios registrados en la plataforma
        </p>
      </div>
      <UsuariosTable usuarios={usuarios ?? []} />
    </div>
  );
}
