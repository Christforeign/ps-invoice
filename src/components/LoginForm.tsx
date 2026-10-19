import { useState } from "react";
import { toast } from "sonner";
import { Lock, Mail, KeyRound, ShieldCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginUser } from "@/lib/auth";
import { useDB, updateSettings } from "@/lib/store";

export function LoginForm() {
  const db = useDB();
  const configuredEmail = db.settings.security?.adminEmail || "blaisechristeveste@gmail.com";
  const [email, setEmail] = useState(configuredEmail);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      toast.error("Veuillez saisir votre adresse email");
      return;
    }
    if (!password) {
      toast.error("Veuillez saisir votre mot de passe");
      return;
    }

    setLoading(true);
    try {
      loginUser(cleanEmail, password);
      // If business email was not set yet, update it with user's login email
      if (!db.settings.business.email) {
        updateSettings({ business: { ...db.settings.business, email: cleanEmail } });
      }
      toast.success("Connexion réussie !");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Email ou mot de passe incorrect.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[85vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner">
            {db.settings.business.logo ? (
              <img
                src={db.settings.business.logo}
                alt="Logo"
                className="h-10 w-10 object-contain rounded"
              />
            ) : (
              <Lock className="h-7 w-7 text-primary" />
            )}
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {db.settings.business.name || "PRIME SHIPPING"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Connectez-vous pour accéder à vos factures et sauvegarder vos données
          </p>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Adresse email
              </Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="nom@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Mot de passe
              </Label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9"
                  autoComplete="current-password"
                />
              </div>
            </div>

            <Button type="submit" className="w-full gap-2 mt-2" disabled={loading}>
              {loading ? "Connexion..." : "Se connecter"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <div className="mt-5 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <span>
              Connexion locale sécurisée (sans serveur externe) : toutes vos factures et données sont conservées et sauvegardées localement.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
