"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// Campos de un RRPP (alta y edición)
export interface ValoresRrpp {
  nombre: string;
  comision: string;
  email: string;
  telefono: string;
  cuentaApp: string;
  notas: string;
}

export const valoresVacios: ValoresRrpp = { nombre: "", comision: "", email: "", telefono: "", cuentaApp: "", notas: "" };

// "2,5" → 2.5; vacío o no numérico → NaN (la acción lo rechaza)
// "2,5" o "2.50" → 2.5. Cualquier otra cosa ("2,5€", "1.000", "1e3") → NaN (y el formulario no deja guardar)
export const numeroEuros = (s: string) => {
  const t = s.trim();
  return /^\d{1,4}([.,]\d{1,2})?$/.test(t) ? Number(t.replace(",", ".")) : NaN;
};

export default function CamposRrpp({ v, set }: { v: ValoresRrpp; set: (v: ValoresRrpp) => void }) {
  const campo = (k: keyof ValoresRrpp) => ({
    value: v[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set({ ...v, [k]: e.target.value }),
  });
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor="rrpp-nombre">Nombre *</Label>
        <Input id="rrpp-nombre" maxLength={80} required {...campo("nombre")} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="rrpp-comision">Comisión por entrada (€) *</Label>
        <Input id="rrpp-comision" inputMode="decimal" placeholder="2,50" required {...campo("comision")} />
        <p className="text-xs text-muted-foreground">Lo que se le paga por cada entrada. Si se cambia, solo afecta a las ventas nuevas.</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="rrpp-email">Correo</Label>
        <Input id="rrpp-email" type="email" {...campo("email")} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="rrpp-telefono">Teléfono</Label>
        <Input id="rrpp-telefono" type="tel" {...campo("telefono")} />
      </div>
      <div className="space-y-1.5 md:col-span-2">
        <Label htmlFor="rrpp-cuenta">Su cuenta en la app (correo o @usuario)</Label>
        <Input id="rrpp-cuenta" placeholder="@usuario o correo@ejemplo.com" {...campo("cuentaApp")} />
        <p className="text-xs text-muted-foreground">
          Opcional, pero recomendable: así sus propias compras no cuentan como ventas suyas y no puede usar su código.
        </p>
      </div>
      <div className="space-y-1.5 md:col-span-2">
        <Label htmlFor="rrpp-notas">Notas</Label>
        <Textarea id="rrpp-notas" rows={2} placeholder="Cómo se le paga (Bizum, transferencia…), acuerdos…" {...campo("notas")} />
      </div>
    </div>
  );
}
