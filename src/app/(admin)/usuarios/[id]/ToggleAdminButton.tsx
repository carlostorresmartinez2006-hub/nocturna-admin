"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setAdmin } from "@/app/actions/users";
import { Button } from "@/components/ui/button";
import { Shield, ShieldOff, Loader2 } from "lucide-react";

export default function ToggleAdminButton({
  userId,
  currentIsAdmin,
}: {
  userId: string;
  currentIsAdmin: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    try {
      await setAdmin(userId, !currentIsAdmin);
    } catch (e) {
      alert((e as Error).message);
    }
    router.refresh();
    setLoading(false);
  }

  return (
    <Button
      variant={currentIsAdmin ? "destructive" : "outline"}
      size="sm"
      onClick={toggle}
      disabled={loading}
      className="gap-2"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : currentIsAdmin ? (
        <><ShieldOff className="w-4 h-4" /> Quitar admin</>
      ) : (
        <><Shield className="w-4 h-4" /> Hacer admin</>
      )}
    </Button>
  );
}
