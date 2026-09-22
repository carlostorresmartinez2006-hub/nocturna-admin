import { createAdminClient } from "@/lib/supabase/server";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Wine, Plus } from "lucide-react";
import BaresGrid from "./BaresGrid";

export default async function BaresPage() {
  const supabase = createAdminClient();
  const { data: bares } = await supabase
    .from("bares")
    .select("id, nombre, tipo, direccion, rating, reviews_count, es_destacado, image_url, precio_rango")
    .order("nombre");

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wine className="w-6 h-6 text-primary" /> Bares
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {bares?.length ?? 0} bares en la plataforma
          </p>
        </div>
        <Link href="/bares/nuevo" className={buttonVariants({ size: "sm" }) + " gap-2"}>
          <Plus className="w-4 h-4" /> Nuevo bar
        </Link>
      </div>
      <BaresGrid bares={bares ?? []} />
    </div>
  );
}
