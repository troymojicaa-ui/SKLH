import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

function cors(req: Request) {
  const origin = req.headers.get("origin") ?? "*";
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
  };
}

async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors(req) });
  }

  try {
    const url = new URL(req.url);
    const lat = url.searchParams.get("lat");
    const lng = url.searchParams.get("lng");

    if (!lat || !lng) {
      return new Response(JSON.stringify({ display_name: null, error: "Missing lat/lng" }), {
        status: 400,
        headers: cors(req),
      });
    }

    const nom = new URL("https://nominatim.openstreetmap.org/reverse");
    nom.searchParams.set("format", "jsonv2");
    nom.searchParams.set("lat", lat);
    nom.searchParams.set("lon", lng);
    nom.searchParams.set("zoom", "16");
    nom.searchParams.set("addressdetails", "1");

    const res = await fetch(nom.toString(), {
      headers: {
        "User-Agent": "RAI-Reports/1.0 (contact: your@email.com)", // <-- put your email
        "Accept": "application/json",
      },
    });

    if (!res.ok) {
      console.error("Nominatim non-OK:", res.status);
      return new Response(JSON.stringify({ display_name: null, status: res.status }), {
        status: 200,
        headers: cors(req),
      });
    }

    const data = await res.json();
    return new Response(JSON.stringify({ display_name: data?.display_name ?? null }), {
      status: 200,
      headers: cors(req),
    });
  } catch (e) {
    console.error("reverse-geocode error:", e);
    return new Response(JSON.stringify({ display_name: null, error: String(e) }), {
      status: 200,
      headers: cors(req),
    });
  }
}

serve(handler);
