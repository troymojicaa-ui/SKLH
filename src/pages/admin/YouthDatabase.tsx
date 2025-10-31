// src/pages/admin/YouthDatabase.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthProvider";

import { Card, CardContent } from "@/components/ui/card";
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
import { Search, Loader2, Plus } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

import { MapContainer, Marker, TileLayer, Popup, useMapEvents } from "react-leaflet";
import L, { LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";

type ProfileRow = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  role?: string | null;
  status?: string | null;
  created_at?: string | null;
  id_no?: string | null;
};

type AddressRow = {
  user_id: string;
  street: string | null;
  number: string | null;
  barangay: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
};

const LOYOLA: LatLngExpression = [14.6389, 121.0784];
const DEFAULT_ZOOM = 15;

const DefaultIcon = L.icon({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

function useAdminAddresses(userIds: string[]) {
  const { session } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [mapByUser, setMapByUser] = useState<Record<string, AddressRow>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!session || userIds.length === 0) {
        if (!cancelled) {
          setIsAdmin(false);
          setMapByUser({});
        }
        return;
      }
      setLoading(true);
      try {
        const { data: adminRes, error: adminErr } = await supabase.rpc("is_admin", {
          uid: session.user.id,
        });
        if (adminErr) throw adminErr;
        const admin = !!adminRes;
        if (!admin) {
          if (!cancelled) {
            setIsAdmin(false);
            setMapByUser({});
          }
          return;
        }
        const { data, error } = await supabase
          .from("user_addresses")
          .select("user_id, street, number, barangay, city, lat, lng")
          .in("user_id", userIds);
        if (error) throw error;

        const m: Record<string, AddressRow> = {};
        (data ?? []).forEach((r: any) => (m[r.user_id] = r as AddressRow));
        if (!cancelled) {
          setIsAdmin(true);
          setMapByUser(m);
        }
      } catch {
        if (!cancelled) {
          setIsAdmin(false);
          setMapByUser({});
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
  }, [session?.user.id, JSON.stringify(userIds)]);

  const getAddressString = (uid: string) => {
    const a = mapByUser[uid];
    if (!a) return "–";
    const streetLine = [a.number, a.street].filter(Boolean).join(" ").trim();
    const parts = [streetLine || null, a.barangay, a.city].filter(Boolean);
    return parts.length ? parts.join(", ") : "–";
  };

  const getLatLng = (uid: string): LatLngExpression | null => {
    const a = mapByUser[uid];
    if (!a || a.lat == null || a.lng == null) return null;
    return [Number(a.lat), Number(a.lng)];
  };

  return { isAdmin, loading, mapByUser, getAddressString, getLatLng };
}

type EditModalProps = {
  open: boolean;
  onClose: () => void;
  profile: ProfileRow | null;
  currentLatLng: LatLngExpression | null;
  onSaved: () => void;
};

function EditMemberModal({
  open,
  onClose,
  profile,
  currentLatLng,
  onSaved,
}: EditModalProps) {
  const [saving, setSaving] = useState(false);
  const [idNo, setIdNo] = useState(profile?.id_no ?? "");
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [status, setStatus] = useState((profile?.status ?? "active").toLowerCase());
  const [picked, setPicked] = useState<LatLngExpression | null>(currentLatLng ?? null);

  useEffect(() => {
    if (!open) return;
    setIdNo(profile?.id_no ?? "");
    setFullName(profile?.full_name ?? "");
    setStatus((profile?.status ?? "active").toLowerCase());
    setPicked(currentLatLng ?? null);
  }, [open, profile?.id]);

  async function handleSave() {
    if (!profile) return;
    setSaving(true);
    try {
      const patch: Partial<ProfileRow> = {
        id_no: idNo || null,
        full_name: fullName || null,
        status: status || null,
      };
      const { error: uErr } = await supabase.from("profiles").update(patch).eq("id", profile.id);
      if (uErr) throw uErr;

      if (picked) {
        const [lat, lng] = picked as [number, number];
        const { error: aErr } = await supabase.from("user_addresses").upsert(
          { user_id: profile.id, lat, lng },
          { onConflict: "user_id" }
        );
        if (aErr) throw aErr;
      }

      onSaved();
      onClose();
    } catch (e: any) {
      alert(e?.message ?? "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  }

  function ClickPicker({ onPick }: { onPick: (lat: number, lng: number) => void }) {
    useMapEvents({
      click(e) {
        onPick(e.latlng.lat, e.latlng.lng);
      },
    });
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? onClose() : null)}>
      <DialogContent key={profile?.id ?? "new"} className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Member</DialogTitle>
          <DialogDescription id="edit-desc">Update ID No., name, status and pin a location.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 mt-2">
          <div>
            <Label htmlFor="idno">ID No.</Label>
            <Input id="idno" value={idNo} onChange={(e) => setIdNo(e.target.value)} placeholder="Enter ID No." />
          </div>

          <div>
            <Label htmlFor="fname">Full Name</Label>
            <Input id="fname" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g., Juan Dela Cruz" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Role</Label>
              <div className="mt-2 text-sm font-medium">{((profile?.role ?? "connect")[0].toUpperCase() + (profile?.role ?? "connect").slice(1))}</div>
              <div className="text-xs text-muted-foreground">Role is managed separately.</div>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                className="mt-2 w-full rounded-md border bg-white px-3 py-2 text-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="mt-1 rounded-md overflow-hidden">
            <MapContainer
              center={picked ?? currentLatLng ?? LOYOLA}
              zoom={DEFAULT_ZOOM}
              className="h-64 w-full"
              scrollWheelZoom
              attributionControl={false}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <ClickPicker onPick={(la, ln) => setPicked([la, ln])} />
              {picked && (
                <Marker position={picked}>
                  <Popup>Selected address</Popup>
                </Marker>
              )}
            </MapContainer>
            <div className="px-3 py-2 text-xs text-muted-foreground">Click on the map to set where this member lives.</div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type AddModalProps = {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
};

function AddMemberModal({ open, onClose, onAdded }: AddModalProps) {
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [idNo, setIdNo] = useState("");
  const [status, setStatus] = useState<"active" | "pending" | "inactive">("active");
  const [picked, setPicked] = useState<LatLngExpression | null>(null);

  useEffect(() => {
    if (!open) return;
    setSaving(false);
    setEmail("");
    setFullName("");
    setIdNo("");
    setStatus("active");
    setPicked(null);
  }, [open]);

  async function handleCreate() {
    if (!fullName.trim()) {
      alert("Please enter full name.");
      return;
    }
    setSaving(true);
    try {
      const newId = crypto.randomUUID();

      const { error: pErr } = await supabase.from("profiles").insert({
        id: newId,
        full_name: fullName || null,
        email: email || null,
        id_no: idNo || null,
        status,
        role: "connect",
      });
      if (pErr) throw pErr;

      if (picked) {
        const [lat, lng] = picked as [number, number];
        const { error: aErr } = await supabase
          .from("user_addresses")
          .upsert({ user_id: newId, lat, lng }, { onConflict: "user_id" });
        if (aErr) throw aErr;
      }

      onAdded();
      onClose();
    } catch (e: any) {
      alert(e?.message ?? "Failed to add member.");
    } finally {
      setSaving(false);
    }
  }

  function ClickPicker({ onPick }: { onPick: (lat: number, lng: number) => void }) {
    useMapEvents({
      click(e) {
        onPick(e.latlng.lat, e.latlng.lng);
      },
    });
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? onClose() : null)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Member</DialogTitle>
          <DialogDescription>Fill in details below. Role is set to “connect”.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 mt-2">
          <div className="grid grid-cols-1 gap-3">
            <div>
              <Label htmlFor="full">Full Name</Label>
              <Input id="full" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g., Juan Dela Cruz" />
            </div>
            <div>
              <Label htmlFor="email">Email (optional)</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@email.com" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="idnew">ID No. (optional)</Label>
                <Input id="idnew" value={idNo} onChange={(e) => setIdNo(e.target.value)} placeholder="000123" />
              </div>
              <div>
                <Label htmlFor="stat">Status</Label>
                <select
                  id="stat"
                  className="mt-2 w-full rounded-md border bg-white px-3 py-2 text-sm"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                >
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          <div className="rounded-md overflow-hidden">
            <MapContainer center={picked ?? LOYOLA} zoom={DEFAULT_ZOOM} className="h-56 w-full" scrollWheelZoom attributionControl={false}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <ClickPicker onPick={(la, ln) => setPicked([la, ln])} />
              {picked && (
                <Marker position={picked}>
                  <Popup>Selected address</Popup>
                </Marker>
              )}
            </MapContainer>
            <div className="px-3 py-2 text-xs text-muted-foreground">Optional: click on the map to pin this member’s location.</div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding…
              </>
            ) : (
              "Add Member"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const YouthManagement = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [members, setMembers] = useState<ProfileRow[]>([]);

  const [mapFocus, setMapFocus] = useState<LatLngExpression>(LOYOLA);
  const [hoverUserId, setHoverUserId] = useState<string | null>(null);
  const [clickedUserId, setClickedUserId] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<ProfileRow | null>(null);

  const [addOpen, setAddOpen] = useState(false);

  const fetchMembers = async () => {
    setErr(null);
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, role, status, created_at, id_no")
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
  const { isAdmin, getAddressString, getLatLng } = useAdminAddresses(userIds);

  const totalMembers = members.length;
  const activeMembers = members.filter((m) => (m.status ?? "").toLowerCase() === "active").length;
  const pendingMembers = members.filter((m) => (m.status ?? "").toLowerCase() === "pending").length;
  const officers = members.filter((m) => (m.role ?? "").toLowerCase() === "admin").length;

  const stats = [
    { label: "Total Members", value: String(totalMembers), color: "bg-[#3B82F6]" },
    { label: "Active Members", value: String(activeMembers), color: "bg-[#22C55E]" },
    { label: "Pending Verification", value: String(pendingMembers), color: "bg-[#EAB308]" },
    { label: "Officers", value: String(officers), color: "bg-[#8B5CF6]" },
  ];

  const filteredMembers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return members;
    return members.filter((m) => {
      const name = (m.full_name ?? "").toLowerCase();
      const email = (m.email ?? "").toLowerCase();
      const idno = (m.id_no ?? "").toLowerCase();
      return name.includes(term) || email.includes(term) || idno.includes(term);
    });
  }, [members, searchTerm]);

  useEffect(() => {
    const uid = hoverUserId ?? clickedUserId;
    if (!uid) return;
    const pos = getLatLng(uid);
    if (pos) {
      setMapFocus((prev) => {
        const [a, b] = prev as [number, number];
        const [c, d] = pos as [number, number];
        return a === c && b === d ? prev : pos;
      });
    }
  }, [hoverUserId, clickedUserId, getLatLng]);

  const toTitle = (s?: string | null) => {
    const v = (s ?? "").toLowerCase();
    return v ? v[0].toUpperCase() + v.slice(1) : "–";
  };
  const padId = (id?: string | null) => {
    if (!id) return "–";
    const asNum = Number(id);
    if (!Number.isFinite(asNum)) return id;
    return String(asNum).padStart(6, "0");
  };
  const formatDate = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "numeric", day: "numeric" }) : "–";

  return (
    <div className="p-6">
      <style>{`.leaflet-control-attribution{display:none!important}`}</style>

      <Card className="rounded-xl">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Youth Members</h1>
              <p className="text-gray-600">Manage all registered youth members</p>
            </div>
            <Button className="bg-sky-700 hover:bg-sky-800" onClick={() => setAddOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add New Member
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search Name"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {err ? (
                <div className="text-sm text-red-600">{err}</div>
              ) : loading ? (
                <div className="text-sm text-muted-foreground">Loading…</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">ID No.</TableHead>
                      <TableHead>Full Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Join Date</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMembers.map((m) => {
                      const latlng = getLatLng(m.id);
                      const statusLc = (m.status ?? "").toLowerCase();
                      const badgeVariant =
                        statusLc === "active" ? "default" : statusLc === "pending" ? "secondary" : "destructive";
                      return (
                        <TableRow
                          key={m.id}
                          onMouseEnter={() => setHoverUserId(m.id)}
                          onMouseLeave={() => setHoverUserId(null)}
                          onClick={() => setClickedUserId(m.id)}
                          className="cursor-pointer"
                        >
                          <TableCell className="font-mono">{padId(m.id_no)}</TableCell>
                          <TableCell className="font-medium">{m.full_name ?? "–"}</TableCell>
                          <TableCell>
                            <Badge variant={badgeVariant}>{toTitle(m.status)}</Badge>
                          </TableCell>
                          <TableCell>{toTitle(m.role)}</TableCell>
                          <TableCell>{formatDate(m.created_at)}</TableCell>
                          <TableCell>{isAdmin ? getAddressString(m.id) : "–"}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              className="bg-sky-700 hover:bg-sky-800 text-white rounded-md"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditing(m);
                                setEditOpen(true);
                              }}
                            >
                              Edit
                            </Button>
                          </TableCell>
                          {!latlng && <td className="hidden" />}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>

            <div className="lg:col-span-1 space-y-4">
              {stats.map((s) => (
                <div key={s.label} className="rounded-xl overflow-hidden shadow-sm">
                  <div className={`${s.color} text-white px-5 py-4`}>
                    <div className="text-sm">{s.label}</div>
                    <div className="text-2xl font-semibold">{s.value}</div>
                  </div>
                </div>
              ))}

              <div className="h-[300px] rounded-xl overflow-hidden shadow-sm ring-1 ring-gray-200">
                <MapContainer
                  center={mapFocus}
                  zoom={DEFAULT_ZOOM}
                  className="h-full w-full"
                  scrollWheelZoom
                  attributionControl={false}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  {(() => {
                    const uid = hoverUserId ?? clickedUserId;
                    const pos = uid ? getLatLng(uid) : null;
                    if (!uid || !pos) return null;
                    const member = members.find((m) => m.id === uid);
                    return (
                      <Marker position={pos}>
                        <Popup>
                          <div className="text-sm">
                            <div className="font-medium">{member?.full_name ?? "Member"}</div>
                            <div className="text-xs text-muted-foreground">
                              {isAdmin ? getAddressString(uid) : "–"}
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })()}
                </MapContainer>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <EditMemberModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        profile={editing}
        currentLatLng={editing ? getLatLng(editing.id) : null}
        onSaved={() => {
          fetchMembers();
        }}
      />

      <AddMemberModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={() => {
          fetchMembers();
        }}
      />
    </div>
  );
};

export default YouthManagement;
