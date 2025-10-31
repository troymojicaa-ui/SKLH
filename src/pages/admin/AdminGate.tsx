// src/pages/admin/AdminGate.tsx
import { useAuth } from "@/context/AuthProvider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AdminGate() {
  const { user, signOut } = useAuth();
  return (
    <div className="max-w-sm mx-auto p-4">
      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-semibold">Admin Access Required</h2>
        <p className="text-sm text-muted-foreground">
          You’re currently signed in as <b>{user?.email}</b>, which doesn’t have admin access.
          Please log out, then sign in with an admin account.
        </p>
        <Button onClick={signOut} className="w-full">Log out</Button>
      </Card>
    </div>
  );
}
