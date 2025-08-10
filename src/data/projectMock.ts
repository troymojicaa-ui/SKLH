export type Project = {
  id: number;
  title: string;
  description: string;
  date: string;
  requirements?: string;
  image?: string;
};

export const projectMock: Project[] = [
  {
    id: 1,
    title: "Tree Planting Drive",
    description: "An environmental project to plant 100 trees in the barangay.",
    date: "2025-09-01",
    image: "https://via.placeholder.com/400x200",
  },
  {
    id: 2,
    title: "Youth Leadership Seminar",
    description: "Empowering youth through leadership training.",
    date: "2025-06-15",
    image: "https://via.placeholder.com/400x200",
  },
];
