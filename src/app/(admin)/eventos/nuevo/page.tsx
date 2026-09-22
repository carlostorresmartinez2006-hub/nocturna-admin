import { createAdminClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import EventoForm from "@/components/layout/EventoForm";


export default async function NuevoEventoPage() {
  const supabase = await createAdminClient();
  const { data: locales } = await supabase
    .from("locales")
    .select("id, nombre")
    .order("nombre");

  return (
    <div className="p-8 space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link href="/eventos" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarDays className="w-6 h-6 text-primary" /> Nuevo evento
        </h1>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-sm font-medium">Datos del evento</CardTitle></CardHeader>
        <CardContent>
          <EventoForm locales={locales ?? []} mode="create" />
        </CardContent>
      </Card>
    </div>
  );
}
