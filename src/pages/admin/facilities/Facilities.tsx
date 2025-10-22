import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

import {
  Clock,
  MapPin,
} from "lucide-react";

import AdminFacilityListContainer from "./components/AdminFacilityListContainer";
import MapView from "../components/Mapview";
import AdminFacilityCard from "./components/AdminFacilityCard";

import { Marker, Popup } from "react-leaflet";
import FitBounds from "../components/FitBounds";
import AdminFacilityModal from "./components/AdminFacilityModal";

type Facility = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  facility_photos: FacilityPhoto[];
  facility_hours: FacilityHour[];
  facility_address: FacilityAddress;
};

type FacilityPhoto = {
  id: string;
  facility_id: string;
  url: string;
  path: string | null;
  sort_order: number;
};

type FacilityAddress = {
  address: string;
  lat: number;
  lng: number;
}

type FacilityHour = {
  facility_id: string;
  dow: number;              // 0=Sun ... 6=Sat
  open_time: string | null; // "HH:MM:SS" or null
  close_time: string | null;
};

export const DOW_LABEL = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"] as const;

function getManilaNow() {
  const now = new Date();
  return new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
}

function isOpenNow(hours: FacilityHour[] | undefined): { open: boolean; today: string } {
  if (!hours || hours.length === 0) return { open: false, today: "Closed" };
  const manila = getManilaNow();
  const dow = manila.getDay();
  const h = hours.find((x) => x.dow === dow);
  if (!h || !h.open_time || !h.close_time) return { open: false, today: "Closed" };

  const [oh, om] = h.open_time.split(":").map(Number);
  const [ch, cm] = h.close_time.split(":").map(Number);
  const openMin = oh * 60 + om;
  const closeMin = ch * 60 + cm;
  const curMin = manila.getHours() * 60 + manila.getMinutes();

  const openNow =
    closeMin >= openMin ? curMin >= openMin && curMin < closeMin
                        : curMin >= openMin || curMin < closeMin;

  const label =
    h.open_time && h.close_time
      ? `${DOW_LABEL[dow]} · ${h.open_time.slice(0,5)}–${h.close_time.slice(0,5)}`
      : `${DOW_LABEL[dow]} · Closed`;

  return { open: openNow, today: label };
}

export default function AdminFacilities() {
  const [rows, setRows] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Editor state
  const [editing, setEditing] = useState<Facility | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [hours, setHours] = useState<FacilityHour[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [address, setAddress] = useState<FacilityAddress|null>(null);
  const [saving, setSaving] = useState(false);

  // --- NEW: local photo order state for drag&drop ---
  const [orderedPhotos, setOrderedPhotos] = useState<FacilityPhoto[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const photoIdsOriginal = useMemo(
    () => (editing?.facility_photos ?? []).slice().sort((a,b)=>a.sort_order-b.sort_order).map(p=>p.id).join(","),
    [editing]
  );
  const photoIdsCurrent = orderedPhotos.map(p=>p.id).join(",");
  const orderChanged: boolean = photoIdsCurrent !== photoIdsOriginal && orderedPhotos.length > 0;

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      // facility_photos:facility_photos(id, facility_id, url, path, sort_order),
      const { data, error } = await supabase
        .from("facilities")
        .select(`
          id, name, description, is_active, created_at, updated_at,
          facility_photos:facility_photos(url, path, sort_order),
          facility_hours:facility_hours(facility_id, dow, open_time, close_time),
          facility_address:facility_addresses(address, lat, lng)
        `)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      setRows((data ?? []) as Facility[]);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load facilities.");
    } finally {
      setLoading(false);
    }
  }

  function resetEditor(f?: Facility | null) {
    setEditing(f ?? null);
    setName(f?.name ?? "");
    setDescription(f?.description ?? "");

    const base: FacilityHour[] =
      f?.facility_hours && f.facility_hours.length
        ? f.facility_hours
        : Array.from({ length: 7 }, (_, dow) => ({
            facility_id: f?.id ?? "",
            dow,
            open_time: null,
            close_time: null,
          }));

    const map = new Map(base.map((x) => [x.dow, x]));
    const full = Array.from({ length: 7 }, (_, dow) => map.get(dow) ?? ({
      facility_id: f?.id ?? "",
      dow,
      open_time: null,
      close_time: null,
    }));
    setHours(full);
    setFiles([]);

    setAddress(f?.facility_address ?? null);

    // NEW: init ordered photos from editing row
    const photos = (f?.facility_photos ?? []).slice().sort((a,b)=>a.sort_order-b.sort_order);
    setOrderedPhotos(photos);
    setDragIndex(null);
  }

  async function onCreate() {
    resetEditor(null);
    setEditing({} as any); // open modal
  }

  async function onEdit(f: Facility) {
    resetEditor(f);
  }

  function handleHourChange(dow: number, field: "open_time"|"close_time", value: string) {
    setHours((prev) =>
      prev.map((h) => (h.dow === dow ? { ...h, [field]: value || null } : h))
    );
  }

  async function saveFacility(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { alert("Name is required"); return; }
    if (files.length > 10) { alert("Max 10 images."); return; }

    setSaving(true);
    try {
      let facilityId = editing?.id ?? null;

      if (!facilityId) {
        const { data, error } = await supabase
          .from("facilities")
          .insert({ name, description: description || null })
          .select("id")
          .single();
        if (error) throw error;
        facilityId = data!.id as string;
      } else {
        const { error } = await supabase
          .from("facilities")
          .update({ name, description: description || null })
          .eq("id", facilityId);
        if (error) throw error;
      }

      const upserts = hours.map((h) => ({
        facility_id: facilityId!,
        dow: h.dow,
        open_time: h.open_time,
        close_time: h.close_time,
      }));
      const { error: hErr } = await supabase.from("facility_hours").upsert(upserts);
      if (hErr) throw hErr;

      // Upload new photos (if any)
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
        const path = `${facilityId}/${Date.now()}-${i}.${ext}`;
        const up = await supabase.storage.from("facility-photos").upload(path, file, {
          cacheControl: "3600",
          upsert: false,
        });
        if (up.error) throw up.error;
        const { data: pub } = supabase.storage.from("facility-photos").getPublicUrl(path);
        const url = pub?.publicUrl ?? null;
        if (!url) continue;
        const { error: pErr } = await supabase.from("facility_photos").insert({
          facility_id: facilityId,
          url,
          path,
          sort_order: i, // appended after existing
        });
        if (pErr) throw pErr;
      }

      // set address
      if(address){
        const addressPayload = {
          id: facilityId,
          address: address.address,
          lat: address.lat,
          lng: address.lng
        }
        const { error: hErr } = await supabase.from("facility_addresses").upsert(addressPayload);
        if (hErr) throw hErr;
      }


      await load();
      setEditing(null);
    } catch (e: any) {
      alert(e?.message ?? "Failed to save facility.");
    } finally {
      setSaving(false);
    }
  }

  async function removePhoto(photo: FacilityPhoto) {
    if (!confirm("Remove this photo?")) return;
    try {
      const { error } = await supabase.from("facility_photos").delete().eq("id", photo.id);
      if (error) throw error;
      if (photo.path) {
        await supabase.storage.from("facility-photos").remove([photo.path]);
      }
      await load();
      if (editing) {
        const fresh = rows.find((r) => r.id === editing.id);
        if (fresh) resetEditor(fresh);
      }
    } catch (e: any) {
      alert(e?.message ?? "Failed to delete photo.");
    }
  }

  // --- NEW: drag & drop handlers for orderedPhotos ---
  function onDragStart(index: number) {
    setDragIndex(index);
  }
  function onDragEnter(index: number) {
    if (dragIndex === null || dragIndex === index) return;
    setOrderedPhotos((prev) => {
      const arr = prev.slice();
      const [moved] = arr.splice(dragIndex, 1);
      arr.splice(index, 0, moved);
      setDragIndex(index);
      return arr;
    });
  }
  function onDragEnd() {
    setDragIndex(null);
  }

  async function savePhotoOrder() {
    if (!editing?.id) return;
    try {
      const p_ids = orderedPhotos.map((p) => p.id);
      const { error } = await supabase.rpc("facility_photos_reorder", {
        p_facility: editing.id,
        p_ids,
      });
      if (error) throw error;
      await load();
      const fresh = rows.find((r) => r.id === editing.id);
      if (fresh) resetEditor(fresh);
    } catch (e: any) {
      alert(e?.message ?? "Failed to save order.");
    }
  }

  // facility coordinates
  const points = rows.filter(row=>row.facility_address).map(row=>{
    const { open, today } = isOpenNow(row.facility_hours);
    return {
        name: row.name, 
        address: row.facility_address.address,
        open: open,
        today: today,
        lat: row.facility_address.lat, 
        lng: row.facility_address.lng
    }
  })

  return (
    <div className="h-[calc(100vh-64px)] p-6 space-y-4 overflow-hidden flex flex-col">
      <style>{`
        .no-scrollbar { scrollbar-width: none; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 flex-1 min-h-0">
        {/* List of Facilities */}
        <div className="lg:col-span-2 flex flex-col min-h-0">
          <AdminFacilityListContainer onCreate={onCreate} totalFacility={rows.length}>
            {rows.map(row=>{
              const { open, today } = isOpenNow(row.facility_hours);
              return (<AdminFacilityCard onEdit={()=>{
                // setEditing(row)
                onEdit(row)
              }} key={row.name} cover={row.facility_photos[0]?.url} address={row.facility_address?.address ?? 'No address.'} facitity_name={row.name} open={open} today={today}  />)
            })}
          </AdminFacilityListContainer>
        </div>
        {/* Mapview */}
        <div className="lg:col-span-3 h-full rounded-lg overflow-hidden border bg-white relative z-0">
          <MapView center={[14.6445, 121.0795]} zoom={10}>
            <FitBounds points={points} padding={[100, 100]} />
            {points.map(point=>{
              return (
                <Marker key={`${point.lat}_${point.lng}`} position={[point.lat, point.lng]}>
                  <Popup>
                    <div className="flex flex-col gap-2">
                      <span className="text-lg font-medium">{point.name}</span>
                      <span className="flex gap-1"><MapPin className="h-4 w-4" /><span className="truncate flex-1">{point.address}</span></span>
                      <span className="flex gap-1"><Clock className="h-4 w-4" /><span className="truncate flex-1">{point.today}</span></span>
                    </div>
                  </Popup>
                </Marker>
              )
            })}
          </MapView>
        </div>
      </div>

      {/* Facility Create/Edit Modal */}
      <AdminFacilityModal 
        editing={editing}
        setEditing={setEditing}
        saveFacility={saveFacility}
        name={name}
        setName={setName}
        description={description}
        setDescription={setDescription}
        hours={hours}
        setHours={setHours}
        files={files}
        setFiles={setFiles}
        address={address}
        setAddress={setAddress}
        orderedPhotos={orderedPhotos}
        orderChanged={orderChanged}
        savePhotoOrder={savePhotoOrder}
        dragIndex={dragIndex}
        onDragStart={onDragStart}
        onDragEnter={onDragEnter}
        onDragEnd={onDragEnd}
        removePhoto={removePhoto}
        handleHourChange={handleHourChange}
        saving={saving}
      />
    </div>
  )
}
