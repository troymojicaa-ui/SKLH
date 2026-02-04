// src/pages/admin/Reports.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { format, parseISO, startOfDay, endOfDay } from "date-fns";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
} from "react-leaflet";
import L, { LatLngExpression, Map as LeafletMap } from "leaflet";
import { X, ChevronDown, ChevronUp } from "lucide-react";

type ReportStatus = "pending" | "reviewed" | "resolved";

type Report = {
  id: string;
  user_id: string | null;
  title: string;
  description: string | null;
  created_at: string;
  status: ReportStatus;
  edited: boolean;
  lat: number | null;
  lng: number | null;
  photo_url: string | null;
  address?: string | null;
  remarks?: string | null;
  report_number?: number | null;
};

const ADMIN_BLUE = "#0d2747";
const DARK_BLUE = "#0B2F59";
const CARD_BG = "#F5F6F8";
const GREEN = "#34C759";
const LOYOLA_CENTER: LatLngExpression = [14.6445, 121.0795];
const DEFAULT_ZOOM = 16;

const pinSvg = (fill = DARK_BLUE) =>
  `<svg width="26" height="38" viewBox="0 0 26 38" xmlns="http://www.w3.org/2000/svg"><path d="M13 0C5.82 0 0 5.82 0 13c0 9.75 13 25 13 25s13-15.25 13-25C26 5.82 20.18 0 13 0z" fill="${fill}"/><circle cx="13" cy="13" r="5.2" fill="#ffffff"/></svg>`;
const pinIcon = (fill?: string) =>
  L.divIcon({
    html: pinSvg(fill),
    className: "sk-pin",
    iconSize: [26, 38],
    iconAnchor: [13, 38],
  });

function statusFill(s: ReportStatus) {
  if (s === "resolved") return "#22c55e";
  if (s === "reviewed") return "#f59e0b";
  return DARK_BLUE;
}

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const base = import.meta.env.VITE_SUPABASE_URL;
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!base || !anon) return null;
  try {
    const res = await fetch(
      `${base}/functions/v1/reverse-geocode?lat=${encodeURIComponent(
        lat
      )}&lng=${encodeURIComponent(lng)}`,
      {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${anon}`,
        },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.display_name ?? null;
  } catch {
    return null;
  }
}

function Tag({ label }: { label: string }) {
  return (
    <span
      className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
      style={{ background: DARK_BLUE, color: "#fff" }}
    >
      {label}
    </span>
  );
}

function Pill({
  label,
  variant,
  disabled,
  onClick,
}: {
  label: string;
  variant: "green" | "outline";
  disabled?: boolean;
  onClick?: () => void;
}) {
  const base =
    "h-8 px-4 rounded-[10px] text-[12px] font-medium inline-flex items-center justify-center";
  if (disabled) {
    return (
      <button
        className={`${base} cursor-not-allowed`}
        style={{ background: "#E6E7EA", color: "#8A8F98" }}
        disabled
      >
        {label}
      </button>
    );
  }
  if (variant === "green") {
    return (
      <button
        className={base}
        style={{ background: GREEN, color: "#fff" }}
        onClick={onClick}
      >
        {label}
      </button>
    );
  }
  return (
    <button
      className={`${base} border`}
      style={{ background: "#fff", color: DARK_BLUE, borderColor: DARK_BLUE }}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function DraggableMarker({
  value,
  onChange,
}: {
  value: { lat: number; lng: number };
  onChange: (v: { lat: number; lng: number }) => void;
}) {
  const markerRef = useRef<any>(null);
  useMapEvents({
    click(e) {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return (
    <Marker
      draggable
      position={[value.lat, value.lng]}
      icon={pinIcon()}
      ref={markerRef}
      eventHandlers={{
        dragend: () => {
          const m = markerRef.current;
          if (!m) return;
          const ll = m.getLatLng();
          onChange({ lat: ll.lat, lng: ll.lng });
        },
      }}
    />
  );
}

function ModalShell({
  title,
  subtitle,
  children,
  onClose,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[80]" onClick={onClose} />
      <div className="fixed inset-0 z-[81] flex items-start justify-center overflow-auto">
        <div
          className="mt-10 mb-10 w-[min(980px,92vw)] rounded-3xl bg-white shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="grid grid-cols-[1fr_auto_1fr] items-center px-6 py-4 border-b">
            <div />
            <div className="text-center">
              <h3 className="text-xl font-semibold">{title}</h3>
              {subtitle ? (
                <div className="text-sm text-gray-600 mt-0.5">{subtitle}</div>
              ) : null}
            </div>
            <div className="flex justify-end">
              <button
                className="h-9 w-9 inline-flex items-center justify-center rounded-full hover:bg-gray-100"
                onClick={onClose}
                aria-label="Close"
              >
                <X className="h-5 w-5 text-gray-700" />
              </button>
            </div>
          </div>
          <div className="p-6">{children}</div>
        </div>
      </div>
    </>
  );
}

export default function AdminReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [statusFilter, setStatusFilter] = useState<ReportStatus | "all">("all");
  const [sortDir, setSortDir] = useState<"new" | "old">("new");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [filterOpen, setFilterOpen] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);

  const [addrCache, setAddrCache] = useState<Record<string, string>>({});
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("reports")
        .select(
          "id,user_id,title,description,created_at,status,edited,lat,lng,photo_url,address,remarks,report_number"
        )
        .order("created_at", { ascending: false });
      setReports((data ?? []) as Report[]);
    })();
  }, []);

  useEffect(() => {
    const ch = supabase
      .channel("rt-reports")
      .on("postgres_changes", { event: "*", schema: "public", table: "reports" }, async () => {
        const { data } = await supabase
          .from("reports")
          .select(
            "id,user_id,title,description,created_at,status,edited,lat,lng,photo_url,address,remarks,report_number"
          )
          .order("created_at", { ascending: false });
        setReports((data ?? []) as Report[]);
      })
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  useEffect(() => {
    const miss = reports.filter(
      (r) =>
        !r.address &&
        typeof r.lat === "number" &&
        typeof r.lng === "number" &&
        !addrCache[r.id]
    );
    if (!miss.length) return;
    let cancelled = false;
    (async () => {
      for (const r of miss) {
        if (cancelled) return;
        const addr = await reverseGeocode(r.lat!, r.lng!);
        if (addr && !cancelled) setAddrCache((m) => ({ ...m, [r.id]: addr }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reports, addrCache]);

  const filtered = useMemo(() => {
    let list =
      statusFilter === "all"
        ? reports.slice()
        : reports.filter((r) => r.status === statusFilter);
    if (dateFrom) {
      const from = startOfDay(parseISO(dateFrom)).getTime();
      list = list.filter((r) => +new Date(r.created_at) >= from);
    }
    if (dateTo) {
      const to = endOfDay(parseISO(dateTo)).getTime();
      list = list.filter((r) => +new Date(r.created_at) <= to);
    }
    list.sort((a, b) =>
      sortDir === "new"
        ? +new Date(b.created_at) - +new Date(a.created_at)
        : +new Date(a.created_at) - +new Date(b.created_at)
    );
    return list;
  }, [reports, statusFilter, sortDir, dateFrom, dateTo]);

  const selectedReport =
    filtered.find((r) => r.id === (hoverId ?? selectedId)) ?? null;

  async function setStatus(id: string, next: ReportStatus) {
    setReports((list) => list.map((r) => (r.id === id ? { ...r, status: next, edited: r.edited || next === "resolved" } : r)));
    await supabase.from("reports").update({ status: next, edited: true }).eq("id", id);
  }

  const getAddress = (r: Report) =>
    r.address || addrCache[r.id] || (r.lat && r.lng ? `${r.lat.toFixed(6)}, ${r.lng.toFixed(6)}` : "—");

  return (
    <div className="h-[calc(100vh-64px)] overflow-hidden">
      <style>{`
        .leaflet-control-attribution,.leaflet-control-scale{display:none!important}
        .leaflet-pane,.leaflet-top,.leaflet-bottom{z-index:0}
      `}</style>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4 h-full p-4">
        <div className="flex flex-col min-h-0">
          <div className="rounded-[14px] p-4 mb-3" style={{ background: "#EAF2FF" }}>
            <button
              className="w-full rounded-[10px] h-10 text-white font-medium"
              style={{ background: ADMIN_BLUE }}
              onClick={() => setAddOpen(true)}
            >
              Add Report
            </button>
          </div>

          <div className="mb-3">
            <div className="w-full rounded-full border px-4 h-10 flex items-center justify-between bg-white">
              <span className="text-sm text-gray-700">
                Showing all <span className="font-semibold">{filtered.length}</span> results
              </span>
              <button
                className="text-sm inline-flex items-center gap-1"
                onClick={() => setFilterOpen((v) => !v)}
              >
                {filterOpen ? "Collapse" : "Expand"}
                {filterOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>

            {filterOpen && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[12px] text-gray-500">Status</label>
                  <select
                    className="mt-1 w-full h-9 rounded-md border px-3 text-sm bg-white"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as ReportStatus | "all")}
                  >
                    <option value="all">All</option>
                    <option value="pending">Pending</option>
                    <option value="reviewed">Reviewed</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
                <div>
                  <label className="text-[12px] text-gray-500">Sort</label>
                  <select
                    className="mt-1 w-full h-9 rounded-md border px-3 text-sm bg-white"
                    value={sortDir}
                    onChange={(e) => setSortDir(e.target.value as "new" | "old")}
                  >
                    <option value="new">Newest to oldest</option>
                    <option value="old">Oldest to newest</option>
                  </select>
                </div>
                <div>
                  <label className="text-[12px] text-gray-500">From</label>
                  <input
                    type="date"
                    className="mt-1 w-full h-9 rounded-md border px-3 text-sm bg-white"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[12px] text-gray-500">To</label>
                  <input
                    type="date"
                    className="mt-1 w-full h-9 rounded-md border px-3 text-sm bg-white"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-3">
            {filtered.map((r) => {
              const reviewedTag = r.status === "reviewed" || (r.status === "resolved" && r.edited);
              const resolvedTag = r.status === "resolved";
              return (
                <div
                  key={r.id}
                  onMouseEnter={() => setHoverId(r.id)}
                  onMouseLeave={() => setHoverId(null)}
                  onClick={() => {
                    setSelectedId(r.id);
                    setViewOpen(true);
                  }}
                  className="rounded-[14px] p-4 cursor-pointer"
                  style={{
                    background: CARD_BG,
                    boxShadow:
                      "0 1px 2px rgba(16,24,40,0.05), 0 1px 3px rgba(16,24,40,0.06)",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {resolvedTag && <Tag label="Resolved" />}
                      {reviewedTag && <Tag label="Reviewed" />}
                    </div>
                    <button
                      className="text-sm underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedId(r.id);
                        setEditOpen(true);
                      }}
                    >
                      Edit
                    </button>
                  </div>

                  <div className="mt-1">
                    <p className="text-[13px] text-gray-900 font-semibold">
                      Report ID No. {(typeof r.report_number === "number" ? String(r.report_number).padStart(5, "0") : r.id.slice(0,5).toUpperCase())}
                    </p>
                    <p className="text-[12px] text-gray-600 italic line-clamp-2">
                      {r.title || "—"}
                    </p>
                  </div>

                  <div className="mt-2 text-xs text-gray-600">
                    <div>{format(new Date(r.created_at), "dd MMM yyyy  p")}</div>
                    <div className="truncate">{getAddress(r)}</div>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <Pill
                      label="Resolved"
                      variant="green"
                      disabled={r.status === "resolved"}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (r.status !== "resolved") setStatus(r.id, "resolved");
                      }}
                    />
                    <Pill
                      label="Reviewed"
                      variant="outline"
                      disabled={r.status === "reviewed" || r.status === "resolved"}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (r.status === "pending") setStatus(r.id, "reviewed");
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg overflow-hidden border bg-white relative">
          <MapContainer
            center={LOYOLA_CENTER}
            zoom={DEFAULT_ZOOM}
            style={{ height: "100%", width: "100%" }}
            whenCreated={(m) => (mapRef.current = m)}
            scrollWheelZoom
            className="z-0"
          >
            <TileLayer
              attribution=""
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />
            {filtered
              .filter((r) => r.lat != null && r.lng != null)
              .map((r) => (
                <Marker
                  key={r.id}
                  position={[r.lat as number, r.lng as number]}
                  icon={pinIcon(statusFill(r.status))}
                  eventHandlers={{
                    click: () => {
                      setSelectedId(r.id);
                      setViewOpen(true);
                    },
                    mouseover: () => setHoverId(r.id),
                    mouseout: () => setHoverId(null),
                  }}
                >
                  <Popup>
                    <div className="min-w-[180px]">
                      <p className="font-medium text-sm">{r.title || "Report"}</p>
                      <p className="text-xs text-gray-600">
                        {format(new Date(r.created_at), "PPp")}
                      </p>
                      <p className="text-xs mt-1">Status: <b>{r.status}</b></p>
                    </div>
                  </Popup>
                </Marker>
              ))}
          </MapContainer>

          <div className="absolute right-3 bottom-1 text-[11px] text-gray-600 bg-white/80 rounded px-2 py-0.5">
            Lat {LOYOLA_CENTER[0]} | Lon {LOYOLA_CENTER[1]}
          </div>
        </div>
      </div>

      {editOpen && selectedReport && (
        <EditReportModal
          report={selectedReport}
          onClose={() => setEditOpen(false)}
          onSave={async (updated) => {
            let addr = updated.address ?? null;
            if (typeof updated.lat === "number" && typeof updated.lng === "number") {
              addr = (await reverseGeocode(updated.lat, updated.lng)) ?? addr;
            }
            await supabase
              .from("reports")
              .update({
                status: updated.status,
                description: updated.description,
                remarks: updated.remarks ?? null,
                lat: updated.lat,
                lng: updated.lng,
                address: addr,
                edited: true,
              })
              .eq("id", updated.id);
            setEditOpen(false);
            const { data } = await supabase
              .from("reports")
              .select(
                "id,user_id,title,description,created_at,status,edited,lat,lng,photo_url,address,remarks,report_number"
              )
              .order("created_at", { ascending: false });
            setReports((data ?? []) as Report[]);
          }}
        />
      )}

      {viewOpen && selectedReport && (
        <SideDetails
          title="Report Details"
          onClose={() => setViewOpen(false)}
        >
          <div className="p-6 space-y-3">
            <p className="text-sm text-gray-500">
              Report ID No.{" "}
              <span className="font-semibold">
                {(typeof selectedReport.report_number === "number"
                  ? String(selectedReport.report_number).padStart(5, "0")
                  : selectedReport.id.slice(0, 5).toUpperCase())}
              </span>
            </p>
            <h4 className="text-lg font-semibold">
              {selectedReport.title || "Untitled"}
            </h4>
            <div className="text-sm text-gray-600">
              {format(new Date(selectedReport.created_at), "PPp")}
            </div>
            <div className="text-sm text-gray-600 break-words">
              {getAddress(selectedReport)}
            </div>
            <div className="pt-2">
              <p className="text-sm font-medium">Description</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {selectedReport.description || "—"}
              </p>
            </div>
            {selectedReport.remarks ? (
              <div className="pt-2">
                <p className="text-sm font-medium">Remarks</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {selectedReport.remarks}
                </p>
              </div>
            ) : null}
            <div className="rounded-xl overflow-hidden border mt-4">
              {selectedReport.photo_url ? (
                <img
                  src={selectedReport.photo_url}
                  alt="Report"
                  className="w-full h-[320px] object-cover"
                  onError={(e) =>
                    ((e.currentTarget as HTMLImageElement).style.display =
                      "none")
                  }
                />
              ) : (
                <div className="h-[320px] w-full flex items-center justify-center text-sm text-gray-500">
                  No image
                </div>
              )}
            </div>
          </div>
        </SideDetails>
      )}

      {addOpen && (
        <AddReportModal
          onClose={() => setAddOpen(false)}
          onSave={async (p) => {
            let photo_url: string | null = null;
            if (p.file) {
              const path = `reports/${Date.now()}_${p.file.name}`;
              const { error: upErr } = await supabase.storage
                .from("project-images")
                .upload(path, p.file, { upsert: false });
              if (!upErr) {
                photo_url =
                  supabase.storage
                    .from("project-images")
                    .getPublicUrl(path).data.publicUrl;
              }
            }
            const address = await reverseGeocode(p.lat, p.lng);
            await supabase.from("reports").insert({
              title: p.title,
              description: p.description,
              status: p.status,
              lat: p.lat,
              lng: p.lng,
              address: address ?? null,
              remarks: p.remarks ?? null,
              photo_url,
            });
            setAddOpen(false);
            const { data } = await supabase
              .from("reports")
              .select(
                "id,user_id,title,description,created_at,status,edited,lat,lng,photo_url,address,remarks,report_number"
              )
              .order("created_at", { ascending: false });
            setReports((data ?? []) as Report[]);
          }}
        />
      )}
    </div>
  );
}

function EditReportModal({
  report,
  onClose,
  onSave,
}: {
  report: Report;
  onClose: () => void;
  onSave: (r: Report) => Promise<void>;
}) {
  const [status, setStatus] = useState<ReportStatus>(report.status);
  const [description, setDescription] = useState<string>(report.description ?? "");
  const [remarks, setRemarks] = useState<string>(report.remarks ?? "");
  const [pin, setPin] = useState<{ lat: number; lng: number }>({
    lat: report.lat ?? (LOYOLA_CENTER as [number, number])[0],
    lng: report.lng ?? (LOYOLA_CENTER as [number, number])[1],
  });

  const displayId =
    typeof report.report_number === "number"
      ? String(report.report_number).padStart(5, "0")
      : report.id.slice(0, 5).toUpperCase();

  return (
    <ModalShell title="Edit Report" subtitle={`Report ID No. ${displayId}`} onClose={onClose}>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Report Status</label>
            <select
              className="mt-1 w-full h-10 rounded-md border px-3 text-sm bg-white"
              value={status}
              onChange={(e) => setStatus(e.target.value as ReportStatus)}
            >
              <option value="pending">Pending</option>
              <option value="reviewed">Reviewed</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Remark/s</label>
            <input
              className="mt-1 w-full h-10 rounded-md border px-3 text-sm bg-white"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Enter remark"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Description</label>
            <textarea
              className="mt-1 w-full rounded-md border p-3 text-sm bg-white min-h-[140px]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter description"
            />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button className="h-10 px-5 rounded-xl bg-gray-300 text-gray-800" onClick={onClose}>
              Cancel
            </button>
            <button
              className="h-10 px-6 rounded-xl text-white"
              style={{ background: ADMIN_BLUE }}
              onClick={() =>
                onSave({
                  ...report,
                  status,
                  description,
                  remarks,
                  lat: pin.lat,
                  lng: pin.lng,
                })
              }
            >
              Save
            </button>
          </div>
        </div>
        <div className="rounded-xl overflow-hidden border aspect-square">
          <MapContainer
            center={[pin.lat, pin.lng]}
            zoom={17}
            style={{ height: "100%", width: "100%" }}
            scrollWheelZoom
          >
            <TileLayer attribution="" url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
            <DraggableMarker value={pin} onChange={setPin} />
          </MapContainer>
        </div>
      </div>
    </ModalShell>
  );
}

function AddReportModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (p: {
    title: string;
    description: string;
    status: ReportStatus;
    lat: number;
    lng: number;
    remarks?: string | null;
    file?: File | null;
  }) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [remarks, setRemarks] = useState("");
  const [status, setStatus] = useState<ReportStatus>("pending");
  const [pin, setPin] = useState<{ lat: number; lng: number }>({
    lat: (LOYOLA_CENTER as [number, number])[0],
    lng: (LOYOLA_CENTER as [number, number])[1],
  });
  const [file, setFile] = useState<File | null>(null);

  return (
    <ModalShell title="Add Report" onClose={onClose}>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Title</label>
            <input
              className="mt-1 w-full h-10 rounded-md border px-3 text-sm bg-white"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter title"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Description</label>
            <textarea
              className="mt-1 w-full rounded-md border p-3 text-sm bg-white min-h-[120px]"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Enter description"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Report Status</label>
            <select
              className="mt-1 w-full h-10 rounded-md border px-3 text-sm bg-white"
              value={status}
              onChange={(e) => setStatus(e.target.value as ReportStatus)}
            >
              <option value="pending">Pending</option>
              <option value="reviewed">Reviewed</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Remark/s</label>
            <input
              className="mt-1 w-full h-10 rounded-md border px-3 text-sm bg-white"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Enter remark"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Upload image</label>
            <input
              type="file"
              accept="image/*"
              className="mt-1 block w-full text-sm"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button className="h-10 px-5 rounded-xl bg-gray-300 text-gray-800" onClick={onClose}>
              Cancel
            </button>
            <button
              className="h-10 px-6 rounded-xl text-white"
              style={{ background: ADMIN_BLUE }}
              onClick={() =>
                onSave({
                  title,
                  description: desc,
                  status,
                  lat: pin.lat,
                  lng: pin.lng,
                  remarks,
                  file,
                })
              }
            >
              Save
            </button>
          </div>
        </div>
        <div className="rounded-xl overflow-hidden border aspect-square">
          <MapContainer
            center={[pin.lat, pin.lng]}
            zoom={17}
            style={{ height: "100%", width: "100%" }}
            scrollWheelZoom
          >
            <TileLayer attribution="" url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
            <DraggableMarker value={pin} onChange={setPin} />
          </MapContainer>
        </div>
      </div>
    </ModalShell>
  );
}

function SideDetails({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[80]" onClick={onClose} />
      <div
        className="fixed inset-y-0 left-0 z-[81] w-full sm:w-[520px] transform transition-transform duration-300 translate-x-0 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-base font-semibold">{title}</h3>
          <button
            className="h-9 w-9 inline-flex items-center justify-center rounded-full hover:bg-gray-100"
            onClick={onClose}
          >
            <X className="h-5 w-5 text-gray-700" />
          </button>
        </div>
        <div className="overflow-y-auto h-[calc(100%-57px)]">{children}</div>
      </div>
    </>
  );
}