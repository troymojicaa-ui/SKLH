// src/pages/auth/ResetPassword.tsx
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResetPassword() {
  const [sp] = useSearchParams();
  const dest = (sp.get("dest") as "admin" | "connect" | null) ?? "connect";
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [msg, setMsg] = useState<{ type: "error" | "success" | "info"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      if (!data.session) {
        setMsg({
          type: "error",
          text: "Your reset link is invalid or expired. Please request a new reset email.",
        });
      } else {
        setMsg({ type: "info", text: "Enter a new password. You won’t need your current one." });
      }
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (newPw.length < 8) return setMsg({ type: "error", text: "Use at least 8 characters." });
    if (newPw !== confirmPw)
      return setMsg({ type: "error", text: "Passwords do not match." });

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) throw error;

      setMsg({ type: "success", text: "Password updated. Redirecting…" });
      setTimeout(() => {
        const go = dest === "admin" ? "/admin/app" : "/dashboard";
        navigate(go, { replace: true });
      }, 700);
    } catch (err: any) {
      setMsg({ type: "error", text: err?.message ?? "Failed to update password." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Card className="p-6 sm:p-8">
        <h1 className="text-xl font-semibold">Set a new password</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {loading ? "Checking your reset link…" : "You’re signed in via a secure reset link."}
        </p>

        {msg && (
          <div
            className={[
              "mt-4 rounded-md border px-3 py-2 text-sm",
              msg.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : msg.type === "error"
                ? "bg-rose-50 text-rose-800 border-rose-200"
                : "bg-sky-50 text-sky-800 border-sky-200",
            ].join(" ")}
          >
            {msg.text}
          </div>
        )}

        {!loading && (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="newPw" className="text-sm">New password</Label>
              <Input
                id="newPw"
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                autoComplete="new-password"
                placeholder="At least 8 characters"
                disabled={submitting}
              />
            </div>
            <div>
              <Label htmlFor="confirmPw" className="text-sm">Confirm new password</Label>
              <Input
                id="confirmPw"
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                autoComplete="new-password"
                placeholder="Repeat new password"
                disabled={submitting}
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Updating…" : "Update password"}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
