// src/pages/admin/YouthManagement.tsx  (aka youthdatabase.tsx)
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthProvider";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Filter, MoreHorizontal, UserPlus, Loader2 } from "lucide-react";

/* ---- imports for the Add Member modal ---- */
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

/* ---------- Types ---------- */
type ProfileRow = {
  id: string; // auth.users.id
  full_name?: string | null;
  email?: string | null;
  role?: string | null;
  status?: string | null;
  created_at?: string | null;
};

type AddressRow = {
  user_id: string;
  street: string | null;
  number: string | null;
  barangay: string;
  city: string;
};

/* ---------- Inline Component: AddMemberModal (#3) ---------- */
type AddMemberModalProps = { onCreated?: () => void };

function AddMemberModal({ onCreated }: AddMemberModalProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null); // visible error inside modal

  type MemberForm = {
    full_name: string;
    address_line: string;
    birthday: string;
    birth_city: string;
    email: string;
    phone: string;
    id_type: string;
    id_value: string;
  };

  const [form, setForm] = useState<MemberForm>({
    full_name: "",
    address_line: "",
    birthday: "",
    birth_city: "",
    email: "",
    phone: "",
    id_type: "",
    id_value: "",
  });

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  async function handleCreate() {
    setLocalError(null);

    // basic validation + visible inline message
    if (!form.full_name || !form.email) {
      const msg = "Full name and email are required.";
      setLocalError(msg);
      try { toast({ title: "Missing required fields", description: msg, variant: "destructive" }); } catch {}
      return;
    }

    setSaving(true);
    try {
      // invoke Edge Function
      const { data, error } = await supabase.functions.invoke("admin_create_member", { body: form });

      // console visibility for debugging
      console.log("[admin_create_member] response:", { data, error });

      if (error) {
        setLocalError(error.message ?? "Failed to create member.");
        try { toast({ title: "Error creating member", description: error.message ?? String(error), variant: "destructive" }); } catch {}
        return;
      }

      try {
        toast({
          title: "Member created",
          description: "Account created with default password. User will set a new one on first login.",
        });
      } catch {}

      // reset & close
      setForm({
        full_name: "",
        address_line: "",
        birthday: "",
        birth_city: "",
        email: "",
        phone: "",
        id_type: "",
        id_value: "",
      });
      setOpen(false);

      // refresh the list
      onCreated?.();
    } catch (e: any) {
      console.error("[admin_create_member] exception:", e);
      setLocalError(e?.message ?? "Unexpected error while creating member.");
      try { toast({ title: "Error", description: e?.message ?? String(e), variant: "destructive" }); } catch {}
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <UserPlus className="w-4 h-4 mr-2" />
          Add New Member
        </Button>
      </DialogTrigger>

      {/* allow popovers to escape and render fully opaque on top */}
      <DialogContent className="sm:max-w-xl overflow-visible">
        <DialogHeader>
          <DialogTitle>Create New Member Account</DialogTitle>
          <p className="text-sm text-muted-foreground">
            This creates a login via email with a default password. The member will be required to set
            a new password on first sign-in.
          </p>
        </DialogHeader>

        {/* inline error (shows even if toaster is not mounted) */}
        {localError && (
          <div className="mb-2 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
            {localError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="full_name">Full Name *</Label>
            <Input
              id="full_name"
              name="full_name"
              value={form.full_name}
              onChange={onChange}
              placeholder="e.g., Juan Dela Cruz"
            />
          </div>

          <div>
            <Label htmlFor="email">Email (login) *</Label>
            <Input
              id="email"
              type="email"
              name="email"
              value={form.email}
              onChange={onChange}
              placeholder="name@example.com"
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="address_line">Address (one-line)</Label>
            <Input
              id="address_line"
              name="address_line"
              value={form.address_line}
              onChange={onChange}
              placeholder="House/Unit, Street, Barangay, City"
            />
          </div>

          <div>
            <Label htmlFor="birthday">Birthday</Label>
            <Input id="birthday" type="date" name="birthday" value={form.birthday} onChange={onChange} />
          </div>

          <div>
            <Label htmlFor="birth_city">City of Birth</Label>
            <Input
              id="birth_city"
              name="birth_city"
              value={form.birth_city}
              onChange={onChange}
              placeholder="e.g., Quezon City"
            />
          </div>

          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" value={form.phone} onChange={onChange} placeholder="+63 9xx xxx xxxx" />
          </div>

          <div>
            <Label>ID Type</Label>
            <Select value={form.id_type} onValueChange={(v) => setForm((s) => ({ ...s, id_type: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Choose ID type" />
              </SelectTrigger>

              {/* solid background + high z-index so it fully covers buttons behind */}
              <SelectContent
                position="popper"
                sideOffset={8}
                className="z-[1001] bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 shadow-xl rounded-md"
              >
                <SelectItem value="PhilID">PhilID</SelectItem>
                <SelectItem value="Passport">Passport</SelectItem>
                <SelectItem value="DriverLicense">Driver’s License</SelectItem>
                <SelectItem value="StudentID">Student ID</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="id_value">ID Number</Label>
            <Input
              id="id_value"
              name="id_value"
              value={form.id_value}
              onChange={onChange}
              placeholder="e.g., PHL-1234-5678-9012"
            />
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={saving} aria-busy={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating…
              </>
            ) : (
              "Create Member"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Hook: fetch admin-only addresses for a set of userIds ---------- */
function useAdminAddresses(userIds: string[]) {
  const { session } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [map, setMap] = useState<Record<string, AddressRow>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!session || userIds.length === 0) {
        setIsAdmin(false);
        setMap({});
        return;
      }
      setLoading(true);
      try {
        // 1) check admin
        const { data: adminRes, error: adminErr } = await supabase.rpc("is_admin", {
          uid: session.user.id,
        });
        if (adminErr) throw adminErr;
        const admin = !!adminRes;
        if (!admin) {
          if (!cancelled) {
            setIsAdmin(false);
            setMap({});
          }
          return;
        }
        // 2) fetch addresses (RLS will only return for admins)
        const { data, error } = await supabase
          .from("user_addresses")
          .select("user_id, street, number, barangay, city")
          .in("user_id", userIds);
        if (error) throw error;

        const m: Record<string, AddressRow> = {};
        (data ?? []).forEach((r: any) => (m[r.user_id] = r as AddressRow));
        if (!cancelled) {
          setIsAdmin(true);
          setMap(m);
        }
      } catch {
        if (!cancelled) {
          setIsAdmin(false);
          setMap({});
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id, JSON.stringify(userIds)]);

  const getAddressString = (uid: string) => {
    const a = map[uid];
    if (!a) return "—";
    const streetLine = [a.number, a.street].filter(Boolean).join(" ").trim(); // "123 J. Escaler St"
    return [streetLine, a.barangay, a.city].filter(Boolean).join(", ");
  };

  return { isAdmin, loading, getAddressString };
}

/* ---------- Page ---------- */
const YouthManagement = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Members loaded from profiles
  const [members, setMembers] = useState<ProfileRow[]>([]);

  // central fetch so modal can refresh after create
  const fetchMembers = async () => {
    setErr(null);
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, role, status, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setMembers((data ?? []) as ProfileRow[]);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load members.");
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const userIds = useMemo(() => members.map((m) => m.id), [members]);
  const { isAdmin, getAddressString } = useAdminAddresses(userIds);

  // Derived stats (basic examples; adjust as you add real fields)
  const totalMembers = members.length;
  const activeMembers = members.filter((m) => (m.status ?? "").toLowerCase() === "active").length;
  const pendingMembers = members.filter((m) => (m.status ?? "").toLowerCase() === "pending").length;
  const officers = members.filter((m) => (m.role ?? "").toLowerCase() === "officer").length;

  const stats = [
    { label: "Total Members", value: String(totalMembers), color: "bg-blue-500" },
    { label: "Active Members", value: String(activeMembers), color: "bg-green-500" },
    { label: "Pending Verification", value: String(pendingMembers), color: "bg-yellow-500" },
    { label: "Officers", value: String(officers), color: "bg-purple-500" },
  ];

  const filteredMembers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return members;
    return members.filter((m) => {
      const name = (m.full_name ?? "").toLowerCase();
      const email = (m.email ?? "").toLowerCase();
      return name.includes(term) || email.includes(term);
    });
  }, [members, searchTerm]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Youth Management</h1>
          <p className="text-gray-600">Manage and monitor youth members in your barangay</p>
        </div>

        {/* Add New Member (modal trigger + flow) */}
        <AddMemberModal onCreated={fetchMembers} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className={`w-4 h-4 rounded-full ${stat.color} mr-3`} />
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Members */}
      <Card>
        <CardHeader>
          <CardTitle>Youth Members</CardTitle>
          <CardDescription>Manage all registered youth members</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
          </div>

          {err ? (
            <div className="text-sm text-red-600">{err}</div>
          ) : loading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Join Date</TableHead>
                  {/* Address visible to admins only */}
                  <TableHead>Address (Admin)</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">
                      {m.full_name ?? "—"}
                    </TableCell>
                    <TableCell>{m.email ?? "—"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          (m.status ?? "").toLowerCase() === "active"
                            ? "default"
                            : (m.status ?? "").toLowerCase() === "pending"
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {m.status ?? "—"}
                      </Badge>
                    </TableCell>
                    <TableCell>{m.role ?? "—"}</TableCell>
                    <TableCell>
                      {m.created_at ? new Date(m.created_at).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell>
                      {isAdmin ? getAddressString(m.id) : "—"}
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default YouthManagement;
