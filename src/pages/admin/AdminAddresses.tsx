import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from "@/components/ui/table";

type AddressRow = {
  user_id: string;
  street: string | null;
  number: string | null;
  barangay: string;
  city: string;
};

type ProfileRow = {
  id: string;
  avatar_url: string | null;
  bio: string | null;
};

export default function AdminAddresses() {
  const [rows, setRows] = useState<AddressRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileRow>>({});
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        // Only admins will actually see rows due to RLS
        const { data, error } = await supabase
          .from("user_addresses")
          .select("user_id, street, number, barangay, city")
          .order("updated_at", { ascending: false });
        if (error) throw error;
        const addr = (data ?? []) as AddressRow[];
        setRows(addr);

        // Fetch profiles for the returned user_ids
        const ids = addr.map((r) => r.user_id);
        if (ids.length) {
          const { data: profs, error: pErr } = await supabase
            .from("profiles")
            .select("id, avatar_url, bio")
            .in("id", ids);
          if (pErr) throw pErr;
          const map: Record<string, ProfileRow> = {};
          (profs ?? []).forEach((p: any) => (map[p.id] = p));
          setProfiles(map);
        } else {
          setProfiles({});
        }
      } catch (e: any) {
        setErr(e?.message ?? "Failed to load addresses.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) => {
      const p = profiles[r.user_id];
      const addr = [
        r.street ?? "",
        r.number ?? "",
        r.barangay ?? "",
        r.city ?? "",
        p?.bio ?? "",
      ].join(" ").toLowerCase();
      return addr.includes(term);
    });
  }, [q, rows, profiles]);

  return (
    <div className="p-6 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">User Addresses (Admin)</h1>
        <Badge variant="secondary">{filtered.length} results</Badge>
      </header>

      <Card className="p-3">
        <Input
          placeholder="Search address or bio…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <p className="text-xs text-muted-foreground mt-2">
          You’ll see data here only if you’re an admin.
        </p>
      </Card>

      {loading ? (
        <Card className="p-4 text-sm text-muted-foreground">Loading…</Card>
      ) : err ? (
        <Card className="p-4 text-sm text-red-600">{err}</Card>
      ) : filtered.length === 0 ? (
        <Card className="p-4 text-sm text-muted-foreground">No addresses.</Card>
      ) : (
        <Card className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Avatar</TableHead>
                <TableHead>Bio</TableHead>
                <TableHead>Street</TableHead>
                <TableHead>No.</TableHead>
                <TableHead>Barangay</TableHead>
                <TableHead>City</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => {
                const p = profiles[r.user_id];
                return (
                  <TableRow key={r.user_id}>
                    <TableCell className="font-mono text-xs">{r.user_id}</TableCell>
                    <TableCell>
                      {p?.avatar_url ? (
                        <img
                          src={p.avatar_url}
                          alt="avatar"
                          className="h-10 w-10 rounded-full object-cover"
                          onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gray-100" />
                      )}
                    </TableCell>
                    <TableCell className="max-w-[24rem] truncate">{p?.bio ?? "—"}</TableCell>
                    <TableCell>{r.street ?? "—"}</TableCell>
                    <TableCell>{r.number ?? "—"}</TableCell>
                    <TableCell>{r.barangay}</TableCell>
                    <TableCell>{r.city}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
