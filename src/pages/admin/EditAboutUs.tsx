import { useEffect, useRef, useState } from "react";
import { ImagePlus, Camera, ArrowUp, ArrowDown, Trash2 } from "lucide-react";
import {
  fetchAboutUs,
  saveAboutUs,
  deleteTeamMember,
  deleteTimelineItem,
  type AboutUsDTO,
  type MemberDTO,
  type TimelineItemDTO,
} from "@/services/aboutUs";

const fieldCls =
  "w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-300";
const labelCls = "mb-1 block text-sm font-medium text-slate-700";
const cardCls = "rounded-2xl border border-gray-200 bg-white p-6 shadow-sm";

const readAsDataURL = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(String(e.target?.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

function CropImageModal({
  open,
  src,
  aspect,
  onClose,
  onDone,
  outputWidth = 1600,
}: {
  open: boolean;
  src: string | null;
  aspect: number;
  onClose: () => void;
  onDone: (dataUrl: string) => void;
  outputWidth?: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [isDragging, setDragging] = useState(false);
  const [start, setStart] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!open) {
      setScale(1);
      setPos({ x: 0, y: 0 });
    }
  }, [open]);

  if (!open || !src) return null;

  const onPointerDown = (e: React.PointerEvent) => {
    setDragging(true);
    setStart({ x: e.clientX - pos.x, y: e.clientY - pos.y });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !start) return;
    setPos({ x: e.clientX - start.x, y: e.clientY - start.y });
  };
  const onPointerUp = (e: React.PointerEvent) => {
    setDragging(false);
    setStart(null);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const doCrop = () => {
    if (!containerRef.current || !imgRef.current) return;

    const frame = containerRef.current.getBoundingClientRect();
    const iw = imgRef.current.naturalWidth;
    const ih = imgRef.current.naturalHeight;

    const renderWidth = iw * scale;
    const renderHeight = ih * scale;

    const imgLeft = pos.x + frame.width / 2 - renderWidth / 2;
    const imgTop = pos.y + frame.height / 2 - renderHeight / 2;

    const outW = outputWidth;
    const outH = Math.round(outW / aspect);

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const sx = ((0 - imgLeft) / renderWidth) * iw;
    const sy = ((0 - imgTop) / renderHeight) * ih;
    const sWidth = (frame.width / renderWidth) * iw;
    const sHeight = (frame.height / renderHeight) * ih;

    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, outW, outH);
    ctx.drawImage(imgRef.current, sx, sy, sWidth, sHeight, 0, 0, outW, outH);
    onDone(canvas.toDataURL("image/jpeg", 0.92));
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl rounded-xl bg-white p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="px-1 pb-2 text-lg font-semibold">Adjust image</h3>

        <div
          ref={containerRef}
          className="relative mx-auto mb-4 overflow-hidden rounded-lg bg-black/5"
          style={{ width: "100%", aspectRatio: String(aspect) }}
        >
          <img
            ref={imgRef}
            src={src}
            alt="crop"
            className="select-none"
            draggable={false}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: `translate(-50%, -50%) translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
              transformOrigin: "center center",
              userSelect: "none",
              willChange: "transform",
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />
          <div className="pointer-events-none absolute inset-0 rounded-lg ring-2 ring-slate-300" />
        </div>

        <div className="flex items-center gap-4 px-1">
          <label className="text-sm font-medium text-slate-700">Zoom</label>
          <input
            type="range"
            min={0.5}
            max={3}
            step={0.01}
            value={scale}
            onChange={(e) => setScale(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="mt-4 flex justify-end gap-2 px-1">
          <button
            onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm text-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={doCrop}
            className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EditAboutUs() {
  const [data, setData] = useState<AboutUsDTO | null>(null);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState<Record<number, boolean>>({});
  const [newMember, setNewMember] = useState<MemberDTO>({
    name: "",
    role: "",
    bio: "",
    avatarUrl: "",
    sortOrder: 0,
  });

  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  const heroInputRef = useRef<HTMLInputElement>(null);
  const aboutSideInputRef = useRef<HTMLInputElement>(null);
  const newAvatarRef = useRef<HTMLInputElement>(null);
  const avatarInputs = useRef<Record<number, HTMLInputElement | null>>({});

  const [cropOpen, setCropOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropAspect, setCropAspect] = useState(16 / 9);
  const cropTargetRef = useRef<"hero" | "about">("hero");

  useEffect(() => {
    (async () => {
      const d = await fetchAboutUs();
      setData({
        heroImage: d.heroImage ?? null,
        whyWeMadeText: d.whyWeMadeText ?? "",
        missionText: d.missionText ?? "",
        whyWeMadeThisImage: d.whyWeMadeThisImage ?? null,
        team: (d.team ?? []).map((m, i) => ({
          id: m.id,
          name: m.name ?? "",
          role: m.role ?? "",
          bio: m.bio ?? "",
          avatarUrl: m.avatarUrl ?? "",
          sortOrder: m.sortOrder ?? i,
        })),
        cta: d.cta ?? {
          tagline: "Tagline",
          heading: "",
          text: "",
          buttonLabel: "",
          buttonUrl: "",
        },
        timeline: (d.timeline ?? []).map((t, i) => ({
          id: t.id,
          date: t.date ?? "",
          title: t.title ?? "",
          description: t.description ?? "",
          buttonLabel: t.buttonLabel ?? "",
          buttonUrl: t.buttonUrl ?? "",
          sortOrder: t.sortOrder ?? i,
        })),
      });
      setLoading(false);
    })().catch(() => setLoading(false));
  }, []);

  if (loading || !data) return <div className="p-6">Loading…</div>;

  const setField = <K extends keyof AboutUsDTO>(key: K, val: AboutUsDTO[K]) =>
    setData((d) => (d ? { ...d, [key]: val } : d));

  const setTeamAt = <K extends keyof MemberDTO>(idx: number, key: K, val: MemberDTO[K]) =>
    setData((d) =>
      d
        ? {
            ...d,
            team: d.team.map((m, i) => (i === idx ? { ...m, [key]: val } : m)),
          }
        : d
    );

  const setTimelineAt = <K extends keyof TimelineItemDTO>(
    idx: number,
    key: K,
    val: TimelineItemDTO[K]
  ) =>
    setData((d) =>
      d
        ? {
            ...d,
            timeline: d.timeline.map((t, i) => (i === idx ? { ...t, [key]: val } : t)),
          }
        : d
    );

  const toggleEdit = (idx: number) => setEditing((e) => ({ ...e, [idx]: !e[idx] }));

  const addMember = () =>
    setData((d) =>
      d
        ? {
            ...d,
            team: [...d.team, { ...newMember, sortOrder: d.team.length }],
          }
        : d
    );

  const removeMemberLocal = async (idx: number) => {
    const m = data.team[idx];
    setData((d) =>
      d
        ? {
            ...d,
            team: d.team.filter((_, i) => i !== idx).map((x, i) => ({ ...x, sortOrder: i })),
          }
        : d
    );
    if (m?.id) await deleteTeamMember(m.id);
  };

  const moveMember = (idx: number, dir: -1 | 1) =>
    setData((d) => {
      if (!d) return d;
      const a = [...d.team];
      const j = idx + dir;
      if (j < 0 || j >= a.length) return d;
      [a[idx], a[j]] = [a[j], a[idx]];
      return { ...d, team: a.map((x, i) => ({ ...x, sortOrder: i })) };
    });

  const addTimelineItem = () =>
    setData((d) =>
      d
        ? {
            ...d,
            timeline: [
              ...d.timeline,
              {
                date: "",
                title: "",
                description: "",
                buttonLabel: "",
                buttonUrl: "",
                sortOrder: d.timeline.length,
              },
            ],
          }
        : d
    );

  const removeTimelineLocal = async (idx: number) => {
    const it = data.timeline[idx];
    setData((d) =>
      d
        ? {
            ...d,
            timeline: d.timeline.filter((_, i) => i !== idx).map((x, i) => ({ ...x, sortOrder: i })),
          }
        : d
    );
    if (it?.id) await deleteTimelineItem(it.id);
  };

  const moveTimelineItem = (idx: number, dir: -1 | 1) =>
    setData((d) => {
      if (!d) return d;
      const a = [...d.timeline];
      const j = idx + dir;
      if (j < 0 || j >= a.length) return d;
      [a[idx], a[j]] = [a[j], a[idx]];
      return { ...d, timeline: a.map((x, i) => ({ ...x, sortOrder: i })) };
    });

  const openCropper = async (
    file: File,
    target: "hero" | "about",
    aspect: number,
    _outWidth: number
  ) => {
    const url = await readAsDataURL(file);
    cropTargetRef.current = target;
    setCropAspect(aspect);
    setCropSrc(url);
    setCropOpen(true);
  };

  const onCropDone = (dataUrl: string) => {
    if (cropTargetRef.current === "hero") {
      setField("heroImage", dataUrl);
    } else {
      setField("whyWeMadeThisImage", dataUrl);
    }
  };

  const onChangeHero = async (f?: File | null) => {
    if (!f) return;
    openCropper(f, "hero", 3.5, 1920);
  };

  const onChangeAboutSide = async (f?: File | null) => {
    if (!f) return;
    openCropper(f, "about", 16 / 9, 1600);
  };

  const onChangeAvatar = async (idx: number, f?: File | null) => {
    if (!f) return;
    const url = await readAsDataURL(f);
    setTeamAt(idx, "avatarUrl", url);
  };

  const onChangeNewAvatar = async (f?: File | null) => {
    if (!f) return;
    const url = await readAsDataURL(f);
    setNewMember((s) => ({ ...s, avatarUrl: url }));
  };

  const handleSaveAll = async () => {
    try {
      setSaving(true);
      setSaveErr(null);
      await saveAboutUs(data);
      const fresh = await fetchAboutUs();
      setData({
        heroImage: fresh.heroImage ?? null,
        whyWeMadeText: fresh.whyWeMadeText ?? "",
        missionText: fresh.missionText ?? "",
        whyWeMadeThisImage: fresh.whyWeMadeThisImage ?? null,
        team: (fresh.team ?? []).map((m, i) => ({ ...m, sortOrder: m.sortOrder ?? i })),
        cta: fresh.cta,
        timeline: (fresh.timeline ?? []).map((t, i) => ({ ...t, sortOrder: t.sortOrder ?? i })),
      });
      alert("Saved!");
    } catch (e: any) {
      console.error(e);
      setSaveErr(e?.message ?? "Save failed");
      alert(`Save failed: ${e?.message ?? "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-8 text-center text-3xl font-bold">About Us</h1>

      <section className="space-y-6">
        <div>
          <label className={labelCls}>Mission Statement</label>
          <textarea
            rows={4}
            className={`${fieldCls} resize-none`}
            placeholder="Enter description here"
            value={data.missionText}
            onChange={(e) => setField("missionText", e.target.value)}
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className={labelCls}>Why We Made This Project</label>
            <textarea
              rows={8}
              className={`${fieldCls} h-[220px] resize-none`}
              placeholder="Enter description here"
              value={data.whyWeMadeText}
              onChange={(e) => setField("whyWeMadeText", e.target.value)}
            />
          </div>

          <div>
            <label className={labelCls}>Project Image</label>
            <div
              className={`relative flex h-[220px] w-full items-center justify-center rounded-xl border ${
                data.whyWeMadeThisImage ? "border-transparent" : "border-blue-100 bg-blue-50"
              }`}
            >
              {data.whyWeMadeThisImage ? (
                <>
                  <img
                    src={data.whyWeMadeThisImage}
                    alt="About visual"
                    className="h-full w-full rounded-xl object-cover"
                  />
                  <button
                    onClick={() => aboutSideInputRef.current?.click()}
                    className="absolute bottom-3 right-3 rounded-lg bg-white/90 px-3 py-1.5 text-sm shadow"
                  >
                    Change Image
                  </button>
                </>
              ) : (
                <button
                  onClick={() => aboutSideInputRef.current?.click()}
                  className="flex flex-col items-center"
                >
                  <ImagePlus className="mb-3 h-10 w-10 text-slate-500" />
                  <span className="text-sm text-slate-700">Add Image</span>
                </button>
              )}
              <input
                ref={aboutSideInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => onChangeAboutSide(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
        </div>

        <div>
          <label className={labelCls}>Hero Image</label>
          <div
            className={`relative flex h-[220px] w-full items-center justify-center rounded-xl border ${
              data.heroImage ? "border-transparent" : "border-blue-100 bg-blue-50"
            }`}
          >
            {data.heroImage ? (
              <>
                <img
                  src={data.heroImage}
                  alt="Hero"
                  className="h-full w-full rounded-xl object-cover"
                />
                <button
                  onClick={() => heroInputRef.current?.click()}
                  className="absolute bottom-3 right-3 rounded-lg bg-white/90 px-3 py-1.5 text-sm shadow"
                >
                  Change Image
                </button>
              </>
            ) : (
              <button
                onClick={() => heroInputRef.current?.click()}
                className="flex flex-col items-center"
              >
                <ImagePlus className="mb-3 h-10 w-10 text-slate-500" />
                <span className="text-sm text-slate-700">Add Image</span>
              </button>
            )}
            <input
              ref={heroInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => onChangeHero(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="mb-6 text-xl font-semibold">Members</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {data.team.map((m, idx) => {
            const isEditing = !!editing[idx];
            return (
              <div key={m.id ?? idx} className={cardCls}>
                <div className="mb-5 flex items-center justify-center">
                  <div className="relative h-24 w-24 overflow-hidden rounded-full border border-gray-200">
                    {m.avatarUrl ? (
                      <img src={m.avatarUrl} alt={m.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gray-100">
                        <Camera className="h-6 w-6 text-gray-500" />
                      </div>
                    )}

                    <input
                      ref={(el) => (avatarInputs.current[idx] = el)}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => onChangeAvatar(idx, e.target.files?.[0] ?? null)}
                    />
                    <button
                      onClick={() => avatarInputs.current[idx]?.click()}
                      aria-label="Change photo"
                      className="group absolute inset-x-0 bottom-0 h-9 focus:outline-none"
                    >
                      <svg viewBox="0 0 100 100" className="h-full w-full">
                        <path
                          d="M0,60 A50,50 0 0 0 100,60 L100,100 L0,100 Z"
                          className="fill-white opacity-90 transition-opacity group-hover:opacity-100"
                        />
                      </svg>
                      <span className="pointer-events-none absolute inset-x-0 bottom-1 text-center text-[11px] font-medium text-slate-700">
                        Change
                      </span>
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className={labelCls}>Full Name</label>
                    <input
                      type="text"
                      className={fieldCls}
                      placeholder="Full Name"
                      value={m.name}
                      onChange={(e) => setTeamAt(idx, "name", e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Member Position</label>
                    <input
                      type="text"
                      className={fieldCls}
                      placeholder="Chairperson"
                      value={m.role ?? ""}
                      onChange={(e) => setTeamAt(idx, "role", e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Short Description</label>
                    <textarea
                      rows={3}
                      className={`${fieldCls} resize-none`}
                      placeholder="Short description"
                      value={m.bio ?? ""}
                      onChange={(e) => setTeamAt(idx, "bio", e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2">
                  <button
                    onClick={() => moveMember(idx, -1)}
                    className="rounded-md bg-gray-100 px-3 py-2 text-sm text-slate-700"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => moveMember(idx, 1)}
                    className="rounded-md bg-gray-100 px-3 py-2 text-sm text-slate-700"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => removeMemberLocal(idx)}
                    className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <button
                  onClick={() => toggleEdit(idx)}
                  className="mt-3 w-full rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900"
                >
                  {isEditing ? "Save" : "Edit"}
                </button>
              </div>
            );
          })}

          <div className={cardCls}>
            <div className="mb-5 flex items-center justify-center">
              <div
                className="relative h-24 w-24 overflow-hidden rounded-full border border-dashed border-gray-300 bg-gray-50"
                onClick={() => newAvatarRef.current?.click()}
                role="button"
              >
                {newMember.avatarUrl ? (
                  <img
                    src={newMember.avatarUrl}
                    alt="new member avatar"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <ImagePlus className="h-7 w-7 text-gray-500" />
                  </div>
                )}
                <input
                  ref={newAvatarRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onChangeNewAvatar(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className={labelCls}>Full Name</label>
                <input
                  type="text"
                  className={fieldCls}
                  placeholder="First Name"
                  value={newMember.name}
                  onChange={(e) => setNewMember((s) => ({ ...s, name: e.target.value }))}
                />
              </div>
              <div>
                <label className={labelCls}>Member Position</label>
                <input
                  type="text"
                  className={fieldCls}
                  placeholder="Select Member Position"
                  value={newMember.role ?? ""}
                  onChange={(e) => setNewMember((s) => ({ ...s, role: e.target.value }))}
                />
              </div>
              <div>
                <label className={labelCls}>Short Description</label>
                <textarea
                  rows={3}
                  className={`${fieldCls} resize-none`}
                  placeholder="Short Description"
                  value={newMember.bio ?? ""}
                  onChange={(e) => setNewMember((s) => ({ ...s, bio: e.target.value }))}
                />
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                onClick={() =>
                  setNewMember({ name: "", role: "", bio: "", avatarUrl: "", sortOrder: 0 })
                }
                className="flex-1 rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={addMember}
                className="flex-1 rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900"
              >
                Add Member
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-12">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Timeline</h2>
          <button
            onClick={addTimelineItem}
            className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900"
          >
            Add Item
          </button>
        </div>

        <div className="space-y-6">
          {data.timeline.map((item, idx) => (
            <div key={item.id ?? idx} className={cardCls}>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className={labelCls}>Date</label>
                  <input
                    className={fieldCls}
                    value={item.date}
                    onChange={(e) => setTimelineAt(idx, "date", e.target.value)}
                    placeholder="Date"
                  />
                </div>
                <div>
                  <label className={labelCls}>Title</label>
                  <input
                    className={fieldCls}
                    value={item.title}
                    onChange={(e) => setTimelineAt(idx, "title", e.target.value)}
                    placeholder="Short heading here"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className={labelCls}>Description</label>
                <textarea
                  rows={3}
                  className={`${fieldCls} resize-none`}
                  value={item.description}
                  onChange={(e) => setTimelineAt(idx, "description", e.target.value)}
                  placeholder="Supporting description"
                />
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <label className={labelCls}>Button Label</label>
                  <input
                    className={fieldCls}
                    value={item.buttonLabel ?? ""}
                    onChange={(e) => setTimelineAt(idx, "buttonLabel", e.target.value)}
                    placeholder="Button →"
                  />
                </div>
                <div>
                  <label className={labelCls}>Button URL</label>
                  <input
                    className={fieldCls}
                    value={item.buttonUrl ?? ""}
                    onChange={(e) => setTimelineAt(idx, "buttonUrl", e.target.value)}
                    placeholder="https://example.com"
                  />
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => moveTimelineItem(idx, -1)}
                  className="rounded-md bg-gray-100 px-3 py-2 text-sm text-slate-700"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  onClick={() => moveTimelineItem(idx, 1)}
                  className="rounded-md bg-gray-100 px-3 py-2 text-sm text-slate-700"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button
                  onClick={() => removeTimelineLocal(idx)}
                  className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-10 flex items-center justify-end gap-3">
        {saveErr ? <span className="text-sm text-red-600">{saveErr}</span> : null}
        <button
          onClick={handleSaveAll}
          disabled={saving}
          className="rounded-md bg-slate-800 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>

      <CropImageModal
        open={cropOpen}
        src={cropSrc}
        aspect={cropAspect}
        onClose={() => setCropOpen(false)}
        onDone={onCropDone}
      />
    </div>
  );
}
