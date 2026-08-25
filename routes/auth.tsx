import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuroraLogo } from "@/components/AuroraLogo";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Eye, EyeOff, Mail, Lock, User as UserIcon } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  component: Auth,
});

function Auth() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session) navigate({ to: "/home" });
  }, [session, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/home`,
            data: { full_name: fullName, company },
          },
        });
        if (error) throw error;
        toast.success("Account creato! Ora puoi accedere.");
        setMode("login");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bentornato!");
        navigate({ to: "/home" });
      }
    } catch (err: any) {
      toast.error(err.message ?? "Errore");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-6 py-10">
      <div className="mt-8 mb-10">
        <AuroraLogo size="lg" />
      </div>
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-semibold text-primary text-center">
          {mode === "login" ? "Benvenuto" : "Crea account"}
        </h1>
        <p className="text-muted-foreground text-center mt-1 text-sm">
          {mode === "login" ? "Accedi al tuo account" : "Registrati per ordinare"}
        </p>

        <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-3">
          {mode === "signup" && (
            <>
              <Field icon={<UserIcon size={18} />}>
                <input
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nome e Cognome"
                  className="bg-transparent flex-1 outline-none text-foreground"
                />
              </Field>
              <Field icon={<UserIcon size={18} />}>
                <input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Azienda (opzionale)"
                  className="bg-transparent flex-1 outline-none text-foreground"
                />
              </Field>
            </>
          )}
          <Field icon={<Mail size={18} />}>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="bg-transparent flex-1 outline-none text-foreground"
            />
          </Field>
          <Field icon={<Lock size={18} />}>
            <input
              required
              minLength={6}
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="bg-transparent flex-1 outline-none text-foreground"
            />
            <button type="button" onClick={() => setShow((v) => !v)} className="text-muted-foreground">
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </Field>

          <button
            type="submit"
            disabled={loading}
            className="mt-4 h-12 rounded-lg bg-primary text-primary-foreground font-semibold uppercase tracking-wider disabled:opacity-60"
          >
            {loading ? "..." : mode === "login" ? "Accedi" : "Registrati"}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          {mode === "login" ? "Non hai un account? " : "Hai già un account? "}
          <button
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="text-primary font-medium"
          >
            {mode === "login" ? "Registrati" : "Accedi"}
          </button>
        </p>
        <p className="text-center mt-6">
          <Link to="/home" className="text-xs text-muted-foreground">
            Continua senza account
          </Link>
        </p>
      </div>
    </div>
  );
}

function Field({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 h-12 px-4 rounded-lg bg-card border border-border">
      <span className="text-muted-foreground">{icon}</span>
      {children}
    </div>
  );
}