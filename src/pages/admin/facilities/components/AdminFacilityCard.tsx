import { Card } from "@/components/ui/card";
import { MapPin, Clock, ChevronLeft, ChevronRight, X, Building2 } from "lucide-react";
import { Button } from "../../../../components/ui/button";


interface AdminFacilityCardProps {
  cover: string | undefined;
  facitity_name: any;
  address: string,
  open: boolean;
  today: any;
  onEdit: ()=>void;
}

export default function AdminFacilityCard({cover, facitity_name, address, open, today, onEdit}: AdminFacilityCardProps) {

  return (
    <Card className="overflow-hidden hover:shadow transition cursor-pointer">
      <div className="relative h-40 bg-slate-100 overflow-hidden">
        {cover ? (
        <img
            src={cover}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
            // onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
        />
        ) : (
        <div className="h-full w-full grid place-items-center text-slate-500">
            <div className="flex flex-col items-center">
            <Building2 className="h-6 w-6 mb-1" />
            <span className="text-sm">No photo</span>
            </div>
        </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex justify-between items-center">
          <h3 className="font-medium">{facitity_name ?? "Facility"}</h3>
          <Button variant="outline" size="sm" onClick={onEdit}>
            Edit
          </Button>
        </div>
        <div className="mt-2 space-y-1 text-sm">
          <div className="flex items-center gap-2 text-slate-600">
            <MapPin className="h-4 w-4" />
            <span className="truncate flex-1">{address}</span>
          </div>
          <div className={`flex items-center gap-2 ${open ? "text-slate-600" : "text-rose-600"}`}>
            <Clock className="h-4 w-4" />
            {today}
          </div>
        </div>
      </div>
    </Card>
  )
}