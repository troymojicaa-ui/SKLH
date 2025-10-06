// src/pages/user/Facilities.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card } from "@/components/ui/card";
import { MapPin, Clock, ChevronLeft, ChevronRight, X, Building2 } from "lucide-react";

type Facility = {
  id: string;
  name: string;
  description: string | null;
  facility_photos?: { url: string | null; sort_order: number | null }[];
  facility_hours?: { dow: number; open_time: string | null; close_time: string | null }[];
};

type HoursDay = { open?: string | null; close?: string | null; closed?: boolean | null };
type Hours = Partial<Record<"sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat", HoursDay>>;
const DAY_KEYS: Array<keyof Hours> = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function buildHoursFromRows(rows: Facility["facility_hours"] | undefined): Hours | null {
  if (!rows || rows.length === 0) return null;
  const out: Hours = {};
  for (const r of rows) {
    const key = DAY_KEYS[r.dow as 0 | 1 | 2 | 3 | 4 | 5 | 6];
    if (!key) continue;
    const open = r.open_time ? r.open_time.slice(0, 5) : null;
    const close = r.close_time ? r.close_time.slice(0, 5) : null;
    out[key] = { open, close, closed: !(open && close) };
  }
  return out;
}
function hasAnyHours(h?: Hours | null) {
  if (!h) return false;
  return Object.values(h).some((d) => d && (d.closed === false || (!!d.open && !!d.close)));
}
function photosFrom(f?: Facility): string[] {
  const arr = (f?.facility_photos ?? [])
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((p) => (p.url || "").trim())
    .filter(Boolean);
  return Array.from(new Set(arr));
}

/* ---------- Carousel ---------- */
function PhotoCarousel({ images, className = "" }: { images: string[]; className?: string }) {
  const [idx, setIdx] = useState(0);
  const wrap = (n: number) => (images.length ? (n + images.length) % images.length : 0);
  const go = (delta: number) => setIdx((i) => wrap(i + delta));

  const startX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => (startX.current = e.touches[0].clientX);
  const onTouchEnd = (e: React.TouchEvent) => {
    if (startX.current == null) return;
    const dx = e.changedTouches[0].clientX - startX.current;
    if (Math.abs(dx) > 40) go(dx < 0 ? +1 : -1);
    startX.current = null;
  };

  if (images.length === 0) {
    return (
      <div className={`grid place-items-center bg-slate-100 text-slate-500 rounded-lg ${className}`}>
        No photos
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-black/5 ${className}`}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <img src={images[idx]} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
      {images.length > 1 && (
        <>
          <button
            aria-label="Previous photo"
            onClick={() => go(-1)}
            className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 hover:bg-white p-2 shadow"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            aria-label="Next photo"
            onClick={() => go(1)}
            className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 hover:bg-white p-2 shadow"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
            {images.map((_, i) => (
              <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === idx ? "bg-white" : "bg-white/60"}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- Fullscreen View ---------- */
function FacilityFullView({ facility, onClose }: { facility: Facility; onClose: () => void }) {
  const images = useMemo(() => photosFrom(facility), [facility]);
  const hours = useMemo(() => buildHoursFromRows(facility?.facility_hours), [facility]);

  return (
    <div className="fixed inset-0 z-50 bg-white">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute right-3 top-3 rounded-full bg-white shadow p-2 hover:bg-slate-50"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 pt-14 pb-4 overflow-y-auto h-full">
        <h2 className="text-xl sm:text-2xl font-semibold">{facility.name}</h2>
        {facility.description ? <p className="mt-1 text-slate-600">{facility.description}</p> : null}

        <PhotoCarousel images={images} className="mt-4 h-64 sm:h-80" />

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2 font-medium">
              <MapPin className="h-4 w-4 text-slate-600" />
              Location
            </div>
            <p className="mt-1 text-sm text-slate-700 break-words">—</p>
          </div>

          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2 font-medium">
              <Clock className="h-4 w-4 text-slate-600" />
              Weekly Hours
            </div>

            {hasAnyHours(hours) ? (
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-y-2 text-sm">
                {DAY_LABELS.map((lbl, i) => {
                  const key = DAY_KEYS[i];
                  const d = hours?.[key];
                  const val = !d || d.closed || (!d.open && !d.close) ? "Closed" : `${d.open} – ${d.close}`;
                  return (
                    <div key={lbl} className="flex items-center justify-between px-1">
                      <span className="text-slate-600">{lbl}</span>
                      <span className={val === "Closed" ? "text-rose-600" : "text-slate-800"}>{val}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-500 mt-1">Hours not set</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Page ---------- */
export default function Facilities() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [active, setActive] = useState<Facility | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const { data, error } = await supabase
        .from("facilities")
        .select(
          `
          id, name, description,
          facility_photos:facility_photos(url, sort_order),
          facility_hours:facility_hours(dow, open_time, close_time)
        `
        )
        .order("name", { ascending: true });
      if (error) throw error;
      setFacilities((data ?? []) as Facility[]);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load facilities.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const ch1 = supabase
      .channel("rt-facilities")
      .on("postgres_changes", { event: "*", schema: "public", table: "facilities" }, load)
      .subscribe();
    const ch2 = supabase
      .channel("rt-facility-photos")
      .on("postgres_changes", { event: "*", schema: "public", table: "facility_photos" }, load)
      .subscribe();
    const ch3 = supabase
      .channel("rt-facility-hours")
      .on("postgres_changes", { event: "*", schema: "public", table: "facility_hours" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch1);
      supabase.removeChannel(ch2);
      supabase.removeChannel(ch3);
    };
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <h1 className="text-2xl font-semibold mb-4">Facilities</h1>

      {loading ? (
        <Card className="p-4 text-sm text-slate-600">Loading…</Card>
      ) : err ? (
        <Card className="p-4 text-sm text-rose-600">{err}</Card>
      ) : facilities.length === 0 ? (
        <Card className="p-4 text-sm text-slate-600">No facilities yet.</Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {facilities.map((f) => {
            const imgs = photosFrom(f);
            const cover = imgs[0] ?? null;
            const hours = buildHoursFromRows(f.facility_hours);
            const hoursSet = hasAnyHours(hours);

            return (
              <Card
                key={f.id}
                className="overflow-hidden hover:shadow transition cursor-pointer"
                onClick={() => setActive(f)}
              >
                <div className="relative h-40 bg-slate-100 overflow-hidden">
                  {cover ? (
                    <img
                      src={cover}
                      alt=""
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover"
                      onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
                    />
                  ) : (
                    <div className="h-full w-full grid place-items-center text-slate-500">
                      <div className="flex flex-col items-center">
                        <Building2 className="h-6 w-6 mb-1" />
                        <span className="text-sm">No photo</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <h3 className="font-medium">{f.name ?? "Facility"}</h3>
                  <div className="mt-2 space-y-1 text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <MapPin className="h-4 w-4" />
                      <span className="truncate">—</span>
                    </div>
                    <div className={`flex items-center gap-2 ${hoursSet ? "text-slate-600" : "text-rose-600"}`}>
                      <Clock className="h-4 w-4" />
                      <span>{hoursSet ? "Hours available" : "Hours not set"}</span>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {active && <FacilityFullView facility={active} onClose={() => setActive(null)} />}
    </div>
  );
}
