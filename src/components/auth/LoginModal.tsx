import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserCircle, Shield } from "lucide-react";
// import { supabase } from "@/lib/supabaseClient";

import { useAuth } from "../../hooks/useAuth";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: "admin" | "user"; // user = Connect
}

const LoginModal = ({ isOpen, onClose, role }: LoginModalProps) => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingLink, setIsSendingLink] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Pull what we need from our custom hook
  const { login, isLoggingIn, loginError } = useAuth();

  // 🔑 FIX: Connect users go to /dashboard (not /connect/app)
  // const getDestinationFromProfile = async (): Promise<
  //   "/admin/app" | "/dashboard"
  // > => {
  //   const { data } = await supabase.auth.getSession();
  //   const userId = data.session?.user?.id;

  //   if (!userId) {
  //     return role === "admin" ? "/admin/app" : "/dashboard";
  //   }

  //   const { data: profile } = await supabase
  //     .from("profiles")
  //     .select("role")
  //     .eq("id", userId)
  //     .maybeSingle();

  //   const resolvedRole =
  //     (profile?.role as "admin" | "user") ??
  //     (role === "admin" ? "admin" : "user");

  //   return resolvedRole === "admin" ? "/admin/app" : "/dashboard";
  // };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    if (!email.trim() || !password.trim()) {
      setMsg("Please enter your email and password.");
      return;
    }

    // // MAGIC LINK
    // if (!password.trim()) {
    //   setIsSendingLink(true);
    //   try {
    //     const dest = role === "admin" ? "admin" : "connect";
    //     const redirect = `${window.location.origin}/auth/callback?dest=${dest}`;
    //     localStorage.setItem("post_login_dest", dest);

    //     const options =
    //       role === "admin"
    //         ? { shouldCreateUser: false, emailRedirectTo: redirect }
    //         : { emailRedirectTo: redirect };

    //     const { error } = await supabase.auth.signInWithOtp({
    //       email: email.trim(),
    //       options,
    //     });

    //     if (error) throw error;

    //     setMsg("Magic link sent! Check your email to complete sign-in.");
    //   } catch (err: any) {
    //     setMsg(err?.message ?? "Failed to send magic link.");
    //   } finally {
    //     setIsSendingLink(false);
    //   }
    //   return;
    // }

    // // EMAIL + PASSWORD
    // setIsLoading(true);
    // try {
    //   const { error } = await supabase.auth.signInWithPassword({
    //     email: email.trim(),
    //     password,
    //   });
    //   if (error) throw error;

    //   const dest = await getDestinationFromProfile();

    //   onClose();
    //   navigate(dest, { replace: true });
    // } catch (err: any) {
    //   setMsg(err?.message ?? "Login failed.");
    // } finally {
    //   setIsLoading(false);
    // }

    // Login using django api
    login({email, password});
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
            <Label>Email</Label>
            <Input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <Label>Password</Label>
            <Input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave blank for magic link"
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading || isSendingLink}>
            {isLoading
              ? "Signing in…"
              : isSendingLink
              ? "Sending link…"
              : "Login"}
          </Button>

          {msg && <p className="text-sm text-red-600">{msg}</p>}
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LoginModal;