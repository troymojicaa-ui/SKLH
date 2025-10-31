import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthProvider";
import { format, isAfter } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Trash2, Pencil, ChevronLeft, ChevronRight, Calendar, Loader2 } from "lucide-react";

/* ---------- Types ---------- */
type Status = "draft" | "published" | "archived";
type Visibility = "public" | "private";

type DBProject = {
  id: string;
  title: string;
  summary: string | null;
  body: string | null;
  cover_url: string | null;
  cover_path: string | null;
  status: Status;
  start_date: string | null;
  end_date: string | null;
  visibility: Visibility;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type RegistrationStatus = "pending" | "approved" | "declined";

/* ---------- Registrations Full-Page Modal ---------- */
function ProjectRegistrationsModal({
  open,
  onClose,
  project,
}: {
  open: boolean;
  onClose: () => void;
  project: DBProject | null;
}) {
  type RegStatus = "pending" | "approved" | "declined";
  type Row = {
    id: string;
    event_id: string;
    user_id: string;
    status: RegStatus;
    created_at: string;
    updated_at: string;
  };
  type Profile = { id: string; full_name?: string | null; email?: string | null };

  const [regs, setRegs] = useState<Row[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [err, setErr] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = async () => {
    if (!project) return;
    setLoading(true);
    setErr(null);
    try {
      const { data: regRows, error: regErr } = await supabase
        .from("event_registrations")
        .select("id,event_id,user_id,status,created_at,updated_at")
        .eq("event_id", project.id)
        .order("created_at", { ascending: false });

      if (regErr) throw regErr;

      const rows = ((regRows ?? []) as any[]) || [];
      setRegs(rows as Row[]);

      const userIds = Array.from(new Set(rows.map((r) => r.user_id))).filter(Boolean);
      if (userIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds);
        const map: Record<string, Profile> = {};
        (profs as Profile[] | null)?.forEach((p) => (map[p.id] = p));
        setProfilesMap(map);
      } else {
        setProfilesMap({});
      }
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load registrations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open || !project?.id) return;
    load();
    const ch = supabase
      .channel(`event-regs-${project.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "event_registrations", filter: `event_id=eq.${project.id}` },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [open, project?.id]);

  const approve = async (id: string) => {
    setActingId(id);
    setRegs((prev) => prev.map((r) => (r.id === id ? { ...r, status: "approved" } : r)));
    try {
      const { error } = await supabase
        .from("event_registrations")
        .update({ status: "approved" })
        .eq("id", id);
      if (error) throw error;
    } catch (e: any) {
      alert(e?.message ?? "Failed to approve.");
      setRegs((prev) => prev.map((r) => (r.id === id ? { ...r, status: "pending" } : r)));
    } finally {
      setActingId(null);
    }
  };

  const decline = async (id: string) => {
    setActingId(id);
    setRegs((prev) => prev.map((r) => (r.id === id ? { ...r, status: "declined" } : r)));
    try {
      const { error } = await supabase
        .from("event_registrations")
        .update({ status: "declined" })
        .eq("id", id);
      if (error) throw error;
    } catch (e: any) {
      alert(e?.message ?? "Failed to decline.");
      setRegs((prev) => prev.map((r) => (r.id === id ? { ...r, status: "pending" } : r)));
    } finally {
      setActingId(null);
    }
  };

  const total = regs.length;
  const pending = regs.filter((r) => r.status === "pending").length;
  const approved = regs.filter((r) => r.status === "approved").length;
  const declined = regs.filter((r) => r.status === "declined").length;

  const nameOf = (user_id: string) => profilesMap[user_id]?.full_name || "(no name)";
  const emailOf = (user_id: string) => profilesMap[user_id]?.email || "";

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? onClose() : null)}>
      <DialogContent className="w-[95vw] max-w-[1200px] h-[85vh] bg-white p-0 overflow-hidden">
        <div className="flex flex-col h-full">
          <DialogHeader className="px-6 pt-6 pb-0 pr-16">
            <div className="flex flex-col gap-4">
              <DialogTitle className="text-2xl leading-tight">
                {project ? project.title : "Project"}
              </DialogTitle>

              <div className="flex flex-col gap-2">
                <DialogDescription className="text-sm">
                  Review and manage registrations for this project.
                </DialogDescription>

                <div className="flex items-center gap-4 text-xs">
                  <span className="text-muted-foreground">total: {total}</span>
                  <span className="text-muted-foreground">pending: {pending}</span>
                  <span className="text-gray-700">approved: {approved}</span>
                  <span className="text-gray-700">declined: {declined}</span>
                </div>

                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {project?.start_date ? format(new Date(project.start_date), "MMM dd, yyyy") : "No date"}
                  {project?.end_date ? ` – ${format(new Date(project.end_date), "MMM dd, yyyy")}` : ""}
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-auto px-6 py-4">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                loading registrations…
              </div>
            ) : err ? (
              <div className="text-sm text-red-600">{err}</div>
            ) : total === 0 ? (
              <div className="text-sm text-gray-600">No registrations yet.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white border-b">
                  <tr className="text-left">
                    <th className="py-2 pr-3 font-medium">name</th>
                    <th className="py-2 px-3 font-medium">email</th>
                    <th className="py-2 px-3 font-medium">status</th>
                    <th className="py-2 px-3 font-medium">registered</th>
                    <th className="py-2 pl-3 font-medium text-right">action</th>
                  </tr>
                </thead>
                <tbody>
                  {regs.map((r) => (
                    <tr key={r.id} className="border-b last:border-b-0">
                      <td className="py-2 pr-3">{nameOf(r.user_id)}</td>
                      <td className="py-2 px-3">{emailOf(r.user_id)}</td>
                      <td className="py-2 px-3">
                        {r.status === "approved" ? (
                          <span className="text-sm text-gray-900">approved</span>
                        ) : r.status === "declined" ? (
                          <Badge className="bg-red-600 text-white hover:bg-red-700">declined</Badge>
                        ) : (
                          <Badge variant="secondary">pending</Badge>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        {format(new Date(r.created_at), "MMM dd, yyyy • hh:mm a")}
                      </td>
                      <td className="py-2 pl-3">
                        <div className="flex items-center gap-2 justify-end">
                          <Button
                            size="sm"
                            onClick={() => approve(r.id)}
                            disabled={actingId === r.id || r.status === "approved"}
                          >
                            {actingId === r.id && r.status !== "approved" ? "Working…" : "Approve"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border"
                            onClick={() => decline(r.id)}
                            disabled={actingId === r.id || r.status === "declined"}
                          >
                            {actingId === r.id && r.status !== "declined" ? "Working…" : "Decline"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="border-t px-6 py-4">
            <div className="flex justify-end">
              <Button onClick={onClose}>Close</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Create Project Modal ---------- */
function CreateProjectModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    title: string;
    summary: string;
    start_date: string;
    end_date?: string;
    status: Status;
    visibility: Visibility;
    file?: File | null;
  }) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [date, setDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState<Status>("draft");
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!title.trim() || !date) {
      alert("Please fill in Title and Start date.");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        summary: summary.trim(),
        start_date: date,
        end_date: endDate || undefined,
        status,
        visibility,
        file,
      });
      onClose();
      setTitle("");
      setSummary("");
      setDate("");
      setEndDate("");
      setStatus("draft");
      setVisibility("public");
      setFile(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? onClose() : null)}>
      <DialogContent className="max-w-lg bg-white">
        <DialogHeader>
          <DialogTitle>Create Project</DialogTitle>
          <DialogDescription>
            Published + Public projects appear in Connect and on the public site.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <label className="text-sm">
            Title *
            <input
              className="mt-1 w-full border rounded p-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Feeding Program"
            />
          </label>

          <label className="text-sm">
            Summary
            <textarea
              className="mt-1 w-full border rounded p-2 min-h-[100px]"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Short details about the project…"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              Start date *
              <input
                type="date"
                className="mt-1 w-full border rounded p-2 bg-white"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            <label className="text-sm">
              End date (optional)
              <input
                type="date"
                className="mt-1 w-full border rounded p-2 bg-white"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              Status
              <select
                className="mt-1 w-full border rounded p-2 bg-white"
                value={status}
                onChange={(e) => setStatus(e.target.value as Status)}
              >
                <option value="draft">draft</option>
                <option value="published">published</option>
                <option value="archived">archived</option>
              </select>
            </label>

            <label className="text-sm">
              Visibility
              <select
                className="mt-1 w-full border rounded p-2 bg-white"
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as Visibility)}
              >
                <option value="public">public</option>
                <option value="private">private</option>
              </select>
            </label>
          </div>

          <label className="text-sm">
            Cover image (optional)
            <input
              type="file"
              accept="image/*"
              className="mt-1 w-full border rounded p-2 bg-white"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Edit Project Modal ---------- */
function EditProjectModal({
  open,
  onClose,
  project,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  project: DBProject;
  onSave: (data: {
    id: string;
    title: string;
    summary: string;
    start_date: string | null;
    end_date: string | null;
    status: Status;
    visibility: Visibility;
    newFile?: File | null;
  }) => Promise<void>;
}) {
  const [title, setTitle] = useState(project.title);
  const [summary, setSummary] = useState(project.summary ?? "");
  const [start, setStart] = useState(project.start_date ?? "");
  const [end, setEnd] = useState(project.end_date ?? "");
  const [status, setStatus] = useState<Status>(project.status);
  const [visibility, setVisibility] = useState<Visibility>(project.visibility);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTitle(project.title);
    setSummary(project.summary ?? "");
    setStart(project.start_date ?? "");
    setEnd(project.end_date ?? "");
    setStatus(project.status);
    setVisibility(project.visibility);
    setFile(null);
  }, [project]);

  const submit = async () => {
    if (!title.trim()) {
      alert("Title is required");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        id: project.id,
        title: title.trim(),
        summary: summary.trim(),
        start_date: start || null,
        end_date: end || null,
        status,
        visibility,
        newFile: file ?? undefined,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? onClose() : null)}>
      <DialogContent className="max-w-lg bg-white">
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
          <DialogDescription>Update fields and save.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          {project.cover_url && (
            <img
              src={project.cover_url}
              alt={project.title}
              className="w-full max-h-40 object-cover rounded border"
            />
          )}

          <label className="text-sm">
            Title *
            <input
              className="mt-1 w-full border rounded p-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>

          <label className="text-sm">
            Summary
            <textarea
              className="mt-1 w-full border rounded p-2 min-h-[100px]"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              Start date
              <input
                type="date"
                className="mt-1 w-full border rounded p-2 bg-white"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </label>
            <label className="text-sm">
              End date
              <input
                type="date"
                className="mt-1 w-full border rounded p-2 bg-white"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              Status
              <select
                className="mt-1 w-full border rounded p-2 bg-white"
                value={status}
                onChange={(e) => setStatus(e.target.value as Status)}
              >
                <option value="draft">draft</option>
                <option value="published">published</option>
                <option value="archived">archived</option>
              </select>
            </label>

            <label className="text-sm">
              Visibility
              <select
                className="mt-1 w-full border rounded p-2 bg-white"
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as Visibility)}
              >
                <option value="public">public</option>
                <option value="private">private</option>
              </select>
            </label>
          </div>

          <label className="text-sm">
            Replace cover (optional)
            <input
              type="file"
              accept="image/*"
              className="mt-1 w-full border rounded p-2 bg-white"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Confirm Delete ---------- */
function ConfirmDeleteDialog({
  open,
  onClose,
  onConfirm,
  title,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
}) {
  const [busy, setBusy] = useState(false);
  const handle = async () => {
    setBusy(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? onClose() : null)}>
      <DialogContent className="max-w-md bg-white">
        <DialogHeader>
          <DialogTitle>Delete project</DialogTitle>
          <DialogDescription>
            This will permanently delete “{title}”. You can’t undo this action.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handle} disabled={busy}>
            {busy ? "Deleting…" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Main Page ---------- */
export default function AdminProjects() {
  const { session } = useAuth();
  const [rows, setRows] = useState<DBProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [toEdit, setToEdit] = useState<DBProject | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState<DBProject | null>(null);

  const [regsOpen, setRegsOpen] = useState(false);
  const [projectForRegs, setProjectForRegs] = useState<DBProject | null>(null);

  const [regCounts, setRegCounts] = useState<
    Record<string, { total: number; pending: number; approved: number; declined: number }>
  >({});

  const outlineLight = "bg-white text-black border border-gray-300 hover:bg-gray-50";

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("start_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      const projects = (data ?? []) as DBProject[];
      setRows(projects);

      const { data: counts, error: countsErr } = await supabase
        .from("project_reg_counts_v")
        .select("*");
      if (!countsErr && counts) {
        const map: Record<string, any> = {};
        counts.forEach(
          (c: any) =>
            (map[c.project_id] = {
              total: c.total,
              pending: c.pending,
              approved: c.approved,
              declined: c.declined,
            })
        );
        setRegCounts(map);
      } else {
        setRegCounts({});
      }
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const chProjects = supabase
      .channel("projects-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, () => load())
      .subscribe();

    const chRegs = supabase
      .channel("event-registrations-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "event_registrations" }, () =>
        load()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(chProjects);
      supabase.removeChannel(chRegs);
    };
  }, []);

  const upcoming = useMemo(
    () => rows.filter((p) => (p.start_date ? isAfter(new Date(p.start_date), new Date()) : false)),
    [rows]
  );
  const past = useMemo(
    () => rows.filter((p) => (p.start_date ? !isAfter(new Date(p.start_date), new Date()) : true)),
    [rows]
  );

  async function createProject(payload: {
    title: string;
    summary: string;
    start_date: string;
    end_date?: string;
    status: Status;
    visibility: Visibility;
    file?: File | null;
  }) {
    if (!session) {
      alert("You must be logged in.");
      return;
    }

    try {
      let coverUrl: string | null = null;
      let coverPath: string | null = null;

      if (payload.file) {
        const ext = (payload.file.name.split(".").pop() || "jpg").toLowerCase();
        const path = `${session.user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("project-images")
          .upload(path, payload.file, { cacheControl: "3600", upsert: false });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("project-images").getPublicUrl(path);
        coverUrl = pub.publicUrl;
        coverPath = path;
      }

      const { error: insErr } = await supabase.from("projects").insert({
        title: payload.title,
        summary: payload.summary || null,
        body: null,
        cover_url: coverUrl,
        cover_path: coverPath,
        status: payload.status,
        start_date: payload.start_date,
        end_date: payload.end_date ?? null,
        visibility: payload.visibility,
        created_by: session.user.id,
      });
      if (insErr) throw insErr;

      await load();
    } catch (e: any) {
      alert(e?.message ?? "Failed to create project. Check RLS and storage policies.");
    }
  }

  async function saveEdit(data: {
    id: string;
    title: string;
    summary: string;
    start_date: string | null;
    end_date: string | null;
    status: Status;
    visibility: Visibility;
    newFile?: File | null;
  }) {
    if (!session) return;
    const current = rows.find((r) => r.id === data.id);
    if (!current) return;

    let cover_url = current.cover_url;
    let cover_path = current.cover_path;

    try {
      if (data.newFile) {
        const ext = (data.newFile.name.split(".").pop() || "jpg").toLowerCase();
        const newPath = `${session.user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("project-images")
          .upload(newPath, data.newFile, { cacheControl: "3600", upsert: false });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("project-images").getPublicUrl(newPath);
        cover_url = pub.publicUrl;
        const oldPath = cover_path;
        cover_path = newPath;

        const { error: updErr } = await supabase
          .from("projects")
          .update({
            title: data.title,
            summary: data.summary || null,
            start_date: data.start_date,
            end_date: data.end_date,
            status: data.status,
            visibility: data.visibility,
            cover_url,
            cover_path,
          })
          .eq("id", data.id);
        if (updErr) throw updErr;

        if (oldPath) {
          await supabase.storage.from("project-images").remove([oldPath]);
        }
      } else {
        const { error: updErr } = await supabase
          .from("projects")
          .update({
            title: data.title,
            summary: data.summary || null,
            start_date: data.start_date,
            end_date: data.end_date,
            status: data.status,
            visibility: data.visibility,
          })
          .eq("id", data.id);
        if (updErr) throw updErr;
      }

      await load();
    } catch (e: any) {
      alert(e?.message ?? "Failed to update project.");
    }
  }

  async function deleteProject(p: DBProject) {
    try {
      const { error: delErr } = await supabase.from("projects").delete().eq("id", p.id);
      if (delErr) throw delErr;

      if (p.cover_path) {
        await supabase.storage.from("project-images").remove([p.cover_path]);
      }

      await load();
    } catch (e: any) {
      alert(e?.message ?? "Failed to delete project.");
    }
  }

  const regCountText = (projectId: string) => {
    const c = regCounts[projectId];
    const count = c?.total ?? 0;
    return <span className="text-xs text-gray-500">{count} regs</span>;
  };

  const renderDateLine = (p: DBProject, small = false) => {
    const start = p.start_date
      ? format(new Date(p.start_date), small ? "MMM dd, yyyy" : "MMMM dd, yyyy")
      : null;
    const end = p.end_date
      ? format(new Date(p.end_date), small ? "MMM dd, yyyy" : "MMMM dd, yyyy")
      : null;
    const label = start ? (end ? `${start} – ${end}` : start) : "No date";
    return (
      <div
        className={
          small
            ? "text-xs text-gray-500 flex items-center gap-2"
            : "text-sm text-gray-500 flex items-center gap-2"
        }
      >
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span>{label}</span>
      </div>
    );
  };

  const openRegistrations = (p: DBProject) => {
    setProjectForRegs(p);
    setRegsOpen(true);
  };

  const renderCard = (p: DBProject) => (
    <div key={p.id} className="bg-white rounded border overflow-hidden hover:shadow-sm transition">
      <img
        src={p.cover_url || "https://via.placeholder.com/400x200"}
        alt={p.title}
        className="w-full h-48 object-cover cursor-pointer"
        onClick={() => openRegistrations(p)}
      />
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3
              className="text-lg font-semibold cursor-pointer truncate"
              title={p.title}
              onClick={() => openRegistrations(p)}
            >
              {p.title}
            </h3>
            <div className="mt-0.5">{regCountText(p.id)}</div>
          </div>
        </div>

        {p.summary && <p className="text-sm text-gray-600 line-clamp-2">{p.summary}</p>}

        {renderDateLine(p, false)}

        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            variant="outline"
            className={outlineLight}
            onClick={(e) => {
              e.stopPropagation();
              setToEdit(p);
              setEditOpen(true);
            }}
          >
            <Pencil className="w-4 h-4 mr-1" /> Edit
          </Button>
          <Button
            size="sm"
            variant="outline"
            className={outlineLight}
            onClick={(e) => {
              e.stopPropagation();
              setToDelete(p);
              setDeleteOpen(true);
            }}
          >
            <Trash2 className="w-4 h-4 mr-1" /> Delete
          </Button>
        </div>
      </div>
    </div>
  );

  const renderCardCarousel = (p: DBProject) => (
    <div
      key={p.id}
      className="w-64 sm:w-72 flex-shrink-0 bg-white rounded border overflow-hidden hover:shadow-sm transition"
    >
      <img
        src={p.cover_url || "https://via.placeholder.com/400x200"}
        alt={p.title}
        className="w-full h-36 object-cover cursor-pointer"
        onClick={() => openRegistrations(p)}
      />
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3
              className="text-base font-semibold cursor-pointer truncate"
              title={p.title}
              onClick={() => openRegistrations(p)}
            >
              {p.title}
            </h3>
            <div className="mt-0.5">{regCountText(p.id)}</div>
          </div>
        </div>

        {p.summary && <p className="text-sm text-gray-600 line-clamp-2">{p.summary}</p>}

        {renderDateLine(p, true)}

        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            variant="outline"
            className={outlineLight}
            onClick={(e) => {
              e.stopPropagation();
              setToEdit(p);
              setEditOpen(true);
            }}
          >
            <Pencil className="w-4 h-4 mr-1" /> Edit
          </Button>
          <Button
            size="sm"
            variant="outline"
            className={outlineLight}
            onClick={(e) => {
              e.stopPropagation();
              setToDelete(p);
              setDeleteOpen(true);
            }}
          >
            <Trash2 className="w-4 h-4 mr-1" /> Delete
          </Button>
        </div>
      </div>
    </div>
  );

  const upcomingRef = useRef<HTMLDivElement | null>(null);
  const scrollBy = (dx: number) => {
    if (upcomingRef.current) {
      upcomingRef.current.scrollBy({ left: dx, behavior: "smooth" });
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-10">
      <style>{`
        .no-scrollbar { scrollbar-width: none; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      <div className="flex items-center justify-between">
        <div className="mb-2">
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-sm text-muted-foreground">
            Create, update, publish, archive, or delete. Click a project to view and manage registrations. Published + Public appear in Connect & Public site.
          </p>
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Upcoming Projects</h2>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            New Project
          </Button>
        </div>

        <div className="relative border rounded-lg bg-white">
          <div ref={upcomingRef} className="flex gap-4 overflow-x-auto no-scrollbar p-4">
            {loading ? (
              <div className="text-sm text-gray-600">Loading…</div>
            ) : upcoming.length ? (
              upcoming.map(renderCardCarousel)
            ) : (
              <p className="text-gray-500">No upcoming projects yet.</p>
            )}
          </div>

          {upcoming.length > 4 && (
            <>
              <button
                aria-label="Scroll left"
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow border"
                onClick={() => scrollBy(-320)}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                aria-label="Scroll right"
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow border"
                onClick={() => scrollBy(320)}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Past Projects</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="text-sm text-gray-600">Loading…</div>
          ) : past.length ? (
            past.map(renderCard)
          ) : (
            <p className="text-gray-500">No past projects yet.</p>
          )}
        </div>
      </section>

      <CreateProjectModal open={createOpen} onClose={() => setCreateOpen(false)} onSave={createProject} />

      {toEdit && <EditProjectModal open={editOpen} onClose={() => setEditOpen(false)} project={toEdit} onSave={saveEdit} />}

      {toDelete && <ConfirmDeleteDialog open={deleteOpen} onClose={() => setDeleteOpen(false)} title={toDelete.title} onConfirm={() => deleteProject(toDelete)} />}

      <ProjectRegistrationsModal open={regsOpen} onClose={() => setRegsOpen(false)} project={projectForRegs} />
    </div>
  );
}
