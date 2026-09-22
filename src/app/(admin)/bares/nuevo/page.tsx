import Link from "next/link";
import { ArrowLeft, Wine } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import BarForm from "@/components/layout/BarForm";

export default function NuevoBarPage() {
  return (
    <div className="p-8 space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link href="/bares" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="w-5 h-5" /></Link>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Wine className="w-6 h-6 text-primary" /> Nuevo bar</h1>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-sm font-medium">Datos del bar</CardTitle></CardHeader>
        <CardContent><BarForm mode="create" /></CardContent>
      </Card>
    </div>
  );
}
