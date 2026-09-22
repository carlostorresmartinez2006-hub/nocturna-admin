import { createAdminClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PuntoInteresForm from "@/components/layout/PuntoInteresForm";

export default async function EditPuntoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createAdminClient();
  const { data: punto } = await supabase.from("puntos_interes").select("*").eq("id", id).single();
  if (!punto) notFound();

  return (
    <div className="p-8 space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link href="/puntos-interes" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="w-5 h-5" /></Link>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Compass className="w-6 h-6 text-primary" /> {punto.nombre}</h1>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-sm font-medium">Editar punto de interés</CardTitle></CardHeader>
        <CardContent><PuntoInteresForm punto={punto} mode="edit" /></CardContent>
      </Card>
    </div>
  );
}
