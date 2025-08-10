import { useMemo, useState } from "react";
import { projectMock } from "@/data/projectMock";
import type { Project } from "@/data/projectMock"; // ✅ Your Admin-side Project type
import { format, isAfter, addHours } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import ProjectModal, { type ModalProject } from "@/components/projects/ProjectModal";

type Counts = { joining: number; might_go: number; not_going: number };

// --- Create Project Modal ---
function CreateProjectModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: Omit<Project, "id">) => void;
}) {
  const [form, setForm] = useState<Omit<Project, "id">>({
    title: "",
    description: "",
    date: "",
    requirements: "",
    image: "",
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.title || !form.date || !form.description) {
      alert("Please fill in title, description, and date.");
      return;
    }
    setSaving(true);
    try {
      await new Promise((r) => setTimeout(r, 150)); // small UX delay
      onSave(form);
      onClose();
      setForm({ title: "", description: "", date: "", requirements: "", image: "" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? onClose() : null)}>
      <DialogContent className="max-w-lg bg-white">
        <DialogHeader>
          <DialogTitle>Create Project</DialogTitle>
          <DialogDescription>Fill out the details below and click Save to add a new project.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <label className="text-sm">
            Title
            <input
              className="mt-1 w-full border rounded p-2"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g., Feeding Program"
            />
          </label>

          <label className="text-sm">
            Description
            <textarea
              className="mt-1 w-full border rounded p-2 min-h-[100px]"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Short details about the project…"
            />
          </label>

          <label className="text-sm">
            Date
            <input
              type="date"
              className="mt-1 w-full border rounded p-2"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            />
          </label>

          <label className="text-sm">
            Requirements (optional)
            <input
              className="mt-1 w-full border rounded p-2"
              value={form.requirements}
              onChange={(e) => setForm((f) => ({ ...f, requirements: e.target.value }))}
              placeholder="What to bring or prepare"
            />
          </label>

          <label className="text-sm">
            Image URL (optional)
            <input
              className="mt-1 w-full border rounded p-2"
              value={form.image}
              onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))}
              placeholder="https://…"
            />
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const Projects = () => {
  const [projects, setProjects] = useState<Project[]>(projectMock);

  // Per-project status counts (admin can view them in the modal)
  const [countsById, setCountsById] = useState<Record<string, Counts>>(() => {
    const seed: Record<string, Counts> = {};
    projectMock.forEach((p) => {
      seed[String(p.id)] = { joining: 0, might_go: 0, not_going: 0 };
    });
    return seed;
  });

  // Selected project for modal
  const [selected, setSelected] = useState<Project | null>(null);

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);

  const addProject = (data: Omit<Project, "id">) => {
    const newEntry: Project = { id: Date.now(), ...data };
    setProjects((prev) => [newEntry, ...prev]);
    setCountsById((prev) => ({
      ...prev,
      [String(newEntry.id)]: { joining: 0, might_go: 0, not_going: 0 },
    }));
  };

  const upcomingProjects = useMemo(
    () => projects.filter((p) => isAfter(new Date(p.date), new Date())),
    [projects]
  );
  const pastProjects = useMemo(
    () => projects.filter((p) => !isAfter(new Date(p.date), new Date())),
    [projects]
  );

  // Adapter: Admin Project -> ModalProject (adds end_at = start + 2h)
  const toModalProject = (p: Project): ModalProject => {
    const start = new Date(p.date);
    const end = addHours(start, 2);
    return {
      id: String(p.id),
      title: p.title,
      description: p.description,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      cover_url: p.image || undefined,
      counts: countsById[String(p.id)],
    };
  };

  const renderProjectCard = (project: Project) => (
    <div
      key={project.id}
      className="bg-white rounded shadow-md overflow-hidden"
    >
      <img
        src={project.image || "https://via.placeholder.com/400x200"}
        alt={project.title}
        className="w-full h-48 object-cover"
      />
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-semibold">{project.title}</h3>
          <div className="flex gap-1">
            <Badge variant="secondary" className="text-[11px]">
              Joining: {countsById[String(project.id)]?.joining ?? 0}
            </Badge>
            <Badge variant="outline" className="text-[11px]">
              Might go: {countsById[String(project.id)]?.might_go ?? 0}
            </Badge>
            <Badge variant="destructive" className="text-[11px]">
              Not going: {countsById[String(project.id)]?.not_going ?? 0}
            </Badge>
          </div>
        </div>

        <p className="text-sm text-gray-600">{project.description}</p>
        <p className="text-sm text-gray-500">
          📅 {format(new Date(project.date), "MMMM dd, yyyy")}
        </p>
        {project.requirements && (
          <p className="text-sm text-gray-700">
            Requirements: {project.requirements}
          </p>
        )}

        <div className="pt-2">
          <Button size="sm" onClick={() => setSelected(project)}>
            View / Manage
          </Button>
        </div>
      </div>
    </div>
  );

  // Add Project card (same size & grid behavior as a normal card)
  const AddProjectCard = (
    <button
      onClick={() => setCreateOpen(true)}
      className="bg-white rounded shadow-md border-dashed border-2 border-blue-200 hover:border-blue-400 transition grid place-items-center h-full"
      style={{ minHeight: 0 }}
      aria-label="Add project"
    >
      <div className="flex flex-col items-center justify-center w-full">
        <div className="w-full h-48 grid place-items-center bg-gradient-to-b from-blue-50 to-white">
          <Plus className="w-12 h-12 text-blue-600" />
        </div>
        <div className="p-4 w-full text-center">
          <span className="text-sm text-blue-700 font-medium">Add Project</span>
        </div>
      </div>
    </button>
  );

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Manage Projects</h1>
        <Badge variant="secondary">Admin</Badge>
      </div>

      {/* Upcoming Projects */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold">Upcoming Projects</h2>
          <Button size="sm" onClick={() => setCreateOpen(true)}>New Project</Button>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Add project tile FIRST */}
          {AddProjectCard}
          {upcomingProjects.length > 0 ? (
            upcomingProjects.map(renderProjectCard)
          ) : (
            <p className="text-gray-500">No upcoming projects yet.</p>
          )}
        </div>
      </section>

      {/* Past Projects */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Past Projects</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {pastProjects.length > 0 ? (
            pastProjects.map(renderProjectCard)
          ) : (
            <p className="text-gray-500">No past projects yet.</p>
          )}
        </div>
      </section>

      {/* Admin modal (controls via role='admin') */}
      {selected && (
        <ProjectModal
          project={toModalProject(selected)}
          role="admin"
          isAuthenticated={true}
          onClose={() => setSelected(null)}
        />
      )}

      {/* Create Project modal */}
      <CreateProjectModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSave={addProject}
      />
    </div>
  );
};

export default Projects;
