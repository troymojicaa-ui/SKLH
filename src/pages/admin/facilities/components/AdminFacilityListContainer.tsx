import { Button } from "@/components/ui/button";

import { type ReactNode } from "react";
import {
  Plus,
} from "lucide-react";


interface AdminFacilityListProps {
  totalFacility: number;
  onCreate: ()=>void;
  children?: ReactNode;
}

export default function AdminFacilityListContainer({totalFacility, children, onCreate}: AdminFacilityListProps) {
  return (
    <>
      {/* Sticky filter/header row */}
      <div className="flex items-center justify-between sticky top-0 bg-white z-10 pb-2 py-2">
        <p className="text-sm text-muted-foreground">
          Showing <span className="font-medium">{totalFacility}</span> results
        </p>
        <div className="flex items-center gap-2">
          <Button size={'small'} onClick={onCreate}>
            <Plus className="h-4 w-4 mr-2" />
            New Facility
          </Button>
        </div>
      </div>

      {/* Scrollable list only on the left */}
      <div className="flex-1 overflow-y-auto no-scrollbar pr-1 space-y-3">
        {children}
      </div>
    </>
  )
}