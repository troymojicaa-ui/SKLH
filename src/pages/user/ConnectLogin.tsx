// src/pages/user/ConnectLogin.tsx
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthProvider";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Shield, Mail } from "lucide-react";

export default function ConnectLogin() {
  const { session } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const navigate = useNavigate();
  const location = useLocation();

  // ✅ IMPORTANT: default to a Connect route (NOT /dashboard unless that's truly your Connect home)
  const from = (location.state as any)?.from?.pathname || "/connect";

  // ✅ Redirect in an effect (do NOT navigate during render)
  useEffect(() => {
    if (session) {
      navigate(from, { replace: true });
    }
  }, [session, from, navigate]);

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    try {
      if (!email) {
        setMsg("Please enter your email.");
        return;
      }

      if (password) {
        // Email + password login
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        // ✅ Don't rely on data.session being immediately set; your auth listener/guard will handle it
        navigate(from, { replace: true });
      } else {
        // Magic link login
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            // optional but recommended if you have a specific callback route:
            // emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        setMsg("Magic link sent! Check your email to finish logging in.");
      }
    } catch (err: any) {
      setMsg(err?.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          // optional but recommended if you have a callback route:
          // redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
      // Supabase will redirect back after Google login
    } catch (err: any) {
      alert(err?.message ?? "Google login failed");
    }
  };

  return (
    <div className="min-h-[100dvh] bg-sky-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand / avatar */}
        <div className="flex flex-col items-center">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-sky-500 to-sky-700 grid place-items-center shadow-sm ring-1 ring-white/40">
            <Shield className="h-7 w-7 text-white" />
          </div>
          <h1 className="mt-4 text-2xl font-semibold text-sky-900">SK Connect</h1>
          <p className="mt-1 text-center text-sm text-sky-900/70 max-w-xs">
            Log in to access projects, events, and updates.
          </p>
        </div>

        {/* Card */}
        <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-sky-100">
          <form onSubmit={handleContinue} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sky-900">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-sky-100 focus-visible:ring-sky-600"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sky-900">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="•••••••• (leave blank for magic link)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border-sky-100 focus-visible:ring-sky-600"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-sky-600 hover:bg-sky-700 text-white"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Continue"}
            </Button>

            {msg && <p className="text-sm text-center text-sky-800 mt-2">{msg}</p>}

            <div className="relative my-4">
              <Separator className="bg-sky-100" />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-xs text-sky-900/60">
                or
              </span>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full border-sky-600 text-sky-700 hover:bg-sky-50"
              onClick={handleGoogle}
            >
              <Mail className="mr-2 h-4 w-4" />
              Continue with Google
            </Button>

            <p className="mt-2 text-center text-[11px] leading-5 text-sky-900/70">
              By continuing, you agree to our{" "}
              <a className="underline decoration-sky-400 underline-offset-2" href="#">
                Terms
              </a>{" "}
              &{" "}
              <a className="underline decoration-sky-400 underline-offset-2" href="#">
                Privacy
              </a>
              .
            </p>
          </form>
        </div>

        <div className="mt-6 text-center">
          <a href="#" className="text-sm font-medium text-sky-700 hover:text-sky-800">
            Forgot password?
          </a>
        </div>
      </div>
    </div>
  );
}
