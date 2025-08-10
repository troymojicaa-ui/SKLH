import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, ShieldAlert, User } from "lucide-react";

export default function UserDashboard() {
  return (
    <div className="p-4 md:p-6 space-y-8">
      {/* Page header */}
      <section>
        <h1 className="text-2xl md:text-3xl font-semibold">Welcome to SK Connect</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Quick access to your projects, reports, and profile.
        </p>
      </section>

      {/* Quick actions */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:shadow-sm transition">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-600" />
              Projects
            </CardTitle>
            <CardDescription>See upcoming and past projects.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Join or track participation.
            </div>
            <Button asChild>
              <Link to="/dashboard/projects">Open</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-sm transition">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-purple-600" />
              Reports
            </CardTitle>
            <CardDescription>View and submit incident reports.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Map + list of reports.
            </div>
            <Button asChild variant="secondary">
              <Link to="/dashboard/report">Open</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-sm transition">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-purple-600" />
              Profile
            </CardTitle>
            <CardDescription>Update your details and photo.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Bio, birthday, address.
            </div>
            <Button asChild variant="outline">
              <Link to="/dashboard/profile">Open</Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Optional: Recent activity placeholder */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Projects</CardTitle>
            <CardDescription>What’s coming up soon.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            You’ll see upcoming projects here once they’re published.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Reports</CardTitle>
            <CardDescription>Your latest submitted incidents.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            You haven’t submitted any reports yet.
          </CardContent>
        </Card>
      </section>
    </div>
  );
}