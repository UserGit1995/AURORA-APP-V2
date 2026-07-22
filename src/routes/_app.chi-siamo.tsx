import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/_app/chi-siamo")({
  component: () => (
    <div className="px-4 pt-4 space-y-4">
      <h1 className="text-xl font-semibold text-foreground">Chi siamo</h1>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Aurora è il tuo partner per forniture professionali B2B: qualità, professionalità e affidabilità sempre con te.
      </p>
    </div>
  ),
});