// src/pages/user/Profile.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthProvider";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { KeyRound } from "lucide-react";

type ProfileRow = {
  id: string;
  avatar_url: string | null;
  full_name: string | null;
  contact_number: string | null;
  birth_date: string | null;
  role?: string | null;
};

type AddressRow = {
  user_id: string;
  street: string | null;
  number: string | null;
  barangay: string | null;
  city: string | null;
};

type Msg = { type: "success" | "error" | "info"; text: string };

export default function ProfilePage() {
  const { session } = useAuth();
  const user = session?.user ?? null;
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [addressLine, setAddressLine] = useState("");

  const email = user?.email ?? "";
  const [isAdmin, setIsAdmin] = useState(false);
  const originalRef = useRef<any>(null);

  const displayName = useMemo(() => {
    if (fullName.trim()) return fullName.trim();
    const meta = (user?.user_metadata ?? {}) as Record<string, any>;
    return (meta.full_name || meta.name || "").trim() || "Profile";
  }, [fullName, user?.user_metadata]);

  const provider = (user?.app_metadata as any)?.provider ?? "email";
  const isEmailPassword = provider === "email";

  const [pwOpen, setPwOpen] = useState(false);
  const [pwMsg, setPwMsg] = useState<Msg | null>(null);
  const [pwLoading, setPwLoading] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwVisible, setPwVisible] = useState({ current: false, next: false, confirm: false });

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      setErr(null);
      setOk(null);
      try {
        const { data: prof, error: pErr } = await supabase
          .from("profiles")
          .select("id, avatar_url, full_name, contact_number, birth_date, role")
          .eq("id", user.id)
          .single();
        if (pErr) throw pErr;

        const pr = prof as ProfileRow;
        setAvatarUrl(pr.avatar_url ?? null);

        const meta = (user.user_metadata ?? {}) as Record<string, any>;
        const fallbackName = (meta.full_name || meta.name || "") as string;
        setFullName((pr.full_name ?? fallbackName ?? "").trim());
        setContactNumber(pr.contact_number ?? "");
        setBirthDate(pr.birth_date ?? "");

        const metaRole = String(meta.role || "").toLowerCase();
        setIsAdmin(((pr.role ?? "").toLowerCase() === "admin") || metaRole === "admin");

        const { data: addr, error: aErr } = await supabase
          .from("user_addresses")
          .select("user_id, street, number, barangay, city")
          .eq("user_id", user.id)
          .maybeSingle();
        if (aErr) throw aErr;

        const A = (addr ?? {}) as Partial<AddressRow>;
        const joined =
          A.street ?? [A.number, A.street, A.barangay, A.city].filter(Boolean).join(", ");
        setAddressLine(joined || "");

        originalRef.current = {
          avatarUrl: pr.avatar_url ?? null,
          fullName: (pr.full_name ?? fallbackName ?? "").trim(),
          contactNumber: pr.contact_number ?? "",
          birthDate: pr.birth_date ?? "",
          addressLine: joined || "",
          isAdmin: ((pr.role ?? "").toLowerCase() === "admin") || metaRole === "admin",
        };
      } catch (e: any) {
        setErr(e?.message ?? "Failed to load profile.");
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, [user?.id]);

  function handlePickAvatar(file: File | null) {
    setAvatarFile(file);
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    if (file) {
      const u = URL.createObjectURL(file);
      previewUrlRef.current = u;
      setAvatarUrl(u);
    }
  }

  if (!user) {
    return <Card className="p-4">Please sign in to edit your profile.</Card>;
  }

  function onCancel(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    navigate("/dashboard");
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    setOk(null);

    try {
      let newAvatarUrl = avatarUrl;

      if (avatarFile) {
        const ext = (avatarFile.name.split(".").pop() || "jpg").toLowerCase();
        const safeExt = ext.replace(/[^a-z0-9]/gi, "");
        const filename = `avatar-${Date.now()}.${safeExt || "jpg"}`;
        const path = `${user.id}/${filename}`;

        const { error: upErr } = await supabase.storage
          .from("profile-photos")
          .upload(path, avatarFile, {
            cacheControl: "3600",
            upsert: true,
            contentType: avatarFile.type || "image/*",
          });
        if (upErr) throw upErr;

        const { data: pub } = supabase.storage.from("profile-photos").getPublicUrl(path);
        newAvatarUrl = pub?.publicUrl ?? null;
        setAvatarUrl(newAvatarUrl);
        setAvatarFile(null);
        if (previewUrlRef.current) {
          URL.revokeObjectURL(previewUrlRef.current);
          previewUrlRef.current = null;
        }
      }

      const payload: Record<string, any> = {
        avatar_url: newAvatarUrl ?? null,
        contact_number: contactNumber || null,
        birth_date: birthDate || null,
      };
      if (isAdmin) payload.full_name = fullName || null;

      const { error: profErr } = await supabase.from("profiles").update(payload).eq("id", user.id);
      if (profErr) throw profErr;

      const barangayValue =
        /loyola heights/i.test(addressLine) ? "Loyola Heights" : "Unknown";
      const cityValue =
        /quezon\s*city/i.test(addressLine) ? "Quezon City" : "Quezon City";

      const { error: addrErr } = await supabase.from("user_addresses").upsert({
        user_id: user.id,
        street: addressLine || null,
        number: null,
        barangay: barangayValue,
        city: cityValue,
      });
      if (addrErr) throw addrErr;

      originalRef.current = {
        avatarUrl: newAvatarUrl ?? null,
        fullName,
        contactNumber,
        birthDate,
        addressLine,
        isAdmin,
      };

      setOk("Profile saved!");
    } catch (e: any) {
      setErr(e?.message ?? "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setPwMsg(null);

    if (!email) {
      setPwMsg({ type: "error", text: "No email on file for this account." });
      return;
    }
    if (newPw !== confirmPw) {
      setPwMsg({ type: "error", text: "New password and confirmation do not match." });
      return;
    }
    if (newPw.length < 8) {
      setPwMsg({ type: "error", text: "Use at least 8 characters for your new password." });
      return;
    }

    setPwLoading(true);
    try {
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password: currentPw,
      });
      if (signInErr) {
        setPwMsg({ type: "error", text: "Current password is incorrect." });
        return;
      }

      const { error: updateErr } = await supabase.auth.updateUser({ password: newPw });
      if (updateErr) {
        setPwMsg({ type: "error", text: updateErr.message || "Failed to update password." });
        return;
      }

      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      setPwMsg({ type: "success", text: "Password updated successfully." });
      setTimeout(() => setPwOpen(false), 700);
    } catch (err: any) {
      setPwMsg({ type: "error", text: err?.message ?? "Something went wrong." });
    } finally {
      setPwLoading(false);
    }
  }

  async function handleSendResetEmail() {
    if (!email) {
      setPwMsg({ type: "error", text: "No email on file for this account." });
      return;
    }
    setPwLoading(true);
    setPwMsg(null);
    try {
      const redirectTo = `${window.location.origin}/auth/callback?dest=connect`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;
      setPwMsg({
        type: "success",
        text: "Password reset email sent. Check your inbox for the link.",
      });
    } catch (err: any) {
      setPwMsg({
        type: "error",
        text: err?.message ?? "Failed to send reset email.",
      });
    } finally {
      setPwLoading(false);
    }
  }

  const Banner = ({ msg }: { msg: Msg | null }) => {
    if (!msg) return null;
    const styles =
      msg.type === "success"
        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
        : msg.type === "error"
        ? "bg-rose-50 text-rose-800 border-rose-200"
        : "bg-sky-50 text-sky-800 border-sky-200";
    return <div className={`rounded-md border px-3 py-2 text-sm ${styles}`}>{msg.text}</div>;
  };

  return (
    <div className="max-w-sm sm:max-w-md mx-auto p-4">
      <Card className="p-6 sm:p-8">
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : (
          <form onSubmit={onSave} className="space-y-6">
            <div className="flex flex-col items-center">
              <div className="relative">
                <div className="h-24 w-24 rounded-full overflow-hidden ring-4 ring-white shadow">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="avatar"
                      className="h-full w-full object-cover"
                      onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
                    />
                  ) : (
                    <div className="h-full w-full grid place-items-center text-xs text-muted-foreground bg-slate-100">
                      No image
                    </div>
                  )}
                </div>
                <label
                  htmlFor="avatar-input"
                  className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-white shadow grid place-items-center cursor-pointer"
                  title="Change photo"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-700" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 17.25V21h3.75l11.06-11.06-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 000-1.42l-2.34-2.34a1.003 1.003 0 00-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z"/>
                  </svg>
                </label>
                <input
                  id="avatar-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handlePickAvatar(e.target.files?.[0] ?? null)}
                />
              </div>

              <h2 className="mt-4 text-2xl font-semibold tracking-wide">{displayName}</h2>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Full Name</Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={`mt-1 ${!isAdmin ? "bg-slate-50 cursor-not-allowed" : ""}`}
                placeholder="Your full name"
                readOnly={!isAdmin}
                disabled={!isAdmin}
                onFocus={(e) => { if (!isAdmin) e.currentTarget.blur(); }}
                onKeyDown={(e) => { if (!isAdmin) e.preventDefault(); }}
              />
              {!isAdmin && (
                <p className="text-xs text-muted-foreground">
                  Only administrators can change your name.
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm">Birth Date</Label>
                <Input
                  type="date"
                  value={birthDate || ""}
                  onChange={(e) => setBirthDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Contact Number</Label>
                <Input
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  placeholder="e.g., 0999 999 9999"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Email</Label>
              <Input value={email} readOnly className="bg-slate-50" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Address</Label>
              <Input
                value={addressLine}
                onChange={(e) => setAddressLine(e.target.value)}
                placeholder="Krus Na Ligas, Diliman, Quezon City, Philippines"
              />
            </div>

            <div className="pt-2 border-t">
              <div className="mt-4 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold flex items-center gap-2">
                    <KeyRound className="h-4 w-4" />
                    Security
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {isEmailPassword
                      ? "Manage your account password."
                      : "This account uses a social login. You can set a password by sending a reset email."}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setPwMsg(null);
                    setPwOpen(true);
                  }}
                  className="shrink-0"
                >
                  Manage password
                </Button>
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between">
              <button
                onClick={onCancel}
                className="text-sm text-slate-600 hover:text-slate-900 underline underline-offset-2"
              >
                Cancel
              </button>
              <Button
                type="submit"
                className="px-6 bg-[#13294B] hover:bg-[#0F2140]"
                disabled={saving}
              >
                {saving ? "Saving…" : "Save Edit"}
              </Button>
            </div>

            {err && <div className="text-sm text-red-600">{err}</div>}
            {ok && <div className="text-sm text-green-700">{ok}</div>}
          </form>
        )}
      </Card>

      <Dialog open={pwOpen} onOpenChange={setPwOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Password</DialogTitle>
            <DialogDescription>
              {isEmailPassword
                ? "Update your password. If you don’t remember the current one, send yourself a reset email instead."
                : "This account uses a social login. You can set a password by sending a reset email."}
            </DialogDescription>
          </DialogHeader>

          <Banner msg={pwMsg} />

          {isEmailPassword && (
            <form onSubmit={handleChangePassword} className="mt-2 space-y-3">
              <div>
                <Label htmlFor="pw-current" className="text-sm">Current password</Label>
                <div className="mt-1 flex gap-2">
                  <Input
                    id="pw-current"
                    type={pwVisible.current ? "text" : "password"}
                    value={currentPw}
                    onChange={(e) => setCurrentPw(e.target.value)}
                    autoComplete="current-password"
                    placeholder="Current password"
                    disabled={pwLoading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPwVisible(v => ({ ...v, current: !v.current }))}
                  >
                    {pwVisible.current ? "Hide" : "Show"}
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="pw-new" className="text-sm">New password</Label>
                <div className="mt-1 flex gap-2">
                  <Input
                    id="pw-new"
                    type={pwVisible.next ? "text" : "password"}
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    disabled={pwLoading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPwVisible(v => ({ ...v, next: !v.next }))}
                  >
                    {pwVisible.next ? "Hide" : "Show"}
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="pw-confirm" className="text-sm">Confirm password</Label>
                <div className="mt-1 flex gap-2">
                  <Input
                    id="pw-confirm"
                    type={pwVisible.confirm ? "text" : "password"}
                    value={confirmPw}
                    onChange={(e) => setConfirmPw(e.target.value)}
                    autoComplete="new-password"
                    placeholder="Repeat new password"
                    disabled={pwLoading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPwVisible(v => ({ ...v, confirm: !v.confirm }))}
                  >
                    {pwVisible.confirm ? "Hide" : "Show"}
                  </Button>
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={handleSendResetEmail} disabled={pwLoading}>
                  Send reset email
                </Button>
                <Button type="submit" disabled={pwLoading}>
                  {pwLoading ? "Updating…" : "Update password"}
                </Button>
              </DialogFooter>
            </form>
          )}

          {!isEmailPassword && (
            <div className="mt-2">
              <DialogFooter className="gap-2">
                <Button onClick={handleSendResetEmail} disabled={pwLoading}>
                  {pwLoading ? "Sending…" : "Send password reset email"}
                </Button>
                <Button variant="outline" onClick={() => setPwOpen(false)}>
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
