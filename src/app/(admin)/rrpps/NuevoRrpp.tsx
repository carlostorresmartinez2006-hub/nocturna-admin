"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { crearRrpp } from "@/app/actions/rrpps";
import CamposRrpp, { numeroEuros, valoresVacios, type ValoresRrpp } from "./CamposRrpp";

export default function NuevoRrpp() {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [v, setV] = useState<ValoresRrpp>(valoresVacios);
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();

  if (!abierto) {
    return (
      <Button onClick={() => setAbierto(true)} className="gap-2">
        <UserPlus className="w-4 h-4" /> Añadir RRPP
      </Button>
    );
  }

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await crearRrpp({ ...v, codigo, comision: numeroEuros(v.comision) });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setV(valoresVacios);
      setCodigo("");
      setAbierto(false);
      router.push(`/rrpps/${r.data}`);
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium flex items-center gap-2"><UserPlus className="w-4 h-4 text-primary" /> Nuevo RRPP</CardTitle>
        <Button variant="ghost" size="icon-sm" onClick={() => setAbierto(false)} title="Cerrar"><X className="w-4 h-4" /></Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={enviar} className="space-y-4">
          <div className="space-y-1.5 max-w-sm">
            <Label htmlFor="rrpp-codigo">Código *</Label>
            <Input
              id="rrpp-codigo"
              required
              maxLength={30}
              placeholder="PABLO24"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.replace(/\s+/g, "").toUpperCase())}
              className="font-mono uppercase"
            />
            <p className="text-xs text-muted-foreground">
              El que pondrán los usuarios antes de comprar. De 3 a 24 letras sin tildes, números, guiones o guiones bajos. No se puede repetir
              nunca, ni uno que ya haya usado otro RRPP.
            </p>
          </div>
          <CamposRrpp v={v} set={setV} />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit" disabled={pendiente} className="gap-2">
            {pendiente ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} Crear RRPP
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
