import { createAdminClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import LocalForm from "@/components/layout/LocalForm";

export default async function EditLocalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createAdminClient();
  const { data: local } = await supabase.from("locales").select("*").eq("id", id).single();
  if (!local) notFound();

  return (
    <div className="p-8 space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link href="/locales" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MapPin className="w-6 h-6 text-primary" /> {local.nombre}
        </h1>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-sm font-medium">Editar local</CardTitle></CardHeader>
        <CardContent><LocalForm local={local} mode="edit" /></CardContent>
      </Card>
    </div>
  );
}
