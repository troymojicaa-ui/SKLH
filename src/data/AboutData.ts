// src/data/AboutData.ts

export let aboutData = {
  heroImage: "/images/hero.jpg", // use actual photo path here
  heroSubtitle: "Empowering youth for a brighter tomorrow.",
  mission:
    "Our mission is to inspire and empower young individuals through leadership, service, and community-driven projects.",
  team: [
    { name: "Juan Dela Cruz", role: "Chairman" },
    { name: "Maria Santos", role: "Vice Chairman" },
    { name: "Pedro Lopez", role: "Secretary" },
    { name: "Ana Reyes", role: "Treasurer" },
    { name: "Carlos Garcia", role: "Auditor" },
    { name: "Sophia Mendoza", role: "PRO" },
  ],
};

// Simple update function for temporary demo
export function updateAboutData(newData: typeof aboutData) {
  aboutData = newData;
}
