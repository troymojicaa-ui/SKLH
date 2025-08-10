import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Filter, MoreHorizontal, UserPlus } from 'lucide-react';

const YouthManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const youthMembers = [
    { id: 1, name: 'Maria Santos', age: 19, email: 'maria@email.com', status: 'Active', joinDate: '2024-01-15', role: 'Member' },
    { id: 2, name: 'Juan Dela Cruz', age: 22, email: 'juan@email.com', status: 'Active', joinDate: '2024-01-10', role: 'Officer' },
    { id: 3, name: 'Ana Rodriguez', age: 20, email: 'ana@email.com', status: 'Pending', joinDate: '2024-02-01', role: 'Member' },
    { id: 4, name: 'Carlos Mendoza', age: 18, email: 'carlos@email.com', status: 'Active', joinDate: '2023-12-20', role: 'Member' },
    { id: 5, name: 'Sofia Garcia', age: 21, email: 'sofia@email.com', status: 'Inactive', joinDate: '2023-11-15', role: 'Member' },
  ];

  const stats = [
    { label: 'Total Members', value: '234', color: 'bg-blue-500' },
    { label: 'Active Members', value: '198', color: 'bg-green-500' },
    { label: 'Pending Verification', value: '12', color: 'bg-yellow-500' },
    { label: 'Officers', value: '8', color: 'bg-purple-500' },
  ];

  const filteredMembers = youthMembers.filter(member =>
    member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Youth Management</h1>
          <p className="text-gray-600">Manage and monitor youth members in your barangay</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <UserPlus className="w-4 h-4 mr-2" />
          Add New Member
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className={`w-4 h-4 rounded-full ${stat.color} mr-3`}></div>
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Youth Members</CardTitle>
          <CardDescription>Manage all registered youth members</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
          </div>

          {/* Members Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Age</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Join Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.name}</TableCell>
                  <TableCell>{member.age}</TableCell>
                  <TableCell>{member.email}</TableCell>
                  <TableCell>
                    <Badge variant={
                      member.status === 'Active' ? 'default' :
                      member.status === 'Pending' ? 'secondary' : 'destructive'
                    }>
                      {member.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{member.role}</TableCell>
                  <TableCell>{member.joinDate}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default YouthManagement;