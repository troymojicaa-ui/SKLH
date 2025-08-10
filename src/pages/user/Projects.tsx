import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays } from "lucide-react";
import LoginModal from "@/components/auth/LoginModal";
import ProjectModal, {
  type ParticipationStatus,
  type ModalProject as Project,
} from "@/components/projects/ProjectModal";

// ---------------------------
// Mock API (switch to real later)
// ---------------------------
const USE_MOCK = true; // set false when wiring to Django

const mockProjects: Project[] = [
  {
    id: "1",
    title: "Feeding Program",
    description: "Community feeding in Barangay 12 covered court.",
    start_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString(),
    end_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2 + 1000 * 60 * 60 * 4).toISOString(),
    cover_url: "https://images.unsplash.com/photo-1504754524776-8f4f37790ca0",
    counts: { joining: 3, might_go: 1, not_going: 0 },
  },
  {
    id: "2",
    title: "Tree Planting",
    description: "Reforestation along the riverside.",
    start_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
    end_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7 + 1000 * 60 * 60 * 3).toISOString(),
    cover_url: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c",
    counts: { joining: 7, might_go: 2, not_going: 1 },
  },
  {
    id: "3",
    title: "Cleanup Drive (Finished)",
    description: "Beach cleanup with volunteers.",
    start_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    end_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3 + 1000 * 60 * 60 * 4).toISOString(),
    cover_url: "https://images.unsplash.com/photo-1542835435-4f8bbd1f0464",
    counts: { joining: 15, might_go: 4, not_going: 3 },
  },
];

async function apiListProjects(kind: "upcoming" | "past"): Promise<Project[]> {
  if (USE_MOCK) {
    const now = new Date();
    return mockProjects
      .filter((p) => (kind === "upcoming" ? new Date(p.end_at) >= now : new Date(p.end_at) < now))
      .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
  }
  const res = await fetch(`/api/projects/${kind}/`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load projects");
  return res.json();
}

async function apiJoin(projectId: string, status: ParticipationStatus): Promise<void> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 350));
    const p = mockProjects.find((x) => x.id === projectId);
    if (!p || !p.counts) return;
    if (status === "joining") p.counts.joining += 1;
    if (status === "might_go") p.counts.might_go += 1;
    if (status === "not_going") p.counts.not_going += 1;
    return;
  }
  const res = await fetch(`/api/projects/${projectId}/join/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Failed to update participation");
}

// ---------------------------
// Project Card
// ---------------------------
function ProjectCard({ project, onClick }: { project: Project; onClick: () => void }) {
  const counts = project.counts ?? { joining: 0, might_go: 0, not_going: 0 };
  return (
    <Card className="hover:shadow cursor-pointer transition" onClick={onClick}>
      {project.cover_url && (
        <div className="aspect-video w-full overflow-hidden rounded-t-2xl">
          <img src={project.cover_url} alt="cover" className="h-full w-full object-cover" />
        </div>
      )}
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <CalendarDays className="h-4 w-4" /> {project.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
        <div className="text-xs">
          {format(new Date(project.start_at), "PPpp")} — {format(new Date(project.end_at), "PPpp")}
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Badge variant="secondary">Joining: {counts.joining}</Badge>
          <Badge variant="outline">Might go: {counts.might_go}</Badge>
          <Badge variant="destructive">Not going: {counts.not_going}</Badge>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------
// Main Page (User Projects)
// ---------------------------
export default function UserProjectsPage({
  role = "user",
  isAuthenticated = true,
}: {
  role?: "user" | "admin";
  isAuthenticated?: boolean;
}) {
  const [upcoming, setUpcoming] = useState<Project[]>([]);
  const [past, setPast] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Project | null>(null);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const [u, p] = await Promise.all([apiListProjects("upcoming"), apiListProjects("past")]);
        if (!mounted) return;
        setUpcoming(u);
        setPast(p);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
    return () => { mounted = false };
  }, []);

  const onJoined = (status: ParticipationStatus) => {
    if (!selected) return;
    const updateCounts = (proj: Project) => {
      if (proj.id !== selected.id) return proj;
      const counts = { ...(proj.counts ?? { joining: 0, might_go: 0, not_going: 0 }) };
      if (status === "joining") counts.joining += 1;
      if (status === "might_go") counts.might_go += 1;
      if (status === "not_going") counts.not_going += 1;
      return { ...proj, counts };
    };
    setUpcoming((arr) => arr.map(updateCounts));
    setPast((arr) => arr.map(updateCounts));
  };

  return (
    <div className="mx-auto max-w-6xl p-4 space-y-8">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Projects</h1>
          <p className="text-sm text-muted-foreground">Browse upcoming projects and join with one click.</p>
        </div>
        <div className="flex items-center gap-2 text-xs opacity-70">
          <Badge variant="outline">Mode: {USE_MOCK ? "Mock" : "API"}</Badge>
          <Badge variant="secondary">{role === "admin" ? "Admin" : "User"}</Badge>
          <Badge variant={isAuthenticated ? "default" : "destructive"}>
            {isAuthenticated ? "Logged in" : "Guest"}
          </Badge>
        </div>
      </header>

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming">
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading upcoming…</div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {upcoming.length === 0 && <div className="text-sm text-muted-foreground">No upcoming projects.</div>}
              {upcoming.map((p) => (
                <ProjectCard key={p.id} project={p} onClick={() => setSelected(p)} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="past">
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading past…</div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {past.length === 0 && <div className="text-sm text-muted-foreground">No past projects.</div>}
              {past.map((p) => (
                <ProjectCard key={p.id} project={p} onClick={() => setSelected(p)} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {selected && (
        <ProjectModal
          project={selected}
          role={role}
          isAuthenticated={isAuthenticated}
          onLoginRequest={() => setShowLogin(true)}
          onAction={async (status, id) => apiJoin(id, status)}
          onJoined={onJoined}
          onClose={() => setSelected(null)}
        />
      )}

      <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} role="user" />
    </div>
  );
}
