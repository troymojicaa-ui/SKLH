// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ✅ Allowed env names (with fallback to old ones if present)
const PROJECT_URL = Deno.env.get("PROJECT_URL") ?? Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY =
  Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const DEFAULT_PASSWORD = Deno.env.get("DEFAULT_PASSWORD") ?? "000000";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (!PROJECT_URL || !SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({ error: "Missing env: PROJECT_URL and/or SERVICE_ROLE_KEY" }),
      { status: 500, headers: corsHeaders }
    );
  }

  const admin = createClient(PROJECT_URL, SERVICE_ROLE_KEY);

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized (no JWT)" }), {
        status: 401, headers: corsHeaders,
      });
    }

    const gate = createClient(PROJECT_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: me, error: meErr } = await gate.auth.getUser();
    if (meErr || !me?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized (bad JWT)" }), {
        status: 401, headers: corsHeaders,
      });
    }

    const { data: callerProfile, error: profErr } = await admin
      .from("profiles")
      .select("role")
      .eq("id", me.user.id)
      .single();
    if (profErr) {
      return new Response(JSON.stringify({ error: `Role check failed: ${profErr.message}` }), {
        status: 500, headers: corsHeaders,
      });
    }
    if ((callerProfile?.role ?? "").toLowerCase() !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden (admin only)" }), {
        status: 403, headers: corsHeaders,
      });
    }

    if (req.headers.get("x-test-ping") === "1") {
      return new Response(JSON.stringify({ ok: true, pong: true }), {
        status: 200, headers: corsHeaders,
      });
    }

    const body = (await req.json()) as Record<string, any>;
    const {
      full_name, address_line, birthday, birth_city, email,
      phone, id_type, id_value, status, role,
    } = body;

    if (!email || !full_name) {
      return new Response(JSON.stringify({ error: "full_name and email are required" }), {
        status: 400, headers: corsHeaders,
      });
    }

    let userId: string | null = null;
    const createRes = await admin.auth.admin.createUser({
      email,
      password: DEFAULT_PASSWORD,
      email_confirm: true,
      user_metadata: { must_change_password: true },
    });

    if (createRes.error) {
      const msg = (createRes.error.message || "").toLowerCase();
      const isDup = msg.includes("already") || msg.includes("registered") || msg.includes("exists");
      if (!isDup) {
        return new Response(JSON.stringify({ error: `Create user failed: ${createRes.error.message}` }), {
          status: 400, headers: corsHeaders,
        });
      }

      const findRes = await fetch(
        `${PROJECT_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
        { headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}`, apikey: SERVICE_ROLE_KEY } },
      );
      if (!findRes.ok) {
        const txt = await findRes.text();
        return new Response(JSON.stringify({ error: `User exists, but lookup failed: ${txt}` }), {
          status: findRes.status, headers: corsHeaders,
        });
      }
      const users = await findRes.json();
      if (!Array.isArray(users) || users.length === 0) {
        return new Response(JSON.stringify({ error: "User exists, but not returned by admin lookup" }), {
          status: 409, headers: corsHeaders,
        });
      }
      userId = users[0].id as string;
    } else {
      userId = createRes.data.user!.id;
    }

    const up = {
      id: userId!, email, full_name,
      address_line: address_line ?? null,
      birthday: birthday ?? null,
      birth_city: birth_city ?? null,
      phone: phone ?? null,
      id_type: id_type ?? null,
      id_value: id_value ?? null,
      status: (status ?? "active") as string,
      role: (role ?? "member") as string,
      must_change_password: true,
    };

    const { error: upsertErr } = await admin.from("profiles").upsert(up, { onConflict: "id" });
    if (upsertErr) {
      return new Response(JSON.stringify({ error: `Profile upsert failed: ${upsertErr.message}` }), {
        status: 500, headers: corsHeaders,
      });
    }

    return new Response(JSON.stringify({ ok: true, user_id: userId, email }), {
      status: 200, headers: corsHeaders,
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500, headers: corsHeaders,
    });
  }
});
