"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Pencil } from "lucide-react";
import { updateProfile } from "@/app/actions/resources";
import ImageUpload from "@/components/ui/image-upload";

interface Props {
  profile: {
    id: string;
    username: string | null;
    full_name: string | null;
    age: number | null;
    instagram_handle: string | null;
    avatar_url: string | null;
  };
}

export default function EditProfileForm({ profile }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    username: profile.username ?? "",
    full_name: profile.full_name ?? "",
    age: profile.age?.toString() ?? "",
    instagram_handle: profile.instagram_handle ?? "",
    avatar_url: profile.avatar_url ?? "",
  });

  const set = (field: string, value: string) =>
    setForm((p) => ({ ...p, [field]: value }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      try {
        await updateProfile({
          id: profile.id,
          username: form.username || null,
          full_name: form.full_name || null,
          age: form.age ? parseInt(form.age) : null,
          instagram_handle: form.instagram_handle || null,
          avatar_url: form.avatar_url || null,
        });
        setOpen(false);
        router.refresh();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Error al guardar");
      }
    });
  }

  if (!open) {
    return (
      <Button size="sm" variant="outline" className="gap-2" onClick={() => setOpen(true)}>
        <Pencil className="w-3.5 h-3.5" /> Editar perfil
      </Button>
    );
  }

  return (
    <Card className="md:col-span-2 border-primary/30">
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Pencil className="w-4 h-4 text-primary" /> Editar perfil
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Username</Label>
              <Input
                value={form.username}
                onChange={(e) => set("username", e.target.value)}
                placeholder="nombre_usuario"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Nombre completo</Label>
              <Input
                value={form.full_name}
                onChange={(e) => set("full_name", e.target.value)}
                placeholder="Nombre Apellido"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Edad</Label>
              <Input
                type="number"
                value={form.age}
                onChange={(e) => set("age", e.target.value)}
                placeholder="18"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Instagram</Label>
              <Input
                value={form.instagram_handle}
                onChange={(e) => set("instagram_handle", e.target.value)}
                placeholder="@usuario"
                className="h-9 text-sm"
              />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs">Foto de perfil</Label>
              <ImageUpload
                value={form.avatar_url}
                onChange={(url) => set("avatar_url", url)}
                folder="avatars"
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-2 pt-1">
            <Button type="submit" size="sm" disabled={isPending} className="gap-2">
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Guardar cambios
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
