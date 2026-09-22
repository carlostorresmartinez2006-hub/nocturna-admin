import { createAdminClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import EventoForm from "@/components/layout/EventoForm";

export default async function EditEventoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createAdminClient();

  const [{ data: evento }, { data: locales }] = await Promise.all([
    supabase.from("eventos").select("*").eq("id", id).single(),
    supabase.from("locales").select("id, nombre").order("nombre"),
  ]);

  if (!evento) notFound();

  return (
    <div className="p-8 space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link href="/eventos" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarDays className="w-6 h-6 text-primary" />
          Editar: {evento.titulo}
        </h1>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-sm font-medium">Datos del evento</CardTitle></CardHeader>
        <CardContent>
          <EventoForm evento={evento} locales={locales ?? []} mode="edit" />
        </CardContent>
      </Card>
    </div>
  );
}
