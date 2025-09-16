import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useParams, useNavigate } from "react-router-dom";
import { projectMock } from "@/data/projectMock";
import { format } from "date-fns";

export default function PublicProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const project = projectMock.find((p) => String(p.id) === String(id));

  if (!project) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <main className="max-w-4xl mx-auto px-4 py-20 text-center">
          <p className="text-gray-600">Project not found.</p>
          <button
            className="mt-6 rounded-md border px-4 py-2"
            onClick={() => navigate("/projects")}
          >
            Back to Projects
          </button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="max-w-4xl mx-auto px-4 pt-10 pb-24">
        {/* Breadcrumb-like small caption on desktop mock reads “Our Projects” */}
        <p className="text-sm text-gray-600">Our Projects</p>

        <h1 className="mt-2 text-center text-[28px] sm:text-[32px] font-medium">
          {project.title}
        </h1>
        <p className="mt-1 text-center text-xs text-gray-500">
          {format(new Date(project.date), "MMMM dd, yyyy")}
        </p>

        {/* Big hero image */}
        <div className="mt-8 overflow-hidden rounded-xl ring-1 ring-gray-200 shadow-sm">
          <div className="aspect-[16/9] w-full bg-gray-200">
            <img
              src={project.image || "https://via.placeholder.com/1600x900?text=Cover"}
              alt={project.title}
              className="h-full w-full object-cover"
            />
          </div>
        </div>

        {/* Body content (placeholder text to match the design) */}
        <article className="prose prose-slate max-w-none mt-8">
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Fusce varius
            faucibus massa sollicitudin amet augue. Nibh metus a semper purus mauris
            dui. Lorem eu neque, tristique quis dui. Nibh scelerisque ac adipiscing
            velit non nulla in amet pellentesque. Sit turpis pretium eget maecenas.
            Vestibulum dolor mattis consectetur eget commodo vitae.
          </p>
          <p>
            Amet pellentesque sit pulvinar lorem mi a, euismod risus rhoncus.
            Elementum ullamcorper nec, habitasse vulputate. Eget dictum quis est sed
            egestas tellus, a lectus. Quam ullamcorper in fringilla arcu aliquet
            fames cras. Arcu enim, nibh lorem nec elementum eros porta. Sed
            elementum, sed dolor purus dolor. Ullamcorper nisl pulvinar vulputate
            sit sagittis in eleifend dignissim.
          </p>
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Fusce varius
            faucibus massa sollicitudin amet augue. Nibh metus a semper purus mauris
            dui. Lorem eu neque, tristique quis dui. Nibh scelerisque ac adipiscing
            velit non nulla in amet pellentesque. Sit turpis pretium eget maecenas.
            Vestibulum dolor mattis consectetur eget commodo vitae.
          </p>
          <p>
            Amet pellentesque sit pulvinar lorem mi a, euismod risus rhoncus.
            Elementum ullamcorper nec, habitasse vulputate. Eget dictum quis est sed
            egestas tellus, a lectus. Quam ullamcorper in fringilla arcu aliquet
            fames cras. Arcu enim, nibh lorem nec elementum eros porta. Sed
            elementum, sed dolor purus dolor. Ullamcorper nisl pulvinar vulputate
            sit sagittis in eleifend dignissim.
          </p>
        </article>
      </main>

      <Footer />
    </div>
  );
}
