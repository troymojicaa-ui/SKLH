import { useMemo, useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L, { LatLngExpression } from "leaflet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabaseClient";
import { refFromId } from "@/lib/refCode"; // ✅ NEW

const SUCCESS_PATH = "/dashboard/report/success"; // ⬅ change to "/dashboard/report/submitted" if that's your route

const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function ClickToSetMarker({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const base = import.meta.env.VITE_SUPABASE_URL;
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!base || !anon) return null;

  try {
    const res = await fetch(
      `${base}/functions/v1/reverse-geocode?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`,
      {
        headers: { Accept: "application/json", Authorization: `Bearer ${anon}` },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.display_name ?? null;
  } catch {
    return null;
  }
}

export default function ReportCreate() {
  const navigate = useNavigate();
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const defaultCenter: LatLngExpression = useMemo(() => [14.6475, 121.0737], []);

  // ask for geolocation
  const askedRef = useRef(false);
  if (!askedRef.current && navigator.geolocation) {
    askedRef.current = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 10000 }
    );
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!coords) {
        setAddress(null);
        return;
      }
      setResolving(true);
      const addr = await reverseGeocode(coords.lat, coords.lng);
      if (!cancelled) {
        setAddress(addr);
        setResolving(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [coords]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coords) {
      alert("Please select a location first.");
      return;
    }
    setSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) throw new Error("Please log in first.");

      let addr = address;
      if (!addr) {
        setResolving(true);
        addr = await reverseGeocode(coords.lat, coords.lng);
        setResolving(false);
        setAddress(addr ?? null);
      }

      let photo_url: string | null = null;
      if (photo) {
        const ext = (photo.name.split(".").pop() || "jpg").toLowerCase();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("report-photos")
          .upload(path, photo, { cacheControl: "3600" });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("report-photos").getPublicUrl(path);
        photo_url = pub?.publicUrl ?? null;
      }

      // ✅ Insert and select the new id back so we can compute the Issue Ref #
      const { data: inserted, error: insErr } = await supabase
        .from("reports")
        .insert({
          user_id: user.id,
          title,
          description: desc,
          status: "pending",
          lat: coords.lat,
          lng: coords.lng,
          address: addr ?? null,
          photo_url,
        })
        .select("id")
        .single();

      if (insErr) throw insErr;

      // ✅ Compute short, human-friendly reference and go to success screen
      const ref = refFromId(inserted.id);
      navigate(`${SUCCESS_PATH}?ref=${encodeURIComponent(ref)}`);
    } catch (err: any) {
      alert(err?.message ?? "Failed to submit report.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Map: full-width, fixed height, lower z-index */}
      <div className="relative z-0 w-full h-[35vh]">
        <MapContainer
          center={coords ? [coords.lat, coords.lng] : defaultCenter}
          zoom={16}
          className="h-full w-full rounded-b-2xl shadow-sm"
          style={{ zIndex: 0 }}
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickToSetMarker onPick={(lat, lng) => setCoords({ lat, lng })} />
          {coords && <Marker icon={markerIcon} position={[coords.lat, coords.lng]} />}
        </MapContainer>
      </div>

      {/* Form Card */}
      <div className="flex-1 bg-white rounded-t-3xl -mt-4 z-10 relative shadow-lg px-5 py-6">
        <h1 className="text-xl font-bold text-center mb-4">Report An Issue</h1>
        <p className="text-center text-sm text-gray-500 mb-4">Tell us what happened</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Address</Label>
            <Input
              value={
                resolving
                  ? "Resolving address..."
                  : address ?? "Tap the map above to set location"
              }
              readOnly
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-sm font-medium">Type of Issue / Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Engineering and Construction"
              required
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-sm font-medium">Add Photo/Video</Label>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="mt-2 block w-full rounded-md border border-gray-300 bg-white text-sm
                         file:mr-4 file:rounded-md file:border-0 file:bg-sky-600
                         file:px-3 file:py-2 file:text-white hover:file:bg-sky-700"
              onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
            />
          </div>

          <div>
            <Label className="text-sm font-medium">Please provide any details</Label>
            <Textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Write here…"
              className="mt-1 min-h-[110px]"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" className="flex-1" onClick={() => history.back()}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-sky-600 hover:bg-sky-700 text-white"
              disabled={submitting || resolving}
            >
              {submitting ? "Submitting…" : "Submit"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
