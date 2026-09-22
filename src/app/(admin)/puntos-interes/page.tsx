import { createAdminClient } from "@/lib/supabase/server";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Compass, Plus } from "lucide-react";
import PuntosInteresTable from "./PuntosInteresTable";

export default async function PuntosInteresPage() {
  const supabase = await createAdminClient();
  const { data: puntos } = await supabase
    .from("puntos_interes")
    .select("id, nombre, categoria, direccion, imagen_url, precio, horario")
    .order("nombre");

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Compass className="w-6 h-6 text-primary" /> Puntos de interés
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {puntos?.length ?? 0} puntos registrados
          </p>
        </div>
        <Link href="/puntos-interes/nuevo" className={buttonVariants({ size: "sm" }) + " gap-2"}>
          <Plus className="w-4 h-4" /> Nuevo punto
        </Link>
      </div>
      <PuntosInteresTable puntos={puntos ?? []} />
    </div>
  );
}
