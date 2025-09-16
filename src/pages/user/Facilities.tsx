// src/pages/user/Facilities.tsx
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MapPin, Clock } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

/** DB row shape (matches the SQL we created) */
type DbFacility = {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  open_days: string[] | null;           // e.g. ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
  open_time_start: string | null;       // 'HH:MM' or 'HH:MM:SS'
  open_time_end: string | null;         // 'HH:MM' or 'HH:MM:SS'
  photo_urls: string[] | null;          // direct public URLs (optional)
  photo_paths: string[] | null;         // storage paths (optional)
};

/** UI model */
type Facility = {
  id: string;
  name: string;
  location: string;
  hoursLabel: string;
  openNow: boolean;
  images: string[];
  note?: string | null;
};

/* ---------- helpers ---------- */
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const normalizeDayList = (days: string[] | null | undefined) =>
  new Set((days ?? []).map((d) => (d || "").slice(0, 3).toLowerCase()));

const parseTimeHHMM = (t?: string | null) => {
  if (!t) return null;
  const m = /^(\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/.exec(t.trim());
  if (!m) return null;
  return {
    hh: Math.min(23, Math.max(0, +m[1])),
    mm: Math.min(59, Math.max(0, +m[2])),
  };
};

const toMin = (h: number, m: number) => h * 60 + m;

function isNowOpen(days: Set<string>, start: any, end: any, now = new Date()) {
  if (!start || !end || days.size === 0) return false;
  const today = DAY_LABELS[now.getDay()].toLowerCase();
  if (!days.has(today)) return false;
  const cur = toMin(now.getHours(), now.getMinutes());
  const s = toMin(start.hh, start.mm);
  const e = toMin(end.hh, end.mm);
  // support overnight ranges (e.g. 22:00–02:00)
  return s <= e ? cur >= s && cur < e : cur >= s || cur < e;
}

function formatHours(days: Set<string>, start: any, end: any) {
  if (!start || !end || days.size === 0) return "Hours not set";
  const fmt = (x: any) =>
    `${(((x.hh + 11) % 12) + 1)}:${String(x.mm).padStart(2, "0")} ${
      x.hh < 12 ? "AM" : "PM"
    }`;
  const list = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    .filter((d) => days.has(d.toLowerCase()))
    .join(" • ");
  return `${list} — ${fmt(start)} to ${fmt(end)}`;
}

function toPublicUrls(row: DbFacility) {
  // Prefer explicit public URLs if present
  if (row.photo_urls?.length) return row.photo_urls.slice(0, 10);
  // Else build public URLs from storage paths
  if (row.photo_paths?.length)
    return row.photo_paths
      .slice(0, 10)
      .map(
        (p) =>
          supabase.storage.from("facility-photos").getPublicUrl(p).data
            .publicUrl
      )
      .filter(Boolean) as string[];
  return [];
}

/* ---------- Page ---------- */
export default function Facilities() {
  const [query, setQuery] = useState("");
  const [list, setList] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const { data, error } = await supabase
          .from("facilities")
          .select(
            `
            id, name, description, location,
            open_days, open_time_start, open_time_end,
            photo_urls, photo_paths
          `
          )
          .order("name", { ascending: true });

        if (error) throw error;

        const now = new Date();
        const mapped = (data as DbFacility[] | null | undefined)?.map((row) => {
          const days = normalizeDayList(row.open_days);
          const s = parseTimeHHMM(row.open_time_start);
          const e = parseTimeHHMM(row.open_time_end);
          return {
            id: row.id,
            name: row.name,
            location: row.location ?? "—",
            hoursLabel: formatHours(days, s, e),
            openNow: isNowOpen(days, s, e, now),
            images: toPublicUrls(row),
            note: row.description,
          } as Facility;
        }) ?? [];

        setList(mapped);
      } catch (e: any) {
        console.error(e);
        setErr(e?.message ?? "Failed to load facilities.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const t = query.trim().toLowerCase();
    if (!t) return list;
    return list.filter(
      (f) =>
        f.name.toLowerCase().includes(t) ||
        f.location.toLowerCase().includes(t) ||
        (f.note ?? "").toLowerCase().includes(t)
    );
  }, [query, list]);

  return (
    <div className="mx-auto w-full max-w-2xl">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-xl font-semibold">Facilities</h1>
        <p className="text-sm text-muted-foreground">
          Find and view community facilities like the gym, courts, and halls.
        </p>
      </div>

      {/* Search */}
      <div className="mb-4">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, location, or note…"
        />
      </div>

      {/* States */}
      {loading && (
        <Card className="p-4 text-sm text-muted-foreground">Loading…</Card>
      )}
      {err && !loading && (
        <Card className="p-4 text-sm text-red-600">{err}</Card>
      )}

      {/* List */}
      {!loading && !err && (
        <div className="grid gap-4">
          {filtered.map((f) => (
            <Card
              key={f.id}
              className="overflow-hidden border shadow-sm hover:shadow transition"
            >
              {/* Images (swipe horizontally if many) */}
              {f.images.length > 0 ? (
                <div
                  className="w-full bg-gray-100 overflow-x-auto snap-x snap-mandatory flex"
                  style={{ scrollbarWidth: "none" }}
                >
                  {f.images.map((u, i) => (
                    <div
                      key={i}
                      className="snap-start shrink-0 w-full h-40 bg-gray-200"
                    >
                      <img
                        src={u}
                        alt={`${f.name} ${i + 1}`}
                        className="h-full w-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display =
                            "none";
                        }}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-40 w-full bg-gray-100 flex items-center justify-center text-xs text-muted-foreground">
                  No photos yet
                </div>
              )}

              {/* Content */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-base font-semibold leading-tight">
                    {f.name}
                  </h2>
                  <Badge
                    className={
                      f.openNow
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-200 text-slate-700"
                    }
                  >
                    {f.openNow ? "Open" : "Closed"}
                  </Badge>
                </div>

                <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{f.location}</span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{f.hoursLabel}</span>
                </div>

                {f.note && <p className="mt-3 text-sm text-gray-700">{f.note}</p>}

                <div className="mt-4 flex gap-2">
                  <Button className="bg-sky-600 hover:bg-sky-700" disabled>
                    Request Booking (soon)
                  </Button>
                  <Button variant="outline" disabled>
                    View Details
                  </Button>
                </div>
              </div>
            </Card>
          ))}

          {filtered.length === 0 && (
            <Card className="p-4 text-sm text-muted-foreground">
              No facilities match “{query}”.
            </Card>
          )}
        </div>
      )}

      <div className="h-6" />
    </div>
  );
}
