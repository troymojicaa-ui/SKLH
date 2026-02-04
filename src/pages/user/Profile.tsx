import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth"; // Your new custom hook

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, ShieldCheck } from "lucide-react";

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, isLoading, isCheckingAuth } = useAuth();

  // Compute display name similarly to your original logic
  const displayName = useMemo(() => {
    if (!user) return "Profile";
    return user.full_name?.trim() || user.username || "User";
  }, [user]);

  // Loading state while TanStack Query fetches the /auth/me data
  if (isLoading || isCheckingAuth) {
    return (
      <div className="max-w-sm sm:max-w-md mx-auto p-4">
        <Card className="p-8 text-center text-muted-foreground">
          Loading profile details...
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-sm sm:max-w-md mx-auto p-4">
        <Card className="p-8 text-center">
          <p className="mb-4">Please sign in to view your profile.</p>
          <Button onClick={() => navigate("/login")}>Go to Login</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-sm sm:max-w-md mx-auto p-4">
      <Card className="p-6 sm:p-8">
        <div className="space-y-6">
          {/* Avatar Section */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <div className="h-24 w-24 rounded-full overflow-hidden ring-4 ring-white shadow bg-slate-100">
                {user.profile.avatar ? (
                  <img
                    src={user.profile.avatar}
                    alt="avatar"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full grid place-items-center text-xs text-muted-foreground">
                    No image
                  </div>
                )}
              </div>
              {user.is_staff && (
                <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-blue-600 text-white shadow grid place-items-center" title="Staff Member">
                  <ShieldCheck className="h-4 w-4" />
                </div>
              )}
            </div>
            <h2 className="mt-4 text-2xl font-semibold tracking-wide text-[#13294B]">
              {displayName}
            </h2>
            <p className="text-sm text-muted-foreground capitalize">{user.role || 'Member'}</p>
          </div>

          {/* Info Fields - All Read Only */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500 uppercase font-bold tracking-wider">Full Name</Label>
              <Input value={user.profile.full_name || "Not provided"} readOnly className="bg-slate-50 border-none shadow-none focus-visible:ring-0" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500 uppercase font-bold tracking-wider">Birth Date</Label>
                <Input value={user.profile.birth_date || "None"} readOnly className="bg-slate-50 border-none shadow-none" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500 uppercase font-bold tracking-wider">Contact Number</Label>
                <Input value={user.profile.contact_number || "None"} readOnly className="bg-slate-50 border-none shadow-none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500 uppercase font-bold tracking-wider">Email</Label>
              <Input value={user.email} readOnly className="bg-slate-50 border-none shadow-none" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500 uppercase font-bold tracking-wider">Address</Label>
              <Input
                value={user.profile.address_line || "No address on file"}
                readOnly
                className="bg-slate-50 border-none shadow-none"
              />
            </div>
          </div>

          {/* Security Summary Section */}
          <div className="pt-4 border-t">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <KeyRound className="h-4 w-4" />
                  Account Security
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Your account is protected. To change your password or edit these details, please contact your administrator.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-center">
            <Button
              variant="outline"
              onClick={() => navigate("/dashboard")}
              className="w-full border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}