import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card } from "@/components/ui/card";
import { MapPin, Clock, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useFacilities } from "@/hooks/useFacilities";
import type { Facility, FacilityHour } from "../../../hooks/useFacilities";

// export type Facility = {
//   id: string;
//   name: string;
//   description: string | null;
//   facility_photos?: { url: string | null; sort_order: number | null }[];
//   facility_hours?: { dow: number; open_time: string | null; close_time: string | null }[];
//   facility_address: { address: string; lat: number; lng: number };
// };

type HoursDay = { open?: string | null; close?: string | null; closed?: boolean | null };
type Hours = Partial<Record<"sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat", HoursDay>>;
const DAY_KEYS: Array<keyof Hours> = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function buildHoursFromRows(rows: FacilityHour[] | undefined): Hours | null {
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
  const arr = (f?.photos ?? [])
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((p) => (p.image || "").trim())
    .filter(Boolean);
  return Array.from(new Set(arr));
}

export default function Facilities() {
  // const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const navigate = useNavigate();


  const { facilities, isLoading, isError, deleteFacility, isDeleting } = useFacilities();

  // async function load() {
  //   setLoading(true);
  //   setErr(null);
  //   try {
  //     const { data, error } = await supabase
  //       .from("facilities")
  //       .select(
  //         `
  //         id, name, description,
  //         facility_photos:facility_photos(url, sort_order),
  //         facility_hours:facility_hours(dow, open_time, close_time),
  //         facility_address:facility_addresses(address, lat, lng)
  //       `
  //       )
  //       .order("name", { ascending: true });

  //     if (error) throw error;
  //     setFacilities((data ?? []) as Facility[]);
  //   } catch (e: any) {
  //     setErr(e?.message ?? "Failed to load facilities.");
  //   } finally {
  //     setLoading(false);
  //   }
  // }

  // useEffect(() => {
  //   load();
  // }, []);

  // useEffect(() => {
  //   const ch1 = supabase
  //     .channel("rt-facilities")
  //     .on("postgres_changes", { event: "*", schema: "public", table: "facilities" }, load)
  //     .subscribe();
  //   const ch2 = supabase
  //     .channel("rt-facility-photos")
  //     .on("postgres_changes", { event: "*", schema: "public", table: "facility_photos" }, load)
  //     .subscribe();
  //   const ch3 = supabase
  //     .channel("rt-facility-hours")
  //     .on("postgres_changes", { event: "*", schema: "public", table: "facility_hours" }, load)
  //     .subscribe();

  //   return () => {
  //     supabase.removeChannel(ch1);
  //     supabase.removeChannel(ch2);
  //     supabase.removeChannel(ch3);
  //   };
  // }, []);

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <h1 className="text-2xl font-semibold mb-4 text-center">Facilities</h1>

      {isLoading ? (
        <Card className="p-4 text-sm text-slate-600">Loading…</Card>
      ) : isError ? (
        <Card className="p-4 text-sm text-rose-600">{isError}</Card>
      ) : facilities.length === 0 ? (
        <Card className="p-4 text-sm text-slate-600">No facilities yet.</Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {facilities.map((f: Facility) => {
            const imgs = photosFrom(f);
            const cover = imgs[0] ?? null;
            const hours = buildHoursFromRows(f.hours);
            const hoursSet = hasAnyHours(hours);

            return (
              <Card
                key={f.id}
                className="overflow-hidden hover:shadow transition cursor-pointer"
                onClick={() => navigate(`/dashboard/facilities/${f.id}`)}
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
                      <span className="truncate">{f.address}</span>
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
    </div>
  );
}
