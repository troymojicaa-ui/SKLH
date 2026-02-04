// src/pages/user/facilities/FacilityDetail.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card } from "@/components/ui/card";
import { MapPin, Clock, ChevronLeft, ChevronRight, X, Building2 } from "lucide-react";
import { NavLink, useParams } from "react-router-dom";
// import type { Facility } from "./Facilities";
import L, { LatLngExpression } from "leaflet";
import MapView from "../../admin/components/Mapview";
import { Marker } from "react-leaflet";

import { useFacilities } from "@/hooks/useFacilities";
import type { Facility, FacilityHour } from "../../../hooks/useFacilities";

type HoursDay = { open?: string | null; close?: string | null; closed?: boolean | null };
type Hours = Partial<Record<"sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat", HoursDay>>;
const DAY_KEYS: Array<keyof Hours> = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

function DetailView({ facility }: { facility: Facility; }) {
  const images = useMemo(() => photosFrom(facility), [facility]);
  const hours = useMemo(() => buildHoursFromRows(facility?.hours), [facility]);

	const DEFAULT_ZOOM = 16;

	const markerLocation = facility.address ? [facility.lat, facility.lng] : null

  return (
    <div className="">

      <div className="mx-auto max-w-4xl px-4 sm:px-6 overflow-y-auto h-full">
        <h2 className="text-xl sm:text-2xl font-semibold">{facility.name}</h2>
        {facility.description ? <p className="mt-1 text-slate-600">{facility.description}</p> : null}

        <PhotoCarousel images={images} className="mt-4 h-64 sm:h-80" />

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2 font-medium">
              <MapPin className="h-4 w-4 text-slate-600" />
              Location
            </div>
            <p className="mt-1 text-sm text-slate-700 break-words">{facility.address}</p>
						{ markerLocation && (
							<div className="h-64 w-full">
								<MapView center={markerLocation} zoom={DEFAULT_ZOOM}>
									<Marker position={markerLocation} />
								</MapView>
							</div>
						)}
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

export default function FacilityDetail() {
	// const { id: facilityId } = useParams<{ id: string }>();
	// const [facility, setFacility] = useState<Facility|null>(null);
	// const [loading, setLoading] = useState(true);
	// const [err, setErr] = useState<string | null>(null);

  const { id } = useParams<{ id: string }>();
  // Use the hook with the specific ID
  const { facility, isLoading, isError } = useFacilities(id || null);

	// async function load() {
	// 	setLoading(true);
	// 	setErr(null);
	// 	try {
	// 		const { data, error } = await supabase
	// 			.from("facilities")
	// 			.select(
	// 				`
	// 				id, name, description,
	// 				facility_photos:facility_photos(url, sort_order),
	// 				facility_hours:facility_hours(dow, open_time, close_time),
	// 				facility_address:facility_addresses(address, lat, lng)
	// 			`
	// 			)
	// 			.eq("id", facilityId) 
	// 			.single();
	// 		if (error) throw error;
	// 		setFacility(data as Facility);
	// 	} catch (e: any) {
	// 		setErr(e?.message ?? "Failed to load facilities.");
	// 	} finally {
	// 		setLoading(false);
	// 	}
	// }

	// useEffect(() => {
	// 	load();
	// }, []);

	return (
		<div className="max-w-4xl mx-auto p-4 sm:p-6">
			<NavLink to={"/dashboard/facilities"} className="flex items-center py-2" >
					<ChevronLeft className="pl-0 h-6 w-6" /> Facilities<ChevronRight className="pl-0 h-4 w-4" />Detail
			</NavLink>

			{isLoading ? (
        <Card className="p-4 text-sm text-slate-600">Loading…</Card>
      ) : isError ? (
        <Card className="p-4 text-sm text-rose-600">{isError}</Card>
      ) : facility === null ? (
        <Card className="p-4 text-sm text-slate-600">No facilities yet.</Card>
      ) : (
				<DetailView facility={facility} />
			)
			}
		</div>
	)

}