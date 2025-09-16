import { useEffect, useMemo, useState } from "react";
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
import { Plus, RefreshCcw, Trash2, Pencil } from "lucide-react";

/* ====================== Types (DB) ====================== */
type Status = "draft" | "published" | "archived";
type Visibility = "public" | "private";

type DBProject = {
  id: string;
  title: string;
  summary: string | null;
  body: string | null;
  cover_url: string | null;
  cover_path: string | null;   // NEW (for storage cleanup)
  status: Status;
  start_date: string | null;   // yyyy-mm-dd
  end_date: string | null;     // yyyy-mm-dd
  visibility: Visibility;
  created_by: string | null;
  created_at: string;          // ISO
  updated_at: string;          // ISO
};

/* ========================================================
   Create Project Modal
======================================================== */
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
    start_date: string; // yyyy-mm-dd
    end_date?: string;
    status: Status;
    visibility: Visibility;
    file?: File | null;
  }) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [date, setDate] = useState(""); // start_date
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
                className="mt-1 w-full border rounded p-2"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            <label className="text-sm">
              End date (optional)
              <input
                type="date"
                className="mt-1 w-full border rounded p-2"
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
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ========================================================
   Edit Project Modal
======================================================== */
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
    // refresh when a different project is opened
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
                className="mt-1 w-full border rounded p-2"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </label>
            <label className="text-sm">
              End date
              <input
                type="date"
                className="mt-1 w-full border rounded p-2"
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
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ========================================================
   Delete Confirm Modal
======================================================== */
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
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={handle} disabled={busy}>
            {busy ? "Deleting…" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ========================================================
   Page
======================================================== */
export default function AdminProjects() {
  const { session } = useAuth();
  const [rows, setRows] = useState<DBProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // modals
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [toEdit, setToEdit] = useState<DBProject | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState<DBProject | null>(null);

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
      setRows((data ?? []) as DBProject[]);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  // realtime refresh
  useEffect(() => {
    const ch = supabase
      .channel("projects-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
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
    title: string; summary: string; start_date: string; end_date?: string;
    status: Status; visibility: Visibility; file?: File | null;
  }) {
    if (!session) { alert("You must be logged in."); return; }

    try {
      // Upload cover if provided
      let coverUrl: string | null = null;
      let coverPath: string | null = null;

      if (payload.file) {
        const ext = (payload.file.name.split(".").pop() || "jpg").toLowerCase();
        const path = `${session.user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("project-images").upload(path, payload.file, {
          cacheControl: "3600",
          upsert: false,
        });
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
        cover_path: coverPath,      // NEW
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
      // 1) If replacing cover, upload new first
      if (data.newFile) {
        const ext = (data.newFile.name.split(".").pop() || "jpg").toLowerCase();
        const newPath = `${session.user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("project-images").upload(newPath, data.newFile, {
          cacheControl: "3600",
          upsert: false,
        });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("project-images").getPublicUrl(newPath);
        cover_url = pub.publicUrl;
        // remember new path; remove old later (best-effort)
        const oldPath = cover_path;
        cover_path = newPath;

        // 2) Update row first (so you don't lose the project if remove fails)
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

        // 3) Best-effort remove old file
        if (oldPath) {
          await supabase.storage.from("project-images").remove([oldPath]);
        }
      } else {
        // No new image: simple update
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
      // 1) Delete row
      const { error: delErr } = await supabase.from("projects").delete().eq("id", p.id);
      if (delErr) throw delErr;

      // 2) Best-effort delete cover
      if (p.cover_path) {
        await supabase.storage.from("project-images").remove([p.cover_path]);
      }

      await load();
    } catch (e: any) {
      alert(e?.message ?? "Failed to delete project.");
    }
  }

  const renderCard = (p: DBProject) => (
    <div key={p.id} className="bg-white rounded shadow-md overflow-hidden">
      <img
        src={p.cover_url || "https://via.placeholder.com/400x200"}
        alt={p.title}
        className="w-full h-48 object-cover"
      />
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-semibold">{p.title}</h3>
          <Badge variant={p.status === "published" ? "default" : "secondary"}>
            {p.status}
          </Badge>
        </div>

        {p.summary && <p className="text-sm text-gray-600">{p.summary}</p>}

        <p className="text-sm text-gray-500">
          {p.start_date ? `📅 ${format(new Date(p.start_date), "MMMM dd, yyyy")}` : "No date"}
          {p.end_date ? ` – ${format(new Date(p.end_date), "MMMM dd, yyyy")}` : ""}
        </p>

        <div className="flex gap-2 pt-2">
          <Button size="sm" variant="secondary" onClick={() => { setToEdit(p); setEditOpen(true); }}>
            <Pencil className="w-4 h-4 mr-1" /> Edit
          </Button>
          <Button size="sm" variant="destructive" onClick={() => { setToDelete(p); setDeleteOpen(true); }}>
            <Trash2 className="w-4 h-4 mr-1" /> Delete
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Manage Projects</h1>
          <p className="text-sm text-muted-foreground">
            Create, update, publish, archive, or delete. Published + Public appear in Connect & Public site.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Reload
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </div>
      </div>

      {/* Upcoming */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold">Upcoming Projects</h2>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            New Project
          </Button>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {upcoming.length ? upcoming.map(renderCard) : (
            <p className="text-gray-500">No upcoming projects yet.</p>
          )}
        </div>
      </section>

      {/* Past */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Past Projects</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {past.length ? past.map(renderCard) : (
            <p className="text-gray-500">No past projects yet.</p>
          )}
        </div>
      </section>

      {/* Create */}
      <CreateProjectModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSave={createProject}
      />

      {/* Edit */}
      {toEdit && (
        <EditProjectModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          project={toEdit}
          onSave={saveEdit}
        />
      )}

      {/* Delete */}
      {toDelete && (
        <ConfirmDeleteDialog
          open={deleteOpen}
          onClose={() => setDeleteOpen(false)}
          title={toDelete.title}
          onConfirm={() => deleteProject(toDelete)}
        />
      )}
    </div>
  );
}
