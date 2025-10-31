import { MapContainer, TileLayer } from "react-leaflet";
import { type ReactNode, useRef } from "react";

import { Map as LeafletMap } from "leaflet";

interface MapViewProps {
  center: [number, number];
  zoom?: number;
  children?: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const MapView = ({
  center,
  zoom = 13,
  children,
  className = "",
  style = { height: "100%", width: "100%" },
}: MapViewProps) => {
  const mapRef = useRef<LeafletMap | null>(null);

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={style}
      whenCreated={(m) => (mapRef.current = m)}
      scrollWheelZoom
      className={`z-0 ${className}`}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap &copy; CARTO'
        url='https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
        errorTileUrl='data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='
      />
      {children}
    </MapContainer>
  );
};

export default MapView;