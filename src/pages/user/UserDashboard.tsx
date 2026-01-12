import { useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { ShieldAlert, Building2, CalendarDays, User } from "lucide-react";
import { useAuth } from "@/context/AuthProvider";

export default function UserDashboard() {
  const navigate = useNavigate();
  const { session } = useAuth();

  const name =
    (session?.user?.user_metadata?.full_name as string | undefined) ||
    session?.user?.email?.split("@")[0] ||
    "there";

  return (
    <div className="min-h-[calc(100dvh-56px)] bg-gradient-to-b from-white to-[#CFEAFF]">
      <div className="px-4 pt-4 pb-12">

        {/* Floating shapes */}
        <div className="relative h-[120px]">
          <div className="absolute left-0 top-4 h-14 w-14 rounded-2xl bg-white/60" />
          <div className="absolute left-12 top-14 h-10 w-10 rounded-2xl bg-white/50" />
          <div className="absolute right-2 top-2 h-12 w-12 rounded-2xl bg-white/60" />
          <div className="absolute right-16 top-10 h-16 w-16 rounded-2xl bg-white/50" />
        </div>

        {/* Headings */}
        <div className="text-center mt-1">
          <p className="text-[13px] text-slate-600">Hello, {name}!</p>
          <h1 className="mt-1 text-[30px] font-semibold tracking-tight text-slate-900">
            Welcome to SK Loyola
          </h1>
          <p className="mx-auto mt-2 max-w-[320px] text-[13px] leading-snug text-slate-700">
            Browse and sign up for events, search for facilities, and report
            community issues all in one place.
          </p>
        </div>

        {/* Action tiles */}
        <div className="mx-auto mt-8 grid max-w-[320px] grid-cols-2 gap-4">
          <Tile
            label="Report an Issue"
            icon={<ShieldAlert className="h-7 w-7 stroke-[2.4]" />}
            color="text-red-500"
            onClick={() => navigate("/dashboard/report")}
          />
          <Tile
            label="Facilities"
            icon={<Building2 className="h-7 w-7 stroke-[2.4]" />}
            color="text-[#0B2C5A]"
            onClick={() => navigate("/dashboard/facilities")}
          />
          <Tile
            label="Events"
            icon={<CalendarDays className="h-7 w-7 stroke-[2.4]" />}
            color="text-[#0B2C5A]"
            onClick={() => navigate("/dashboard/events")}
          />
          <Tile
            label="Profile"
            icon={<User className="h-7 w-7 stroke-[2.4]" />}
            color="text-[#0B2C5A]"
            onClick={() => navigate("/dashboard/profile")}
          />
        </div>
      </div>
    </div>
  );
}

function Tile({
  icon,
  label,
  color,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="
        w-full
        h-[168px]
        rounded-2xl
        bg-white
        shadow-[0_12px_28px_rgba(0,0,0,0.08)]
        flex flex-col items-center justify-center
        gap-4
        text-center
        active:scale-[0.97]
        transition
      "
    >
      <div className={`flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <div className="text-[14px] font-semibold text-slate-900">
        {label}
      </div>
    </button>
  );
}
