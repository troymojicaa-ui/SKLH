import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { projectMock } from "@/data/projectMock";
import type { Project as AdminProject } from "@/data/projectMock";
import { format, addHours } from "date-fns";
import LoginModal from "@/components/auth/LoginModal";
import ProjectModal, { type ModalProject } from "@/components/projects/ProjectModal";

const ProjectShowcase = () => {
  const [selected, setSelected] = useState<ModalProject | null>(null);
  const [showLogin, setShowLogin] = useState(false);

  // Map admin/public project -> modal project shape
  const toModalProject = (p: AdminProject): ModalProject => {
    const start = new Date(p.date);
    const end = addHours(start, 2);
    return {
      id: String(p.id),
      title: p.title,
      description: p.description ?? "",
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      cover_url: p.image || undefined,
      // counts optional; modal defaults to 0s
    };
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />

      <main className="flex-1 p-6 max-w-6xl mx-auto space-y-10">
        <h1 className="text-3xl font-bold text-center">Our Projects</h1>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {projectMock.map((project) => (
            <div
              key={project.id}
              className="bg-white rounded shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition"
              onClick={() => setSelected(toModalProject(project))}
            >
              <img
                src={project.image || "https://via.placeholder.com/400x200"}
                alt={project.title}
                className="w-full h-48 object-cover"
              />
              <div className="p-4 space-y-2">
                <h3 className="text-lg font-semibold">{project.title}</h3>
                <p className="text-sm text-gray-600">{project.description}</p>
                <p className="text-sm text-gray-500">
                  📅 {format(new Date(project.date), "MMMM dd, yyyy")}
                </p>
                {project.requirements && (
                  <p className="text-sm text-gray-700">
                    Requirements: {project.requirements}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>

      <Footer />

      {/* Guest modal: actions disabled + login prompt */}
      {selected && (
        <ProjectModal
          project={selected}
          role="user"
          isAuthenticated={false}
          onLoginRequest={() => setShowLogin(true)}
          onClose={() => setSelected(null)}
        />
      )}

      <LoginModal
        isOpen={showLogin}
        onClose={() => setShowLogin(false)}
        role="user"
      />
    </div>
  );
};

export default ProjectShowcase;
