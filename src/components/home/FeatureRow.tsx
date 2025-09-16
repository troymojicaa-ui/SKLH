import { Target, Eye, Sparkles } from "lucide-react";

const features = [
  { icon: Target, title: "Mission", desc: "Short, clear statement about your mission." },
  { icon: Eye, title: "Vision", desc: "Brief description of your long-term vision." },
  { icon: Sparkles, title: "Highlight three", desc: "A third highlight to emphasize." },
];

export default function FeatureRow() {
  return (
    <section className="relative bg-gradient-to-r from-sky-600 to-sky-400 text-white">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-10 md:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="text-center">
              <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-white/15 ring-1 ring-white/20">
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-white/90">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
