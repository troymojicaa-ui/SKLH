// Simple mock you can replace with your backend later

export type EventItem = {
  id: string;
  title: string;
  date: string;       // ISO
  start: string;      // '08:00 AM'
  end: string;        // '12:00 PM'
  mode: "In-person" | "Online";
  category?: string;
  location: string;
  cover?: string;
  speakers?: string[];
  excerpt?: string;
};

export type DaySchedule = {
  id: string;
  label: string; // e.g., "Friday 12 Feb"
  items: Array<{
    time: string;
    title: string;
    mode: "In-person" | "Online";
    speaker: string;
    location: string;
  }>;
};

export const featuredEvents: EventItem[] = [
  {
    id: "fe1",
    title: "Event title heading",
    date: "2025-02-10",
    start: "08:00 AM",
    end: "12:00 PM",
    mode: "In-person",
    location: "Loyola Heights Gym",
    speakers: ["Juan Dela Cruz", "Amy Tan", "Jane Doe"],
    excerpt:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse varius enim in eros elementum tristique.",
    cover:
      "https://images.unsplash.com/photo-1526948128573-703ee1aeb6fa?q=80&w=1600&auto=format&fit=crop",
  },
  {
    id: "fe2",
    title: "Barangay Town Hall",
    date: "2025-02-17",
    start: "04:00 PM",
    end: "06:00 PM",
    mode: "In-person",
    location: "Barangay Hall",
    speakers: ["SK Council"],
    excerpt:
      "Community updates and open forum. Bring your questions and suggestions.",
    cover:
      "https://images.unsplash.com/photo-1515165562835-c3b8c2360d4a?q=80&w=1600&auto=format&fit=crop",
  },
];

export const allEvents: EventItem[] = [
  {
    id: "e1",
    title: "Event title heading",
    date: "2025-02-10",
    start: "08:00 AM",
    end: "12:00 PM",
    mode: "In-person",
    category: "Category one",
    location: "Loyola Heights Court",
    cover:
      "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=1600&auto=format&fit=crop",
    excerpt:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse varius enim in eros.",
  },
  {
    id: "e2",
    title: "Event title heading",
    date: "2025-02-11",
    start: "09:00 AM",
    end: "12:00 PM",
    mode: "In-person",
    category: "Category two",
    location: "SK Function Room",
    cover:
      "https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=1600&auto=format&fit=crop",
    excerpt:
      "Suspendisse varius enim in eros elementum tristique. Duis cursus, mi quis viverra ornare.",
  },
  {
    id: "e3",
    title: "Event title heading",
    date: "2025-02-12",
    start: "01:00 PM",
    end: "03:00 PM",
    mode: "In-person",
    category: "Category three",
    location: "Barangay Hall",
    cover:
      "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=1600&auto=format&fit=crop",
    excerpt:
      "Integer non nulla quis elit cursus imperdiet. Aenean faucibus nibh et justo cursus.",
  },
];

export const categories = [
  "All",
  "Category one",
  "Category two",
  "Category three",
  "Category four",
];

export const schedule: DaySchedule[] = [
  {
    id: "d1",
    label: "Friday 12 Feb",
    items: [
      {
        time: "08:00 am",
        title: "Event title heading",
        mode: "In-person",
        speaker: "Speaker",
        location: "Location",
      },
      {
        time: "09:00 am",
        title: "Event title heading",
        mode: "Online",
        speaker: "Speaker",
        location: "Location",
      },
      {
        time: "10:00 am",
        title: "Event title heading",
        mode: "Online",
        speaker: "Speaker",
        location: "Location",
      },
    ],
  },
  {
    id: "d2",
    label: "Saturday 24 Feb",
    items: [
      {
        time: "09:00 am",
        title: "Youth orientation",
        mode: "In-person",
        speaker: "Council",
        location: "Hall",
      },
    ],
  },
  {
    id: "d3",
    label: "Saturday 25 Feb",
    items: [
      {
        time: "01:00 pm",
        title: "Leadership 101",
        mode: "Online",
        speaker: "Guest",
        location: "Zoom",
      },
    ],
  },
];
