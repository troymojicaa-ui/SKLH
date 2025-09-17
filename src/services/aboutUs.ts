import { supabase } from "@/lib/supabaseClient";

/* ---------- Types ---------- */
export type MemberDTO = {
  id?: string;
  name: string;
  role?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  sortOrder: number;
};

export type CTA = {
  tagline: string;
  heading: string;
  text: string;
  buttonLabel: string;
  buttonUrl: string;
};

export type TimelineItemDTO = {
  id?: string;
  date: string;
  title: string;
  description: string;
  buttonLabel?: string;
  buttonUrl?: string;
  sortOrder: number;
};

export type AboutUsDTO = {
  heroImage: string | null;
  whyWeMadeText: string;
  missionText: string;
  whyWeMadeThisImage: string | null;
  team: MemberDTO[];
  cta: CTA;
  timeline: TimelineItemDTO[];
};

/* ---------- helpers ---------- */
function isDataUrl(v?: string | null) {
  return !!v && v.startsWith("data:");
}

async function uploadDataUrl(dataUrl: string, prefix: string) {
  const blob = await (await fetch(dataUrl)).blob();
  const ext = (blob.type.split("/")[1] || "bin").replace("+xml", "");
  const key = `${prefix}/${crypto.randomUUID()}.${ext}`;
  const { data, error } = await supabase
    .storage
    .from("about")
    .upload(key, blob, { contentType: blob.type, upsert: false });
  if (error) throw error;
  const { data: pub } = supabase.storage.from("about").getPublicUrl(data.path);
  return pub.publicUrl;
}

/* ---------- fetch ---------- */
export async function fetchAboutUs(): Promise<AboutUsDTO> {
  const { data: s, error: e1 } = await supabase
    .from("settings_about_us")
    .select("*")
    .eq("id", 1)
    .single();
  if (e1) throw e1;

  const { data: members, error: e2 } = await supabase
    .from("team_members")
    .select("*")
    .order("sort_order", { ascending: true });
  if (e2) throw e2;

  const { data: items, error: e3 } = await supabase
    .from("timeline_items")
    .select("*")
    .order("sort_order", { ascending: true });
  if (e3) throw e3;

  return {
    heroImage: s?.hero_image_url ?? null,
    whyWeMadeText: s?.why_text ?? "",
    missionText: s?.mission_text ?? "",
    whyWeMadeThisImage: s?.why_image_url ?? null,
    team: (members ?? []).map((m: any) => ({
      id: m.id,
      name: m.name,
      role: m.role,
      bio: m.bio,
      avatarUrl: m.avatar_url,
      sortOrder: m.sort_order ?? 0,
    })),
    cta: {
      tagline: s?.cta_tagline ?? "Tagline",
      heading: s?.cta_heading ?? "",
      text: s?.cta_text ?? "",
      buttonLabel: s?.cta_button_label ?? "",
      buttonUrl: s?.cta_button_url ?? "",
    },
    timeline: (items ?? []).map((t: any) => ({
      id: t.id,
      date: t.date_text ?? "",
      title: t.title ?? "",
      description: t.description ?? "",
      buttonLabel: t.button_label ?? "",
      buttonUrl: t.button_url ?? "",
      sortOrder: t.sort_order ?? 0,
    })),
  };
}

/* ---------- save (upsert) ---------- */
export async function saveAboutUs(payload: AboutUsDTO) {
  let heroUrl = payload.heroImage;
  if (isDataUrl(heroUrl)) heroUrl = await uploadDataUrl(heroUrl!, "hero");

  let whyImgUrl = payload.whyWeMadeThisImage;
  if (isDataUrl(whyImgUrl)) whyImgUrl = await uploadDataUrl(whyImgUrl!, "about");

  const { error: sErr } = await supabase.from("settings_about_us").upsert({
    id: 1,
    hero_image_url: heroUrl ?? null,
    mission_text: payload.missionText,
    why_text: payload.whyWeMadeText,
    why_image_url: whyImgUrl ?? null,
    cta_tagline: payload.cta.tagline,
    cta_heading: payload.cta.heading,
    cta_text: payload.cta.text,
    cta_button_label: payload.cta.buttonLabel,
    cta_button_url: payload.cta.buttonUrl,
    updated_at: new Date().toISOString(),
  });
  if (sErr) throw sErr;

  const teamRows = await Promise.all(
    payload.team.map(async (m, idx) => {
      let avatar = m.avatarUrl ?? null;
      if (isDataUrl(avatar)) avatar = await uploadDataUrl(avatar!, "avatars");
      return {
        id: m.id || undefined,
        name: m.name,
        role: m.role ?? null,
        bio: m.bio ?? null,
        avatar_url: avatar,
        sort_order: idx,
      };
    })
  );
  const { error: tErr } = await supabase
    .from("team_members")
    .upsert(teamRows, { onConflict: "id" });
  if (tErr) throw tErr;

  const tlRows = payload.timeline.map((t, idx) => ({
    id: t.id || undefined,
    date_text: t.date,
    title: t.title,
    description: t.description,
    button_label: t.buttonLabel ?? null,
    button_url: t.buttonUrl ?? null,
    sort_order: idx,
  }));
  const { error: tlErr } = await supabase
    .from("timeline_items")
    .upsert(tlRows, { onConflict: "id" });
  if (tlErr) throw tlErr;

  return true;
}

/* ---------- deletes ---------- */
export async function deleteTeamMember(id: string) {
  const { error } = await supabase.from("team_members").delete().eq("id", id);
  if (error) throw error;
}

export async function deleteTimelineItem(id: string) {
  const { error } = await supabase.from("timeline_items").delete().eq("id", id);
  if (error) throw error;
}
