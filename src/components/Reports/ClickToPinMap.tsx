
import { useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvent } from "react-leaflet";
import type { LatLngExpression } from "leaflet";

type Props = {
  initial?: LatLngExpression | null;
  onChange?: (pos: { lat: number; lng: number } | null) => void;
  className?: string;
  disabled?: boolean;
  heightPx?: number;
};

function ClickCatcher({
  setPos,
  onChange,
  disabled,
}: {
  setPos: (p: LatLngExpression | null) => void;
  onChange?: (pos: { lat: number; lng: number } | null) => void;
  disabled?: boolean;
}) {
  useMapEvent("click", (e) => {
    if (disabled) return;
    const next: LatLngExpression = [e.latlng.lat, e.latlng.lng];
    setPos(next);
    onChange?.({ lat: e.latlng.lat, lng: e.latlng.lng });
  });
  return null;
}

export default function ClickToPinMap({
  initial = null,
  onChange,
  className,
  disabled,
  heightPx = 360,
}: Props) {
  const [pos, setPos] = useState<LatLngExpression | null>(initial);

  const center: LatLngExpression = pos ?? [14.5995, 120.9842];

  return (
    <div className={className}>
      <MapContainer
        center={center}
        zoom={pos ? 16 : 12}
        style={{
          height: heightPx,
          width: "100%",
          borderRadius: 12,
        }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Handle click to (re)place the pin */}
        <ClickCatcher setPos={setPos} onChange={onChange} disabled={disabled} />

        {/* Show the pin only when a position is set */}
        {pos && <Marker position={pos} />}
      </MapContainer>
    </div>
  );
}
