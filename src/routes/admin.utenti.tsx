import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminListUsers, adminSetRole } from "@/lib/admin.functions";
import { Shield, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/admin/utenti")({
  component: AdminUtenti,
});

function AdminUtenti() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-users"], queryFn: () => adminListUsers() });

  const toggleAdmin = async (userId: string, isAdmin: boolean) => {
    await adminSetRole({ data: { userId, role: "admin", grant: !isAdmin } });
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  };

  return (
    <div>
      <h2 className="text-sm font-bold text-foreground mb-1">Utenti admin</h2>
      <p className="text-xs text-muted-foreground mb-4">
        Chi ha il ruolo "admin" può accedere a questo pannello di controllo.
      </p>
      {isLoading ? (
        <div className="h-48 rounded-xl bg-card animate-pulse" />
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {(data ?? []).map((u: any) => {
            const isAdmin = u.roles?.includes("admin");
            return (
              <div key={u.id} className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0">
                <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-muted-foreground shrink-0">
                  {isAdmin ? <ShieldCheck size={14} className="text-primary" /> : <Shield size={14} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{u.full_name || "—"}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.company || "nessuna azienda indicata"}</p>
                </div>
                <button
                  onClick={() => toggleAdmin(u.id, isAdmin)}
                  className={`text-[11px] font-semibold px-3 py-1.5 rounded-full border ${
                    isAdmin
                      ? "bg-primary/15 text-primary border-primary/30"
                      : "bg-secondary text-muted-foreground border-border"
                  }`}
                >
                  {isAdmin ? "Admin — rimuovi" : "Rendi admin"}
                </button>
              </div>
            );
          })}
          {(data ?? []).length === 0 && <p className="text-xs text-muted-foreground p-4">Nessun utente.</p>}
        </div>
      )}
    </div>
  );
}
