// ClickMarkerAddress.tsx
import { useMapEvents } from "react-leaflet";

interface ClickMarkerAddressProps {
  setAddress: (address: {address: string, lat: number, lng: number})=>void;
}

const ClickMarkerAddress = ({ setAddress }: ClickMarkerAddressProps) => {
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
  const getCoordinateAddress = async (lat: number, lng: number) => {
    setAddress({
      address: 'Resolving address...',
      lat: lat,
      lng: lng
    })

    const addr = await reverseGeocode(lat, lng);

    if (addr) {
      setAddress({
        address: addr,
        lat: lat,
        lng: lng
      })
    }
    else {
      setAddress({
        address: '',
        lat: lat,
        lng: lng
      })
    }
  }

//   return null; // this component renders nothing
  useMapEvents({
    click(e:any) {
      getCoordinateAddress(e.latlng.lat, e.latlng.lng)
    },
  });
  return null;
};

export default ClickMarkerAddress;