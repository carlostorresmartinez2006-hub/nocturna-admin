import { createAdminClient } from "@/lib/supabase/server";
import Link from "next/link";
import { CalendarDays, Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import EventosTable from "./EventosTable";

export default async function EventosPage() {
  const supabase = await createAdminClient();
  const { data: eventos } = await supabase
    .from("eventos")
    .select("id, titulo, fecha_evento, local_texto, precio, imagen_cartel_url, fourvenues_evento_id, enlace_rrpp")
    .order("fecha_evento", { ascending: false });

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-primary" /> Eventos
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {eventos?.length ?? 0} eventos registrados
          </p>
        </div>
        <Link href="/eventos/nuevo" className={buttonVariants({ size: "sm" }) + " gap-2"}>
          <Plus className="w-4 h-4" /> Nuevo evento
        </Link>
      </div>
      <EventosTable eventos={eventos ?? []} />
    </div>
  );
}
