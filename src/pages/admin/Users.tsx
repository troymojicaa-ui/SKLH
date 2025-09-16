import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ManageUsers() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    try {
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // user won’t need to confirm email
        user_metadata: { role: "connect" }, // custom metadata to tag as SK Connect user
      });
      if (error) throw error;
      setMsg(`✅ User created: ${data.user?.email}`);
    } catch (err: any) {
      setMsg(err.message ?? "Error creating user");
    }
  };

  return (
    <div className="p-6 max-w-md">
      <h1 className="text-xl font-bold mb-4">Create SK Connect User</h1>
      <form onSubmit={handleCreateUser} className="space-y-4">
        <input
          type="email"
          placeholder="user@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border p-2 w-full"
          required
        />
        <input
          type="password"
          placeholder="temporary password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border p-2 w-full"
          required
        />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
          Create User
        </button>
      </form>
      {msg && <p className="mt-4">{msg}</p>}
    </div>
  );
}
