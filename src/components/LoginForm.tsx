import { useState } from "react";
import { toast } from "sonner";
import { Mail, KeyRound, ShieldCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useDB } from "@/lib/store";

export function LoginForm() {
  const db = useDB();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return toast.error("Email et mot de passe requis");
    if (password.length < 6) return toast.error("Mot de passe: 6 caractères minimum");
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (!data.session) toast.success("Compte créé ! Vérifiez votre email pour confirmer, puis connectez-vous.");
        setMode("signin");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      toast.error(msg.includes("Invalid login") ? "Email ou mot de passe incorrect." : msg || "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <img src={db.settings.business.logo} alt="" className="mx-auto h-16 w-16 rounded-xl bg-card object-contain" />
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{db.settings.business.name || "PRIME SHIPPING"}</h1>
          <p className="text-sm text-muted-foreground">
            {mode === "signin" ? "Connectez-vous pour retrouver vos factures sur tous vos appareils" : "Créez votre compte pour sauvegarder vos factures en ligne"}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Adresse email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="email" type="email" placeholder="nom@exemple.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" autoComplete="email" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9" autoComplete={mode === "signin" ? "current-password" : "new-password"} />
              </div>
            </div>
            <Button type="submit" className="mt-2 w-full gap-2" disabled={loading}>
              {loading ? "Veuillez patienter…" : mode === "signin" ? "Se connecter" : "Créer mon compte"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
          <button type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="mt-4 w-full text-center text-sm text-primary hover:underline">
            {mode === "signin" ? "Pas encore de compte ? Créer un compte" : "Déjà un compte ? Se connecter"}
          </button>
          <div className="mt-5 flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>Vos factures, clients et inventaire sont sauvegardés en ligne avec votre compte. Les factures déjà présentes sur cet appareil sont ajoutées automatiquement.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
