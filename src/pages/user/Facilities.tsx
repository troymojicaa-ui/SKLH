// src/pages/user/Facilities.tsx
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { MapPin, Clock, Building2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

/** Raw DB row (very flexible) */
type DbFacility = Record<string, any>;

type Facility = {
  id: string;
  name: string;
  location: string;
  images: string[];
  openNow: boolean;
  statusText: string; // "Open • Closes …" / "Closed • Opens …" / "Hours not set"
  note?: string | null;
};

/* ---------- small utils ---------- */
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const toMin = (h: number, m: number) => h * 60 + m;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

const parseHHMM = (t?: string | null) => {
  if (!t) return null;
  const m = /^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/i.exec(String(t).trim());
  if (!m) return null;
  return { hh: clamp(+m[1], 0, 23), mm: clamp(+m[2], 0, 59) };
};
const fmtTime = (x: { hh: number; mm: number }) =>
  `${(((x.hh + 11) % 12) + 1)}:${String(x.mm).padStart(2, "0")} ${x.hh < 12 ? "AM" : "PM"}`;

const normalizeDayList = (days: any): Set<string> => {
  if (!days) return new Set();
  // days can be array, comma string, or JSON string
  let arr: string[] = [];
  if (Array.isArray(days)) arr = days as string[];
  else {
    try {
      const parsed = JSON.parse(days as string);
      if (Array.isArray(parsed)) arr = parsed;
    } catch {
      arr = String(days).split(/[,\s]+/);
    }
  }
  return new Set(arr.map((d) => (d || "").slice(0, 3).toLowerCase()));
};

function deriveOpenStatus(
  days: Set<string>,
  start: { hh: number; mm: number } | null,
  end: { hh: number; mm: number } | null,
  now = new Date()
) {
  if (!start || !end || days.size === 0)
    return { openNow: false, label: "Hours not set" };

  const today = DAY_LABELS[now.getDay()].toLowerCase();
  if (!days.has(today)) return { openNow: false, label: "Closed" };

  const cur = toMin(now.getHours(), now.getMinutes());
  const s = toMin(start.hh, start.mm);
  const e = toMin(end.hh, end.mm);
  const openNow = s <= e ? cur >= s && cur < e : cur >= s || cur < e;

  if (openNow) return { openNow: true, label: `Open • Closes ${fmtTime(end)}` };
  return { openNow: false, label: `Closed • Opens ${fmtTime(start)}` };
}

/* ---------- image helpers ---------- */
const BUCKETS_TO_TRY = ["facility-photos", "facilities", "public"];

function publicUrlFromAnyBucket(path: string) {
  for (const bucket of BUCKETS_TO_TRY) {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    if (data?.publicUrl) return data.publicUrl;
  }
  return "";
}

function safeParse<T = any>(v: any): T | null {
  try {
    return JSON.parse(v as string) as T;
  } catch {
    return null;
  }
}

/** Build public URLs from whatever media fields are available */
function extractImageUrls(row: DbFacility): string[] {
  // Already-absolute URLs (arrays)
  const arrCandidates = [
    row.photo_urls,
    row.photos,
    row.images,
    row.gallery,
    row.media,
  ].filter(Boolean);

  for (const c of arrCandidates) {
    // Might already be an array or a JSON-encoded array
    const arr = Array.isArray(c) ? c : safeParse<any[]>(c);
    if (Array.isArray(arr) && arr.length) {
      // Could be array of strings or array of objects {url|path}
      const urls = arr
        .map((it) => {
          if (typeof it === "string") return it;
          if (it && typeof it === "object") {
            if (it.url) return it.url as string;
            if (it.path) return publicUrlFromAnyBucket(String(it.path));
          }
          return "";
        })
        .filter(Boolean);
      if (urls.length) return urls.slice(0, 10);
    }
  }

  // Storage paths arrays
  const pathArrays = [row.photo_paths, row.image_paths, row.photos_paths].filter(Boolean);
  for (const p of pathArrays) {
    const arr = Array.isArray(p) ? p : safeParse<string[]>(p);
    if (Array.isArray(arr) && arr.length) {
      const urls = arr.map((path) => publicUrlFromAnyBucket(String(path))).filter(Boolean);
      if (urls.length) return urls.slice(0, 10);
    }
  }

  // Single URL fallbacks
  const singles = [row.cover_url, row.image_url, row.main_image_url, row.primary_photo, row.photo]
    .map((x) => (x ? String(x) : ""))
    .filter(Boolean);
  if (singles.length) return [singles[0]];

  return [];
}

/* ---------- Page ---------- */
export default function Facilities() {
  const [list, setList] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        // Try your known table first. If it doesn't exist, we'll surface the error.
        const { data, error } = await supabase
          .from("facilities")
          .select("*")
          .order("name", { ascending: true });
        if (error) throw error;

        const rows = (data as DbFacility[] | null) ?? [];
        const now = new Date();

        const mapped: Facility[] = rows.map((row) => {
          // Names
          const name =
            String(
              row.name ??
                row.title ??
                row.facility_name ??
                "Untitled facility"
            );

          // Location variations
          const location =
            String(
              row.location ??
                row.address ??
                row.address_line ??
                row.addressLine ??
                row.site_address ??
                "—"
            );

          // Hours variations
          const days = normalizeDayList(row.open_days ?? row.openDays ?? row.days_open ?? row.daysOpen);
          const s =
            parseHHMM(row.open_time_start ?? row.openTimeStart ?? row.opening_time ?? row.start_time);
          const e =
            parseHHMM(row.open_time_end ?? row.openTimeEnd ?? row.closing_time ?? row.end_time);

          const { openNow, label } = deriveOpenStatus(days, s, e, now);

          return {
            id: String(row.id ?? crypto.randomUUID()),
            name,
            location,
            images: extractImageUrls(row),
            openNow,
            statusText: label,
            note: row.description ?? row.note ?? null,
          };
        });

        setList(mapped);
      } catch (e: any) {
        console.error(e);
        setErr(e?.message ?? "Failed to load facilities.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // In case you re-add filtering later
  const items = useMemo(() => list, [list]);

  return (
    <div className="mx-auto w-full max-w-md px-4 py-6">
      {/* Header – simple */}
      <h1 className="mb-4 text-3xl font-bold tracking-tight text-slate-800">Facilities</h1>

      {/* States */}
      {loading && <Card className="p-4 text-sm text-muted-foreground">Loading…</Card>}
      {err && !loading && <Card className="p-4 text-sm text-red-600">{err}</Card>}

      {/* List */}
      {!loading && !err && (
        <div className="space-y-6">
          {items.map((f) => {
            const cover = f.images[0] || "";
            return (
              <Card
                key={f.id}
                className="overflow-hidden rounded-2xl border bg-white shadow-md ring-1 ring-black/5"
              >
                {/* Top image */}
                {cover ? (
                  <div className="h-40 w-full overflow-hidden">
                    <img
                      src={cover}
                      alt={f.name}
                      className="h-full w-full rounded-b-none object-cover"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="flex h-40 w-full items-center justify-center bg-gray-100 text-xs text-muted-foreground">
                    <Building2 className="mr-1 h-4 w-4 text-gray-400" />
                    No photo
                  </div>
                )}

                {/* Content */}
                <div className="p-4">
                  <h2 className="text-[15px] font-semibold text-slate-800">{f.name}</h2>

                  <div className="mt-2 flex items-center gap-2 text-[13px] text-slate-600">
                    <MapPin className="h-4 w-4 text-rose-500" />
                    <span className="leading-none">{f.location}</span>
                  </div>

                  <div className="mt-2 flex items-center gap-2 text-[13px]">
                    <Clock className={`h-4 w-4 ${f.openNow ? "text-emerald-600" : "text-rose-500"}`} />
                    <span className={`${f.openNow ? "text-emerald-700" : "text-rose-600"} leading-none`}>
                      {f.statusText}
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <div className="h-6" />
    </div>
  );
}
