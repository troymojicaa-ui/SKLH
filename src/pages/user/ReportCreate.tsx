// src/pages/user/ReportCreate.tsx
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

// Default marker
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

/** Reverse-geocode via your Supabase Edge Function (CORS-safe) */
async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const base = import.meta.env.VITE_SUPABASE_URL; // e.g. https://btjrehnuylywflkmblfm.supabase.co
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!base || !anon) {
    console.warn("[reverseGeocode] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
    return null;
  }

  const url = `${base}/functions/v1/reverse-geocode?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`;

  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${anon}`,
      },
      cache: "no-store",
    });
    if (!res.ok) {
      console.warn("[reverseGeocode] Edge Function HTTP", res.status);
      return null;
    }
    const data = await res.json();
    return data?.display_name ?? null;
  } catch (err) {
    console.error("[reverseGeocode] fetch failed", err);
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

  // Ask for geolocation (best effort)
  const askedRef = useRef(false);
  if (!askedRef.current && navigator.geolocation) {
    askedRef.current = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 10_000 }
    );
  }

  // Resolve address whenever coords change
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!coords) {
        setAddress(null);
        return;
      }
      setResolving(true);
      console.log("↪️ reverse-geocode start", coords);
      const addr = await reverseGeocode(coords.lat, coords.lng);
      if (!cancelled) {
        setAddress(addr);
        setResolving(false);
        console.log("✅ reverse-geocode done:", addr);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [coords]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coords) {
      alert("Please choose a location on the map.");
      return;
    }
    setSubmitting(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) {
        alert("Please log in first.");
        return;
      }

      // Ensure we have an address at submit time
      let addr = address;
      if (!addr) {
        console.log("🕒 address missing at submit — resolving now…");
        setResolving(true);
        addr = await reverseGeocode(coords.lat, coords.lng);
        setResolving(false);
        setAddress(addr ?? null);
        console.log("🔁 resolved at submit:", addr);
      }

      // 1) Upload photo (optional)
      let photo_url: string | null = null;
      if (photo) {
        const ext = (photo.name.split(".").pop() || "jpg").toLowerCase();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase
          .storage
          .from("report-photos")
          .upload(path, photo, { cacheControl: "3600", upsert: false });
        if (upErr) throw upErr;

        const { data: pub } = supabase.storage.from("report-photos").getPublicUrl(path);
        photo_url = pub?.publicUrl ?? null;
      }

      // 2) Insert report — includes address
      console.log("📥 inserting row with address:", addr);
      const { error: insErr } = await supabase
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
        });

      if (insErr) throw insErr;

      navigate("/dashboard/report");
    } catch (err: any) {
      console.error(err);
      alert(err?.message ?? "Failed to submit report.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-[100dvh] md:h-auto md:min-h-screen bg-white flex flex-col">
      <div className="w-full" style={{ height: "40vh" }}>
        <MapContainer
          center={coords ? [coords.lat, coords.lng] : defaultCenter}
          zoom={16}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickToSetMarker onPick={(lat, lng) => setCoords({ lat, lng })} />
          {coords && <Marker icon={markerIcon} position={[coords.lat, coords.lng]} />}
        </MapContainer>
      </div>

      <div className="flex-1 overflow-auto px-4 py-4">
        <h1 className="text-xl font-semibold mb-3">Report an Incident</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Flooded street, broken signage"
              required
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="desc">Description (optional)</Label>
            <Textarea
              id="desc"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Describe what happened…"
              className="mt-1 min-h-[110px]"
            />
          </div>

          <div>
            <Label htmlFor="photo">Add photo (camera supported)</Label>
            <input
              id="photo"
              name="photo"
              type="file"
              accept="image/*"
              capture="environment"
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white text-sm
                         file:mr-4 file:rounded-md file:border-0 file:bg-sky-600
                         file:px-3 file:py-2 file:text-white hover:file:bg-sky-700"
              onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              On phones, this opens the camera. You can also pick from the gallery.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => history.back()}>
              Cancel
            </Button>
            {/* Disable while submitting OR resolving so we don't insert early */}
            <Button
              type="submit"
              className="flex-1 bg-sky-600 hover:bg-sky-700"
              disabled={submitting || resolving}
            >
              {submitting || resolving
                ? (resolving ? "Resolving address…" : "Submitting…")
                : "Submit Report"}
            </Button>
          </div>
        </form>

        <div className="mt-4 text-xs text-muted-foreground">
          {coords
            ? (resolving
                ? `Selected: resolving address… (${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)})`
                : address
                  ? `Selected: ${address}`
                  : `Selected: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`)
            : "Tap on the map to select a location"}
        </div>
      </div>
    </div>
  );
}
