import { createAdminClient } from "@/lib/supabase/server";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Star, Plus } from "lucide-react";
import DestacadosGrid from "./DestacadosGrid";

export default async function DestacadosPage() {
  const supabase = await createAdminClient();
  const { data: destacados, error } = await supabase
    .from("destacados")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Star className="w-6 h-6 text-primary" /> Destacados
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {destacados ? `${destacados.length} destacados` : "Banners y cards destacadas que aparecen en la app"}
          </p>
        </div>
        <Link href="/destacados/nuevo" className={buttonVariants({ size: "sm" }) + " gap-2"}>
          <Plus className="w-4 h-4" /> Nuevo
        </Link>
      </div>
      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-4 text-sm text-destructive">
          Error al cargar destacados: {error.message}
        </div>
      )}
      <DestacadosGrid destacados={destacados ?? []} />
    </div>
  );
}
