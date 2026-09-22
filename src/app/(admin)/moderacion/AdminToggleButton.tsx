"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Ban, Loader2, ShieldCheck, Volume2, VolumeX } from "lucide-react";
import { banUserByAdmin, silenceUserByAdmin } from "@/app/actions/users";

type Props = {
  userId: string;
  type: "ban" | "silence";
  current: boolean;
};

export default function AdminToggleButton({ userId, type, current }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function handleConfirm() {
    setConfirming(false);
    setLoading(true);
    try {
      if (type === "ban") await banUserByAdmin(userId, !current);
      else await silenceUserByAdmin(userId, !current);
      router.refresh();
    } catch (err) {
      console.error("AdminToggleButton error:", err);
    } finally {
      setLoading(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-xs text-muted-foreground">¿Confirmar?</span>
        <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={handleConfirm}>
          Sí
        </Button>
        <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={() => setConfirming(false)}>
          No
        </Button>
      </div>
    );
  }

  if (current) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="h-7 gap-1.5 text-xs"
        onClick={() => setConfirming(true)}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : type === "ban" ? (
          <ShieldCheck className="w-3 h-3" />
        ) : (
          <Volume2 className="w-3 h-3" />
        )}
        {type === "ban" ? "Desbanear" : "Dessilenciar"}
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className={`h-7 gap-1.5 text-xs ${
        type === "ban"
          ? "text-muted-foreground hover:text-red-400 hover:bg-red-400/10"
          : "text-muted-foreground hover:text-amber-400 hover:bg-amber-400/10"
      }`}
      onClick={() => setConfirming(true)}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : type === "ban" ? (
        <Ban className="w-3 h-3" />
      ) : (
        <VolumeX className="w-3 h-3" />
      )}
      {type === "ban" ? "Banear" : "Silenciar"}
    </Button>
  );
}
