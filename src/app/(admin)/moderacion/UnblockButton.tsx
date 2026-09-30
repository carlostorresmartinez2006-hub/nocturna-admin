"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { quitarRelacionModeracion } from "@/app/actions/users";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";

export default function UnblockButton({ id, table }: { id: string; table: "bloqueados" | "silenciados" }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleRemove() {
    setLoading(true);
    try {
      await quitarRelacionModeracion(table, id);
    } catch (e) {
      alert((e as Error).message);
    }
    router.refresh();
    setLoading(false);
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
      onClick={handleRemove}
      disabled={loading}
    >
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
    </Button>
  );
}
