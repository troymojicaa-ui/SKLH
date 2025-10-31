import { Marker, useMap } from "react-leaflet";
import { Icon } from "leaflet";
import { useEffect } from "react";


interface Report {
  id: number | string;
  lat: number;
  lng: number;
  [key: string]: any; // allow extra fields
}

interface MarkerPinsProps {
  reports: Report[];
  selectedId?: number | string | null;
  hoverId?: number | string | null;
  setSelectedId: (id: number | string) => void;
  setHoverId: (id: number | string | null) => void;
  setModalOpen?: (open: boolean) => void;
  iconFor: (report: Report, active: boolean) => Icon;
  recenterZoom?: number;
}

const MarkerPins = ({
  reports,
  selectedId,
  hoverId,
  setSelectedId,
  setHoverId,
  setModalOpen,
  iconFor,
  recenterZoom=16,
}: MarkerPinsProps) => {
  const map = useMap();

  // 🔁 Watch for selectedId change → recenter map
  useEffect(() => {
    if (!map || !selectedId) return;

    const selected = reports.find((r) => r.id === selectedId);
    if (selected && selected.lat != null && selected.lng != null) {
      const target = [selected.lat, selected.lng] as [number, number];

      // Smooth pan or fly animation
      if (recenterZoom != null) {
        map.flyTo(target, recenterZoom, { duration: 0.8 });
      } else {
        map.flyTo(target, map.getZoom(), { duration: 0.8 });
      }
    }
  }, [selectedId, reports, map, recenterZoom]);

  return (
    <>
      {reports
        .filter((r) => r.lat != null && r.lng != null)
        .map((r) => {
          const active = r.id === (hoverId ?? selectedId);
          const icon = iconFor(r, active);

          return (
            <Marker
              key={r.id}
              position={[r.lat, r.lng]}
              icon={icon}
              eventHandlers={{
                click: () => {
                  setSelectedId(r.id);
                  if (setModalOpen) setModalOpen(true);
                },
                mouseover: () => setHoverId(r.id),
                mouseout: () => setHoverId(null),
              }}
            />
          );
        })}
    </>
  );
};

export default MarkerPins;