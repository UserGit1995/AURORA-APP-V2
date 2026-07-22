import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/_app/cataloghi")({
  component: () => (<div className="px-4 pt-4"><h1 className="text-xl font-semibold text-foreground mb-4">Cataloghi PDF</h1><p className="text-sm text-muted-foreground">Nessun catalogo disponibile. L'admin può caricarli dal pannello.</p></div>),
});