import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Bridgette Laundry" },
      {
        name: "description",
        content: "Sign in or create a Bridgette Laundry account to book laundry pickup or drop-off.",
      },
      { property: "og:title", content: "Sign in — Bridgette Laundry" },
      {
        property: "og:description",
        content: "Access your Bridgette Laundry orders, or create an account in seconds.",
      },
    ],
  }),
  component: AuthPage,
});

function normalisePhone(phone: string) {
  const digits = phone.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("0")) return `+254${digits.slice(1)}`;
  if (digits.startsWith("254")) return `+${digits}`;
  return digits;
}

function AuthPage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"email" | "phone">("email");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function handleSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password") ?? "");
    setBusy(true);
    const credentials =
      mode === "email"
        ? { email: String(form.get("identifier") ?? "").trim(), password }
        : { phone: normalisePhone(String(form.get("identifier") ?? "")), password };
    const { error } = await supabase.auth.signInWithPassword(credentials);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    navigate({ to: "/dashboard", replace: true });
  }

  async function handleSignUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const fullName = String(form.get("full_name") ?? "").trim();
    const phone = String(form.get("phone") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const identifier = String(form.get("identifier") ?? "").trim();
    setBusy(true);

    const base = {
      password,
      options: {
        data: { full_name: fullName, phone },
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    };
    const { error } = await supabase.auth.signUp(
      mode === "email"
        ? { email: identifier, ...base }
        : { phone: normalisePhone(identifier), ...base },
    );
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      navigate({ to: "/dashboard", replace: true });
    } else {
      toast.success("Account created. Check your inbox to confirm, then sign in.");
    }
  }

  const identifierLabel = mode === "email" ? "Email address" : "Phone number";
  const identifierType = mode === "email" ? "email" : "tel";
  const identifierPlaceholder = mode === "email" ? "you@example.com" : "0712345678";

  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-4">
        <Link to="/" className="font-display text-lg font-semibold">
          Bridgette Laundry
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 pb-16">
        <div className="ticket p-6">
          <h1 className="font-display text-2xl">Welcome</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Freshness You Can Trust — sign in to place and track orders.
          </p>

          <div className="mt-5 flex rounded-md border border-border p-1">
            {(["email", "phone"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex-1 rounded-sm px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                  mode === m ? "bg-secondary text-foreground" : "text-muted-foreground"
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <Tabs defaultValue="signin" className="mt-5">
            <TabsList className="w-full">
              <TabsTrigger value="signin" className="flex-1">
                Sign in
              </TabsTrigger>
              <TabsTrigger value="signup" className="flex-1">
                Create account
              </TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="mt-4 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="si-identifier">{identifierLabel}</Label>
                  <Input
                    id="si-identifier"
                    name="identifier"
                    type={identifierType}
                    placeholder={identifierPlaceholder}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="si-password">Password</Label>
                  <Input id="si-password" name="password" type="password" required />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "Signing in…" : "Sign in"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="mt-4 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="su-name">Full name</Label>
                  <Input id="su-name" name="full_name" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="su-identifier">{identifierLabel}</Label>
                  <Input
                    id="su-identifier"
                    name="identifier"
                    type={identifierType}
                    placeholder={identifierPlaceholder}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="su-phone">Contact phone</Label>
                  <Input id="su-phone" name="phone" type="tel" placeholder="0712345678" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="su-password">Password</Label>
                  <Input
                    id="su-password"
                    name="password"
                    type="password"
                    minLength={6}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "Creating account…" : "Create account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
