import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PuntoInteresForm from "@/components/layout/PuntoInteresForm";

export default function NuevoPuntoPage() {
  return (
    <div className="p-8 space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link href="/puntos-interes" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="w-5 h-5" /></Link>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Compass className="w-6 h-6 text-primary" /> Nuevo punto de interés</h1>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-sm font-medium">Datos del punto</CardTitle></CardHeader>
        <CardContent><PuntoInteresForm mode="create" /></CardContent>
      </Card>
    </div>
  );
}
