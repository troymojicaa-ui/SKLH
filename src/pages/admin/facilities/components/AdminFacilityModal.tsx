import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { type Facility, type FacilityPhoto, type FacilityHour, type FacilityAddress, DOW_LABEL } from "../Facilities";
import {
  Trash2,
  Save,
} from "lucide-react";
import MapView from "../../components/Mapview";
import { Marker } from "react-leaflet";
import ClickMarkerAddress from "../../components/ClickMarkerAddress";

interface AdminFacilityModalProps {
  editing: Facility | null;
  setEditing: (val: Facility | null) => void;

  name: string;
  setName: (val: string)=>void;
  description: string;
  setDescription: (val: string)=>void;
  hours: FacilityHour[];
  setHours: (val: FacilityHour[])=>void;
  files: File[];
  setFiles: (val: File[])=>void;
  address: FacilityAddress | null;
  setAddress: (val: FacilityAddress|null)=>void;

  saveFacility: (e: React.FormEvent)=>void;
  orderedPhotos: FacilityPhoto[];
  orderChanged: boolean;
  savePhotoOrder: ()=>void;
  dragIndex: number | null;
  onDragStart: (idx: number)=>void;
  onDragEnter: (idx: number)=>void;
  onDragEnd: ()=>void;
  removePhoto: (photo: FacilityPhoto)=>void;
  handleHourChange: (dow: number, field: "open_time"|"close_time", value: string)=>void;
  saving: boolean;
}

export default function AdminFacilityModal({
  editing,
  setEditing,
  name,
  setName,
  description,
  setDescription,
  hours,
  setHours,
  files,
  setFiles,
  address,
  setAddress,
  saveFacility,
  orderedPhotos,
  orderChanged,
  savePhotoOrder,
  dragIndex,
  onDragStart,
  onDragEnter,
  onDragEnd,
  removePhoto,
  handleHourChange,
  saving,
}: AdminFacilityModalProps) {
  return (
    <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
      <DialogContent className="max-w-4xl h-screen sm:h-[calc(100vh-4rem)]">
        <DialogHeader>
          <DialogTitle>{editing?.id ? "Edit Facility" : "New Facility"}</DialogTitle>
          <DialogDescription>
            Add details, set weekly hours, upload photos; drag photos to reorder.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={saveFacility} className="space-y-6 overflow-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Basics + Photos */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input
                  className="mt-1"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Barangay Gym"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  className="mt-1"
                  rows={6}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe this facility…"
                />
              </div>

              <div>
                <label className="text-sm font-medium">New images (max 10)</label>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 10))}
                  />
                  <Badge variant="secondary">{files.length} to upload</Badge>
                </div>

                {/* Existing images with drag & drop */}
                {orderedPhotos.length > 0 && (
                  <>
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {orderedPhotos.map((p, idx) => (
                        <div
                          key={p.id}
                          className={`relative rounded border overflow-hidden bg-gray-50 ${
                            dragIndex === idx ? "opacity-70 ring-2 ring-sky-500" : ""
                          }`}
                          draggable
                          onDragStart={() => onDragStart(idx)}
                          onDragEnter={() => onDragEnter(idx)}
                          onDragEnd={onDragEnd}
                          onDragOver={(e) => e.preventDefault()}
                          title="Drag to reorder"
                        >
                          <img
                            src={p.url}
                            alt=""
                            className="w-full h-28 object-cover"
                            onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
                          />
                          <div className="absolute left-1 top-1 rounded bg-black/50 px-1.5 py-0.5 text-[11px] text-white">
                            {idx + 1}
                          </div>
                          <div className="absolute inset-x-0 bottom-0 p-1 flex justify-end">
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              onClick={() => removePhoto(p)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Tip: drag cards to change the display order.
                      </span>
                      <Button
                        type="button"
                        variant={orderChanged ? "default" : "outline"}
                        disabled={!orderChanged || !editing?.id}
                        onClick={savePhotoOrder}
                      >
                        {orderChanged ? "Save order" : "Order saved"}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Right: Weekly Hours */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Weekly Hours</label>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {hours.map((h) => (
                  <div key={h.dow} className="flex items-center gap-3 rounded border bg-white p-2">
                    <div className="w-12 shrink-0 text-sm font-medium">{DOW_LABEL[h.dow]}</div>
                    <Input
                      type="time"
                      value={h.open_time?.slice(0,5) ?? ""}
                      onChange={(e) => handleHourChange(h.dow, "open_time", e.target.value ? e.target.value + ":00" : "")}
                      className="w-28"
                    />
                    <span className="text-sm text-muted-foreground">to</span>
                    <Input
                      type="time"
                      value={h.close_time?.slice(0,5) ?? ""}
                      onChange={(e) => handleHourChange(h.dow, "close_time", e.target.value ? e.target.value + ":00" : "")}
                      className="w-28"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      className="ml-auto h-8 px-2 text-xs"
                      onClick={() => {
                        handleHourChange(h.dow, "open_time", "");
                        handleHourChange(h.dow, "close_time", "");
                      }}
                    >
                      Closed
                    </Button>
                  </div>
                ))}
              </div>

              <p className="text-xs text-muted-foreground">
                Leave a day “Closed” by clearing both times. Overnight (e.g., 20:00–02:00) is supported.
              </p>
            </div>
          </div>

          <div className="w-full h-64 flex flex-col">
            <div>
              <span className="flex items-center gap-2"><span className="font-semibold">Address:</span> <span className="truncate flex-1">{address?address.address:'No address. Click on map to set address.'}</span></span>
            </div>
            <MapView
              center={address ?? [14.6445, 121.0795]} 
              zoom={14}
            >
              <ClickMarkerAddress setAddress={setAddress} />
              {address && <Marker position={[address.lat, address.lng]} />}
            </MapView>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}