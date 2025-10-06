import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserCircle, Shield } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthProvider";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: "admin" | "user"; // which portal this modal is for
}

const LoginModal = ({ isOpen, onClose, role }: LoginModalProps) => {
  const navigate = useNavigate();
  const { session, role: profileRole } = useAuth(); // live auth state

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);         // password sign-in
  const [isSendingLink, setIsSendingLink] = useState(false); // magic link
  const [msg, setMsg] = useState<string | null>(null);

  // If already logged in, close modal & send to the right home.
  useEffect(() => {
    if (!isOpen) return;
    if (session) {
      // Prefer profile role when known
      const dest = (profileRole === "admin" || role === "admin")
        ? "/admin/app"
        : "/dashboard";
      onClose?.();
      navigate(dest, { replace: true });
    }
  }, [session, profileRole, role, isOpen, navigate, onClose]);

  const redirectAfterAuth = () => {
    const dest = role === "admin" ? "/admin/app" : "/dashboard";
    onClose?.();
    navigate(dest, { replace: true });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    if (!email) {
      setMsg("Please enter your email.");
      return;
    }

    // Passwordless: send magic link if password is blank
    if (!password.trim()) {
      setIsSendingLink(true);
      try {
        const destParam = role === "admin" ? "admin" : "connect";
        const redirect = `${window.location.origin}/auth/callback?dest=${destParam}`;

        // fallback in case query param is lost
        localStorage.setItem("post_login_dest", destParam);

        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            shouldCreateUser: false, // set to true if you want auto-create
            emailRedirectTo: redirect, // must be allowed in Supabase auth settings
          },
        });
        if (error) throw error;

        setMsg("Magic link sent. Check your email to complete sign-in.");
      } catch (err: any) {
        setMsg(err?.message ?? "Failed to send magic link. Please try again.");
      } finally {
        setIsSendingLink(false);
      }
      return;
    }

    // Password login
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.session) {
        redirectAfterAuth(); // will close modal & navigate
      } else {
        setMsg("Login failed. Please try again.");
      }
    } catch (err: any) {
      setMsg(err?.message ?? "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white rounded-lg shadow-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {role === "admin" ? (
              <Shield className="w-5 h-5 text-blue-600 md:hidden" />
            ) : (
              <UserCircle className="w-5 h-5 text-purple-600 md:hidden" />
            )}
            <span>{role === "admin" ? "SK Command" : "SK Connect"}</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <Label htmlFor="login-email">Email</Label>
            <Input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <Label htmlFor="login-password">Password</Label>
            <Input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave blank for magic link"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Leave blank to receive a sign-in link via email.
            </p>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || isSendingLink}
          >
            {isLoading ? "Signing in…" : isSendingLink ? "Sending link…" : "Login / Send Magic Link"}
          </Button>

          {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LoginModal;
