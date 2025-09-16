import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthProvider";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ProfileRow = {
  id: string;                // auth.users id
  avatar_url: string | null;
  bio: string | null;
};

type AddressRow = {
  user_id: string;
  street: string | null;
  number: string | null;
  barangay: string;
  city: string;
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
  const [bio, setBio] = useState("");

  // address (private)
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [barangay, setBarangay] = useState("Loyola Heights");
  const [city, setCity] = useState("Quezon City");

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      setErr(null);
      setOk(null);
      try {
        // 1) load public-ish profile fields
        const { data: prof, error: pErr } = await supabase
          .from("profiles")
          .select("id, avatar_url, bio")
          .eq("id", user.id)
          .single();
        if (pErr) throw pErr;
        const pr = prof as ProfileRow;
        setAvatarUrl(pr.avatar_url ?? null);
        setBio(pr.bio ?? "");

        // 2) load private address (owner allowed by RLS)
        const { data: addr, error: aErr } = await supabase
          .from("user_addresses")
          .select("user_id, street, number, barangay, city")
          .eq("user_id", user.id)
          .maybeSingle();
        if (aErr) throw aErr;

        const A = (addr ?? {}) as Partial<AddressRow>;
        setStreet(A.street ?? "");
        setNumber(A.number ?? "");
        setBarangay(A.barangay ?? "Loyola Heights");
        setCity(A.city ?? "Quezon City");
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

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    setOk(null);

    try {
      let newAvatarUrl = avatarUrl;

      // 1) Upload avatar if a new file is chosen
      if (avatarFile) {
        const ext = (avatarFile.name.split(".").pop() || "jpg").toLowerCase();
        const path = `${user.id}/avatar-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("profile-photos")
          .upload(path, avatarFile, { cacheControl: "3600", upsert: false });
        if (upErr) throw upErr;

        const { data: pub } = supabase.storage.from("profile-photos").getPublicUrl(path);
        newAvatarUrl = pub?.publicUrl ?? null;
        setAvatarUrl(newAvatarUrl);
      }

      // 2) Update profile (bio + avatar url)
      const { error: profErr } = await supabase
        .from("profiles")
        .update({
          bio: bio || null,
          avatar_url: newAvatarUrl ?? null,
        })
        .eq("id", user.id);
      if (profErr) throw profErr;

      // 3) Upsert private address
      const { error: addrErr } = await supabase
        .from("user_addresses")
        .upsert({
          user_id: user.id,
          street: street || null,
          number: number || null,
          barangay: barangay || "Loyola Heights",
          city: city || "Quezon City",
        });
      if (addrErr) throw addrErr;

      setOk("Profile saved!");
    } catch (e: any) {
      setErr(e?.message ?? "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-4">Your Profile</h1>

      <Card className="p-4 space-y-4">
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : (
          <form onSubmit={onSave} className="space-y-4">
            {/* Avatar */}
            <div>
              <Label>Avatar</Label>
              <div className="mt-2 flex items-center gap-3">
                <div className="h-16 w-16 rounded-full overflow-hidden bg-gray-100">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="avatar"
                      className="h-full w-full object-cover"
                      onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
                    />
                  ) : (
                    <div className="h-full w-full grid place-items-center text-xs text-muted-foreground">
                      No image
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>

            {/* Bio (optional) */}
            <div>
              <Label htmlFor="bio">Bio (optional)</Label>
              <Textarea
                id="bio"
                rows={4}
                placeholder="Tell something about yourself…"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* Address (private) */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Address (private)</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="street">Street</Label>
                  <Input
                    id="street"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    placeholder="e.g., J. Escaler Street"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="number">Number</Label>
                  <Input
                    id="number"
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    placeholder="e.g., 123"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="barangay">Barangay</Label>
                  <Input
                    id="barangay"
                    value={barangay}
                    onChange={(e) => setBarangay(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Your address is visible only to you and admins.
              </p>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
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
