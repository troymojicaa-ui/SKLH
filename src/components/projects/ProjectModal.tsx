import React, { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Users } from "lucide-react";

export type ParticipationStatus = "joining" | "might_go" | "not_going";

export type ModalProject = {
  id: string;
  title: string;
  description?: string | null;
  start_at: string; // ISO
  end_at: string;   // ISO
  cover_url?: string | null;
  counts?: { joining: number; might_go: number; not_going: number };
};

export type Participant = {
  id: string;
  name: string;
  status: ParticipationStatus;
  note?: string | null;
};

type Props = {
  project: ModalProject;
  role?: "user" | "admin";
  /** If false, user actions disabled with a login prompt. */
  isAuthenticated?: boolean;
  onLoginRequest?: () => void;

  onClose: () => void;

  /** Called when user clicks Join/Might go/Not going. */
  onAction?: (status: ParticipationStatus, projectId: string) => Promise<void> | void;
  /** Let parent bump counts optimistically after onAction resolves. */
  onJoined?: (status: ParticipationStatus) => void;

  /** ADMIN inline management (all optional) */
  onSaveProject?: (changes: Partial<ModalProject> & { id: string }) => Promise<void> | void;
  onDeleteProject?: (projectId: string) => Promise<void> | void;

  /** Participants (admin tab). If omitted, the tab still shows but empty. */
  participants?: Participant[];
  onChangeParticipantStatus?: (
    participantId: string,
    status: ParticipationStatus
  ) => Promise<void> | void;
};

const ProjectModal: React.FC<Props> = ({
  project,
  role = "user",
  isAuthenticated = true,
  onLoginRequest,
  onClose,
  onAction,
  onJoined,
  onSaveProject,
  onDeleteProject,
  participants,
  onChangeParticipantStatus,
}) => {
  const [open, setOpen] = useState(true);
  const [busy, setBusy] = useState<ParticipationStatus | null>(null);
  const counts = project.counts ?? { joining: 0, might_go: 0, not_going: 0 };
  const isPast = useMemo(() => new Date(project.end_at) < new Date(), [project.end_at]);


  const disabledForGuest = role === "user" && !isAuthenticated;
  const disableUserActions = disabledForGuest || isPast;

  const act = async (status: ParticipationStatus) => {
    if (disabledForGuest) {
      onLoginRequest?.();
      return;
    }
    if (isPast) return;
    try {
      setBusy(status);
      if (onAction) {
        await onAction(status, project.id);
      } else {
        // Small delay for demo if no backend yet
        await new Promise((r) => setTimeout(r, 200));
      }
      onJoined?.(status);
    } catch (e) {
      console.error("ProjectModal action error:", e);
    } finally {
      setBusy(null);
    }
  };

  // ----- ADMIN: EDIT TAB -----
  const toLocalInput = (iso: string) => {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  };

  const [form, setForm] = useState({
    title: project.title,
    description: project.description ?? "",
    start_at: toLocalInput(project.start_at),
    end_at: toLocalInput(project.end_at),
    cover_url: project.cover_url ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [savedTick, setSavedTick] = useState(false);

  const saveProject = async () => {
    try {
      setSaving(true);
      const payload: Partial<ModalProject> & { id: string } = {
        id: project.id,
        title: form.title.trim(),
        description: form.description.trim(),
        start_at: new Date(form.start_at).toISOString(),
        end_at: new Date(form.end_at).toISOString(),
        cover_url: form.cover_url.trim() || undefined,
      };
      if (onSaveProject) {
        await onSaveProject(payload);
      } else {
        await new Promise((r) => setTimeout(r, 250)); // demo fallback
      }
      setSavedTick(true);
      setTimeout(() => setSavedTick(false), 1200);
    } catch (e) {
      console.error("saveProject error:", e);
    } finally {
      setSaving(false);
    }
  };

  const removeProject = async () => {
    if (!onDeleteProject) return;
    const ok = window.confirm("Delete this project? This cannot be undone.");
    if (!ok) return;
    try {
      await onDeleteProject(project.id);
      onClose(); 
    } catch (e) {
      console.error("deleteProject error:", e);
    }
  };


  const [localParticipants, setLocalParticipants] = useState<Participant[]>(
    () => participants ?? []
  );
  useEffect(() => {
    if (participants) setLocalParticipants(participants);
  }, [participants]);

  const [filter, setFilter] = useState<"all" | ParticipationStatus>("all");
  const visibleParticipants = useMemo(() => {
    return filter === "all"
      ? localParticipants
      : localParticipants.filter((p) => p.status === filter);
  }, [localParticipants, filter]);

  const changeParticipant = async (pid: string, status: ParticipationStatus) => {
    try {
      if (onChangeParticipantStatus) {
        await onChangeParticipantStatus(pid, status);
      } else {

        setLocalParticipants((arr) =>
          arr.map((p) => (p.id === pid ? { ...p, status } : p))
        );
      }
    } catch (e) {
      console.error("changeParticipant error:", e);
    }
  };


  const Overview = (
    <div className="space-y-4">
      {/* Notices */}
      {disabledForGuest && (
        <div className="rounded-md border p-3 text-xs">
          You need to{" "}
          <a
            href="#login"
            className="underline text-primary hover:opacity-90"
            onClick={(e) => {
              e.preventDefault();
              onLoginRequest?.();
            }}
          >
            log in
          </a>{" "}
          to join or mark your status.
        </div>
      )}
      {isPast && role === "user" && (
        <div className="rounded-md border p-3 text-xs">
          This project has already ended. Status updates are closed.
        </div>
      )}

      {/* Counts */}
      <div>
        <div className="text-sm mb-2">Status counts</div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="secondary">Joining: {counts.joining}</Badge>
          <Badge variant="outline">Might go: {counts.might_go}</Badge>
          <Badge variant="destructive">Not going: {counts.not_going}</Badge>
        </div>
      </div>

      {/* Actions */}
      {role === "user" ? (
        <div className="flex gap-2 pt-1">
          <Button disabled={!!busy || disableUserActions} onClick={() => act("joining")} aria-disabled={disableUserActions}>
            {busy === "joining" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Join"}
          </Button>
          <Button variant="secondary" disabled={!!busy || disableUserActions} onClick={() => act("might_go")} aria-disabled={disableUserActions}>
            {busy === "might_go" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Might go"}
          </Button>
          <Button variant="ghost" disabled={!!busy || disableUserActions} onClick={() => act("not_going")} aria-disabled={disableUserActions}>
            {busy === "not_going" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Not going"}
          </Button>
        </div>
      ) : (
        <div className="rounded border p-3 text-xs text-muted-foreground">
          Admin view: use the <b>Participants</b> or <b>Edit</b> tabs to manage this project.
        </div>
      )}
    </div>
  );

  const ParticipantsTab = (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm">Filter:</span>
        <div className="flex gap-2">
          {(["all", "joining", "might_go", "not_going"] as const).map((k) => (
            <Button
              key={k}
              size="sm"
              variant={filter === k ? "default" : "outline"}
              onClick={() => setFilter(k)}
            >
              {k === "all" ? "All" : k.replace("_", " ")}
            </Button>
          ))}
        </div>
        <div className="ml-auto text-xs text-muted-foreground">
          Total: {visibleParticipants.length}
        </div>
      </div>

      <div className="rounded border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/30">
            <tr>
              <th className="text-left p-2">Name</th>
              <th className="text-left p-2">Status</th>
              <th className="text-left p-2">Note</th>
              <th className="text-right p-2 w-40">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleParticipants.length === 0 && (
              <tr>
                <td className="p-3 text-xs text-muted-foreground" colSpan={4}>
                  No participants yet.
                </td>
              </tr>
            )}
            {visibleParticipants.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-2">{p.name}</td>
                <td className="p-2 capitalize">{p.status.replace("_", " ")}</td>
                <td className="p-2">{p.note ?? "—"}</td>
                <td className="p-2">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => changeParticipant(p.id, "joining")}>
                      Set Joining
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => changeParticipant(p.id, "might_go")}>
                      Might go
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => changeParticipant(p.id, "not_going")}>
                      Not going
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const EditTab = (
    <div className="space-y-4">
      <div className="grid gap-3">
        <label className="text-sm">
          Title
          <input
            className="mt-1 w-full border rounded p-2"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
        </label>

        <label className="text-sm">
          Description
          <textarea
            className="mt-1 w-full border rounded p-2 min-h-[100px]"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="text-sm">
            Start
            <input
              type="datetime-local"
              className="mt-1 w-full border rounded p-2"
              value={form.start_at}
              onChange={(e) => setForm((f) => ({ ...f, start_at: e.target.value }))}
            />
          </label>
          <label className="text-sm">
            End
            <input
              type="datetime-local"
              className="mt-1 w-full border rounded p-2"
              value={form.end_at}
              onChange={(e) => setForm((f) => ({ ...f, end_at: e.target.value }))}
            />
          </label>
        </div>

        <label className="text-sm">
          Cover URL
          <input
            className="mt-1 w-full border rounded p-2"
            value={form.cover_url}
            onChange={(e) => setForm((f) => ({ ...f, cover_url: e.target.value }))}
          />
        </label>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {savedTick ? "Saved ✓" : "Make changes then click Save"}
        </div>
        <div className="flex gap-2">
          {onDeleteProject && (
            <Button variant="destructive" onClick={removeProject}>
              Delete
            </Button>
          )}
          <Button onClick={saveProject} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl bg-white">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Users className="h-5 w-5" /> {project.title}
          </DialogTitle>
          {/* Keep DialogDescription inline-only (renders a <p>) */}
          <DialogDescription>
            {project.description}
          </DialogDescription>
          {/* Block-level date info outside the <p> to avoid nesting issues */}
          <div className="mt-2 text-xs text-muted-foreground">
            {format(new Date(project.start_at), "PPpp")} — {format(new Date(project.end_at), "PPpp")}
          </div>
        </DialogHeader>

        {/* Tabs appear only for admin; users see Overview only */}
        {role === "admin" ? (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="participants">Participants</TabsTrigger>
              <TabsTrigger value="edit">Edit</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">{Overview}</TabsContent>
            <TabsContent value="participants">{ParticipantsTab}</TabsContent>
            <TabsContent value="edit">{EditTab}</TabsContent>
          </Tabs>
        ) : (
          <div>{Overview}</div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ProjectModal;

