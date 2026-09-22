import { createAdminClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DestacadoForm from "@/components/layout/DestacadoForm";

export default async function EditDestacadoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createAdminClient();

  const [{ data: destacado }, { data: eventos }] = await Promise.all([
    supabase.from("destacados").select("*").eq("id", id).single(),
    supabase
      .from("eventos")
      .select("id, titulo, fecha_texto, imagen_cartel_url, enlace_rrpp, descripcion, local_id, local_texto")
      .order("fecha_evento", { ascending: false }),
  ]);

  if (!destacado) notFound();

  return (
    <div className="p-8 space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link href="/destacados" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Star className="w-6 h-6 text-primary" /> {destacado.title}
        </h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Editar destacado</CardTitle>
        </CardHeader>
        <CardContent>
          <DestacadoForm destacado={destacado} mode="edit" eventos={eventos ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
