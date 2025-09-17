import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthProvider";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ProfileRow = {
  id: string;                 // auth.users id
  avatar_url: string | null;
  full_name: string | null;   // source of truth for name
  contact_number: string | null;
  birth_date: string | null;  // 'YYYY-MM-DD'
  role?: string | null;       // used to detect admin
};

type AddressRow = {
  user_id: string;
  street: string | null;      // we store the entire address line here
  number: string | null;
  barangay: string | null;    // NOT NULL in your DB (we ensure non-null on write)
  city: string | null;        // we ensure non-null on write
};

export default function ProfilePage() {
  const { session } = useAuth();
  const user = session?.user ?? null;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // form fields
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const [fullName, setFullName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [birthDate, setBirthDate] = useState(""); // YYYY-MM-DD

  const email = user?.email ?? ""; // read-only display

  // address (private) — as a single line
  const [addressLine, setAddressLine] = useState("");

  // role
  const [isAdmin, setIsAdmin] = useState(false);

  // snapshot for Cancel
  const originalRef = useRef<any>(null);

  const displayName = useMemo(() => {
    // Show the real name from DB if present; otherwise auth metadata
    if (fullName.trim()) return fullName.trim();
    const meta = (user?.user_metadata ?? {}) as Record<string, any>;
    return (meta.full_name || meta.name || "").trim() || "Profile";
  }, [fullName, user?.user_metadata]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      setErr(null);
      setOk(null);
      try {
        // Load profile (NO 'name' column)
        const { data: prof, error: pErr } = await supabase
          .from("profiles")
          .select("id, avatar_url, full_name, contact_number, birth_date, role")
          .eq("id", user.id)
          .single();

        if (pErr) throw pErr;

        const pr = prof as ProfileRow;
        setAvatarUrl(pr.avatar_url ?? null);

        // prefer DB full_name; fallback to auth metadata so the field isn't blank
        const meta = (user.user_metadata ?? {}) as Record<string, any>;
        const fallbackName = (meta.full_name || meta.name || "") as string;
        setFullName((pr.full_name ?? fallbackName ?? "").trim());

        setContactNumber(pr.contact_number ?? "");
        setBirthDate(pr.birth_date ?? "");

        // admin detection from either profiles.role or auth metadata role
        const metaRole = String(meta.role || "").toLowerCase();
        setIsAdmin(((pr.role ?? "").toLowerCase() === "admin") || metaRole === "admin");

        // Load private address (owner allowed by RLS)
        const { data: addr, error: aErr } = await supabase
          .from("user_addresses")
          .select("user_id, street, number, barangay, city")
          .eq("user_id", user.id)
          .maybeSingle();

        if (aErr) throw aErr;

        const A = (addr ?? {}) as Partial<AddressRow>;
        const joined =
          A.street ??
          [A.number, A.street, A.barangay, A.city].filter(Boolean).join(", ");
        setAddressLine(joined || "");

        // Snapshot for Cancel
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
  }, [user?.id]);

  if (!user) {
    return <Card className="p-4">Please sign in to edit your profile.</Card>;
  }

  function onCancel(e: React.MouseEvent) {
    e.preventDefault();
    const o = originalRef.current;
    if (!o) return;
    setAvatarUrl(o.avatarUrl);
    setAvatarFile(null);
    setFullName(o.fullName);
    setContactNumber(o.contactNumber);
    setBirthDate(o.birthDate);
    setAddressLine(o.addressLine);
    setIsAdmin(o.isAdmin);
    setErr(null);
    setOk(null);
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    setOk(null);

    try {
      let newAvatarUrl = avatarUrl;

      // Upload avatar if new file chosen
      if (avatarFile) {
        const ext = (avatarFile.name.split(".").pop() || "jpg").toLowerCase();
        const path = `${user.id}/avatar-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("profile-photos")
          .upload(path, avatarFile, { cacheControl: "3600", upsert: false });
        if (upErr) throw upErr;

        const { data: pub } = supabase.storage
          .from("profile-photos")
          .getPublicUrl(path);
        newAvatarUrl = pub?.publicUrl ?? null;
        setAvatarUrl(newAvatarUrl);
      }

      // Build profile payload; only admins may change full_name
      const payload: Record<string, any> = {
        avatar_url: newAvatarUrl ?? null,
        contact_number: contactNumber || null,
        birth_date: birthDate || null, // expects 'YYYY-MM-DD'
      };
      if (isAdmin) {
        payload.full_name = fullName || null;
      }

      const { error: profErr } = await supabase
        .from("profiles")
        .update(payload)
        .eq("id", user.id);
      if (profErr) throw profErr;

      // Upsert private address (ensure required fields are never null)
      const barangayValue =
        /loyola heights/i.test(addressLine) ? "Loyola Heights" : "Unknown";
      const cityValue =
        /quezon\s*city/i.test(addressLine) ? "Quezon City" : "Quezon City";

      const { error: addrErr } = await supabase
        .from("user_addresses")
        .upsert({
          user_id: user.id,
          street: addressLine || null,
          number: null,
          barangay: barangayValue, // never null
          city: cityValue,         // never null
        });
      if (addrErr) throw addrErr;

      // Refresh snapshot
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

  return (
    <div className="max-w-sm sm:max-w-md mx-auto p-4">
      <Card className="p-6 sm:p-8">
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : (
          <form onSubmit={onSave} className="space-y-5">
            {/* Avatar + name header */}
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
                {/* Pencil overlay */}
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
                  onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
                />
              </div>

              <h2 className="mt-4 text-2xl font-semibold tracking-wide">{displayName}</h2>
            </div>

            {/* Full Name (admin-only editable) */}
            <div>
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
                <p className="mt-1 text-xs text-muted-foreground">
                  Only administrators can change your name.
                </p>
              )}
            </div>

            {/* Birth date + Contact */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Birth Date</Label>
                <Input
                  type="date"
                  value={birthDate || ""}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm">Contact Number</Label>
                <Input
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  className="mt-1"
                  placeholder="e.g., 0999 999 9999"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <Label className="text-sm">Email</Label>
              <Input value={email} readOnly className="mt-1 bg-slate-50" />
            </div>

            {/* Address (single line) */}
            <div>
              <Label className="text-sm">Address</Label>
              <Input
                value={addressLine}
                onChange={(e) => setAddressLine(e.target.value)}
                className="mt-1"
                placeholder="Krus Na Ligas, Diliman, Quezon City, Philippines"
              />
              <p className="mt-1 text-xs text-muted-foreground">
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
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
    </div>
  );
}
