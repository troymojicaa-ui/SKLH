import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Calendar, FileText, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';

const AdminDashboard = () => {
  const stats = [
    { name: 'Active Youth Members', value: '234', icon: Users, change: '+12%', changeType: 'positive' },
    { name: 'Upcoming Events', value: '8', icon: Calendar, change: '+3', changeType: 'positive' },
    { name: 'Active Projects', value: '15', icon: FileText, change: '+5', changeType: 'positive' },
    { name: 'Participation Rate', value: '87%', icon: TrendingUp, change: '+5%', changeType: 'positive' },
  ];

  const recentActivities = [
    { id: 1, activity: 'New youth member registered', user: 'Maria Santos', time: '2 hours ago', type: 'user' },
    { id: 2, activity: 'Community Clean-up Drive scheduled', user: 'Admin', time: '4 hours ago', type: 'event' },
    { id: 3, activity: 'Project proposal submitted', user: 'Juan Dela Cruz', time: '6 hours ago', type: 'project' },
    { id: 4, activity: 'Event feedback received', user: 'Ana Rodriguez', time: '8 hours ago', type: 'feedback' },
  ];

  const pendingApprovals = [
    { id: 1, item: 'Youth Leadership Training Budget', type: 'Budget', priority: 'high' },
    { id: 2, item: 'New Member Verification', type: 'Verification', priority: 'medium' },
    { id: 3, item: 'Sports Equipment Purchase', type: 'Purchase', priority: 'low' },
  ];

  const upcomingEvents = [
    { id: 1, title: 'Youth Leadership Summit', date: 'Feb 15, 2024', attendees: 45 },
    { id: 2, title: 'Community Garden Project', date: 'Feb 20, 2024', attendees: 23 },
    { id: 3, title: 'Digital Literacy Workshop', date: 'Feb 25, 2024', attendees: 67 },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">SK Command Dashboard</h1>
        <p className="text-gray-600">Welcome back! Here's what's happening in Loyola Heights.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-sm text-green-600">{stat.change} from last month</p>
                </div>
                <stat.icon className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activities */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activities</CardTitle>
            <CardDescription>Latest updates from your community</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-4">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{activity.activity}</p>
                    <p className="text-xs text-gray-500">by {activity.user} • {activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pending Approvals */}
        <Card>
          <CardHeader>
            <CardTitle>Pending Approvals</CardTitle>
            <CardDescription>Items requiring your attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingApprovals.map((item) => (
                <div key={item.id} className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{item.item}</p>
                    <p className="text-xs text-gray-500">{item.type}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={
                      item.priority === 'high' ? 'destructive' : 
                      item.priority === 'medium' ? 'default' : 'secondary'
                    }>
                      {item.priority}
                    </Badge>
                    <Button size="sm" variant="outline">Review</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Events */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Events</CardTitle>
          <CardDescription>Events scheduled for this month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {upcomingEvents.map((event) => (
              <div key={event.id} className="border rounded-lg p-4">
                <h4 className="font-medium text-gray-900">{event.title}</h4>
                <p className="text-sm text-gray-600">{event.date}</p>
                <p className="text-sm text-blue-600">{event.attendees} registered</p>
                <Button size="sm" className="mt-2" variant="outline">View Details</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;