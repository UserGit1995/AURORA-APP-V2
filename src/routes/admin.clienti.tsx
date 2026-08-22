import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { adminListUsers } from "@/lib/admin.functions";
import { Users } from "lucide-react";

export const Route = createFileRoute("/admin/clienti")({
  component: AdminClienti,
});

function AdminClienti() {
  const { data, isLoading } = useQuery({ queryKey: ["admin-users"], queryFn: () => adminListUsers() });

  return (
    <div>
      <h2 className="text-sm font-bold text-foreground mb-4">Clienti registrati</h2>
      {isLoading ? (
        <div className="h-48 rounded-xl bg-card animate-pulse" />
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {(data ?? []).map((u: any) => (
            <div key={u.id} className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0">
              <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-muted-foreground shrink-0">
                <Users size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{u.full_name || "—"}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {u.company ? `${u.company} · ` : ""}{u.phone || "nessun telefono"}
                </p>
              </div>
              <span className="text-[10px] text-muted-foreground">
                {new Date(u.created_at).toLocaleDateString("it-IT")}
              </span>
            </div>
          ))}
          {(data ?? []).length === 0 && <p className="text-xs text-muted-foreground p-4">Nessun cliente registrato.</p>}
        </div>
      )}
    </div>
  );
}
