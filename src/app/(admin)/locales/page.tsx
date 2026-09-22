import { createAdminClient } from "@/lib/supabase/server";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { MapPin, Plus } from "lucide-react";
import LocalesGrid from "./LocalesGrid";

export default async function LocalesPage() {
  const supabase = await createAdminClient();
  const { data: locales } = await supabase
    .from("locales")
    .select("id, nombre, tipo, direccion, edad_minima, vestimenta, horario_habitual, imagen_url")
    .order("nombre");

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MapPin className="w-6 h-6 text-primary" /> Locales
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {locales?.length ?? 0} locales en la plataforma
          </p>
        </div>
        <Link href="/locales/nuevo" className={buttonVariants({ size: "sm" }) + " gap-2"}>
          <Plus className="w-4 h-4" /> Nuevo local
        </Link>
      </div>
      <LocalesGrid locales={locales ?? []} />
    </div>
  );
}
