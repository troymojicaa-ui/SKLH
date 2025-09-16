// src/components/admin/AddMemberModal.tsx
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";

export default function AddMemberModal() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    address_line: "",
    birthday: "",
    birth_city: "",
    email: "",
    phone: "",
    id_type: "",
    id_value: "",
  });

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  async function onSubmit() {
    if (!form.full_name || !form.email) {
      toast({ title: "Full name and email are required." });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin_create_member", {
        body: form,
      });
      if (error) throw error;
      toast({ title: "Member created", description: `User ID: ${data?.user_id}` });
      setOpen(false);
      setForm({
        full_name: "", address_line: "", birthday: "", birth_city: "",
        email: "", phone: "", id_type: "", id_value: "",
      });
    } catch (e: any) {
      toast({ title: "Error", description: e.message ?? String(e) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button onClick={() => setOpen(true)}>Add New Member</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Create New Member Account</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="full_name">Full Name</Label>
            <Input name="full_name" id="full_name" value={form.full_name} onChange={onChange} />
          </div>

          <div>
            <Label htmlFor="email">Email (login)</Label>
            <Input type="email" name="email" id="email" value={form.email} onChange={onChange} />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="address_line">Address (one line)</Label>
            <Input name="address_line" id="address_line" value={form.address_line} onChange={onChange} />
          </div>

          <div>
            <Label htmlFor="birthday">Birthday</Label>
            <Input type="date" name="birthday" id="birthday" value={form.birthday} onChange={onChange} />
          </div>

          <div>
            <Label htmlFor="birth_city">City of Birth</Label>
            <Input name="birth_city" id="birth_city" value={form.birth_city} onChange={onChange} />
          </div>

          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input name="phone" id="phone" value={form.phone} onChange={onChange} />
          </div>

          <div>
            <Label>ID Type</Label>
            <Select value={form.id_type} onValueChange={(v) => setForm((s) => ({ ...s, id_type: v }))}>
              <SelectTrigger><SelectValue placeholder="Choose ID type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PhilID">PhilID</SelectItem>
                <SelectItem value="Passport">Passport</SelectItem>
                <SelectItem value="DriverLicense">Driver’s License</SelectItem>
                <SelectItem value="StudentID">Student ID</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="id_value">ID Number</Label>
            <Input name="id_value" id="id_value" value={form.id_value} onChange={onChange} />
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancel</Button>
          <Button onClick={onSubmit} disabled={loading}>{loading ? "Creating..." : "Create Member"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
