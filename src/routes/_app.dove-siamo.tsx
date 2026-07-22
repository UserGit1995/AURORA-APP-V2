import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/_app/dove-siamo")({
  component: () => (
    <div className="px-4 pt-4"><h1 className="text-xl font-semibold text-foreground mb-4">Dove siamo</h1>
      <p className="text-sm text-muted-foreground">Indirizzo e mappa configurabili dal pannello admin.</p></div>
  ),
});