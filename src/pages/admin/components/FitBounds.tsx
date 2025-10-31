// FitBounds.tsx
import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

interface FitBoundsProps {
  points: { lat: number; lng: number }[];
  padding?: [number, number];
}

const FitBounds = ({ points, padding = [30, 30] }: FitBoundsProps) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !points.length) return;

    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding });
  }, [points]);

  return null; // this component renders nothing
};

export default FitBounds;