"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// Campos de un RRPP (alta y edición). La comisión no va aquí: es por discoteca y se fija en su perfil
export interface ValoresRrpp {
  nombre: string;
  email: string;
  telefono: string;
  cuentaApp: string;
  notas: string;
}

export const valoresVacios: ValoresRrpp = { nombre: "", email: "", telefono: "", cuentaApp: "", notas: "" };

// "2,5" o "2.50" → 2.5. Cualquier otra cosa ("2,5€", "1.000", "1e3", "-1") → NaN (y el formulario no deja
// guardar). El máximo de cada campo lo comprueba quien la usa
export const numeroEuros = (s: string) => {
  const t = s.trim();
  return /^\d{1,6}([.,]\d{1,2})?$/.test(t) ? Number(t.replace(",", ".")) : NaN;
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
        <p className="text-xs text-muted-foreground">
          No hace falta poner una comisión: en su perfil verás cuántas entradas ha vendido en cada discoteca y, si quieres, podrás fijarle una
          comisión por discoteca para que el panel te calcule lo que le toca.
        </p>
      </div>
    </div>
  );
}
